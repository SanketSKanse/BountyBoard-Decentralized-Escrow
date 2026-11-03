import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useInView, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Lock, ExternalLink, FileCode, Clock, Cpu } from 'lucide-react';
import { BOUNTY_ESCROW_ADDRESS } from '../../contracts/config';
import { TextScramble } from './TextScramble';

export const ProtocolVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  // Tightened scroll track to 250vh (no dead gaps before or after)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest < 0.25) {
        setActivePhase(1);
      } else if (latest < 0.5) {
        setActivePhase(2);
      } else if (latest < 0.75) {
        setActivePhase(3);
      } else {
        setActivePhase(4);
      }
    });
  }, [scrollYProgress]);

  const scrollToPhase = (phaseNumber: 1 | 2 | 3 | 4) => {
    setActivePhase(phaseNumber);
    if (!containerRef.current) return;
    const offsets = { 1: 0.05, 2: 0.35, 3: 0.65, 4: 0.95 };
    const targetOffset = offsets[phaseNumber];
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: containerTop + containerHeight * targetOffset,
      behavior: 'smooth',
    });
  };

  const phases = [
    { num: 1, label: '01 DEPOSIT', title: 'Non-Custodial Escrow Vault' },
    { num: 2, label: '02 SIGNED BID', title: 'EIP-712 Cryptographic Signature' },
    { num: 3, label: '03 PR SUBMISSION', title: 'On-Chain Deliverable Proof' },
    { num: 4, label: '04 SETTLEMENT', title: 'Instant Autonomous Settlement' },
  ];

  return (
    <section id="escrow-core" ref={containerRef} className="relative h-[250vh] bg-transparent">
      {/* Sticky Dual-Pane Terminal Viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-hidden px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Section Header */}
        <div className="w-full max-w-7xl mx-auto mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4">
          <div className="shrink min-w-0">
            <span className="font-mono text-xs text-[#8F94A6] tracking-widest uppercase block mb-1.5 sm:mb-2">
              // DECENTRALIZED PROTOCOL RUNTIME
            </span>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-[42px] xl:text-5xl font-normal text-white tracking-tight">
              4-Phase Autonomous Escrow Engine
            </h2>
          </div>

          {/* Phase Tracker Pills (Strictly in one single line without wrapping) */}
          <div className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0 overflow-x-auto no-scrollbar py-1">
            {phases.map((p, index) => {
              const isCurrent = activePhase === p.num;
              return (
                <React.Fragment key={p.num}>
                  <button
                    onClick={() => scrollToPhase(p.num as 1 | 2 | 3 | 4)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-[10px] sm:text-[11px] tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-white text-black font-semibold shadow-md'
                        : 'border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 bg-[#111624]/50'
                    }`}
                  >
                    {p.label}
                  </button>
                  {index < phases.length - 1 && (
                    <span className="text-white/20 text-xs hidden sm:inline shrink-0 select-none">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Expansive Dual-Pane Container: Left card visible on desktop, Terminal prioritized on mobile */}
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Contextual Protocol Rules & Telemetry (Hidden on small mobile screens to prevent text overload) */}
          <div className="hidden lg:flex lg:col-span-5 rounded-2xl border border-white/10 bg-[#0F1420]/80 p-6 sm:p-7 backdrop-blur-xl flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E8A94D] animate-pulse" />
                  <span className="font-mono text-xs text-white uppercase tracking-wider font-semibold">
                    PHASE 0{activePhase} // 04
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#8F94A6]">
                  State Machine Active
                </span>
              </div>

              {/* Dynamic Phase Explanation */}
              <div className="mt-5 space-y-4">
                <AnimatePresence mode="wait">
                  {activePhase === 1 && (
                    <motion.div
                      key="desc-phase-1"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h3 className="font-display text-2xl text-white font-normal">
                        Non-Custodial Escrow Vault Lock
                      </h3>
                      <p className="text-sm text-[#8F94A6] leading-relaxed font-light">
                        The client locks 100% of the project funds (USDC) into the audited BountyEscrow smart contract. No middleman, platform founder, or centralized entity can freeze, rehypothecate, or divert your funds.
                      </p>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Funds isolated in immutable smart contract vault</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Client cannot revoke funds once work starts</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Builder works with mathematical payment guarantee</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePhase === 2 && (
                    <motion.div
                      key="desc-phase-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h3 className="font-display text-2xl text-white font-normal">
                        EIP-712 Typed Signature Bidding
                      </h3>
                      <p className="text-sm text-[#8F94A6] leading-relaxed font-light">
                        Developers submit proposals using gasless EIP-712 cryptographic signatures. The contract securely verifies the developer's wallet identity and milestone commitments without burning gas fees.
                      </p>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Zero gas cost for developer proposal submission</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Cryptographic binding of milestones and deadlines</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Client approves bid via smart contract assignment</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePhase === 3 && (
                    <motion.div
                      key="desc-phase-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h3 className="font-display text-2xl text-white font-normal">
                        On-Chain Deliverable Proof & Review
                      </h3>
                      <p className="text-sm text-[#8F94A6] leading-relaxed font-light">
                        Upon completing the milestone, the builder commits the deliverable hash (Git commit and IPFS CID) on-chain. An automated review clock begins, protecting both parties against delays.
                      </p>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Immutable hash stamped to block header</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Automated timer prevents client ghosting</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Decentralized 2-of-3 arbiter quorum standing by</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePhase === 4 && (
                    <motion.div
                      key="desc-phase-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h3 className="font-display text-2xl text-white font-normal">
                        2-Second Settlement & SBT Mint
                      </h3>
                      <p className="text-sm text-[#8F94A6] leading-relaxed font-light">
                        Upon review completion, the contract releases payment in 2 seconds directly to the builder's wallet. 99% payout, only 1% platform fee. Concurrently, an on-chain Soulbound reputation badge is minted.
                      </p>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Instant 2s Layer-2 settlement on Base</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>1% flat fee (eliminates 20% Web2 fee cut)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-white/90">
                          <Check className="w-3.5 h-3.5 text-[#6EE7B7]" />
                          <span>Soulbound ERC-721 badge minted to builder</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Protocol Telemetry Box */}
            <div className="mt-6 pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-black/30">
                <span className="text-[#8F94A6] block">Contract Address</span>
                <span className="text-white font-medium mt-0.5 block truncate">
                  {BOUNTY_ESCROW_ADDRESS.slice(0, 6)}...{BOUNTY_ESCROW_ADDRESS.slice(-4)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-white/[0.06] bg-black/30">
                <span className="text-[#8F94A6] block">Dispute Protocol</span>
                <span className="text-[#6EE7B7] font-medium mt-0.5 block">
                  2-of-3 Multi-Sig
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Tech Escrow Terminal (Takes full comfortable width on mobile) */}
          <div className="lg:col-span-7 w-full max-w-xl lg:max-w-none mx-auto rounded-2xl border border-white/10 bg-[#0B0E17]/95 p-5 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] font-mono text-xs text-[#8F94A6]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6EE7B7] animate-pulse" />
                <span className="text-white font-medium">Bounty #104 Execution Terminal</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-white/60">Base Sepolia</span>
                <span className="text-white/20">•</span>
                <span className="text-white">Block #19,420,110</span>
              </div>
            </div>

            {/* Central Terminal Body Morphs */}
            <div className="py-6 min-h-[260px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                
                {/* PHASE 1: DEPOSIT */}
                {activePhase === 1 && (
                  <motion.div
                    key="terminal-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                      <div>
                        <span className="font-mono text-xs text-[#8F94A6] uppercase tracking-wider block">
                          Locked in Escrow Contract
                        </span>
                        <div className="mt-1 font-display text-4xl sm:text-5xl font-normal text-white">
                          1,500 <span className="font-mono text-sm text-[#E8A94D] font-medium">USDC</span>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8A94D]/30 bg-[#E8A94D]/10 text-xs font-mono text-[#E8A94D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E8A94D] animate-ping" />
                        <span>Awaiting Proposals</span>
                      </div>
                    </div>

                    {/* Progress Bar & Contract Detail */}
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[#E8A94D] to-white rounded-full"
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[11px] text-[#8F94A6]">
                        <span>Client Vault 0x8A92...3F10</span>
                        <span className="text-white">100% Funded & Verified</span>
                      </div>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-xl border border-white/[0.06] bg-black/40 font-mono text-xs space-y-1">
                      <div className="text-[#8F94A6] text-[11px]">BountyCreated: 1,500 USDC locked into escrow vault</div>
                      <div className="text-[#6EE7B7] text-[11px]">Non-custodial smart contract verified • Awaiting proposals</div>
                    </div>
                  </motion.div>
                )}

                {/* PHASE 2: SIGNED BID */}
                {activePhase === 2 && (
                  <motion.div
                    key="terminal-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="font-mono text-xs text-white">
                        Developer: <span className="text-[#8F94A6]">0x71C2...4e8</span>
                      </div>
                      <span className="font-mono text-[11px] text-[#6EE7B7] border border-[#6EE7B7]/30 bg-[#6EE7B7]/10 px-2.5 py-0.5 rounded flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Cryptographic Signature Verified (0 Gas)</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-white/[0.08] bg-black/40 font-mono text-xs space-y-2">
                      <div className="flex justify-between text-[#8F94A6] text-[11px]">
                        <span>EIP-712 Typed Proposal Digest</span>
                        <span className="text-white">Chain ID: 84532</span>
                      </div>
                      <code className="text-[#E8A94D] text-[11px] break-all block bg-black/60 p-2.5 rounded border border-white/[0.06]">
                        0x94f27eb6a029c71e23f00194821a37c9921b7b8a1098234fc4828109bfcd
                      </code>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs text-[#8F94A6]">
                      <span>Milestone Timeline: 5 Days</span>
                      <span className="text-white font-medium">Status: Assigned & Work In Progress</span>
                    </div>
                  </motion.div>
                )}

                {/* PHASE 3: PR SUBMISSION */}
                {activePhase === 3 && (
                  <motion.div
                    key="terminal-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#8F94A6]">Deliverable Proof Committed</span>
                      <span className="font-mono text-[11px] text-white px-2.5 py-0.5 rounded border border-white/20 bg-white/[0.04] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E8A94D]" />
                        <span>Inspection Timer: 72h Auto-Settlement</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-white/[0.08] bg-black/50 font-mono text-xs space-y-2.5">
                      <div className="flex items-center gap-2 text-white">
                        <span className="text-[#8F94A6]">commit</span>
                        <code className="text-[#E8A94D] font-bold">4a9f2b1</code>
                        <span>— "PR #14: Implement Uniswap V4 Hook & Audit Suite"</span>
                      </div>
                      <div className="text-[#8F94A6] text-[11px] break-all">
                        IPFS CID: ipfs://bafybeigdyrzt5sfp7zk2838190...9k3q • Block #19,420,112
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-[#8F94A6]">
                      <span>Client review window active.</span>
                      <span className="text-emerald-400">Arbiter standing by • 0 Disputes</span>
                    </div>
                  </motion.div>
                )}

                {/* PHASE 4: SETTLEMENT */}
                {activePhase === 4 && (
                  <motion.div
                    key="terminal-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#6EE7B7]/20 border border-[#6EE7B7]/40 flex items-center justify-center text-[#6EE7B7]">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="font-mono text-xs text-[#6EE7B7] font-semibold">
                          Settlement Finalized in 2 Seconds
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#8F94A6]">
                        Block #19,420,114
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                        <span className="text-[#8F94A6] text-[11px] block">Freelancer Payout (99%)</span>
                        <div className="text-2xl font-display text-white mt-1">
                          1,485 <span className="font-mono text-xs text-[#6EE7B7]">USDC</span>
                        </div>
                        <span className="text-[10px] text-[#6EE7B7] mt-1 block">Sent directly to 0x71C2...4e8</span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
                        <span className="text-[#8F94A6] text-[11px] block">Protocol Treasury (1%)</span>
                        <div className="text-2xl font-display text-white mt-1">
                          15 <span className="font-mono text-xs text-[#8F94A6]">USDC</span>
                        </div>
                        <span className="text-[10px] text-[#8F94A6] mt-1 block">0% middleman gouge</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between font-mono text-[11px] text-[#8F94A6]">
                      <span>Funds settled instantly to developer wallet.</span>
                      <span className="text-white font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#6EE7B7]" />
                        <span>Soulbound Credential #42 Minted</span>
                      </span>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Terminal Bottom Controls */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-[#8F94A6]">
              <div className="flex items-center gap-2">
                <span>Phase 0{activePhase} // 04</span>
                <span className="text-white/20">|</span>
                <a
                  href={`https://sepolia.basescan.org/address/${BOUNTY_ESCROW_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition flex items-center gap-1"
                >
                  <span>BaseScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollToPhase(Math.max(1, activePhase - 1) as 1 | 2 | 3 | 4)}
                  disabled={activePhase === 1}
                  className="px-2.5 py-1 rounded border border-white/[0.08] hover:text-white disabled:opacity-20 cursor-pointer transition"
                >
                  Prev
                </button>
                <button
                  onClick={() => scrollToPhase(Math.min(4, activePhase + 1) as 1 | 2 | 3 | 4)}
                  disabled={activePhase === 4}
                  className="px-2.5 py-1 rounded border border-white/[0.08] hover:text-white disabled:opacity-20 cursor-pointer transition"
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ProtocolVisualizer;
