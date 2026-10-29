import { Router, type Request, type Response } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../db.js';

export const bountiesRouter = Router();

// ==========================================
// EIP-712 DOMAIN & TYPES DEFINITIONS
// ==========================================
const DEFAULT_CHAIN_ID = 84532; // Base Sepolia
const DEFAULT_VERIFYING_CONTRACT =
    process.env.VITE_CONTRACT_ADDRESS ||
    process.env.CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

const EIP712_DOMAIN = {
    name: "BountyBoard",
    version: "1",
    chainId: DEFAULT_CHAIN_ID,
    verifyingContract: DEFAULT_VERIFYING_CONTRACT,
};

const PROPOSAL_TYPE = {
    Proposal: [
        { name: "bountyId", type: "uint256" },
        { name: "freelancer", type: "address" },
        { name: "timelineDays", type: "uint256" },
        { name: "coverLetterHash", type: "bytes32" },
        { name: "timestamp", type: "uint256" },
    ],
};

/**
 * Helper to cryptographically verify an off-chain EIP-712 signature for a proposal.
 * Returns true if the recovered signer matches the freelancer wallet address.
 */
function verifyProposalSignature(
    bountyId: number,
    freelancerAddress: string,
    coverLetter: string,
    timelineDays: number,
    signature: string,
    timestamp?: number | string | null,
    chainId?: number | string | null,
    verifyingContract?: string | null
): boolean {
    try {
        const normalizedAddress = freelancerAddress.trim().toLowerCase();
        const parsedTimestamp = timestamp ? BigInt(timestamp) : BigInt(Math.floor(Date.now() / 1000));
        const parsedChainId = chainId ? Number(chainId) : DEFAULT_CHAIN_ID;
        const targetContract = verifyingContract || DEFAULT_VERIFYING_CONTRACT;

        const coverLetterHashes = [
            ethers.keccak256(ethers.toUtf8Bytes(coverLetter.trim())),
        ];
        if (coverLetter !== coverLetter.trim()) {
            coverLetterHashes.push(ethers.keccak256(ethers.toUtf8Bytes(coverLetter)));
        }

        const candidateDomains = [
            {
                name: "BountyBoard",
                version: "1",
                chainId: parsedChainId,
                verifyingContract: targetContract,
            },
        ];

        if (targetContract !== "0x0000000000000000000000000000000000000000") {
            candidateDomains.push({
                name: "BountyBoard",
                version: "1",
                chainId: parsedChainId,
                verifyingContract: "0x0000000000000000000000000000000000000000",
            });
        }

        for (const domain of candidateDomains) {
            for (const clHash of coverLetterHashes) {
                try {
                    const value = {
                        bountyId: BigInt(bountyId),
                        freelancer: ethers.getAddress(normalizedAddress),
                        timelineDays: BigInt(timelineDays),
                        coverLetterHash: clHash,
                        timestamp: parsedTimestamp,
                    };

                    const recovered = ethers.verifyTypedData(domain, PROPOSAL_TYPE, value, signature.trim());
                    if (recovered.toLowerCase() === normalizedAddress) {
                        return true;
                    }
                } catch {
                    // Continue to next combination
                }
            }
        }
    } catch (err) {
        console.warn('EIP-712 proposal signature verification failed:', err);
    }
    return false;
}

// ==========================================
// ACTIVITY STREAM ENDPOINTS
// ==========================================

// GET /api/bounties/activity:
// Returns the 30 most recent ActivityEvent records across all bounties for the live activity feed.
bountiesRouter.get('/activity', async (_req: Request, res: Response) => {
    try {
        const events = await prisma.activityEvent.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
        });
        res.json(events);
    } catch (err) {
        console.error('Failed to get activity feed:', err);
        res.status(500).json({ error: 'Failed to retrieve activity events' });
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
                comments: {
                    include: {
                        user: {
                            select: {
                                wallet: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: { proposals: true, comments: true },
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

// GET /api/bounties/:bountyId/metadata:
// Returns rich metadata for a specific bounty including proposals and revision comments.
bountiesRouter.get('/:bountyId/metadata', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    try {
        const metadata = await prisma.bountyMetadata.findUnique({
            where: { bountyId },
            include: {
                proposals: {
                    orderBy: { createdAt: 'desc' },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                wallet: true,
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!metadata) {
            return res.status(404).json({ error: 'Bounty metadata not found' });
        }

        res.json(metadata);
    } catch (err) {
        console.error('Failed to get single bounty metadata:', err);
        res.status(500).json({ error: 'Failed to retrieve bounty metadata' });
    }
});

// POST /api/bounties/:bountyId/metadata:
// Accept { title, description, category, skills, tokenSymbol, tokenAddress, isPrivateDeliverable } and upsert into BountyMetadata.
bountiesRouter.post('/:bountyId/metadata', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const {
        title,
        description,
        category,
        skills,
        tokenSymbol,
        tokenAddress,
        isPrivateDeliverable,
        encryptedDeliverableData,
        encryptedKeyEnvelope,
        actor,
        clientAddress,
        txHash,
    } = req.body;

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
                tokenSymbol: tokenSymbol && typeof tokenSymbol === 'string' ? tokenSymbol.trim() : 'ETH',
                tokenAddress: tokenAddress && typeof tokenAddress === 'string' && tokenAddress.trim().length > 0 ? tokenAddress.trim() : null,
                isPrivateDeliverable: typeof isPrivateDeliverable === 'boolean' ? isPrivateDeliverable : false,
                encryptedDeliverableData: encryptedDeliverableData ? String(encryptedDeliverableData).trim() : undefined,
                encryptedKeyEnvelope: encryptedKeyEnvelope ? String(encryptedKeyEnvelope).trim() : undefined,
            },
            create: {
                bountyId,
                title: title.trim(),
                description: description ? String(description).trim() : null,
                category: category && typeof category === 'string' ? category.trim() : 'General',
                skills: skills && typeof skills === 'string' ? skills.trim() : null,
                tokenSymbol: tokenSymbol && typeof tokenSymbol === 'string' ? tokenSymbol.trim() : 'ETH',
                tokenAddress: tokenAddress && typeof tokenAddress === 'string' && tokenAddress.trim().length > 0 ? tokenAddress.trim() : null,
                isPrivateDeliverable: typeof isPrivateDeliverable === 'boolean' ? isPrivateDeliverable : false,
                encryptedDeliverableData: encryptedDeliverableData ? String(encryptedDeliverableData).trim() : null,
                encryptedKeyEnvelope: encryptedKeyEnvelope ? String(encryptedKeyEnvelope).trim() : null,
            },
        });

        // Record ActivityEvent for CREATED
        const actorAddress = actor || clientAddress;
        if (actorAddress && typeof actorAddress === 'string') {
            await prisma.activityEvent.create({
                data: {
                    bountyId,
                    eventType: "CREATED",
                    actor: actorAddress.trim().toLowerCase(),
                    details: JSON.stringify({
                        title: title.trim(),
                        category: metadata.category,
                        tokenSymbol: metadata.tokenSymbol,
                    }),
                    txHash: txHash ? String(txHash).trim() : null,
                },
            }).catch((e) => console.warn('Activity event logging failed:', e));
        }

        res.status(201).json(metadata);
    } catch (err) {
        console.error('Failed to save bounty metadata:', err);
        res.status(500).json({ error: 'Failed to save bounty metadata' });
    }
});

// ==========================================
// PROPOSAL ENDPOINTS (WITH EIP-712 VERIFICATION)
// ==========================================

// POST /api/bounties/:bountyId/proposals:
// Accept { freelancerAddress, coverLetter, timelineDays, portfolioUrl, signature, timestamp, chainId, verifyingContract }.
// Validates freelancerAddress and coverLetter.
// If signature is provided:
//   Verify using ethers.verifyTypedData(domain, PROPOSAL_TYPE, value, signature).
//   If verified signer equals freelancerAddress.toLowerCase(), set isVerified = true.
// Record an ActivityEvent of type "PROPOSAL_SUBMITTED".
bountiesRouter.post('/:bountyId/proposals', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const {
        freelancerAddress,
        coverLetter,
        timelineDays,
        portfolioUrl,
        signature,
        timestamp,
        chainId,
        verifyingContract,
    } = req.body;

    if (!freelancerAddress || typeof freelancerAddress !== 'string' || freelancerAddress.trim().length === 0) {
        return res.status(400).json({ error: 'freelancerAddress is required' });
    }

    if (!coverLetter || typeof coverLetter !== 'string' || coverLetter.trim().length === 0) {
        return res.status(400).json({ error: 'coverLetter is required' });
    }

    const normalizedAddress = freelancerAddress.trim().toLowerCase();
    const days = typeof timelineDays === 'number' && timelineDays > 0 ? timelineDays : Number(timelineDays) || 7;

    let isVerified = false;
    let savedSignature: string | null = null;

    if (signature && typeof signature === 'string' && signature.trim().length > 0) {
        savedSignature = signature.trim();
        isVerified = verifyProposalSignature(
            bountyId,
            normalizedAddress,
            coverLetter,
            days,
            savedSignature,
            timestamp,
            chainId,
            verifyingContract
        );
    }

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

        // Ensure User record exists for applicant
        await prisma.user.upsert({
            where: { wallet: normalizedAddress },
            update: {},
            create: { wallet: normalizedAddress },
        }).catch(() => {});

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
                signature: savedSignature,
                isVerified,
            },
            create: {
                bountyId,
                freelancerAddress: normalizedAddress,
                coverLetter: coverLetter.trim(),
                timelineDays: days,
                portfolioUrl: portfolioUrl ? String(portfolioUrl).trim() : null,
                status: 'PENDING',
                signature: savedSignature,
                isVerified,
            },
        });

        // Record ActivityEvent
        await prisma.activityEvent.create({
            data: {
                bountyId,
                eventType: "PROPOSAL_SUBMITTED",
                actor: normalizedAddress,
                details: JSON.stringify({
                    timelineDays: days,
                    isVerified,
                    hasSignature: Boolean(savedSignature),
                }),
            },
        }).catch((e) => console.warn('Activity event logging failed:', e));

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

        // Record ActivityEvent
        await prisma.activityEvent.create({
            data: {
                bountyId,
                eventType: "ASSIGNED",
                actor: target.freelancerAddress,
                details: JSON.stringify({
                    proposalId,
                    freelancer: target.freelancerAddress,
                }),
                txHash: req.body.txHash ? String(req.body.txHash).trim() : null,
            },
        }).catch((e) => console.warn('Activity event logging failed:', e));

        res.json(updated);
    } catch (err) {
        console.error('Failed to accept proposal:', err);
        res.status(500).json({ error: 'Failed to accept proposal' });
    }
});

// ==========================================
// ENCRYPTED DELIVERABLE ENDPOINT
// ==========================================

// PATCH /api/bounties/:bountyId/encrypted-deliverable:
// Allows assigned freelancer to upload encrypted deliverable data { encryptedData, keyEnvelope }.
// Validates that caller is the assigned freelancer.
bountiesRouter.patch('/:bountyId/encrypted-deliverable', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const {
        encryptedData,
        keyEnvelope,
        freelancerAddress,
        callerAddress,
        freelancer,
        author,
        txHash,
    } = req.body;

    const caller = freelancerAddress || callerAddress || freelancer || author;
    if (!caller || typeof caller !== 'string' || caller.trim().length === 0) {
        return res.status(400).json({ error: 'freelancerAddress is required to verify authorization' });
    }

    if (!encryptedData || typeof encryptedData !== 'string' || encryptedData.trim().length === 0) {
        return res.status(400).json({ error: 'encryptedData is required' });
    }

    const normalizedCaller = caller.trim().toLowerCase();

    try {
        // Validate caller against accepted proposal if one exists
        const acceptedProposal = await prisma.proposal.findFirst({
            where: {
                bountyId,
                status: 'ACCEPTED',
            },
        });

        if (acceptedProposal && acceptedProposal.freelancerAddress.toLowerCase() !== normalizedCaller) {
            return res.status(403).json({
                error: 'Only the assigned freelancer can upload encrypted deliverables',
            });
        }

        const metadata = await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: {
                isPrivateDeliverable: true,
                encryptedDeliverableData: encryptedData.trim(),
                encryptedKeyEnvelope: keyEnvelope ? String(keyEnvelope).trim() : null,
            },
            create: {
                bountyId,
                title: `Bounty #${bountyId}`,
                category: 'General',
                isPrivateDeliverable: true,
                encryptedDeliverableData: encryptedData.trim(),
                encryptedKeyEnvelope: keyEnvelope ? String(keyEnvelope).trim() : null,
            },
        });

        // Record ActivityEvent
        await prisma.activityEvent.create({
            data: {
                bountyId,
                eventType: "WORK_SUBMITTED",
                actor: normalizedCaller,
                details: JSON.stringify({
                    isPrivateDeliverable: true,
                    hasKeyEnvelope: Boolean(keyEnvelope),
                }),
                txHash: txHash ? String(txHash).trim() : null,
            },
        }).catch((e) => console.warn('Activity event logging failed:', e));

        res.json(metadata);
    } catch (err) {
        console.error('Failed to save encrypted deliverable:', err);
        res.status(500).json({ error: 'Failed to save encrypted deliverable' });
    }
});

// ==========================================
// DISPUTE ENDPOINT
// ==========================================

// PATCH /api/bounties/:bountyId/dispute:
// Accept { disputeReason } and update BountyMetadata.disputeReason for bountyId.
bountiesRouter.patch('/:bountyId/dispute', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { disputeReason, actor, clientAddress, freelancerAddress, txHash } = req.body;
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

        // Record ActivityEvent
        const disputingParty = actor || clientAddress || freelancerAddress || 'party';
        await prisma.activityEvent.create({
            data: {
                bountyId,
                eventType: "DISPUTED",
                actor: String(disputingParty).trim().toLowerCase(),
                details: JSON.stringify({
                    disputeReason: disputeReason.trim(),
                }),
                txHash: txHash ? String(txHash).trim() : null,
            },
        }).catch((e) => console.warn('Activity event logging failed:', e));

        res.json(metadata);
    } catch (err) {
        console.error('Failed to update dispute reason:', err);
        res.status(500).json({ error: 'Failed to update dispute reason' });
    }
});

// ==========================================
// BOUNTY ACTIVITY FEED ENDPOINTS
// ==========================================

// GET /api/bounties/:bountyId/activity:
// Returns ActivityEvent records for a specific bounty.
bountiesRouter.get('/:bountyId/activity', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    try {
        const events = await prisma.activityEvent.findMany({
            where: { bountyId },
            take: 50,
            orderBy: { createdAt: 'desc' },
        });
        res.json(events);
    } catch (err) {
        console.error('Failed to get bounty activity:', err);
        res.status(500).json({ error: 'Failed to retrieve bounty activity' });
    }
});

// POST /api/bounties/:bountyId/activity:
// Allows client to record an activity event (e.g. from on-chain transactions like MILESTONE_APPROVED, COMPLETED).
bountiesRouter.post('/:bountyId/activity', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { eventType, actor, details, txHash } = req.body;
    if (!eventType || typeof eventType !== 'string') {
        return res.status(400).json({ error: 'eventType is required' });
    }
    if (!actor || typeof actor !== 'string') {
        return res.status(400).json({ error: 'actor wallet address is required' });
    }

    try {
        const event = await prisma.activityEvent.create({
            data: {
                bountyId,
                eventType: eventType.trim(),
                actor: actor.trim().toLowerCase(),
                details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
                txHash: txHash ? String(txHash).trim() : null,
            },
        });
        res.status(201).json(event);
    } catch (err) {
        console.error('Failed to record activity event:', err);
        res.status(500).json({ error: 'Failed to record activity event' });
    }
});

// ==========================================
// REVISION FEEDBACK / COMMENTS ENDPOINTS
// ==========================================

// GET /api/bounties/:bountyId/comments:
// Returns all feedback/revision messages for the bounty ordered by createdAt asc.
bountiesRouter.get('/:bountyId/comments', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    try {
        const comments = await prisma.bountyComment.findMany({
            where: { bountyId },
            include: {
                user: {
                    select: {
                        wallet: true,
                        username: true,
                        avatarUrl: true,
                        completedAsWorker: true,
                        completedAsClient: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(comments);
    } catch (err) {
        console.error('Failed to get bounty comments:', err);
        res.status(500).json({ error: 'Failed to retrieve bounty comments' });
    }
});

// POST /api/bounties/:bountyId/comments:
// Adds a comment { author, content, type }.
// Validates that author is either the client, assigned freelancer, or arbiter.
bountiesRouter.post('/:bountyId/comments', async (req: Request, res: Response) => {
    const bountyId = Number(req.params.bountyId);
    if (Number.isNaN(bountyId)) {
        return res.status(400).json({ error: 'Valid bountyId is required' });
    }

    const { author, content, type, clientAddress, freelancerAddress, arbiterAddress } = req.body;

    if (!author || typeof author !== 'string' || author.trim().length === 0) {
        return res.status(400).json({ error: 'author wallet address is required' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'content is required' });
    }

    const normalizedAuthor = author.trim().toLowerCase();

    // Validate type
    const validTypes = ['MESSAGE', 'REVISION_REQUEST', 'APPROVAL_NOTE'];
    const commentType = type && validTypes.includes(type) ? type : 'MESSAGE';

    // Validate author is either client, assigned freelancer, or arbiter if addresses provided
    if (clientAddress || freelancerAddress || arbiterAddress) {
        const allowedParticipants = [
            clientAddress ? String(clientAddress).trim().toLowerCase() : null,
            freelancerAddress ? String(freelancerAddress).trim().toLowerCase() : null,
            arbiterAddress ? String(arbiterAddress).trim().toLowerCase() : null,
        ].filter(Boolean);

        if (!allowedParticipants.includes(normalizedAuthor)) {
            return res.status(403).json({
                error: 'Only the client, assigned freelancer, or arbiter can post comments on this bounty',
            });
        }
    }

    try {
        // Ensure parent BountyMetadata exists so foreign keys never fail
        await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: {},
            create: {
                bountyId,
                title: `Bounty #${bountyId}`,
                category: 'General',
            },
        });

        // Ensure User record exists for author so relation to User.wallet succeeds
        await prisma.user.upsert({
            where: { wallet: normalizedAuthor },
            update: {},
            create: { wallet: normalizedAuthor },
        });

        const newComment = await prisma.bountyComment.create({
            data: {
                bountyId,
                author: normalizedAuthor,
                content: content.trim(),
                type: commentType,
            },
            include: {
                user: {
                    select: {
                        wallet: true,
                        username: true,
                        avatarUrl: true,
                        completedAsWorker: true,
                        completedAsClient: true,
                    },
                },
            },
        });

        res.status(201).json(newComment);
    } catch (err) {
        console.error('Failed to post comment:', err);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});