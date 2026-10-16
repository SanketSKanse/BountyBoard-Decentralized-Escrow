import { useState } from 'react';
import { Contract, isAddress, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS, getExplorerAddressUrl, getExplorerTxUrl } from '../contracts/config';
import { useMilestones } from '../hooks/useMilestones';
import type { Bounty } from '../hooks/useBounties';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type Props = {
    bounty: Bounty;
    connectedAddress: string | null;
    signer: JsonRpcSigner | null;
    chainId?: bigint | null;
    onUpdated: () => void;
};

export function BountyCard({ bounty, connectedAddress, signer, chainId, onUpdated }: Props) {
    const [freelancerInput, setFreelancerInput] = useState('');
    const [milestoneDescription, setMilestoneDescription] = useState('');
    const [milestoneAmount, setMilestoneAmount] = useState('');
    const [clientRefundInput, setClientRefundInput] = useState('');
    const [freelancerPayoutInput, setFreelancerPayoutInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode | null>(null);
    const [milestoneRefreshKey, setMilestoneRefreshKey] = useState(0);

    const { milestones, isLoading: milestonesLoading } = useMilestones(bounty.id, milestoneRefreshKey);

    const normalizedConnected = connectedAddress?.toLowerCase();
    const isClient = Boolean(normalizedConnected && normalizedConnected === bounty.client.toLowerCase());
    const isFreelancer = Boolean(
        bounty.freelancer !== ZERO_ADDRESS &&
        normalizedConnected &&
        normalizedConnected === bounty.freelancer.toLowerCase()
    );
    const isArbiter = Boolean(
        bounty.arbiter &&
        normalizedConnected &&
        normalizedConnected === bounty.arbiter.toLowerCase()
    );

    const hasFreelancer = bounty.freelancer !== ZERO_ADDRESS;
    const hasMilestones = milestones.length > 0;
    const allMilestonesCompleted = hasMilestones && milestones.every((m) => m.completed);

    const allocatedAmount = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const remainingAmount = Number(bounty.remainingBalance || bounty.amount);

    // Bounty statuses: 0=Open, 1=Assigned, 2=Disputed, 3=Completed, 4=Cancelled
    const isOpen = bounty.status === 0;
    const isAssigned = bounty.status === 1;
    const isDisputed = bounty.status === 2;
    const isCompleted = bounty.status === 3;
    const isCancelled = bounty.status === 4;

    const statusBorderColor = isOpen
        ? 'border-l-blue-500'
        : isAssigned
        ? 'border-l-yellow-500'
        : isDisputed
        ? 'border-l-red-500'
        : isCompleted
        ? 'border-l-green-500'
        : 'border-l-gray-500';

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
            setStatusMessage(
                <span>
                    Freelancer assigned.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            setFreelancerInput('');
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCancelAndRefund() {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.cancelBounty(bounty.id);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage(
                <span>
                    Bounty cancelled & 100% refunded to client.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRaiseDispute() {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.raiseDispute(bounty.id);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage(
                <span>
                    Dispute raised! Escrow frozen awaiting arbiter settlement.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleExecuteSettlement() {
        if (!signer) return;
        setStatusMessage(null);

        const clientRefundNum = Number(clientRefundInput);
        const freelancerPayoutNum = Number(freelancerPayoutInput);

        if (isNaN(clientRefundNum) || clientRefundNum < 0) {
            setStatusMessage('Enter a valid non-negative Client Refund amount.');
            return;
        }
        if (isNaN(freelancerPayoutNum) || freelancerPayoutNum < 0) {
            setStatusMessage('Enter a valid non-negative Freelancer Payout amount.');
            return;
        }

        const sum = clientRefundNum + freelancerPayoutNum;
        const remaining = Number(bounty.remainingBalance);

        if (Math.abs(sum - remaining) > 0.00001) {
            setStatusMessage(
                `Refund + Payout (${sum.toFixed(4)} ETH) must exactly equal Remaining Balance (${remaining.toFixed(4)} ETH).`
            );
            return;
        }

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.resolveDispute(
                bounty.id,
                parseEther(clientRefundInput),
                parseEther(freelancerPayoutInput)
            );
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage(
                <span>
                    Dispute settled successfully! Funds transferred.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            setClientRefundInput('');
            setFreelancerPayoutInput('');
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
            setStatusMessage(
                <span>
                    Payment released to freelancer.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRefundRemainder() {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.refundRemainder(bounty.id);
            setStatusMessage('Transaction sent, waiting to be mined...');
            await tx.wait();
            setStatusMessage(
                <span>
                    Remainder refunded to client.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
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
        const unallocated = Number(bounty.amount) - allocatedAmount;
        if (amountNum > unallocated) {
            setStatusMessage(`Amount exceeds remaining unallocated funds (${unallocated.toFixed(4)} ETH left).`);
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
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className={`glass rounded-2xl border-l-4 ${statusBorderColor} p-5`}>
            {/* Header: Title and Status Badge */}
            <div className="flex items-start justify-between">
                <div>
                    <span className="font-mono text-xs text-[#9B96AE]">Bounty #{bounty.id}</span>
                    <h2 className="mt-1 text-lg font-semibold text-[#F1EEE6]">{bounty.title}</h2>
                </div>
                <StatusBadge status={bounty.status} />
            </div>

            {/* Reward & Remaining Balance */}
            <div className="mt-3 flex items-baseline justify-between">
                <p className="font-display text-2xl text-gold">{bounty.amount} ETH</p>
                {bounty.remainingBalance && (
                    <p className="text-xs text-[#9B96AE]">
                        Remaining Escrow: <span className="font-mono text-[#F1EEE6]">{bounty.remainingBalance} ETH</span>
                    </p>
                )}
            </div>

            {/* Address Details with Clickable Block Explorer Links */}
            <div className="mt-3 space-y-1 text-sm text-[#9B96AE]">
                <p>
                    Client:{' '}
                    <a
                        href={getExplorerAddressUrl(bounty.client, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[#F1EEE6] hover:text-violet transition underline decoration-white/20"
                    >
                        {bounty.client}
                    </a>
                </p>
                <p>
                    Freelancer:{' '}
                    {hasFreelancer ? (
                        <a
                            href={getExplorerAddressUrl(bounty.freelancer, chainId)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[#F1EEE6] hover:text-violet transition underline decoration-white/20"
                        >
                            {bounty.freelancer}
                        </a>
                    ) : (
                        <span className="font-mono text-[#9B96AE]">Not assigned</span>
                    )}
                </p>
                {bounty.arbiter && (
                    <p className="text-xs">
                        Arbiter:{' '}
                        <a
                            href={getExplorerAddressUrl(bounty.arbiter, chainId)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[#9B96AE] hover:text-violet transition underline decoration-white/20"
                        >
                            {bounty.arbiter}
                        </a>
                    </p>
                )}
            </div>

            {isFreelancer && (
                <p className="mt-3 inline-block rounded-full bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
                    You are the assigned freelancer
                </p>
            )}

            {/* Disputed Alert Banner */}
            {isDisputed && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    ⚠️ <strong>Dispute Active:</strong> Escrow is currently frozen. Awaiting arbiter resolution.
                </div>
            )}

            {/* Cancelled Alert Banner */}
            {isCancelled && (
                <div className="mt-4 rounded-xl border border-gray-500/30 bg-gray-500/10 p-3 text-xs text-gray-400">
                    ✕ <strong>Cancelled:</strong> This bounty has been cancelled and 100% of deposited ETH was refunded.
                </div>
            )}

            {/* ACTION: Client Assign & Cancel when Open */}
            {isClient && isOpen && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <label className="text-sm text-[#9B96AE]">Assign Freelancer address</label>
                    <input
                        value={freelancerInput}
                        onChange={(e) => setFreelancerInput(e.target.value)}
                        placeholder="0x..."
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleAssign}
                            disabled={isSubmitting}
                            className="rounded-lg bg-violet px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Assigning...' : 'Assign Freelancer'}
                        </button>
                        <button
                            onClick={handleCancelAndRefund}
                            disabled={isSubmitting}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                            Cancel & Refund (100%)
                        </button>
                    </div>
                </div>
            )}

            {/* ACTION: Non-Client Cancel & Refund button if open and client doesn't use assign */}
            {!isClient && isOpen && (
                <p className="mt-3 text-xs text-[#9B96AE]">Bounty is open for freelancer assignment.</p>
            )}

            {/* ACTION: Assigned Bounty Triggers (Raise Dispute, Release Payment, Refund Remainder) */}
            {isAssigned && (
                <div className="mt-4 border-t border-white/10 pt-4 flex flex-wrap items-center gap-2">
                    {isClient && !hasMilestones && (
                        <button
                            onClick={handleRelease}
                            disabled={isSubmitting}
                            className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Releasing...' : 'Release Full Payment'}
                        </button>
                    )}

                    {isClient && allMilestonesCompleted && remainingAmount > 0 && (
                        <button
                            onClick={handleRefundRemainder}
                            disabled={isSubmitting}
                            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                        >
                            Refund Unallocated Remainder ({remainingAmount.toFixed(4)} ETH)
                        </button>
                    )}

                    {(isClient || isFreelancer) && (
                        <button
                            onClick={handleRaiseDispute}
                            disabled={isSubmitting}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                            Raise Dispute
                        </button>
                    )}
                </div>
            )}

            {/* ARBITER RESOLUTION PANEL: Visible when connectedAddress == bounty.arbiter AND status == Disputed */}
            {isArbiter && isDisputed && (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-red-300">⚖️ Arbiter Settlement Panel</h3>
                        <span className="font-mono text-xs text-[#9B96AE]">
                            Escrow Balance: {bounty.remainingBalance} ETH
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9B96AE]">
                        Split the remaining {bounty.remainingBalance} ETH between the client and freelancer.
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[#9B96AE]">Client Refund (ETH)</label>
                            <input
                                value={clientRefundInput}
                                onChange={(e) => setClientRefundInput(e.target.value)}
                                placeholder="e.g. 0.2"
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] focus:border-red-400/60 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-[#9B96AE]">Freelancer Payout (ETH)</label>
                            <input
                                value={freelancerPayoutInput}
                                onChange={(e) => setFreelancerPayoutInput(e.target.value)}
                                placeholder="e.g. 0.8"
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] focus:border-red-400/60 focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleExecuteSettlement}
                        disabled={isSubmitting}
                        className="mt-4 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Executing Settlement...' : 'Execute Settlement'}
                    </button>
                </div>
            )}

            {/* Milestones Section */}
            {hasFreelancer && !isCancelled && !isDisputed && (
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
                                    ) : isClient && isAssigned ? (
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

                    {isClient && isAssigned && (Number(bounty.amount) - allocatedAmount) > 0 && (
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
                                placeholder={`Amount (up to ${(Number(bounty.amount) - allocatedAmount).toFixed(4)} ETH)`}
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

            {statusMessage && <div className="mt-3 text-sm text-[#9B96AE]">{statusMessage}</div>}
        </div>
    );
}

/**
 * Dynamic Status Badges:
 * - Open (Blue)
 * - Assigned (Yellow)
 * - Disputed (Red)
 * - Completed (Green)
 * - Cancelled (Gray)
 */
function StatusBadge({ status }: { status: number }) {
    switch (status) {
        case 0:
            return (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    Open
                </span>
            );
        case 1:
            return (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                    Assigned
                </span>
            );
        case 2:
            return (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                    Disputed
                </span>
            );
        case 3:
            return (
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                    Completed
                </span>
            );
        case 4:
            return (
                <span className="rounded-full border border-gray-500/30 bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-400">
                    Cancelled
                </span>
            );
        default:
            return (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                    Open
                </span>
            );
    }
}

function extractRevertReason(err: any): string {
    if (!err) return 'Transaction failed or was rejected.';
    if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        return 'Transaction was rejected in MetaMask.';
    }

    const rawMsg =
        err?.error?.message ||
        err?.info?.error?.message ||
        err?.data?.message ||
        (err?.shortMessage && err.shortMessage !== 'could not coalesce error' ? err.shortMessage : null) ||
        err?.reason ||
        err?.message ||
        'Transaction failed or was rejected.';

    if (typeof rawMsg === 'string' && rawMsg.includes('Chain must support EIP-7702')) {
        return 'MetaMask Smart Account issue: Please toggle off "Smart account" in MetaMask Account Details because Base Sepolia testnet does not support EIP-7702 delegations.';
    }

    return String(rawMsg);
}