import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BOUNTY_ESCROW_ADDRESS } from '../../contracts/config';
import { TextScramble } from './TextScramble';

export const SoulboundBadgeScene: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-60px' });

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -7;
    const rotY = ((x - centerX) / centerX) * 7;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const proofFeatures = [
    {
      num: '01',
      tag: 'NON-TRANSFERABLE IDENTITY',
      title: 'Bound Permanently to Builder Wallet',
      description:
        'Unlike traditional speculative NFTs, Soulbound Tokens cannot be transferred, sold, or sybil-farmed. Stored forever in your wallet address as verified cryptographic proof of work.',
      badge: 'EIP-5192 / ERC-721 Locked',
    },
    {
      num: '02',
      tag: 'ON-CHAIN AUDIT TRAIL',
      title: 'Cryptographic Milestone Stamped',
      description:
        'Contains immutable metadata pointing to the project bounty ID, Git commit hash, IPFS deliverables, verified payout, and 2-of-3 multi-sig approval signatures.',
      badge: 'Zero Fraud Verification',
    },
    {
      num: '03',
      tag: 'PORTABLE REPUTATION',
      title: 'Universal Web3 Portfolio',
      description:
        'No centralized marketplace can ban your account, take down your client reviews, or hold your ratings hostage. Your credentials live with you natively on the blockchain.',
      badge: 'Decentralized Proof of Work',
    },
  ];

  return (
    <section
      id="proof"
      ref={sectionRef}
      className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-transparent border-t border-white/[0.06] relative"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Editorial Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-[#8F94A6] tracking-widest uppercase block mb-2">
              // IMMUTABLE PROOF
            </span>
            {/* Underlined item 1: Animated Headline */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white tracking-tight min-h-[48px]">
              <TextScramble
                text="Reputation that cannot be revoked."
                trigger={isInView}
                duration={900}
                delay={200}
              />
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#8F94A6] max-w-2xl font-sans font-light leading-relaxed">
              Every completed contract mints an immutable Soulbound Token (SBT) directly to the developer's wallet, turning verified deliverables into an on-chain resume.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/70 backdrop-blur-md text-xs font-mono text-[#8F94A6] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#6EE7B7] animate-pulse" />
            <span>ERC-721 SOULBOUND STANDARD</span>
          </div>
        </div>

        {/* Expansive 2-Column Grid (Filled Width, No Empty Space) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* Left Column: 3 Rich Feature Proof Cards */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            {proofFeatures.map((feat, idx) => (
              <motion.div
                key={feat.num}
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                className="rounded-2xl border border-white/[0.08] bg-[#0E121E]/70 p-6 sm:p-7 backdrop-blur-xl hover:border-white/20 transition-all duration-300 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <span className="font-mono text-xs text-[#8F94A6] tracking-wider uppercase">
                      {feat.num} // {feat.tag}
                    </span>
                    <span className="font-mono text-[10px] text-white/70 border border-white/[0.08] px-2 py-0.5 rounded bg-white/[0.02]">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-xl sm:text-2xl font-normal text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#8F94A6] font-light leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-[#8F94A6]">
                  <span className="flex items-center gap-1.5 text-white/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7]" />
                    <span>Cryptographically Authenticated</span>
                  </span>
                  <span className="text-white/40">Base Sepolia</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Tactile 3D Interactive Credential Card (Static Real Text, No Scramble) */}
          <div className="lg:col-span-6 flex justify-center items-center perspective-1000 w-full">
            <div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.15s ease-out',
              }}
              className="w-full max-w-lg lg:max-w-none rounded-2xl border border-white/[0.12] bg-[#111624]/90 p-8 sm:p-9 shadow-2xl text-left cursor-default backdrop-blur-xl relative overflow-hidden group"
            >
              {/* Subtle Ambient Radial Highlight */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6EE7B7] animate-pulse" />
                  <span className="font-mono text-xs text-white font-medium uppercase tracking-wider">
                    BOUNTY CREDENTIAL #42
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/90 border border-white/[0.12] px-2.5 py-1 rounded bg-white/[0.04] font-medium">
                  ERC-721 SBT
                </span>
              </div>

              {/* Credential Content */}
              <div className="py-6 space-y-5 relative z-10">
                <div>
                  <span className="font-mono text-[11px] text-[#8F94A6] uppercase tracking-wider block">
                    PROJECT DELIVERABLE
                  </span>
                  <div className="font-display text-2xl sm:text-3xl text-white mt-1.5 font-normal tracking-tight">
                    Automated Market Maker V3 Audit
                  </div>
                </div>

                {/* 2x2 Credential Telemetry Grid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="font-mono text-[10px] text-[#8F94A6] uppercase tracking-wider block">
                      Verified Builder
                    </span>
                    <div className="font-mono text-xs text-white mt-1 font-medium truncate">
                      0x71C2...4e8
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="font-mono text-[10px] text-[#8F94A6] uppercase tracking-wider block">
                      Settled Value
                    </span>
                    <div className="font-mono text-xs text-[#E8A94D] mt-1 font-medium">
                      1,500 USDC
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="font-mono text-[10px] text-[#8F94A6] uppercase tracking-wider block">
                      Deliverable Digest
                    </span>
                    <div className="font-mono text-xs text-white mt-1 truncate">
                      commit #4a9f2b1
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="font-mono text-[10px] text-[#8F94A6] uppercase tracking-wider block">
                      Consensus Quorum
                    </span>
                    <div className="font-mono text-xs text-[#6EE7B7] mt-1 truncate">
                      2-of-3 Multi-Sig
                    </div>
                  </div>
                </div>

                {/* On-Chain Visual Credential Seal */}
                <div className="p-4 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[#6EE7B7]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-white font-medium">
                        On-Chain Soulbound Certificate
                      </div>
                      <div className="font-mono text-[10px] text-[#8F94A6]">
                        Minted at Block #19,420,114 • Base Sepolia
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[#6EE7B7] border border-[#6EE7B7]/30 bg-[#6EE7B7]/10 px-2.5 py-1 rounded">
                    Verified
                  </span>
                </div>
              </div>

              {/* Card Footer: Metadata Chip & Explorer Link */}
              <div className="pt-6 border-t border-white/[0.08] flex items-center justify-between relative z-10">
                <span className="font-mono text-[10px] text-[#8F94A6] tracking-wider uppercase">
                  ERC-721 SOULBOUND // NON-TRANSFERABLE
                </span>
                <a
                  href={`https://sepolia.basescan.org/address/${BOUNTY_ESCROW_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-white hover:text-white/70 flex items-center gap-1.5 transition"
                >
                  <span>View on BaseScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default SoulboundBadgeScene;
