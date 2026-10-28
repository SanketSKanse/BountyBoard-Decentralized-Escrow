import { useState } from 'react';
import { Contract, parseEther, parseUnits, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import {
    BOUNTY_ESCROW_ADDRESS,
    getExplorerTxUrl,
    getUsdcAddress,
    ERC20_ABI,
} from '../contracts/config';
import { API_BASE_URL } from '../config';

const CATEGORIES = [
    'General',
    'Smart Contracts',
    'Frontend',
    'Full Stack',
    'Security Audit',
    'UI/UX Design',
];

type Props = {
    signer: JsonRpcSigner;
    chainId?: bigint | null;
    onCreated: () => void;
};

export function CreateBountyForm({ signer, chainId, onCreated }: Props) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General');
    const [skills, setSkills] = useState('');
    const [currency, setCurrency] = useState<'ETH' | 'USDC'>('ETH');
    const [reward, setReward] = useState('');
    const [deadlineDays, setDeadlineDays] = useState('');
    const [status, setStatus] = useState<React.ReactNode | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);

        if (!title.trim()) {
            setStatus('Enter a title for the bounty.');
            return;
        }
        if (!reward || Number(reward) <= 0) {
            setStatus('Enter a reward amount greater than 0.');
            return;
        }

        const days = Number(deadlineDays);
        const hasDeadline = !isNaN(days) && days > 0;
        const deadlineTimestamp = hasDeadline
            ? Math.floor(Date.now() / 1000) + Math.floor(days * 86400)
            : 0;

        try {
            setIsSubmitting(true);
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            let tx;

            if (currency === 'USDC') {
                const usdcAddress = getUsdcAddress(chainId);
                const usdcAmount = parseUnits(reward, 6);
                const usdcContract = new Contract(usdcAddress, ERC20_ABI, signer);
                const userAddress = await signer.getAddress();

                setStatus('Checking USDC allowance for escrow...');
                const currentAllowance: bigint = await usdcContract.allowance(
                    userAddress,
                    BOUNTY_ESCROW_ADDRESS
                );

                if (currentAllowance < usdcAmount) {
                    setStatus('Step 1/2: Please approve USDC spending in your wallet...');
                    const approveTx = await usdcContract.approve(BOUNTY_ESCROW_ADDRESS, usdcAmount);
                    setStatus('Step 1/2: Confirming USDC approval on-chain...');
                    await approveTx.wait();
                }

                setStatus('Step 2/2: Confirming token bounty creation in your wallet...');
                if (hasDeadline) {
                    tx = await contract.createTokenBountyWithDeadline(
                        usdcAddress,
                        usdcAmount,
                        deadlineTimestamp
                    );
                } else {
                    tx = await contract.createTokenBounty(usdcAddress, usdcAmount);
                }
            } else {
                setStatus('Waiting for you to confirm transaction in your wallet...');
                const ethAmount = parseEther(reward);
                if (hasDeadline) {
                    try {
                        tx = await contract.createBountyWithDeadline(deadlineTimestamp, {
                            value: ethAmount,
                        });
                    } catch (deadlineErr) {
                        console.warn('createBountyWithDeadline fallback:', deadlineErr);
                        tx = await contract.createBounty({ value: ethAmount });
                    }
                } else {
                    tx = await contract.createBounty({ value: ethAmount });
                }
            }

            setStatus('Transaction sent, waiting for confirmation on-chain...');
            const receipt = await tx.wait();

            // Decode the BountyCreated event to recover the new bounty's ID
            const event = receipt.logs
                .map((log: any) => {
                    try {
                        return contract.interface.parseLog(log);
                    } catch {
                        return null;
                    }
                })
                .find((parsed: any) => parsed?.name === 'BountyCreated');

            const bountyId = event?.args?.bountyId?.toString();

            if (bountyId) {
                // If standard createBounty was used with a deadline, update deadline on-chain
                if (currency === 'ETH' && hasDeadline && !receipt.logs.some((l: any) => {
                    try {
                        return contract.interface.parseLog(l)?.name === 'DeadlineUpdated';
                    } catch {
                        return false;
                    }
                })) {
                    try {
                        const dlTx = await contract.setDeadline(bountyId, deadlineTimestamp);
                        await dlTx.wait();
                    } catch (dlErr) {
                        console.warn('Failed to set deadline after bounty creation:', dlErr);
                    }
                }

                setStatus('Saving rich bounty metadata...');
                const metadataRes = await fetch(`${API_BASE_URL}/bounties/${bountyId}/metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title.trim(),
                        description: description.trim(),
                        category,
                        skills: skills.trim(),
                        tokenSymbol: currency,
                        tokenAddress: currency === 'USDC' ? getUsdcAddress(chainId) : null,
                    }),
                });

                if (!metadataRes.ok) {
                    const errorBody = await metadataRes.text();
                    console.error('Metadata save failed:', metadataRes.status, errorBody);
                    setStatus(`Bounty created on-chain, but saving metadata failed (${metadataRes.status}). Check console.`);
                }
            } else {
                console.warn('Could not extract bountyId from transaction receipt — metadata will not be saved.');
            }

            setStatus(
                <span>
                    🎉 Bounty posted successfully!{' '}
                    <a
                        href={getExplorerTxUrl(tx.hash, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-gold hover:text-white"
                    >
                        View Tx on Explorer
                    </a>
                </span>
            );
            setTitle('');
            setDescription('');
            setCategory('General');
            setSkills('');
            setReward('');
            setDeadlineDays('');
            setIsExpanded(false);
            onCreated();
        } catch (err: any) {
            console.error('Create bounty error:', err);
            const msg = extractContractError(err);
            setStatus(`Failed: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="glass mt-8 rounded-2xl p-6 border border-white/10 transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-display text-xl font-semibold text-[#F1EEE6]">
                        Create a Marketplace Bounty
                    </h2>
                    <p className="text-xs text-[#9B96AE] mt-0.5">
                        Escrow funds on-chain with automatic milestone protections and deadline refunds.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-gold hover:text-white transition underline"
                >
                    {isExpanded ? 'Collapse Form' : '+ New Bounty Form'}
                </button>
            </div>

            {isExpanded && (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-[#9B96AE]">Bounty Title *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                            placeholder="e.g. Build an Escrow Dashboard with Ethers.js"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-[#9B96AE]">Project Description</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                            placeholder="Describe deliverables, requirements, acceptance criteria, or links to specifications..."
                        />
                    </div>

                    {/* Category & Skills Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-[#9B96AE]">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-white/10 bg-[#161426] px-3 py-2 text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat} className="bg-[#161426] text-[#F1EEE6]">
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[#9B96AE]">
                                Required Skills (comma-separated)
                            </label>
                            <input
                                value={skills}
                                onChange={(e) => setSkills(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                                placeholder="Solidity, React, TypeScript"
                            />
                        </div>
                    </div>

                    {/* Reward & Deadline Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[#9B96AE]">
                                    Escrow Reward ({currency}) *
                                </label>
                                <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setCurrency('ETH')}
                                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition ${
                                            currency === 'ETH'
                                                ? 'bg-gold text-vault-bg shadow-sm'
                                                : 'text-[#9B96AE] hover:text-white'
                                        }`}
                                    >
                                        ETH
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrency('USDC')}
                                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition ${
                                            currency === 'USDC'
                                                ? 'bg-[#2775CA] text-white shadow-sm'
                                                : 'text-[#9B96AE] hover:text-white'
                                        }`}
                                    >
                                        USDC
                                    </button>
                                </div>
                            </div>
                            <div className="relative mt-1">
                                <input
                                    value={reward}
                                    onChange={(e) => setReward(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-3 pr-14 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                                    placeholder={currency === 'ETH' ? 'e.g. 0.5' : 'e.g. 100'}
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-semibold text-[#9B96AE]">
                                    {currency}
                                </span>
                            </div>
                            <span className="text-[11px] text-[#9B96AE]/70 block mt-0.5">
                                {currency === 'USDC'
                                    ? 'USDC testnet token (prompts approval if allowance < amount)'
                                    : 'Deposited directly into the escrow smart contract'}
                            </span>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[#9B96AE]">
                                Deadline in Days (Optional)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={deadlineDays}
                                onChange={(e) => setDeadlineDays(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                                placeholder="e.g. 7"
                            />
                            <span className="text-[11px] text-[#9B96AE]/70 block mt-0.5">
                                Enables 100% automated refund if deadline is missed without work submission
                            </span>
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50 shadow-md"
                        >
                            {isSubmitting ? 'Creating Bounty...' : `Create & Escrow ${currency} Bounty`}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="text-xs text-[#9B96AE] hover:text-white transition"
                        >
                            Cancel
                        </button>
                    </div>

                    {status && <div className="mt-3 text-sm text-[#9B96AE]">{status}</div>}
                </form>
            )}
        </div>
    );
}

function extractContractError(err: any): string {
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