import { useWallet } from "./hooks/useWallet";
import { CreateBounty } from "./components/CreateBounty";

function App() {
    const {
        address,
        balance,
        error,
        isConnecting,
        connect,
    } = useWallet();

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
            <section className="mx-auto max-w-3xl">
                <h1 className="text-5xl font-semibold">
                    BountyBoard
                </h1>

                <p className="mt-4 text-slate-400">
                    Decentralized freelance marketplace with blockchain escrow.
                </p>

                {/* Wallet */}
                <div className="mt-8">
                    {!address ? (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950"
                        >
                            {isConnecting
                                ? "Connecting..."
                                : "Connect Wallet"}
                        </button>
                    ) : (
                        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                            <p className="text-sm text-slate-400">
                                Connected wallet
                            </p>

                            <p className="font-mono text-cyan-300">
                                {address}
                            </p>

                            <p className="mt-2 text-sm text-slate-400">
                                Balance
                            </p>

                            <p className="font-mono">
                                {balance} ETH
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="mt-4 text-sm text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                {/* Create Bounty */}
                {address && <CreateBounty />}
            </section>
        </main>
    );
}

export default App;