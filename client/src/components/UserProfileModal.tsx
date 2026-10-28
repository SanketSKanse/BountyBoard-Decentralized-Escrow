import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getExplorerAddressUrl } from '../contracts/config';

export interface UserBadge {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export interface UserProfile {
    id: string;
    wallet: string;
    username?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    skills?: string | null;
    githubHandle?: string | null;
    completedAsWorker: number;
    completedAsClient: number;
    totalEarnedEth: number;
    totalEarnedUsd: number;
    badges: UserBadge[];
    createdAt?: string;
}

type Props = {
    wallet: string;
    currentAccount?: string | null;
    chainId?: bigint | null;
    onClose: () => void;
    onProfileUpdated?: () => void;
};

export function UserProfileModal({
    wallet,
    currentAccount,
    chainId,
    onClose,
    onProfileUpdated,
}: Props) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit profile form state
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [skills, setSkills] = useState('');
    const [githubHandle, setGithubHandle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isOwner = Boolean(
        currentAccount && currentAccount.toLowerCase() === wallet.toLowerCase()
    );

    useEffect(() => {
        let isMounted = true;
        async function fetchProfile() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/users/${wallet.toLowerCase()}`);
                if (!res.ok) {
                    throw new Error(`Failed to load profile (${res.status})`);
                }
                const data: UserProfile = await res.json();
                if (isMounted) {
                    setProfile(data);
                    setUsername(data.username || '');
                    setBio(data.bio || '');
                    setAvatarUrl(data.avatarUrl || '');
                    setSkills(data.skills || '');
                    setGithubHandle(data.githubHandle || '');
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Error loading profile');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchProfile();
        return () => {
            isMounted = false;
        };
    }, [wallet]);

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus(null);

        try {
            const res = await fetch(`${API_BASE_URL}/users/${wallet.toLowerCase()}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    bio: bio.trim(),
                    avatarUrl: avatarUrl.trim(),
                    skills: skills.trim(),
                    githubHandle: githubHandle.trim(),
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update profile');
            }

            const updated: UserProfile = await res.json();
            setProfile(updated);
            setIsEditing(false);
            setSaveStatus('Profile updated successfully!');
            onProfileUpdated?.();
            setTimeout(() => setSaveStatus(null), 3500);
        } catch (err: any) {
            setSaveStatus(`Error: ${err.message || 'Could not save profile'}`);
        } finally {
            setIsSaving(false);
        }
    }

    function handleCopyAddress() {
        navigator.clipboard.writeText(wallet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const skillsList = (profile?.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-lg rounded-2xl glass border border-white/15 p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header / Close button */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                            <span>User Reputation & Profile</span>
                            {isOwner && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet/20 border border-violet/40 text-violet">
                                    You
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-[#9B96AE] mt-0.5">
                            On-chain performance, verified badges & activity credentials.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#9B96AE] hover:text-white hover:bg-white/10 transition"
                        title="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-[#9B96AE] animate-pulse">
                        Loading reputation metrics & on-chain badges...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
                        {error}
                    </div>
                ) : profile ? (
                    <>
                        {/* Profile Header Avatar & Identity */}
                        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="relative">
                                {profile.avatarUrl ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt={profile.username || 'Avatar'}
                                        className="h-16 w-16 rounded-full object-cover border-2 border-violet/50 shadow-md"
                                        onError={(e) => {
                                            // Fallback if image fails
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-violet to-gold text-2xl font-bold text-vault-bg shadow-md">
                                        {(profile.username || wallet.slice(2, 4)).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bold text-lg text-white truncate">
                                        {profile.username || 'Web3 Builder'}
                                    </h3>
                                    {isOwner && !isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="text-xs text-gold hover:underline transition"
                                        >
                                            Edit Profile
                                        </button>
                                    )}
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono text-xs text-[#9B96AE] truncate">
                                        {wallet.slice(0, 8)}...{wallet.slice(-6)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyAddress}
                                        className="text-[11px] text-[#9B96AE] hover:text-white transition"
                                        title="Copy wallet address"
                                    >
                                        {copied ? '✓' : '📋'}
                                    </button>
                                    <a
                                        href={getExplorerAddressUrl(wallet, chainId)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-violet hover:underline flex items-center gap-0.5"
                                        title="View on block explorer"
                                    >
                                        Explorer ↗
                                    </a>
                                </div>
                            </div>
                        </div>

                        {saveStatus && (
                            <div
                                className={`rounded-lg p-2.5 text-xs text-center font-medium ${
                                    saveStatus.startsWith('Error')
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                            >
                                {saveStatus}
                            </div>
                        )}

                        {/* Edit Mode Form */}
                        {isEditing ? (
                            <form
                                onSubmit={handleSaveProfile}
                                className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gold">
                                        Edit Your Profile
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="text-xs text-[#9B96AE] hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs text-[#9B96AE] block">Display Name</label>
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="e.g. SatoshiCraft"
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-violet/60 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-[#9B96AE] block">Avatar Image URL</label>
                                    <input
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        placeholder="https://... (e.g. GitHub or IPFS image)"
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-violet/60 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-[#9B96AE] block">Bio / Summary</label>
                                    <textarea
                                        rows={2}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Experienced Solidity auditor & full-stack Web3 developer..."
                                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-violet/60 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-[#9B96AE] block">
                                            Skills (comma-separated)
                                        </label>
                                        <input
                                            value={skills}
                                            onChange={(e) => setSkills(e.target.value)}
                                            placeholder="Solidity, React, Rust"
                                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-violet/60 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-[#9B96AE] block">GitHub Username</label>
                                        <input
                                            value={githubHandle}
                                            onChange={(e) => setGithubHandle(e.target.value)}
                                            placeholder="e.g. octocat"
                                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-violet/60 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="rounded-lg px-3 py-1.5 text-xs text-[#9B96AE] hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="rounded-lg bg-gold px-4 py-1.5 text-xs font-bold text-vault-bg hover:brightness-110 disabled:opacity-50 transition"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </form>
                        ) : null}

                        {/* Bio & Links if present */}
                        {!isEditing && (
                            <div className="space-y-3">
                                {profile.bio && (
                                    <p className="text-xs text-[#F1EEE6]/90 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5">
                                        {profile.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    {profile.githubHandle && (
                                        <a
                                            href={`https://github.com/${profile.githubHandle.replace(
                                                /^@/,
                                                ''
                                            )}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white border border-white/10 transition"
                                        >
                                            <span>🐙</span>
                                            <span>github.com/{profile.githubHandle.replace(/^@/, '')}</span>
                                            <span className="text-[10px]">↗</span>
                                        </a>
                                    )}

                                    {skillsList.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-md bg-violet/15 border border-violet/30 px-2 py-0.5 text-[11px] font-medium text-violet"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Key Performance Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                                <span className="text-xs text-[#9B96AE] block">🌟 Completed</span>
                                <span className="text-lg font-bold text-emerald-400">
                                    {profile.completedAsWorker}
                                </span>
                                <span className="text-[10px] text-[#9B96AE] block mt-0.5">Freelancer</span>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                                <span className="text-xs text-[#9B96AE] block">💼 Funded</span>
                                <span className="text-lg font-bold text-blue-400">
                                    {profile.completedAsClient}
                                </span>
                                <span className="text-[10px] text-[#9B96AE] block mt-0.5">Client</span>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                                <span className="text-xs text-[#9B96AE] block">💰 Volume Earned</span>
                                <span className="text-sm font-bold text-gold block truncate">
                                    {profile.totalEarnedEth.toFixed(3)} ETH
                                </span>
                                {profile.totalEarnedUsd > 0 && (
                                    <span className="text-[10px] text-[#2775CA] block font-semibold truncate">
                                        +${profile.totalEarnedUsd.toFixed(0)} USDC
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Verified Badges Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9B96AE]">
                                    Verified Skill & Reputation Badges
                                </h4>
                                <span className="text-[11px] font-semibold text-gold">
                                    {profile.badges.length} Unlocked
                                </span>
                            </div>

                            {profile.badges.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-[#9B96AE]">
                                    No badges unlocked yet. Complete or fund bounties to earn verified on-chain badges!
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {profile.badges.map((b) => (
                                        <div
                                            key={b.id}
                                            className="flex items-start gap-2.5 rounded-xl bg-white/5 p-2.5 border border-white/10 hover:border-gold/30 transition"
                                        >
                                            <span className="text-2xl">{b.icon}</span>
                                            <div>
                                                <div className="font-semibold text-xs text-white">
                                                    {b.title}
                                                </div>
                                                <div className="text-[11px] text-[#9B96AE] leading-tight">
                                                    {b.description}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
