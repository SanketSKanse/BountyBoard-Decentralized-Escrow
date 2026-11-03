import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TextScramble } from './TextScramble';
import { RotatingWords } from './RotatingWords';

interface CinematicHeroProps {
  onEnterApp: () => void;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({ onEnterApp }) => {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Parallax and depth transforms on scroll down
  const contentY = useTransform(scrollYProgress, [0, 0.8], [0, 85]);
  const contentScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.94]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.15]);

  // Floating ambient badges drift outward in 3D parallax space as user scrolls towards Problem
  const badge1X = useTransform(scrollYProgress, [0, 0.7], [0, -120]);
  const badge1Y = useTransform(scrollYProgress, [0, 0.7], [0, -60]);
  const badge1Opacity = useTransform(scrollYProgress, [0, 0.55], [0.9, 0]);

  const badge2X = useTransform(scrollYProgress, [0, 0.7], [0, 120]);
  const badge2Y = useTransform(scrollYProgress, [0, 0.7], [0, -60]);
  const badge2Opacity = useTransform(scrollYProgress, [0, 0.55], [0.9, 0]);

  const badge3X = useTransform(scrollYProgress, [0, 0.7], [0, -90]);
  const badge3Y = useTransform(scrollYProgress, [0, 0.7], [0, 80]);
  const badge3Opacity = useTransform(scrollYProgress, [0, 0.55], [0.9, 0]);

  const badge4X = useTransform(scrollYProgress, [0, 0.7], [0, 90]);
  const badge4Y = useTransform(scrollYProgress, [0, 0.7], [0, 80]);
  const badge4Opacity = useTransform(scrollYProgress, [0, 0.55], [0.9, 0]);

  // Optical laser conduit stretching and guiding down into the Problem section
  const conduitHeight = useTransform(scrollYProgress, [0, 0.8], [42, 110]);
  const photonY = useTransform(scrollYProgress, [0, 0.8], [0, 95]);
  const conduitOpacity = useTransform(scrollYProgress, [0, 0.25, 0.85], [0.75, 1, 0.8]);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 pt-28 pb-12 overflow-hidden bg-transparent"
    >
      {/* Top spacer for navbar balance */}
      <div className="w-full h-4" />

      {/* Center Kinetic Headline & Narrative Container with Scroll-Linked Parallax */}
      <motion.div
        style={{ y: contentY, scale: contentScale, opacity: contentOpacity }}
        className="w-full max-w-5xl mx-auto text-center flex flex-col items-center relative z-10"
      >
        {/* Ambient Web3 Badges with scroll-driven outward parallax drift */}
        <motion.div
          style={{ x: badge1X, y: badge1Y, opacity: badge1Opacity }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden md:flex absolute -top-8 left-4 lg:left-10 items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/70 backdrop-blur-md text-[11px] font-mono text-[#8F94A6] shadow-xl pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7] animate-pulse" />
          <span>2-Second Settlement</span>
        </motion.div>

        <motion.div
          style={{ x: badge2X, y: badge2Y, opacity: badge2Opacity }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hidden md:flex absolute -top-6 right-4 lg:right-10 items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/70 backdrop-blur-md text-[11px] font-mono text-[#8F94A6] shadow-xl pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
          <span>100% Non-Custodial</span>
        </motion.div>

        <motion.div
          style={{ x: badge3X, y: badge3Y, opacity: badge3Opacity }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="hidden md:flex absolute -bottom-6 left-8 lg:left-16 items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/70 backdrop-blur-md text-[11px] font-mono text-[#8F94A6] shadow-xl pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span>1% Transparent Fee</span>
        </motion.div>

        <motion.div
          style={{ x: badge4X, y: badge4Y, opacity: badge4Opacity }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="hidden md:flex absolute -bottom-8 right-8 lg:right-16 items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/70 backdrop-blur-md text-[11px] font-mono text-[#8F94A6] shadow-xl pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7]" />
          <span>Base & OP Superchain</span>
        </motion.div>

        {/* Top Pill with Cryptographic Scramble Effect on Load */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-[#111624]/80 backdrop-blur-md text-[#8F94A6] font-mono text-[11px] tracking-wider uppercase shadow-lg"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <TextScramble
            text="AUTONOMOUS ESCROW PROTOCOL"
            duration={1100}
            delay={100}
          />
        </motion.div>

        {/* Headline with Rotating Words (Direct text, no letter formation scramble) */}
        <div className="w-full origin-center">
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-normal tracking-tight text-white leading-[1.08]">
            Freelance contracts that <br />
            <RotatingWords
              words={[
                'enforce themselves.',
                'settle in seconds on Base.',
                'eliminate middleman cuts.',
                'mint on-chain reputation.',
                'protect client & builder.',
              ]}
              intervalMs={2800}
              className="text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]"
            />
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 text-base sm:text-lg text-[#8F94A6] max-w-3xl mx-auto font-sans font-light leading-relaxed min-h-[56px]"
        >
          <TextScramble
            text="Funds securely locked in smart contracts on Base & Optimism. Automated milestone releases, decentralized dispute protection, and zero 20% platform taxation."
            duration={1300}
            delay={350}
          />
        </motion.p>

        {/* Interactive CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
        >
          <button
            onClick={onEnterApp}
            className="px-7 py-3.5 rounded-xl font-mono text-xs tracking-wider uppercase bg-white text-black font-semibold hover:bg-white/90 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <TextScramble text="Launch DApp" duration={900} delay={500} />
            <span className="font-sans font-bold">→</span>
          </button>
          <a
            href="#problem"
            className="px-7 py-3.5 rounded-xl font-mono text-xs tracking-wider uppercase text-[#8F94A6] hover:text-white border border-white/[0.1] hover:border-white/25 bg-[#111624]/40 backdrop-blur-sm transition-all inline-flex items-center gap-1.5"
          >
            <TextScramble text="Explore The Flow" duration={900} delay={650} />
            <span className="font-sans font-bold">↓</span>
          </a>
        </motion.div>

      </motion.div>

      {/* Single Clean Bottom Scroll Indicator (No duplicate lines/dots) */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-2.5 cursor-pointer opacity-75 hover:opacity-100 transition-opacity z-10 pt-4"
        onClick={() => {
          document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="font-mono text-[10px] tracking-widest text-[#8F94A6] uppercase flex items-center gap-1 hover:text-white transition">
          <span>Scroll to explore</span>
          <span>↓</span>
        </span>
        <div className="w-[1px] h-9 bg-gradient-to-b from-white/50 via-white/20 to-transparent relative overflow-hidden">
          <motion.div
            animate={{ y: [-15, 36] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-full h-4 bg-white shadow-[0_0_8px_white]"
          />
        </div>
      </motion.div>
    </section>
  );
};
