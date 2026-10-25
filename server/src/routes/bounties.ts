import { Router, type Request, type Response } from 'express';
import { prisma } from '../db.js';

export const bountiesRouter = Router();

// POST /api/bounties/:bountyId/metadata:
// Accept { title, description, category, skills } and upsert into BountyMetadata.
bountiesRouter.post('/:bountyId/metadata', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { title, description, category, skills } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'title is required' });
    }

    try {
        const metadata = await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: {
                title: title.trim(),
                description: description ? String(description).trim() : null,
                category: category && typeof category === 'string' ? category.trim() : 'General',
                skills: skills && typeof skills === 'string' ? skills.trim() : null,
            },
            create: {
                bountyId,
                title: title.trim(),
                description: description ? String(description).trim() : null,
                category: category && typeof category === 'string' ? category.trim() : 'General',
                skills: skills && typeof skills === 'string' ? skills.trim() : null,
            },
        });
        res.status(201).json(metadata);
    } catch (err) {
        console.error('Failed to save bounty metadata:', err);
        res.status(500).json({ error: 'Failed to save bounty metadata' });
    }
});

// GET /api/bounties/metadata:
// Return all BountyMetadata records including proposals count or array so the frontend can display rich metadata and applicant counts in one query.
bountiesRouter.get('/metadata', async (_req: Request, res: Response) => {
    try {
        const all = await prisma.bountyMetadata.findMany({
            include: {
                proposals: {
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { proposals: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(all);
    } catch (err) {
        console.error('Failed to get bounty metadata:', err);
        res.status(500).json({ error: 'Failed to retrieve bounty metadata' });
    }
});

// POST /api/bounties/:bountyId/proposals:
// Accept { freelancerAddress, coverLetter, timelineDays, portfolioUrl }.
// Validate that freelancerAddress is a non-empty wallet address and coverLetter is provided.
// Ensure a BountyMetadata parent record exists for bountyId (if not, auto-create a placeholder with title: "Bounty #" + bountyId so foreign keys never fail).
// Upsert the proposal for [bountyId, freelancerAddress.toLowerCase()].
bountiesRouter.post('/:bountyId/proposals', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { freelancerAddress, coverLetter, timelineDays, portfolioUrl } = req.body;

    if (!freelancerAddress || typeof freelancerAddress !== 'string' || freelancerAddress.trim().length === 0) {
        return res.status(400).json({ error: 'freelancerAddress is required' });
    }

    if (!coverLetter || typeof coverLetter !== 'string' || coverLetter.trim().length === 0) {
        return res.status(400).json({ error: 'coverLetter is required' });
    }

    const normalizedAddress = freelancerAddress.trim().toLowerCase();
    const days = typeof timelineDays === 'number' && timelineDays > 0 ? timelineDays : Number(timelineDays) || 7;

    try {
        // Ensure a BountyMetadata parent record exists for bountyId
        await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: {},
            create: {
                bountyId,
                title: `Bounty #${bountyId}`,
                category: 'General',
            },
        });

        // Upsert proposal for [bountyId, freelancerAddress.toLowerCase()]
        const proposal = await prisma.proposal.upsert({
            where: {
                bountyId_freelancerAddress: {
                    bountyId,
                    freelancerAddress: normalizedAddress,
                },
            },
            update: {
                coverLetter: coverLetter.trim(),
                timelineDays: days,
                portfolioUrl: portfolioUrl ? String(portfolioUrl).trim() : null,
                status: 'PENDING',
            },
            create: {
                bountyId,
                freelancerAddress: normalizedAddress,
                coverLetter: coverLetter.trim(),
                timelineDays: days,
                portfolioUrl: portfolioUrl ? String(portfolioUrl).trim() : null,
                status: 'PENDING',
            },
        });

        res.status(201).json(proposal);
    } catch (err) {
        console.error('Failed to submit proposal:', err);
        res.status(500).json({ error: 'Failed to submit proposal' });
    }
});

// GET /api/bounties/:bountyId/proposals:
// Return all proposals for bountyId ordered by createdAt desc.
bountiesRouter.get('/:bountyId/proposals', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    try {
        const proposals = await prisma.proposal.findMany({
            where: { bountyId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(proposals);
    } catch (err) {
        console.error('Failed to get proposals:', err);
        res.status(500).json({ error: 'Failed to retrieve proposals' });
    }
});

// PATCH /api/bounties/:bountyId/proposals/:proposalId/accept:
// Set the selected proposal's status to "ACCEPTED" and all other proposals for that bountyId to "REJECTED".
bountiesRouter.patch('/:bountyId/proposals/:proposalId/accept', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;

    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    if (!proposalId || typeof proposalId !== 'string') {
        return res.status(400).json({ error: 'proposalId is required' });
    }

    try {
        const target = await prisma.proposal.findFirst({
            where: { id: proposalId, bountyId },
        });

        if (!target) {
            return res.status(404).json({ error: 'Proposal not found for this bounty' });
        }

        await prisma.$transaction([
            prisma.proposal.updateMany({
                where: {
                    bountyId,
                    id: { not: proposalId },
                },
                data: { status: 'REJECTED' },
            }),
            prisma.proposal.update({
                where: { id: proposalId },
                data: { status: 'ACCEPTED' },
            }),
        ]);

        const updated = await prisma.proposal.findUnique({
            where: { id: proposalId },
        });

        res.json(updated);
    } catch (err) {
        console.error('Failed to accept proposal:', err);
        res.status(500).json({ error: 'Failed to accept proposal' });
    }
});

// PATCH /api/bounties/:bountyId/dispute:
// Accept { disputeReason } and update BountyMetadata.disputeReason for bountyId.
bountiesRouter.patch('/:bountyId/dispute', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { disputeReason } = req.body;
    if (!disputeReason || typeof disputeReason !== 'string' || disputeReason.trim().length === 0) {
        return res.status(400).json({ error: 'disputeReason is required' });
    }

    try {
        const metadata = await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: {
                disputeReason: disputeReason.trim(),
            },
            create: {
                bountyId,
                title: `Bounty #${bountyId}`,
                category: 'Disputed',
                disputeReason: disputeReason.trim(),
            },
        });
        res.json(metadata);
    } catch (err) {
        console.error('Failed to update dispute reason:', err);
        res.status(500).json({ error: 'Failed to update dispute reason' });
    }
});