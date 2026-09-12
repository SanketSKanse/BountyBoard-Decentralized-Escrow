import { useState } from 'react';
import { Contract, isAddress, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';
import { useMilestones } from '../hooks/useMilestones';
import type { Bounty } from '../hooks/useBounties';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type Props = {
    bounty: Bounty;
    connectedAddress: string | null;
    signer: JsonRpcSigner | null;
    onUpdated: () => void;
};

export function BountyCard({ bounty, connectedAddress, signer, onUpdated }: Props) {
    const [freelancerInput, setFreelancerInput] = useState('');
    const [milestoneDescription, setMilestoneDescription] = useState('');
    const [milestoneAmount, setMilestoneAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [milestoneRefreshKey, setMilestoneRefreshKey] = useState(0);

    const { milestones, isLoading: milestonesLoading } = useMilestones(bounty.id, milestoneRefreshKey);

    const normalizedConnected = connectedAddress?.toLowerCase();
    const isClient = normalizedConnected === bounty.client.toLowerCase();
    const isFreelancer =
        bounty.freelancer !== ZERO_ADDRESS && normalizedConnected === bounty.freelancer.toLowerCase();
    const hasFreelancer = bounty.freelancer !== ZERO_ADDRESS;
    const hasMilestones = milestones.length > 0;

    const allocatedAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const remainingAmount = Number(bounty.amount) - allocatedAmount;

    async function handleAssign() {
        if (!signer) return;
        setStatusMessage(null);

        if (!isAddress(freelancerInput)) {
            setStatusMessage('Enter a valid Ethereum address.');
            return;
        }

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.assignFreelancer(bounty.id, freelancerInput);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage('Freelancer assigned successfully.');
            setFreelancerInput('');
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRelease() {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.releasePayment(bounty.id);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage('Payment released to freelancer.');
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddMilestone() {
        if (!signer) return;
        setStatusMessage(null);

        const amountNum = Number(milestoneAmount);
        if (!milestoneDescription.trim()) {
            setStatusMessage('Enter a milestone description.');
            return;
        }
        if (!amountNum || amountNum <= 0) {
            setStatusMessage('Enter a milestone amount greater than 0.');
            return;
        }
        if (amountNum > remainingAmount) {
            setStatusMessage(`Amount exceeds remaining unallocated funds (${remainingAmount.toFixed(4)} ETH left).`);
            return;
        }

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.createMilestone(bounty.id, milestoneDescription, parseEther(milestoneAmount));
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage('Milestone added.');
            setMilestoneDescription('');
            setMilestoneAmount('');
            setMilestoneRefreshKey((k) => k + 1);
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleApproveMilestone(index: number) {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.approveMilestone(bounty.id, index);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage('Milestone approved and paid.');
            setMilestoneRefreshKey((k) => k + 1);
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const statusColor = bounty.completed ? 'border-l-mint' : hasFreelancer ? 'border-l-violet' : 'border-l-gold';

    return (
        <div className={`glass rounded-2xl border-l-4 ${statusColor} p-5`}>
            <div className="flex items-center justify-between">
                <p className="text-sm text-[#9B96AE]">Bounty #{bounty.id}</p>
                <StatusBadge completed={bounty.completed} hasFreelancer={hasFreelancer} />
            </div>

            <p className="font-display mt-1 text-2xl text-gold">{bounty.amount} ETH</p>

            <div className="mt-3 space-y-1 text-sm text-[#9B96AE]">
                <p>
                    Client: <span className="font-mono text-[#F1EEE6]">{bounty.client}</span>
                </p>
                <p>
                    Freelancer:{' '}
                    <span className="font-mono text-[#F1EEE6]">
                        {hasFreelancer ? bounty.freelancer : 'Not assigned'}
                    </span>
                </p>
            </div>

            {isFreelancer && (
                <p className="mt-3 inline-block rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
                    You are the assigned freelancer
                </p>
            )}

            {isClient && !hasFreelancer && !bounty.completed && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <label className="text-sm text-[#9B96AE]">Freelancer address</label>
                    <input
                        value={freelancerInput}
                        onChange={(e) => setFreelancerInput(e.target.value)}
                        placeholder="0x..."
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                    />
                    <button
                        onClick={handleAssign}
                        disabled={isSubmitting}
                        className="mt-2 rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Assigning...' : 'Assign Freelancer'}
                    </button>
                </div>
            )}

            {isClient && hasFreelancer && !bounty.completed && !hasMilestones && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <button
                        onClick={handleRelease}
                        disabled={isSubmitting}
                        className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Releasing...' : 'Release Full Payment'}
                    </button>
                </div>
            )}

            {hasFreelancer && !bounty.completed && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#F1EEE6]">Milestones</h3>
                        {milestones.length > 0 && (
                            <p className="text-xs text-[#9B96AE]">
                                {allocatedAmount.toFixed(4)} / {bounty.amount} ETH allocated
                            </p>
                        )}
                    </div>

                    {milestonesLoading ? (
                        <p className="mt-2 text-sm text-[#9B96AE]">Loading milestones...</p>
                    ) : milestones.length === 0 ? (
                        <p className="mt-2 text-sm text-[#9B96AE]">No milestones yet.</p>
                    ) : (
                        <div className="mt-2 space-y-2">
                            {milestones.map((m) => (
                                <div
                                    key={m.index}
                                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                                >
                                    <div>
                                        <p className="text-sm text-[#F1EEE6]">{m.description}</p>
                                        <p className="font-mono text-xs text-[#9B96AE]">{m.amount} ETH</p>
                                    </div>
                                    {m.completed ? (
                                        <span className="text-xs font-medium text-mint">Paid</span>
                                    ) : isClient ? (
                                        <button
                                            onClick={() => handleApproveMilestone(m.index)}
                                            disabled={isSubmitting}
                                            className="rounded-lg bg-mint px-3 py-1 text-xs font-semibold text-vault-bg hover:brightness-110 disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                    ) : (
                                        <span className="text-xs font-medium text-gold">Pending approval</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {isClient && remainingAmount > 0 && (
                        <div className="mt-3 space-y-2">
                            <input
                                value={milestoneDescription}
                                onChange={(e) => setMilestoneDescription(e.target.value)}
                                placeholder="Milestone description"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                            />
                            <input
                                value={milestoneAmount}
                                onChange={(e) => setMilestoneAmount(e.target.value)}
                                placeholder={`Amount (up to ${remainingAmount.toFixed(4)} ETH)`}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                            />
                            <button
                                onClick={handleAddMilestone}
                                disabled={isSubmitting}
                                className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-vault-bg hover:brightness-110 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Milestone'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {statusMessage && <p className="mt-3 text-sm text-[#9B96AE]">{statusMessage}</p>}
        </div>
    );
}

function StatusBadge({ completed, hasFreelancer }: { completed: boolean; hasFreelancer: boolean }) {
    if (completed) {
        return <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-medium text-mint">Completed</span>;
    }
    if (hasFreelancer) {
        return <span className="rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">In Progress</span>;
    }
    return <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-medium text-gold">Open</span>;
}

function extractRevertReason(err: unknown): string {
    if (err && typeof err === 'object' && 'reason' in err && typeof err.reason === 'string') {
        return err.reason;
    }
    return 'Transaction failed or was rejected.';
}