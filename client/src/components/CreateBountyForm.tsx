import { useState } from 'react';
import { Contract, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_ESCROW_ADDRESS } from '../contracts/config';
import { API_BASE_URL } from '../config';

type Props = {
    signer: JsonRpcSigner;
    onCreated: () => void;
};

export function CreateBountyForm({ signer, onCreated }: Props) {
    const [title, setTitle] = useState('');
    const [reward, setReward] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

        try {
            setIsSubmitting(true);
            setStatus('Waiting for you to confirm in MetaMask...');

            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            const tx = await contract.createBounty({ value: parseEther(reward) });

            setStatus('Transaction sent, waiting for confirmation...');
            const receipt = await tx.wait();

            // Decode the BountyCreated event to recover the new bounty's ID
            const event = receipt.logs
                .map((log: any) => {
                    try {
                        return contract.interface.parseLog(log);
                    } catch {
                        return null; // ignore logs from other contracts, if any
                    }
                })
                .find((parsed: any) => parsed?.name === 'BountyCreated');

            const bountyId = event?.args?.bountyId?.toString();

            if (bountyId) {
                setStatus('Saving bounty details...');
                const metadataRes = await fetch(`${API_BASE_URL}/bounties/${bountyId}/metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description: '' }),
                });

                if (!metadataRes.ok) {
                    const errorBody = await metadataRes.text();
                    console.error('Metadata save failed:', metadataRes.status, errorBody);
                    setStatus(`Bounty created on-chain, but saving the title failed (${metadataRes.status}). Check console.`);
                }
            } else {
                console.warn('Could not extract bountyId from transaction receipt — title will not be saved.');
            }

            setStatus(`Bounty created! Tx hash: ${tx.hash}`);
            setTitle('');
            setReward('');
            onCreated();
        } catch (err) {
            console.error(err);
            setStatus('Transaction failed or was rejected.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="glass mt-8 rounded-2xl p-6">
            <h2 className="font-display text-xl">Post a bounty</h2>

            <div className="mt-4">
                <label className="text-sm text-[#9B96AE]">Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                    placeholder="Build a landing page"
                />
            </div>

            <div className="mt-4">
                <label className="text-sm text-[#9B96AE]">Reward (ETH) — escrowed on-chain immediately</label>
                <input
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                    placeholder="0.5"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 rounded-xl bg-gold px-6 py-3 font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
            >
                {isSubmitting ? 'Creating...' : 'Create Bounty'}
            </button>

            {status && <p className="mt-4 text-sm text-[#9B96AE]">{status}</p>}
        </form>
    );
}
// </parameter>