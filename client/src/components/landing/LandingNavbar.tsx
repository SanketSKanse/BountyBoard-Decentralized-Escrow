import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

interface LandingNavbarProps {
  onEnterApp: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onEnterApp }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [activeChapter, setActiveChapter] = useState<'01' | '02' | '03' | '04'>('01');

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest < 0.2) {
        setActiveChapter('01');
      } else if (latest < 0.5) {
        setActiveChapter('02');
      } else if (latest < 0.8) {
        setActiveChapter('03');
      } else {
        setActiveChapter('04');
      }
    });
  }, [scrollYProgress]);

  const chapters = [
    { id: '01', label: '01 // INTRO', href: '#hero' },
    { id: '02', label: '02 // THE PROBLEM', href: '#problem' },
    { id: '03', label: '03 // ESCROW CORE', href: '#escrow-core' },
    { id: '04', label: '04 // PROOF', href: '#proof' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/[0.06] bg-[#07090E]/85 backdrop-blur-[20px] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        
        {/* Left: Brand & Mono Subtext */}
        <div className="flex items-center gap-3">
          <a href="#hero" className="flex items-baseline gap-2 group">
            <span className="font-display text-lg font-bold tracking-tight text-white group-hover:text-white/80 transition">
              BountyBoard
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-[#8F94A6] tracking-wider">
              escrow // base & op
            </span>
          </a>
        </div>

        {/* Center: Discrete Scroll Chapter Indicators */}
        <nav className="hidden md:flex items-center gap-6">
          {chapters.map((ch) => {
            const isActive = activeChapter === ch.id;
            return (
              <a
                key={ch.id}
                href={ch.href}
                className={`font-mono text-[11px] tracking-wider transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-[#8F94A6]/60 hover:text-[#8F94A6]'
                }`}
              >
                {ch.label}
              </a>
            );
          })}
        </nav>

        {/* Right: Chain Pill & Stark Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/[0.08] bg-white/[0.02]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
            </span>
            <span className="font-mono text-[11px] text-[#8F94A6]">
              Base Sepolia (84532)
            </span>
          </div>

          <button
            onClick={onEnterApp}
            className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono tracking-wide text-white border border-white/15 bg-white/[0.04] hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
          >
            <span>Launch DApp</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>

      </div>

      {/* Hairline 1px Scroll Progress */}
      <motion.div
        className="h-[1px] bg-white/40 origin-left"
        style={{ scaleX }}
      />
    </header>
  );
};
