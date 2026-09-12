import { Router } from 'express';
import { prisma } from '../db.js';

export const bountiesRouter = Router();

// Called right after the frontend confirms a createBounty transaction,
// to attach the title/description the contract itself never stored.
bountiesRouter.post('/:bountyId/metadata', async (req, res) => {
    const bountyId = Number(req.params.bountyId);
    const { title, description } = req.body;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title is required' });
    }

    try {
        const metadata = await prisma.bountyMetadata.upsert({
            where: { bountyId },
            update: { title, description },
            create: { bountyId, title, description },
        });
        res.status(201).json(metadata);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save bounty metadata' });
    }
});

// Called by the frontend to merge titles into the on-chain bounty list.
bountiesRouter.get('/metadata', async (_req, res) => {
    const all = await prisma.bountyMetadata.findMany();
    res.json(all);
});