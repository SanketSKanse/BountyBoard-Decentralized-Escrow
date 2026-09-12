import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';

export type Milestone = {
    index: number;
    description: string;
    amount: string; // formatted ETH, for display
    completed: boolean;
};

export function useMilestones(bountyId: number, refreshKey: number) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMilestones() {
            if (!window.ethereum) return;
            setIsLoading(true);

            const provider = new BrowserProvider(window.ethereum);
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, provider);

            const count = await contract.getMilestoneCount(bountyId);
            const results: Milestone[] = [];

            for (let i = 0; i < Number(count); i++) {
                const m = await contract.milestones(bountyId, i);
                results.push({
                    index: i,
                    description: m.description,
                    amount: formatEther(m.amount),
                    completed: m.completed,
                });
            }

            setMilestones(results);
            setIsLoading(false);
        }

        fetchMilestones();
    }, [bountyId, refreshKey]);

    return { milestones, isLoading };
}