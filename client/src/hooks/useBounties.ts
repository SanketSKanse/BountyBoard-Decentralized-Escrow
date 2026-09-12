import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';
import { API_BASE_URL } from '../config';

export type Bounty = {
    id: number;
    client: string;
    freelancer: string;
    amount: string;
    completed: boolean;
    title: string;
};

export function useBounties(refreshKey: number) {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBounties() {
            if (!window.ethereum) return;
            setIsLoading(true);

            const provider = new BrowserProvider(window.ethereum);
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, provider);

            const count = await contract.bountyCount();

            // Fetch all off-chain titles in one request, rather than one per bounty
            let metadataMap = new Map<number, string>();
            try {
                const res = await fetch(`${API_BASE_URL}/bounties/metadata`);
                const metadataList = await res.json();
                metadataMap = new Map(metadataList.map((m: any) => [m.bountyId, m.title]));
            } catch (err) {
                console.error('Failed to fetch bounty metadata', err);
            }

            const results: Bounty[] = [];
            for (let id = 1; id <= Number(count); id++) {
                const b = await contract.bounties(id);
                results.push({
                    id,
                    client: b.client,
                    freelancer: b.freelancer,
                    amount: formatEther(b.amount),
                    completed: b.completed,
                    title: metadataMap.get(id) || 'Untitled bounty',
                });
            }

            setBounties(results.reverse());
            setIsLoading(false);
        }

        fetchBounties();
    }, [refreshKey]);

    return { bounties, isLoading };
}