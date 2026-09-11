import { useState } from 'react';
import { Contract, parseEther, type JsonRpcSigner } from 'ethers';
import BountyEscrowArtifact from '../contracts/BountyEscrow.json';
import { BOUNTY_BOARD_CHAIN_ID, BOUNTY_ESCROW_ADDRESS } from '../contracts/config';

type Props = {
    signer: JsonRpcSigner;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Unknown wallet or contract error.';
}

export function CreateBountyForm({ signer }: Props) {
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
        <form onSubmit={handleSubmit} className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <div>
                <label className="text-sm text-slate-400">Title: </label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                    placeholder="Build a landing page"
                />
            </div>

            <div className="mt-4">
                <label className="text-sm text-slate-400">Reward (ETH) — this actually gets escrowed on-chain</label>
                <input
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
                    placeholder="0.5"
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
                {isSubmitting ? 'Creating...' : 'Create Bounty'}
            </button>

            {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        </form>
    );
}