import { useState } from 'react';
import { Contract, isAddress, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const normalizedConnected = connectedAddress?.toLowerCase();
    const isClient = normalizedConnected === bounty.client.toLowerCase();
    const isFreelancer =
        bounty.freelancer !== ZERO_ADDRESS && normalizedConnected === bounty.freelancer.toLowerCase();
    const hasFreelancer = bounty.freelancer !== ZERO_ADDRESS;

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

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Bounty #{bounty.id}</p>
                <StatusBadge completed={bounty.completed} hasFreelancer={hasFreelancer} />
            </div>

            <p className="mt-1 font-mono text-lg text-cyan-300">{bounty.amount} ETH</p>

            <div className="mt-3 space-y-1 text-sm text-slate-400">
                <p>
                    Client: <span className="font-mono text-slate-300">{bounty.client}</span>
                </p>
                <p>
                    Freelancer:{' '}
                    <span className="font-mono text-slate-300">
                        {hasFreelancer ? bounty.freelancer : 'Not assigned'}
                    </span>
                </p>
            </div>

            {isFreelancer && (
                <p className="mt-3 inline-block rounded bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-300">
                    You are the assigned freelancer
                </p>
            )}

            {isClient && !hasFreelancer && !bounty.completed && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                    <label className="text-sm text-slate-400">Freelancer address</label>
                    <input
                        value={freelancerInput}
                        onChange={(e) => setFreelancerInput(e.target.value)}
                        placeholder="0x..."
                        className="mt-1 w-full rounded bg-slate-800 px-3 py-2 font-mono text-sm text-slate-100"
                    />
                    <button
                        onClick={handleAssign}
                        disabled={isSubmitting}
                        className="mt-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Assigning...' : 'Assign Freelancer'}
                    </button>
                </div>
            )}

            {isClient && hasFreelancer && !bounty.completed && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                    <button
                        onClick={handleRelease}
                        disabled={isSubmitting}
                        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-green-400 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Releasing...' : 'Release Payment'}
                    </button>
                </div>
            )}

            {statusMessage && <p className="mt-3 text-sm text-slate-300">{statusMessage}</p>}
        </div>
    );
}

function StatusBadge({ completed, hasFreelancer }: { completed: boolean; hasFreelancer: boolean }) {
    if (completed) {
        return <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">Completed</span>;
    }
    if (hasFreelancer) {
        return <span className="rounded bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">In Progress</span>;
    }
    return <span className="rounded bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400">Open</span>;
}

// Solidity's require() messages arrive buried inside a larger error object.
// This digs out the human-readable reason so users see "Only client can assign freelancer"
// instead of a wall of raw JSON.
function extractRevertReason(err: unknown): string {
    if (err && typeof err === 'object' && 'reason' in err && typeof err.reason === 'string') {
        return err.reason;
    }
    return 'Transaction failed or was rejected.';
}