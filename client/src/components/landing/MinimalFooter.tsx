import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MinimalFooterProps {
  onEnterApp: () => void;
}

export const MinimalFooter: React.FC<MinimalFooterProps> = ({ onEnterApp }) => {
  return (
    <footer className="py-24 px-4 sm:px-6 lg:px-8 bg-transparent border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        
        {/* High-Contrast Stark Call to Action */}
        <div className="py-16 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-white leading-tight">
            Ready to build or hire on-chain?
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-white text-black font-mono text-xs uppercase tracking-wider font-semibold hover:bg-white/90 active:scale-[0.98] transition cursor-pointer shadow-sm"
            >
              Launch Application →
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg border border-white/20 text-white font-mono text-xs uppercase tracking-wider hover:bg-white/[0.04] transition flex items-center justify-center gap-2"
            >
              <span>Explore GitHub Repo</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#8F94A6]" />
            </a>
          </div>
        </div>

        {/* Footer Bottom Line */}
        <div className="pt-12 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#8F94A6]">
          <div>
            BountyBoard Protocol © {new Date().getFullYear()} // Decentralized Escrow Infrastructure.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Base Sepolia</span>
            <span>•</span>
            <span>Optimism Sepolia</span>
            <span>•</span>
            <span>EIP-712</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

