import { Router, type Request, type Response } from 'express';
import { prisma } from '../db.js';

export const usersRouter = Router();

export interface UserBadge {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export function computeUserBadges(user: {
    completedAsWorker: number;
    completedAsClient: number;
    totalEarnedEth: number;
    totalEarnedUsd: number;
}): UserBadge[] {
    const badges: UserBadge[] = [];

    if (user.completedAsWorker >= 1) {
        badges.push({
            id: 'first_bounty_worker',
            title: 'Verified Earner',
            description: 'Successfully completed at least 1 bounty',
            icon: '🎯',
        });
    }

    if (user.completedAsWorker >= 5) {
        badges.push({
            id: 'expert_freelancer',
            title: 'Master Craftsman',
            description: 'Completed 5 or more bounties with excellence',
            icon: '⚡',
        });
    }

    if (user.completedAsClient >= 1) {
        badges.push({
            id: 'patron_client',
            title: 'Bounty Patron',
            description: 'Created and funded at least 1 completed bounty',
            icon: '💎',
        });
    }

    if (user.completedAsClient >= 5) {
        badges.push({
            id: 'vip_client',
            title: 'Visionary Backer',
            description: 'Funded and finalized 5 or more bounties',
            icon: '👑',
        });
    }

    if (user.totalEarnedEth >= 1 || user.totalEarnedUsd >= 1000) {
        badges.push({
            id: 'top_earner',
            title: 'High Roller',
            description: 'Earned over 1 ETH or 1,000 USDC in payouts',
            icon: '🏆',
        });
    }

    return badges;
}

// GET /api/users/:wallet
// Returns user profile, stats, completed count, and earned volume.
// Auto-creates a default user record if the wallet is visiting for the first time.
usersRouter.get('/:wallet', async (req: Request, res: Response) => {
    const rawWallet = req.params.wallet;
    const walletParam = Array.isArray(rawWallet) ? rawWallet[0] : rawWallet;

    if (!walletParam || typeof walletParam !== 'string' || walletParam.trim().length === 0) {
        return res.status(400).json({ error: 'Valid wallet address is required' });
    }

    const normalizedWallet = walletParam.trim().toLowerCase();

    try {
        const user = await prisma.user.upsert({
            where: { wallet: normalizedWallet },
            update: {},
            create: {
                wallet: normalizedWallet,
            },
        });

        const badges = computeUserBadges(user);

        res.json({
            ...user,
            badges,
        });
    } catch (err) {
        console.error('Failed to get user profile:', err);
        res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
});

// PATCH /api/users/:wallet
// Updates username, bio, avatarUrl, skills, and githubHandle.
usersRouter.patch('/:wallet', async (req: Request, res: Response) => {
    const rawWallet = req.params.wallet;
    const walletParam = Array.isArray(rawWallet) ? rawWallet[0] : rawWallet;

    if (!walletParam || typeof walletParam !== 'string' || walletParam.trim().length === 0) {
        return res.status(400).json({ error: 'Valid wallet address is required' });
    }

    const normalizedWallet = walletParam.trim().toLowerCase();
    const { username, bio, avatarUrl, skills, githubHandle } = req.body;

    const dataToUpdate: Record<string, any> = {};

    if (username !== undefined) {
        dataToUpdate.username = typeof username === 'string' ? username.trim() : null;
    }
    if (bio !== undefined) {
        dataToUpdate.bio = typeof bio === 'string' ? bio.trim() : null;
    }
    if (avatarUrl !== undefined) {
        dataToUpdate.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : null;
    }
    if (skills !== undefined) {
        dataToUpdate.skills = typeof skills === 'string' ? skills.trim() : null;
    }
    if (githubHandle !== undefined) {
        dataToUpdate.githubHandle = typeof githubHandle === 'string' ? githubHandle.trim() : null;
    }

    try {
        const user = await prisma.user.upsert({
            where: { wallet: normalizedWallet },
            update: dataToUpdate,
            create: {
                wallet: normalizedWallet,
                ...dataToUpdate,
            },
        });

        const badges = computeUserBadges(user);

        res.json({
            ...user,
            badges,
        });
    } catch (err) {
        console.error('Failed to update user profile:', err);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});
