import { useEffect, useState } from 'react';
import { BrowserProvider, JsonRpcProvider, Contract, formatUnits } from 'ethers';
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
    description?: string;
    category: string;
    skills: string[];
    tokenSymbol: string;
    tokenAddress?: string | null;
    disputeReason?: string;
    deliverableUri: string;
    submittedAt: number;
    deadline: number;
    proposalCount: number;
    commentCount?: number;
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

                // Fetch all off-chain metadata (titles, descriptions, categories, skills, proposals)
                let metadataMap = new Map<number, any>();
                try {
                    const res = await fetch(`${API_BASE_URL}/bounties/metadata`);
                    if (res.ok) {
                        const metadataList = await res.json();
                        metadataMap = new Map(metadataList.map((m: any) => [m.bountyId, m]));
                    }
                } catch (err) {
                    console.error('Failed to fetch bounty metadata', err);
                }

                const totalCount = Number(count);
                const bountyPromises: Promise<Bounty>[] = [];

                for (let id = 1; id <= totalCount; id++) {
                    bountyPromises.push(
                        (async () => {
                            const [b, deliverableUri, submittedAtRaw, deadlineRaw, onChainToken] = await Promise.all([
                                contract.bounties(id),
                                contract.bountyDeliverables(id).catch(() => ''),
                                contract.bountySubmittedAt(id).catch(() => 0n),
                                contract.bountyDeadlines(id).catch(() => 0n),
                                contract.bountyTokens(id).catch(() => '0x0000000000000000000000000000000000000000'),
                            ]);

                            const statusNum = Number(b.status ?? (b.completed ? 3 : 0));
                            const meta = metadataMap.get(id);
                            const skillsArray = meta?.skills
                                ? String(meta.skills)
                                      .split(',')
                                      .map((s: string) => s.trim())
                                      .filter(Boolean)
                                : [];

                            const isToken = Boolean(
                                onChainToken &&
                                onChainToken !== '0x0000000000000000000000000000000000000000'
                            );
                            const tokenSymbol = meta?.tokenSymbol || (isToken ? 'USDC' : 'ETH');
                            const tokenAddress = isToken ? onChainToken : (meta?.tokenAddress || null);
                            const decimals = tokenSymbol === 'USDC' ? 6 : 18;

                            const amountFormatted = formatUnits(b.amount, decimals);
                            const remainingFormatted =
                                b.remainingBalance !== undefined
                                    ? formatUnits(b.remainingBalance, decimals)
                                    : amountFormatted;

                            return {
                                id,
                                client: b.client,
                                freelancer: b.freelancer,
                                amount: amountFormatted,
                                remainingBalance: remainingFormatted,
                                status: statusNum,
                                completed: statusNum === 3 || Boolean(b.completed),
                                title: meta?.title || `Bounty #${id}`,
                                description: meta?.description || '',
                                category: meta?.category || 'General',
                                skills: skillsArray,
                                tokenSymbol,
                                tokenAddress,
                                disputeReason: meta?.disputeReason || undefined,
                                deliverableUri: deliverableUri || '',
                                submittedAt: Number(submittedAtRaw || 0n),
                                deadline: Number(deadlineRaw || 0n),
                                proposalCount: meta?.proposals?.length ?? meta?._count?.proposals ?? 0,
                                commentCount: meta?.comments?.length ?? meta?._count?.comments ?? 0,
                                arbiter: arbiterAddress,
                            };
                        })()
                    );
                }

                const results = await Promise.all(bountyPromises);
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