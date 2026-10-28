import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useBounties } from './hooks/useBounties';
import { CreateBountyForm } from './components/CreateBountyForm';
import { BountyList } from './components/BountyList';
import { UserProfileModal } from './components/UserProfileModal';
import {
    BOUNTY_ESCROW_ADDRESS,
    BASE_SEPOLIA_CHAIN_ID,
    OP_SEPOLIA_CHAIN_ID,
    getExplorerAddressUrl,
} from './contracts/config';
import './styles.css';

export default function App() {
    const {
        address,
        balance,
        signer,
        chainId,
        networkName,
        isUnsupportedChain,
        error,
        isConnecting,
        connect,
        switchNetwork,
    } = useWallet();

    const [refreshKey, setRefreshKey] = useState(0);
    const [viewProfileWallet, setViewProfileWallet] = useState<string | null>(null);
    const { bounties, isLoading } = useBounties(refreshKey);

    const isBase = chainId === BASE_SEPOLIA_CHAIN_ID;
    const isOp = chainId === OP_SEPOLIA_CHAIN_ID;

    return (
        <main className="min-h-screen bg-gradient-to-br from-vault-bg to-vault-bg2 px-4 sm:px-6 py-8 text-[#F1EEE6]">
            {/* Top Navigation Bar */}
            <header className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <span className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        BountyBoard
                    </span>
                    <p className="text-xs text-[#9B96AE] mt-0.5">
                        Decentralized Escrow on Base & Optimism Sepolia
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Active Contract Link */}
                    <a
                        href={getExplorerAddressUrl(BOUNTY_ESCROW_ADDRESS, chainId)}
                        target="_blank"
                        rel="noreferrer"
                        title="View contract on block explorer"
                        className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono text-[#9B96AE] hover:text-white transition"
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                        Contract: {BOUNTY_ESCROW_ADDRESS.slice(0, 6)}...{BOUNTY_ESCROW_ADDRESS.slice(-4)}
                        <span className="text-[10px]">↗</span>
                    </a>

                    {/* Network Switcher & Indicator */}
                    {address && (
                        <div className="flex items-center gap-2">
                            {isUnsupportedChain ? (
                                <button
                                    onClick={() => switchNetwork(BASE_SEPOLIA_CHAIN_ID)}
                                    className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30 flex items-center gap-1.5 animate-pulse"
                                >
                                    <span>⚠️</span> Switch Network
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 glass rounded-xl p-1 text-xs">
                                    <button
                                        onClick={() => switchNetwork(BASE_SEPOLIA_CHAIN_ID)}
                                        className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                            isBase
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-[#9B96AE] hover:text-white'
                                        }`}
                                    >
                                        🔵 Base Sepolia
                                    </button>
                                    <button
                                        onClick={() => switchNetwork(OP_SEPOLIA_CHAIN_ID)}
                                        className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                            isOp
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'text-[#9B96AE] hover:text-white'
                                        }`}
                                    >
                                        🔴 OP Sepolia
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wallet Connect / Account Pill */}
                    {!address ? (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="rounded-xl bg-violet px-5 py-2 text-sm font-semibold text-vault-bg transition hover:brightness-110 disabled:opacity-50"
                        >
                            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setViewProfileWallet(address)}
                            className="glass flex items-center gap-3 rounded-xl px-3.5 py-1.5 hover:border-violet/40 transition group cursor-pointer"
                            title="View Your Reputation & Badges"
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-mono text-xs text-violet group-hover:underline">
                                    {address.slice(0, 6)}...{address.slice(-4)}
                                </span>
                            </div>
                            <span className="text-xs font-semibold text-gold">
                                {balance} ETH
                            </span>
                            <span className="text-[10px] text-[#9B96AE] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 group-hover:text-white">
                                Profile 👤
                            </span>
                        </button>
                    )}
                </div>
            </header>

            {/* Unsupported Network Alert Banner */}
            {address && isUnsupportedChain && (
                <section className="mx-auto max-w-4xl mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-sm">
                                Unsupported Network Connected ({networkName})
                            </h3>
                            <p className="text-xs text-amber-300/80 mt-0.5">
                                Please switch to Optimism Sepolia or Base Sepolia to interact with the escrow contract.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => switchNetwork(BASE_SEPOLIA_CHAIN_ID)}
                                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                            >
                                Switch to Base Sepolia
                            </button>
                            <button
                                onClick={() => switchNetwork(OP_SEPOLIA_CHAIN_ID)}
                                className="rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
                            >
                                Switch to OP Sepolia
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Main Content Area */}
            <section className="mx-auto max-w-4xl mt-8">
                <div>
                    <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight">
                        BountyBoard
                    </h1>
                    <p className="mt-2 max-w-2xl text-base text-[#9B96AE]">
                        Post work, escrow milestones, and resolve disputes on-chain with zero counterparty risk.
                        Testnet ETH available on the{' '}
                        <a
                            href="https://console.optimism.io/faucet"
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-gold hover:text-white"
                        >
                            Superchain Faucet
                        </a>
                        .
                    </p>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {signer && (
                    <CreateBountyForm
                        signer={signer}
                        chainId={chainId}
                        onCreated={() => setRefreshKey((k) => k + 1)}
                    />
                )}

                <BountyList
                    bounties={bounties}
                    isLoading={isLoading}
                    connectedAddress={address}
                    signer={signer}
                    chainId={chainId}
                    onUpdated={() => setRefreshKey((k) => k + 1)}
                    onViewProfile={setViewProfileWallet}
                />
            </section>

            {/* User Profile & Reputation Modal */}
            {viewProfileWallet && (
                <UserProfileModal
                    wallet={viewProfileWallet}
                    currentAccount={address}
                    chainId={chainId}
                    onClose={() => setViewProfileWallet(null)}
                    onProfileUpdated={() => setRefreshKey((k) => k + 1)}
                />
            )}
        </main>
    );
}