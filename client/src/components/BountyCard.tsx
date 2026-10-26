import { useState, useEffect } from 'react';
import { Contract, isAddress, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS, getExplorerAddressUrl, getExplorerTxUrl } from '../contracts/config';
import { useMilestones } from '../hooks/useMilestones';
import type { Bounty } from '../hooks/useBounties';
import { API_BASE_URL } from '../config';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type Proposal = {
    id: string;
    bountyId: number;
    freelancerAddress: string;
    coverLetter: string;
    timelineDays: number;
    portfolioUrl?: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
};

type Props = {
    bounty: Bounty;
    connectedAddress: string | null;
    signer: JsonRpcSigner | null;
    chainId?: bigint | null;
    onUpdated: () => void;
};

export function BountyCard({ bounty, connectedAddress, signer, chainId, onUpdated }: Props) {
    // Form & action states
    const [freelancerInput, setFreelancerInput] = useState('');
    const [showManualAssign, setShowManualAssign] = useState(false);
    const [milestoneDescription, setMilestoneDescription] = useState('');
    const [milestoneAmount, setMilestoneAmount] = useState('');
    const [clientRefundInput, setClientRefundInput] = useState('');
    const [freelancerPayoutInput, setFreelancerPayoutInput] = useState('');
    const [deliverableInput, setDeliverableInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<React.ReactNode | null>(null);
    const [milestoneRefreshKey, setMilestoneRefreshKey] = useState(0);

    // Proposal states
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [proposalsLoading, setProposalsLoading] = useState(false);
    const [proposalRefreshKey, setProposalRefreshKey] = useState(0);
    const [showProposalForm, setShowProposalForm] = useState(false);
    const [showProposalsList, setShowProposalsList] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [timelineDays, setTimelineDays] = useState('7');
    const [portfolioUrl, setPortfolioUrl] = useState('');

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

    // Deadline calculations
    const nowSec = Math.floor(Date.now() / 1000);
    const hasDeadline = bounty.deadline > 0;
    const isExpired = hasDeadline && nowSec > bounty.deadline;
    const hasDeliverable = Boolean(bounty.deliverableUri && bounty.deliverableUri.trim().length > 0);

    const statusBorderColor = isOpen
        ? 'border-l-blue-500'
        : isAssigned
        ? 'border-l-yellow-500'
        : isDisputed
        ? 'border-l-red-500'
        : isCompleted
        ? 'border-l-green-500'
        : 'border-l-gray-500';

    // Fetch proposals for this bounty
    useEffect(() => {
        let isMounted = true;
        async function fetchProposals() {
            setProposalsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/bounties/${bounty.id}/proposals`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setProposals(data);
                }
            } catch (err) {
                console.error(`Failed to fetch proposals for bounty ${bounty.id}`, err);
            } finally {
                if (isMounted) setProposalsLoading(false);
            }
        }

        fetchProposals();
        return () => {
            isMounted = false;
        };
    }, [bounty.id, proposalRefreshKey]);

    // Handle Manual Assign
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

    // Handle 1-Click Hire from Proposal
    async function handleHireProposal(proposal: Proposal) {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage(`Hiring ${proposal.freelancerAddress.slice(0, 6)}... Confirm in MetaMask`);

            // 1. Assign on-chain
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.assignFreelancer(bounty.id, proposal.freelancerAddress);
            setStatusMessage('Transaction sent, confirming on blockchain...');
            await tx.wait();

            // 2. Mark proposal as accepted on backend
            try {
                await fetch(`${API_BASE_URL}/bounties/${bounty.id}/proposals/${proposal.id}/accept`, {
                    method: 'PATCH',
                });
            } catch (err) {
                console.warn('Backend proposal status update warning:', err);
            }

            setStatusMessage(
                <span>
                    🎉 Freelancer hired and assigned on-chain!{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-mint hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            setProposalRefreshKey((k) => k + 1);
            onUpdated();
        } catch (err) {
            console.error('Hire proposal error:', err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    // Handle Freelancer Submitting Proposal
    async function handleProposalSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!connectedAddress) {
            setStatusMessage('Connect your wallet to submit a proposal.');
            return;
        }

        if (!coverLetter.trim()) {
            setStatusMessage('Please include a cover letter explaining your approach.');
            return;
        }

        const days = Number(timelineDays) || 7;

        try {
            setIsSubmitting(true);
            setStatusMessage('Submitting proposal to marketplace...');

            const res = await fetch(`${API_BASE_URL}/bounties/${bounty.id}/proposals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    freelancerAddress: connectedAddress,
                    coverLetter: coverLetter.trim(),
                    timelineDays: days,
                    portfolioUrl: portfolioUrl.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            setStatusMessage('✅ Proposal submitted successfully! The client can now review your bid.');
            setCoverLetter('');
            setPortfolioUrl('');
            setShowProposalForm(false);
            setProposalRefreshKey((k) => k + 1);
            onUpdated();
        } catch (err: any) {
            console.error('Submit proposal error:', err);
            setStatusMessage(`Failed to submit proposal: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Handle Freelancer Submitting Work Proof On-Chain
    async function handleSubmitWork() {
        if (!signer) return;
        setStatusMessage(null);

        if (!deliverableInput.trim()) {
            setStatusMessage('Please enter a deliverable proof URI (e.g. GitHub PR, IPFS link, or demo URL).');
            return;
        }

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.submitWork(bounty.id, deliverableInput.trim());
            setStatusMessage('Transaction sent, recording deliverable on blockchain...');
            await tx.wait();

            setStatusMessage(
                <span>
                    📦 Work deliverable proof recorded on-chain!{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-mint hover:text-white"
                    >
                        View Tx
                    </a>
                </span>
            );
            setDeliverableInput('');
            onUpdated();
        } catch (err) {
            console.error(err);
            setStatusMessage(extractRevertReason(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    // Handle Client Claiming Expired Deadline Refund
    async function handleClaimExpiredRefund() {
        if (!signer) return;
        setStatusMessage(null);

        try {
            setIsSubmitting(true);
            setStatusMessage('Waiting for confirmation in MetaMask...');
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.claimExpiredRefund(bounty.id);
            setStatusMessage('Transaction sent, claiming 100% expired refund...');
            await tx.wait();

            setStatusMessage(
                <span>
                    ⌛ Deadline expired with no work submitted. 100% escrow balance refunded to client.{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-gold hover:text-white"
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

    // Handle Cancel & Refund when Open
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

    // Handle Raise Dispute
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

    // Handle Arbiter Dispute Resolution
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

    // Handle Full Payment Release
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

    // Handle Refund Remainder
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

    // Handle Milestone creation
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

    // Handle Milestone approval
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
        <div className={`glass rounded-2xl border-l-4 ${statusBorderColor} p-5 space-y-4`}>
            {/* Top Bar: Category Pill & Status Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet/20 border border-violet/30 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                        {bounty.category || 'General'}
                    </span>
                    <span className="font-mono text-xs text-[#9B96AE]">Bounty #{bounty.id}</span>
                </div>
                <StatusBadge status={bounty.status} />
            </div>

            {/* Title & Reward */}
            <div>
                <h2 className="text-xl font-semibold text-[#F1EEE6] leading-snug">{bounty.title}</h2>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-2xl text-gold">{bounty.amount} ETH</p>
                    {bounty.remainingBalance && (
                        <p className="text-xs text-[#9B96AE]">
                            Remaining Escrow:{' '}
                            <span className="font-mono text-[#F1EEE6]">{bounty.remainingBalance} ETH</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Description (if provided) */}
            {bounty.description && (
                <p className="text-sm text-[#9B96AE] leading-relaxed whitespace-pre-wrap bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    {bounty.description}
                </p>
            )}

            {/* Skill Tags */}
            {bounty.skills && bounty.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {bounty.skills.map((skill, idx) => (
                        <span
                            key={idx}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-[#9B96AE]"
                        >
                            #{skill}
                        </span>
                    ))}
                </div>
            )}

            {/* Deadline Indicator */}
            {hasDeadline && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#9B96AE]">⏰ Deadline:</span>
                    {isExpired ? (
                        <span className="font-semibold text-rose-400">
                            Expired on {new Date(bounty.deadline * 1000).toLocaleDateString()}
                        </span>
                    ) : (
                        <span className="font-medium text-emerald-300">
                            Due in {Math.max(1, Math.ceil((bounty.deadline - nowSec) / 86400))} days (
                            {new Date(bounty.deadline * 1000).toLocaleDateString()})
                        </span>
                    )}
                </div>
            )}

            {/* Address Details with Clickable Block Explorer Links */}
            <div className="space-y-1 text-xs text-[#9B96AE] border-t border-white/10 pt-3">
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
                        <span className="font-mono text-[#9B96AE]">Not assigned yet</span>
                    )}
                </p>
                {bounty.arbiter && (
                    <p className="text-[11px]">
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

            {/* Assigned Freelancer Pill */}
            {isFreelancer && (
                <div className="inline-block rounded-full bg-violet/20 border border-violet/30 px-3 py-1 text-xs font-medium text-violet-300">
                    ✨ You are the assigned freelancer
                </div>
            )}

            {/* VERIFIED ON-CHAIN DELIVERABLE DISPLAY */}
            {hasDeliverable && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-base">📦</span>
                            <h4 className="text-sm font-semibold text-emerald-300">
                                Verified On-Chain Deliverable Proof
                            </h4>
                        </div>
                        {bounty.submittedAt > 0 && (
                            <span className="text-[11px] text-[#9B96AE]">
                                {new Date(bounty.submittedAt * 1000).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-[#9B96AE]">
                        The assigned freelancer has recorded their deliverable proof on the blockchain.
                    </p>
                    <div className="mt-2.5">
                        <a
                            href={
                                bounty.deliverableUri.startsWith('http') || bounty.deliverableUri.startsWith('ipfs://')
                                    ? bounty.deliverableUri
                                    : `https://${bounty.deliverableUri}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition underline"
                        >
                            <span>🔗 Inspect Deliverable Work:</span>
                            <span className="max-w-xs sm:max-w-md truncate">{bounty.deliverableUri}</span>
                            <span>↗</span>
                        </a>
                    </div>
                </div>
            )}

            {/* FREELANCER DELIVERABLE SUBMISSION PANEL */}
            {isFreelancer && isAssigned && !isDisputed && !isCompleted && (
                <div className="rounded-xl border border-violet/40 bg-violet/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-violet-200">
                            Submit Deliverable Proof (On-Chain)
                        </h4>
                        <span className="text-xs text-[#9B96AE]">Permanent Proof</span>
                    </div>
                    <p className="text-xs text-[#9B96AE]">
                        Provide your GitHub Pull Request, IPFS hash, or live project demo URL. This records proof on the escrow contract for the client and arbiter.
                    </p>
                    <div className="flex gap-2">
                        <input
                            value={deliverableInput}
                            onChange={(e) => setDeliverableInput(e.target.value)}
                            placeholder="https://github.com/.../pull/1 or ipfs://..."
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none font-mono"
                        />
                        <button
                            onClick={handleSubmitWork}
                            disabled={isSubmitting || !deliverableInput.trim()}
                            className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
                        >
                            {isSubmitting ? 'Recording...' : 'Submit Work Proof'}
                        </button>
                    </div>
                </div>
            )}

            {/* CLAIM EXPIRED DEADLINE REFUND BUTTON */}
            {isClient && isAssigned && isExpired && !hasDeliverable && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h4 className="text-sm font-semibold text-rose-300">
                                ⌛ Bounty Deadline Expired
                            </h4>
                            <p className="text-xs text-rose-200/80 mt-0.5">
                                The assigned freelancer missed the deadline without submitting deliverable proof. You can claim a 100% automated refund.
                            </p>
                        </div>
                        <button
                            onClick={handleClaimExpiredRefund}
                            disabled={isSubmitting}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-md whitespace-nowrap disabled:opacity-50"
                        >
                            {isSubmitting ? 'Refunding...' : 'Claim Expired Refund (100%)'}
                        </button>
                    </div>
                </div>
            )}

            {/* FREELANCER PROPOSAL APPLICATION SECTION (When Open & Connected wallet is NOT client) */}
            {isOpen && !isClient && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-[#F1EEE6]">Apply for this Bounty</h4>
                            <p className="text-xs text-[#9B96AE]">
                                Submit a bid with your estimated turnaround time and portfolio link.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowProposalForm(!showProposalForm)}
                            className="rounded-lg bg-violet px-3 py-1.5 text-xs font-semibold text-vault-bg transition hover:brightness-110"
                        >
                            {showProposalForm ? 'Close Form' : 'Apply / Bid'}
                        </button>
                    </div>

                    {showProposalForm && (
                        <form onSubmit={handleProposalSubmit} className="mt-4 space-y-3 pt-3 border-t border-white/10">
                            <div>
                                <label className="text-xs font-medium text-[#9B96AE]">
                                    Cover Letter & Approach *
                                </label>
                                <textarea
                                    rows={3}
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Explain how you will complete this bounty and your relevant experience..."
                                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-[#9B96AE]">
                                        Estimated Turnaround (Days)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={timelineDays}
                                        onChange={(e) => setTimelineDays(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                                        placeholder="7"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[#9B96AE]">
                                        Portfolio / GitHub URL (Optional)
                                    </label>
                                    <input
                                        value={portfolioUrl}
                                        onChange={(e) => setPortfolioUrl(e.target.value)}
                                        placeholder="https://github.com/yourhandle"
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !coverLetter.trim()}
                                className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Send Proposal'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* APPLICANT REVIEW PANEL (Visible when Open to Client and curious visitors) */}
            {isOpen && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#F1EEE6]">
                                Freelancer Proposals
                            </h4>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono text-[#9B96AE]">
                                {proposals.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowProposalsList(!showProposalsList)}
                            className="text-xs text-gold hover:text-white transition underline"
                        >
                            {showProposalsList ? 'Hide Applicants' : `View Proposals (${proposals.length})`}
                        </button>
                    </div>

                    {showProposalsList && (
                        <div className="mt-3 space-y-3 pt-3 border-t border-white/10">
                            {proposalsLoading ? (
                                <p className="text-xs text-[#9B96AE]">Loading proposals...</p>
                            ) : proposals.length === 0 ? (
                                <p className="text-xs text-[#9B96AE]">
                                    No proposals submitted yet. Freelancers can apply above.
                                </p>
                            ) : (
                                proposals.map((p) => (
                                    <div
                                        key={p.id}
                                        className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={getExplorerAddressUrl(p.freelancerAddress, chainId)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-mono text-xs text-violet-300 hover:text-white transition underline"
                                                >
                                                    {p.freelancerAddress.slice(0, 6)}...{p.freelancerAddress.slice(-4)}
                                                </a>
                                                <span className="text-[11px] text-[#9B96AE]">
                                                    ⏱ {p.timelineDays} days
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        p.status === 'ACCEPTED'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            : p.status === 'REJECTED'
                                                            ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                    }`}
                                                >
                                                    {p.status}
                                                </span>

                                                {/* 1-Click Hire Button for Client */}
                                                {isClient && isOpen && p.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleHireProposal(p)}
                                                        disabled={isSubmitting}
                                                        className="rounded-lg bg-mint px-3 py-1 text-xs font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50 shadow-sm"
                                                    >
                                                        ⚡ Hire & Assign On-Chain
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs text-[#F1EEE6] leading-relaxed whitespace-pre-wrap">
                                            {p.coverLetter}
                                        </p>

                                        {p.portfolioUrl && (
                                            <a
                                                href={
                                                    p.portfolioUrl.startsWith('http')
                                                        ? p.portfolioUrl
                                                        : `https://${p.portfolioUrl}`
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-block text-[11px] text-gold hover:text-white transition underline"
                                            >
                                                Portfolio / Link ↗
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Disputed Alert Banner */}
            {isDisputed && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    ⚠️ <strong>Dispute Active:</strong> Escrow is currently frozen. Awaiting arbiter resolution.
                </div>
            )}

            {/* Cancelled Alert Banner */}
            {isCancelled && (
                <div className="rounded-xl border border-gray-500/30 bg-gray-500/10 p-3 text-xs text-gray-400">
                    ✕ <strong>Cancelled:</strong> This bounty has been cancelled and deposited funds refunded.
                </div>
            )}

            {/* CLIENT OPEN BOUNTY ACTIONS (Manual address input & cancel) */}
            {isClient && isOpen && (
                <div className="border-t border-white/10 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setShowManualAssign(!showManualAssign)}
                            className="text-xs text-[#9B96AE] hover:text-white transition underline"
                        >
                            {showManualAssign ? 'Hide manual address input' : 'Or assign wallet address directly'}
                        </button>

                        <button
                            onClick={handleCancelAndRefund}
                            disabled={isSubmitting}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                            Cancel & Refund (100%)
                        </button>
                    </div>

                    {showManualAssign && (
                        <div className="space-y-2">
                            <label className="text-xs text-[#9B96AE]">Direct Freelancer Address</label>
                            <div className="flex gap-2">
                                <input
                                    value={freelancerInput}
                                    onChange={(e) => setFreelancerInput(e.target.value)}
                                    placeholder="0x..."
                                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                                />
                                <button
                                    onClick={handleAssign}
                                    disabled={isSubmitting}
                                    className="rounded-lg bg-violet px-4 py-2 text-xs font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                                >
                                    Assign
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ASSIGNED BOUNTY ACTIONS (Raise Dispute, Release Payment, Refund Remainder) */}
            {isAssigned && (
                <div className="border-t border-white/10 pt-3 flex flex-wrap items-center gap-2">
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

            {/* ARBITER RESOLUTION PANEL */}
            {isArbiter && isDisputed && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
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

            {/* MILESTONES SECTION */}
            {hasFreelancer && !isCancelled && !isDisputed && (
                <div className="border-t border-white/10 pt-3">
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
                        <p className="mt-2 text-sm text-[#9B96AE]">No milestones added.</p>
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

            {/* Status Feedback Message */}
            {statusMessage && <div className="text-sm text-[#9B96AE]">{statusMessage}</div>}
        </div>
    );
}

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