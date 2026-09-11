import { useWallet } from './hooks/useWallet';
import { CreateBountyForm } from './components/CreateBountyForm';
import './styles.css';

export default function App() {
    const { address, balance, signer, error, isConnecting, connect } = useWallet();

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
            <section className="mx-auto max-w-3xl">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Phase 2 wallet integration</p>
                <h1 className="text-5xl font-semibold tracking-tight">BountyBoard</h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                    The workspace is ready for the marketplace UI, REST API, and escrow contract to arrive in separate phases.
                </p>

                <div className="mt-10">
                    {!address ? (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                        >
                            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                            <p className="text-sm text-slate-400">Connected address</p>
                            <p className="font-mono text-cyan-300">{address}</p>
                            <p className="mt-2 text-sm text-slate-400">Balance</p>
                            <p className="font-mono">{balance} ETH</p>
                        </div>
                    )}

                    {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                    {signer && <CreateBountyForm signer={signer} />}
                </div>
            </section>
        </main>
    );
}