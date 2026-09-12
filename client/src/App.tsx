import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useBounties } from './hooks/useBounties';
import { CreateBountyForm } from './components/CreateBountyForm';
import { BountyList } from './components/BountyList';
import './styles.css';

export default function App() {
    const { address, balance, signer, error, isConnecting, connect } = useWallet();
    const [refreshKey, setRefreshKey] = useState(0);
    const { bounties, isLoading } = useBounties(refreshKey);

    return (
        <main className="min-h-screen bg-gradient-to-br from-vault-bg to-vault-bg2 px-6 py-16 text-[#F1EEE6]">
    <section className="mx-auto max-w-3xl">
        <h1 className="font-display text-6xl font-medium tracking-tight">BountyBoard</h1>
        <p className="mt-4 max-w-lg text-lg leading-8 text-[#9B96AE]">
            Post work, escrow the reward on-chain, and pay out the moment it's done — no invoices, no waiting.
        </p>

        <div className="mt-10">
            {!address ? (
                <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="rounded-xl bg-violet px-6 py-3 font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
            ) : (
                <div className="glass rounded-2xl p-5">
                    <p className="text-sm text-[#9B96AE]">Connected address</p>
                    <p className="font-mono text-sm text-violet">{address}</p>
                    <p className="mt-3 text-sm text-[#9B96AE]">Balance</p>
                    <p className="font-display text-3xl text-gold">{balance} ETH</p>
                </div>
            )}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            {signer && (
                <CreateBountyForm signer={signer} onCreated={() => setRefreshKey((k) => k + 1)} />
            )}

            <BountyList
                bounties={bounties}
                isLoading={isLoading}
                connectedAddress={address}
                signer={signer}
                onUpdated={() => setRefreshKey((k) => k + 1)}
            />
        </div>
    </section>
</main>
    );
}