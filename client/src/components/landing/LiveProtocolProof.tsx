import React, { useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import { Copy, Check, ExternalLink, Terminal } from 'lucide-react';
import { BOUNTY_ESCROW_ADDRESS } from '../../contracts/config';
import { TextScramble } from './TextScramble';

export const LiveProtocolProof: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Automatically trigger when scrolled into view (runs once per viewport arrival)
  const isStatsInView = useInView(statsRef, { once: true, margin: '-40px' });

  const copyAddress = () => {
    navigator.clipboard.writeText(BOUNTY_ESCROW_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="telemetry"
      ref={sectionRef}
      className="py-24 px-4 sm:px-6 lg:px-8 bg-transparent border-t border-white/[0.06] relative"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Editorial Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs text-[#8F94A6] tracking-widest uppercase block mb-2">
              // ON-CHAIN IMMUTABILITY & PROOF
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-normal text-white tracking-tight min-h-[44px]">
              <TextScramble
                text="Math replaces trust. Code guarantees payout."
                trigger={isStatsInView}
                duration={850}
                delay={250}
              />
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8F94A6]">
            <span className="w-2 h-2 rounded-full bg-[#6EE7B7] animate-pulse" />
            <span>BASE SEPOLIA TESTNET LIVE</span>
          </div>
        </div>

        {/* 4-Column Minimal Stat Grid with 1px Hairline Dividers (Static Crisp Text, No Scramble) */}
        <div
          ref={statsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06] border-y border-white/[0.06]"
        >
          {/* STAT 1: Custodial Risk */}
          <div className="p-8 sm:p-10 flex flex-col justify-between group hover:bg-white/[0.01] transition-colors">
            <div>
              <div className="font-display text-5xl sm:text-6xl font-normal text-white tracking-tight">
                0%
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-white/90 mt-4 font-semibold">
                Custodial Risk
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#8F94A6] font-light leading-relaxed">
              Funds live locked on-chain in smart contracts, never on centralized servers.
            </p>
          </div>

          {/* STAT 2: Finality */}
          <div className="p-8 sm:p-10 flex flex-col justify-between group hover:bg-white/[0.01] transition-colors">
            <div>
              <div className="font-display text-5xl sm:text-6xl font-normal text-white tracking-tight">
                2s
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-white/90 mt-4 font-semibold">
                Finality
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#8F94A6] font-light leading-relaxed">
              Sub-second block confirmation powered by Base & Optimism L2 rollups.
            </p>
          </div>

          {/* STAT 3: Protocol Fee */}
          <div className="p-8 sm:p-10 flex flex-col justify-between group hover:bg-white/[0.01] transition-colors">
            <div>
              <div className="font-display text-5xl sm:text-6xl font-normal text-white tracking-tight">
                1%
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-white/90 mt-4 font-semibold">
                Protocol Fee
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#8F94A6] font-light leading-relaxed">
              99% of funds flow directly to the builder. Zero predatory platform take rates.
            </p>
          </div>

          {/* STAT 4: Open Source */}
          <div className="p-8 sm:p-10 flex flex-col justify-between group hover:bg-white/[0.01] transition-colors">
            <div>
              <div className="font-display text-5xl sm:text-6xl font-normal text-white tracking-tight">
                100%
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-white/90 mt-4 font-semibold">
                Open Source
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-[#8F94A6] font-light leading-relaxed">
              Verified Solidity smart contracts auditable line-by-line on BaseScan.
            </p>
          </div>
        </div>

        {/* Direct Block Explorer Banner (Static Code Display, No Scrambling) */}
        <div className="mt-12 rounded-xl border border-white/[0.08] bg-[#111624] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-3 w-full lg:max-w-2xl">
            {/* Top Bar with distinct split: Left is ACTIVE DEPLOYED / CONTRACT, Right corner is BASE SEPOLIA */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/[0.06] w-full">
              <div className="flex items-start gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#6EE7B7] mt-0.5 shrink-0" />
                <div className="font-mono text-[11px] text-[#8F94A6] uppercase tracking-wider leading-tight">
                  <span>ACTIVE DEPLOYED</span>
                  <span className="block text-white font-medium">CONTRACT</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#6EE7B7]/10 border border-[#6EE7B7]/25 text-[#6EE7B7] font-mono text-[10px] tracking-wider uppercase shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7] animate-pulse" />
                <span>BASE SEPOLIA</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <code className="font-mono text-xs sm:text-sm md:text-base font-medium break-all select-all tracking-tight text-white">
                {BOUNTY_ESCROW_ADDRESS}
              </code>
              <span className="font-mono text-[10px] text-[#6EE7B7] tracking-wider uppercase px-2 py-0.5 rounded bg-[#6EE7B7]/10 border border-[#6EE7B7]/25 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7]" />
                Verified
              </span>

              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  onClick={copyAddress}
                  className="p-1.5 rounded-md border border-white/[0.08] hover:border-white/20 text-[#8F94A6] hover:text-white transition cursor-pointer"
                  title="Copy contract address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#6EE7B7]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="font-mono text-[11px] text-[#8F94A6]/80 pt-1">
              Escrow Core // Non-Reentrant Multi-Token Protocol // EIP-712 Verified
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
            <a
              href={`https://sepolia.basescan.org/address/${BOUNTY_ESCROW_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-white/20 bg-white/[0.03] hover:bg-white hover:text-black font-mono text-xs tracking-wider uppercase text-white transition-all duration-200 w-full sm:w-auto"
            >
              <span>BaseScan Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

export default LiveProtocolProof;
