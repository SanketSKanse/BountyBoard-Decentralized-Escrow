import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useBounties } from './hooks/useBounties';
import { CreateBountyForm } from './components/CreateBountyForm';
import { BountyList } from './components/BountyList';
import { UserProfileModal } from './components/UserProfileModal';
import { ActivityFeedModal } from './components/ActivityFeedModal';
import { LandingPage } from './pages/LandingPage';
import {
    BOUNTY_ESCROW_ADDRESS,
    BASE_SEPOLIA_CHAIN_ID,
    OP_SEPOLIA_CHAIN_ID,
    getExplorerAddressUrl,
} from './contracts/config';
import './styles.css';

export default function App() {
    const getInitialView = (): 'landing' | 'app' => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (window.location.hash === '#app' || params.get('view') === 'app') {
                return 'app';
            }
        }
        return 'landing';
    };

    const [currentView, setCurrentView] = useState<'landing' | 'app'>(getInitialView);

    useEffect(() => {
        const handleHashChange = () => {
            const params = new URLSearchParams(window.location.search);
            if (window.location.hash === '#app' || params.get('view') === 'app') {
                setCurrentView('app');
            } else if (!window.location.hash || window.location.hash === '#') {
                setCurrentView('landing');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, []);

    const navigateToApp = () => {
        setCurrentView('app');
        if (typeof window !== 'undefined') {
            window.location.hash = 'app';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const navigateToLanding = () => {
        setCurrentView('landing');
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', window.location.pathname);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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
    const [showActivityFeed, setShowActivityFeed] = useState(false);
    const { bounties, isLoading } = useBounties(refreshKey);

    const isBase = chainId === BASE_SEPOLIA_CHAIN_ID;
    const isOp = chainId === OP_SEPOLIA_CHAIN_ID;

    // View Switcher: Render Landing Page if currentView === 'landing'
    if (currentView === 'landing') {
        return <LandingPage onEnterApp={navigateToApp} />;
    }

    return (
        <main className="min-h-screen bg-[#07090E] text-[#F1EEE6] relative selection:bg-white selection:text-black px-4 sm:px-6 py-8">
            {/* Ambient Blueprint Grid */}
            <div className="fixed inset-0 bg-blueprint-grid pointer-events-none z-0 opacity-40" />

            <div className="relative z-10">
                {/* Top Navigation Bar */}
                <header className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={navigateToLanding}
                            className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-[#8F94A6] hover:text-white hover:border-white/20 transition group cursor-pointer"
                            title="Return to Landing Page"
                        >
                            <span className="transition-transform group-hover:-translate-x-0.5 text-white/80">←</span>
                            <span>Landing</span>
                        </button>

                        <div>
                            <span className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                BountyBoard
                            </span>
                            <p className="text-xs text-[#8F94A6] mt-0.5 font-mono">
                                Decentralized Escrow // Base & OP Sepolia
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Activity Feed Drawer/Modal Button */}
                        <button
                            type="button"
                            onClick={() => setShowActivityFeed(true)}
                            className="glass flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-[#8F94A6] hover:text-white hover:border-white/20 transition group cursor-pointer"
                            title="View Live Escrow Activity Stream"
                        >
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="group-hover:text-white transition font-medium">🔔 Activity Feed</span>
                        </button>

                        {/* Active Contract Link */}
                        <a
                            href={getExplorerAddressUrl(BOUNTY_ESCROW_ADDRESS, chainId)}
                            target="_blank"
                            rel="noreferrer"
                            title="View contract on block explorer"
                            className="glass flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono text-[#8F94A6] hover:text-white hover:border-white/20 transition"
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
                                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 flex items-center gap-1.5"
                                    >
                                        <span>⚠️</span> Switch Network
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1 glass rounded-xl p-1 text-xs">
                                        <button
                                            onClick={() => switchNetwork(BASE_SEPOLIA_CHAIN_ID)}
                                            className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                                isBase
                                                    ? 'bg-white text-black font-semibold shadow-sm'
                                                    : 'text-[#8F94A6] hover:text-white'
                                            }`}
                                        >
                                            Base Sepolia
                                        </button>
                                        <button
                                            onClick={() => switchNetwork(OP_SEPOLIA_CHAIN_ID)}
                                            className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                                isOp
                                                    ? 'bg-white text-black font-semibold shadow-sm'
                                                    : 'text-[#8F94A6] hover:text-white'
                                            }`}
                                        >
                                            OP Sepolia
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
                                className="rounded-xl bg-white text-black px-5 py-2 text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setViewProfileWallet(address)}
                                className="glass flex items-center gap-3 rounded-xl px-3.5 py-1.5 hover:border-white/20 transition group cursor-pointer"
                                title="View Your Reputation & Badges"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    <span className="font-mono text-xs text-white group-hover:underline">
                                        {address.slice(0, 6)}...{address.slice(-4)}
                                    </span>
                                </div>
                                <span className="text-xs font-mono font-medium text-white/90">
                                    {balance} ETH
                                </span>
                                <span className="text-[10px] text-[#8F94A6] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 group-hover:text-white">
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
                    <p className="mt-2 max-w-2xl text-base text-[#8F94A6]">
                        Post work, escrow milestones, and resolve disputes on-chain with zero counterparty risk.
                        Testnet ETH available on the{' '}
                        <a
                            href="https://console.optimism.io/faucet"
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-white/80 hover:text-white"
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
                    onOpenActivityFeed={() => setShowActivityFeed(true)}
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

            {/* Live Platform Activity Stream Modal */}
            {showActivityFeed && (
                <ActivityFeedModal
                    onClose={() => setShowActivityFeed(false)}
                    chainId={chainId}
                    onSelectBounty={() => {
                        setShowActivityFeed(false);
                    }}
                />
            )}
            </div>
        </main>
    );
}
