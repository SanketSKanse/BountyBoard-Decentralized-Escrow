import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getExplorerAddressUrl, getExplorerTxUrl } from '../contracts/config';

export interface ActivityEventItem {
    id: string;
    bountyId: number;
    eventType: string;
    actor: string;
    details?: string | null;
    txHash?: string | null;
    createdAt: string;
    bounty?: {
        id: number;
        title: string;
        category?: string;
        tokenSymbol?: string;
    } | null;
}

type Props = {
    onClose: () => void;
    chainId?: bigint | null;
    onSelectBounty?: (bountyId: number) => void;
};

export function getEventBadgeInfo(eventType: string): {
    label: string;
    badgeClass: string;
    icon: string;
} {
    switch (eventType) {
        case 'COMPLETED':
            return {
                label: '🎉 Completed & Minted',
                badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                icon: '🎉',
            };
        case 'CREATED':
            return {
                label: '💼 Bounty Created',
                badgeClass: 'bg-violet/20 text-violet border-violet/40',
                icon: '💼',
            };
        case 'PROPOSAL_SUBMITTED':
            return {
                label: '📝 Proposal Submitted',
                badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                icon: '📝',
            };
        case 'PROPOSAL_ACCEPTED':
            return {
                label: '🤝 Freelancer Hired',
                badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                icon: '🤝',
            };
        case 'WORK_SUBMITTED':
            return {
                label: '📦 Work Delivered',
                badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                icon: '📦',
            };
        case 'DISPUTED':
            return {
                label: '⚠️ Dispute Raised',
                badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                icon: '⚠️',
            };
        case 'DISPUTE_RESOLVED':
            return {
                label: '⚖️ Dispute Resolved',
                badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                icon: '⚖️',
            };
        case 'REFUNDED':
            return {
                label: '🔄 Remainder Refunded',
                badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
                icon: '🔄',
            };
        default:
            return {
                label: eventType,
                badgeClass: 'bg-white/10 text-white border-white/20',
                icon: '⚡',
            };
    }
}

function formatRelativeTime(dateString: string): string {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
}

export function ActivityFeedModal({ onClose, chainId, onSelectBounty }: Props) {
    const [events, setEvents] = useState<ActivityEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchActivity() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/bounties/activity?limit=30`);
            if (!res.ok) {
                throw new Error(`Failed to load activity (${res.status})`);
            }
            const data: ActivityEventItem[] = await res.json();
            setEvents(data);
        } catch (err: any) {
            console.error('Failed to load activity stream:', err);
            setError(err.message || 'Error loading live activity');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    function handleBountyClick(bountyId: number) {
        onSelectBounty?.(bountyId);
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-xl rounded-2xl glass border border-white/15 p-6 shadow-2xl max-h-[85vh] flex flex-col space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/20 border border-violet/30 text-xl">
                            🔔
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                                <span>Live Platform Activity Stream</span>
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            </h2>
                            <p className="text-xs text-[#9B96AE] mt-0.5">
                                Real-time audited escrow events, verified credentials & submissions
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchActivity}
                            disabled={loading}
                            className="rounded-lg p-1.5 text-xs text-[#9B96AE] hover:text-white hover:bg-white/10 transition"
                            title="Refresh events"
                        >
                            🔄
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-[#9B96AE] hover:text-white hover:bg-white/10 transition"
                            title="Close modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content / Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {loading && events.length === 0 ? (
                        <div className="py-16 text-center text-xs text-[#9B96AE] animate-pulse">
                            Loading platform activity events...
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs text-red-300">
                            {error}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center space-y-2">
                            <span className="text-3xl block">📡</span>
                            <div className="text-sm font-semibold text-white">No Activity Recorded Yet</div>
                            <p className="text-xs text-[#9B96AE] max-w-sm mx-auto">
                                Platform events, proposal submissions, milestone payouts, and credential mintings will stream here in real time.
                            </p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const badge = getEventBadgeInfo(event.eventType);
                            let parsedDetails: any = null;
                            if (event.details) {
                                try {
                                    parsedDetails = JSON.parse(event.details);
                                } catch {
                                    // Raw string
                                }
                            }

                            return (
                                <div
                                    key={event.id}
                                    className="rounded-xl bg-white/5 border border-white/10 p-3 hover:border-violet/40 transition flex flex-col gap-2 group"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${badge.badgeClass}`}
                                            >
                                                <span>{badge.icon}</span>
                                                <span>{badge.label}</span>
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => handleBountyClick(event.bountyId)}
                                                className="text-xs font-semibold text-white hover:text-gold transition truncate max-w-[200px] sm:max-w-xs text-left cursor-pointer"
                                                title="Jump to this bounty"
                                            >
                                                {event.bounty?.title || `Bounty #${event.bountyId}`} ↗
                                            </button>
                                        </div>

                                        <span className="text-[11px] text-[#9B96AE] whitespace-nowrap">
                                            {formatRelativeTime(event.createdAt)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-[#9B96AE]">
                                        <div className="flex items-center gap-1.5 font-mono">
                                            <span>Actor:</span>
                                            <a
                                                href={getExplorerAddressUrl(event.actor, chainId)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-violet hover:underline"
                                            >
                                                {event.actor.slice(0, 6)}...{event.actor.slice(-4)}
                                            </a>
                                        </div>

                                        {event.txHash && (
                                            <a
                                                href={getExplorerTxUrl(event.txHash, chainId)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-mint hover:underline font-mono text-[10px]"
                                            >
                                                Tx Proof ↗
                                            </a>
                                        )}
                                    </div>

                                    {parsedDetails && (
                                        <div className="text-[11px] text-[#F1EEE6]/80 bg-black/30 rounded p-2 border border-white/5 font-mono">
                                            {parsedDetails.title && (
                                                <span className="block truncate">Title: {parsedDetails.title}</span>
                                            )}
                                            {parsedDetails.recipient && (
                                                <span className="block truncate">Recipient: {parsedDetails.recipient}</span>
                                            )}
                                            {parsedDetails.tokenId && (
                                                <span className="block text-gold font-bold">
                                                    Soulbound NFT #{parsedDetails.tokenId}
                                                </span>
                                            )}
                                            {parsedDetails.isPrivateDeliverable && (
                                                <span className="block text-violet">🔒 Encrypted Deliverable</span>
                                            )}
                                            {parsedDetails.tokenSymbol && (
                                                <span className="block text-[#9B96AE]">Currency: {parsedDetails.tokenSymbol}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
