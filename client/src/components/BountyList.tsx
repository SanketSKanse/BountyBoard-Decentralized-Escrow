import { useState, useMemo } from 'react';
import { BountyCard } from './BountyCard';
import type { Bounty } from '../hooks/useBounties';
import type { JsonRpcSigner } from 'ethers';

const CATEGORIES = [
    'All Categories',
    'Smart Contracts',
    'Frontend',
    'Full Stack',
    'Security Audit',
    'UI/UX Design',
    'General',
];

const STATUS_FILTERS = [
    { label: 'All Statuses', value: -1 },
    { label: 'Open', value: 0 },
    { label: 'Assigned', value: 1 },
    { label: 'Disputed', value: 2 },
    { label: 'Completed', value: 3 },
    { label: 'Cancelled', value: 4 },
];

type Props = {
    bounties: Bounty[];
    isLoading: boolean;
    connectedAddress: string | null;
    signer: JsonRpcSigner | null;
    chainId?: bigint | null;
    onUpdated: () => void;
};

export function BountyList({
    bounties,
    isLoading,
    connectedAddress,
    signer,
    chainId,
    onUpdated,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedStatus, setSelectedStatus] = useState<number>(-1);
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'FREELANCER'>('ALL');

    const normalizedConnected = connectedAddress?.toLowerCase();

    // Filtered bounties memo
    const filteredBounties = useMemo(() => {
        return bounties.filter((b) => {
            // 1. Text Search (title, description, skills)
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const titleMatch = b.title.toLowerCase().includes(query);
                const descMatch = (b.description || '').toLowerCase().includes(query);
                const skillsMatch = b.skills.some((s) => s.toLowerCase().includes(query));
                const categoryMatch = b.category.toLowerCase().includes(query);
                if (!titleMatch && !descMatch && !skillsMatch && !categoryMatch) {
                    return false;
                }
            }

            // 2. Category filter
            if (selectedCategory !== 'All Categories' && b.category !== selectedCategory) {
                return false;
            }

            // 3. Status filter
            if (selectedStatus !== -1 && b.status !== selectedStatus) {
                return false;
            }

            // 4. Role filter
            if (roleFilter === 'CLIENT') {
                if (!normalizedConnected || b.client.toLowerCase() !== normalizedConnected) {
                    return false;
                }
            } else if (roleFilter === 'FREELANCER') {
                if (!normalizedConnected || b.freelancer.toLowerCase() !== normalizedConnected) {
                    return false;
                }
            }

            return true;
        });
    }, [bounties, searchQuery, selectedCategory, selectedStatus, roleFilter, normalizedConnected]);

    const isFiltered =
        Boolean(searchQuery.trim()) ||
        selectedCategory !== 'All Categories' ||
        selectedStatus !== -1 ||
        roleFilter !== 'ALL';

    function handleClearFilters() {
        setSearchQuery('');
        setSelectedCategory('All Categories');
        setSelectedStatus(-1);
        setRoleFilter('ALL');
    }

    if (isLoading) {
        return (
            <div className="mt-8 rounded-2xl glass p-8 text-center text-[#9B96AE] animate-pulse">
                Loading bounties from the blockchain & marketplace...
            </div>
        );
    }

    if (bounties.length === 0) {
        return (
            <div className="mt-8 rounded-2xl glass p-8 text-center text-[#9B96AE]">
                No bounties found on this network yet. Post the first bounty above!
            </div>
        );
    }

    return (
        <section className="mt-8 space-y-5">
            {/* Filter and Search Controls Bar */}
            <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-[#9B96AE] text-sm">🔍</span>
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, description, or skill tag..."
                            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-[#F1EEE6] placeholder:text-[#9B96AE]/60 focus:border-violet/60 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-2.5 text-xs text-[#9B96AE] hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Category Dropdown */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#161426] px-3 py-2 text-sm text-[#F1EEE6] focus:border-violet/60 focus:outline-none"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-[#161426] text-[#F1EEE6]">
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status & Role Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                    {/* Status Pill Filters */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {STATUS_FILTERS.map((s) => {
                            const isSelected = selectedStatus === s.value;
                            return (
                                <button
                                    key={s.value}
                                    onClick={() => setSelectedStatus(s.value)}
                                    className={`rounded-lg px-2.5 py-1 font-medium transition ${
                                        isSelected
                                            ? 'bg-violet text-vault-bg font-semibold shadow-sm'
                                            : 'bg-white/5 text-[#9B96AE] hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Role Filter (when wallet is connected) */}
                    {connectedAddress && (
                        <div className="flex items-center gap-1 glass rounded-lg p-0.5 text-xs">
                            <button
                                onClick={() => setRoleFilter('ALL')}
                                className={`rounded-md px-2 py-0.5 transition ${
                                    roleFilter === 'ALL'
                                        ? 'bg-white/20 text-white font-medium'
                                        : 'text-[#9B96AE] hover:text-white'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setRoleFilter('CLIENT')}
                                className={`rounded-md px-2 py-0.5 transition ${
                                    roleFilter === 'CLIENT'
                                        ? 'bg-white/20 text-white font-medium'
                                        : 'text-[#9B96AE] hover:text-white'
                                }`}
                            >
                                Created by Me
                            </button>
                            <button
                                onClick={() => setRoleFilter('FREELANCER')}
                                className={`rounded-md px-2 py-0.5 transition ${
                                    roleFilter === 'FREELANCER'
                                        ? 'bg-white/20 text-white font-medium'
                                        : 'text-[#9B96AE] hover:text-white'
                                }`}
                            >
                                Assigned to Me
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Summary & Clear Action */}
                <div className="flex items-center justify-between text-xs text-[#9B96AE] pt-1">
                    <span>
                        Showing <strong className="text-[#F1EEE6]">{filteredBounties.length}</strong> of{' '}
                        {bounties.length} bounties
                    </span>
                    {isFiltered && (
                        <button
                            onClick={handleClearFilters}
                            className="text-gold hover:text-white transition underline"
                        >
                            Reset all filters
                        </button>
                    )}
                </div>
            </div>

            {/* Bounties Grid / List */}
            {filteredBounties.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center text-[#9B96AE] space-y-3">
                    <p className="text-base font-medium text-[#F1EEE6]">No bounties matched your criteria.</p>
                    <p className="text-xs">
                        Try adjusting your search terms, status, category, or role filter.
                    </p>
                    <button
                        onClick={handleClearFilters}
                        className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBounties.map((b) => (
                        <BountyCard
                            key={b.id}
                            bounty={b}
                            connectedAddress={connectedAddress}
                            signer={signer}
                            chainId={chainId}
                            onUpdated={onUpdated}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}