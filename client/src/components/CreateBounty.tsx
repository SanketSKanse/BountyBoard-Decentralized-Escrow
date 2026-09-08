import { useState } from "react";
import { parseEther } from "ethers";
import { useBountyContract } from "../hooks/useBountyContract";

export function CreateBounty() {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const { getContract } = useBountyContract();

    async function createBounty() {
        try {
            setLoading(true);
            setMessage("");

            const contract = await getContract();

            const tx = await contract.createBounty({
                value: parseEther(amount),
            });

            setMessage("Transaction submitted...");

            await tx.wait();

            setMessage("Bounty created successfully!");
            setAmount("");
        } catch (error) {
            console.error(error);
            setMessage("Transaction failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
                Create Bounty
            </h2>

            <input
                type="text"
                placeholder="Amount in ETH"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-3"
            />

            <button
                onClick={createBounty}
                disabled={loading || !amount}
                className="mt-4 rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
                {loading ? "Creating..." : "Create Bounty"}
            </button>

            {message && (
                <p className="mt-4 text-sm text-slate-300">
                    {message}
                </p>
            )}
        </div>
    );
}