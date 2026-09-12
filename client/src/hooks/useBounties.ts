import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';

export type Bounty = {
    id: number;
    client: string;
    freelancer: string;
    amount: string; // formatted ETH, for display
    completed: boolean;
};

export function useBounties(refreshKey: number) {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBounties() {
            if (!window.ethereum) return;

            setIsLoading(true);

            // No signer needed here — we're only reading, not sending a transaction
            const provider = new BrowserProvider(window.ethereum);
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, provider);

            const count = await contract.bountyCount();
            const results: Bounty[] = [];

            // Bounty IDs start at 1 in your contract (bountyCount++ happens before storing)
            for (let id = 1; id <= Number(count); id++) {
                const b = await contract.bounties(id);
                results.push({
                    id,
                    client: b.client,
                    freelancer: b.freelancer,
                    amount: formatEther(b.amount),
                    completed: b.completed,
                });
            }

            setBounties(results.reverse()); // newest first
            setIsLoading(false);
        }

        fetchBounties();
    }, [refreshKey]);

    return { bounties, isLoading };
}