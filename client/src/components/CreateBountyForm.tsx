import { useState } from 'react';
import { Contract, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_BOARD_CHAIN_ID, BOUNTY_ESCROW_ADDRESS } from '../contracts/config';

type Props = {
    signer: JsonRpcSigner;
    onCreated: () => void;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown wallet or contract error.';
}

export function CreateBountyForm({ signer, onCreated }: Props) {
    const [title, setTitle] = useState('');
    const [reward, setReward] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);

        if (!reward || Number(reward) <= 0) {
            setStatus('Enter a reward amount greater than 0.');
            return;
        }

        try {
            setIsSubmitting(true);
            const provider = signer.provider;
            const network = await provider.getNetwork();

            if (network.chainId !== BOUNTY_BOARD_CHAIN_ID) {
                throw new Error(`Wrong network. Select BountyBoard Local (chain ID ${BOUNTY_BOARD_CHAIN_ID}), not ${network.chainId}.`);
            }

            const deployedCode = await provider.getCode(BOUNTY_ESCROW_ADDRESS);
            if (deployedCode === '0x') {
                throw new Error(`No contract is deployed at ${BOUNTY_ESCROW_ADDRESS}. Deploy BountyEscrow to the connected local chain.`);
            }

            const value = parseEther(reward);
            const contract = new Contract(BOUNTY_ESCROW_ADDRESS, BountyEscrowArtifact.abi, signer);
            await contract.createBounty.staticCall({ value });

            setStatus(`Confirm ${reward} ETH escrow to ${BOUNTY_ESCROW_ADDRESS} in MetaMask. Network fee is separate.`);
            const tx = await contract.createBounty({ value });

            setStatus('Transaction sent, waiting for confirmation...');
            await tx.wait(); // waits for the transaction to be mined into a block

            setStatus(`Bounty created! Tx hash: ${tx.hash}`);
            onCreated();
            setTitle('');
            setReward('');
        } catch (err) {
            console.error(err);
            setStatus(`Transaction failed: ${getErrorMessage(err)}`);
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