import { useEffect, useState } from 'react';
import { BrowserProvider, JsonRpcProvider, Contract, formatEther } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS, getNetworkConfig } from '../contracts/config';
import { API_BASE_URL } from '../config';

export type Bounty = {
    id: number;
    client: string;
    freelancer: string;
    amount: string;
    remainingBalance: string;
    status: number;
    completed: boolean;
    title: string;
    arbiter: string;
};

export function useBounties(refreshKey: number) {
    const [bounties, setBounties] = useState<Bounty[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBounties() {
            setIsLoading(true);

            try {
                let provider: BrowserProvider | JsonRpcProvider;
                if (window.ethereum) {
                    provider = new BrowserProvider(window.ethereum);
                } else {
                    provider = new JsonRpcProvider(getNetworkConfig().rpcUrl);
                }

                const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, provider);

                let arbiterAddress = '';
                try {
                    arbiterAddress = await contract.arbiter();
                } catch {
                    // Fallback if arbiter call fails on older deployment
                }

                const count = await contract.bountyCount();

                // Fetch all off-chain titles in one request
                let metadataMap = new Map<number, string>();
                try {
                    const res = await fetch(`${API_BASE_URL}/bounties/metadata`);
                    if (res.ok) {
                        const metadataList = await res.json();
                        metadataMap = new Map(metadataList.map((m: any) => [m.bountyId, m.title]));
                    }
                } catch (err) {
                    console.error('Failed to fetch bounty metadata', err);
                }

                const results: Bounty[] = [];
                for (let id = 1; id <= Number(count); id++) {
                    const b = await contract.bounties(id);
                    const statusNum = Number(b.status ?? (b.completed ? 3 : 0));
                    results.push({
                        id,
                        client: b.client,
                        freelancer: b.freelancer,
                        amount: formatEther(b.amount),
                        remainingBalance: b.remainingBalance !== undefined ? formatEther(b.remainingBalance) : formatEther(b.amount),
                        status: statusNum,
                        completed: statusNum === 3 || Boolean(b.completed),
                        title: metadataMap.get(id) || 'Untitled bounty',
                        arbiter: arbiterAddress,
                    });
                }

                setBounties(results.reverse());
            } catch (err) {
                console.error('Failed to fetch bounties:', err);
                setBounties([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBounties();
    }, [refreshKey]);

    return { bounties, isLoading };
}