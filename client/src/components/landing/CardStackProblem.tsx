import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { TextScramble } from './TextScramble';

export const CardStackProblem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const isLeftColInView = useInView(leftColRef, { once: true, margin: '-40px' });

  // Tightened scroll track to 220vh to eliminate dead empty space before Escrow Code
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Card 1 transforms: starts fully visible; dims and subtly scales down as Card 2 arrives
  const card1Scale = useTransform(scrollYProgress, [0.12, 0.44], [1, 0.94]);
  const card1Opacity = useTransform(scrollYProgress, [0.12, 0.44], [1, 0.35]);

  // Card 2 transforms:
  // Starts hidden (opacity: 0, y: 70px)
  // From 0.14 to 0.45: smoothly fades in to 1 and slides up to 0px, fully covering Card 1
  // From 0.52 to 0.82: dims to 0.35 and subtly scales down to 0.94 as Card 3 arrives
  const card2Y = useTransform(scrollYProgress, [0.14, 0.44], [70, 0]);
  const card2Opacity = useTransform(scrollYProgress, [0.14, 0.38, 0.52, 0.80], [0, 1, 1, 0.35]);
  const card2Scale = useTransform(scrollYProgress, [0.52, 0.82], [1, 0.94]);

  // Card 3 transforms:
  // Starts hidden (opacity: 0, y: 70px)
  // From 0.52 to 0.84: smoothly fades in to 1 and slides up to 0px, fully covering Card 2
  const card3Y = useTransform(scrollYProgress, [0.52, 0.82], [70, 0]);
  const card3Opacity = useTransform(scrollYProgress, [0.52, 0.78], [0, 1]);

  // Subtle entrance for the left editorial column on scroll arrival
  const leftColY = useTransform(scrollYProgress, [0, 0.12], [20, 0]);
  const leftColOpacity = useTransform(scrollYProgress, [0, 0.12], [0.85, 1]);

  return (
    <section id="problem" ref={containerRef} className="relative h-[220vh] bg-transparent">
      {/* Sticky Viewport Container - filled width and height without excessive empty margin */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Editorial Headline (Clean static text, zero scramble) */}
          <motion.div
            ref={leftColRef}
            style={{ y: leftColY, opacity: leftColOpacity }}
            className="lg:col-span-5"
          >
            <span className="font-mono text-[11px] sm:text-xs text-[#8F94A6] tracking-widest uppercase block mb-1.5 sm:mb-3">
              // THE FREELANCE TRAP
            </span>
            <h2 className="font-display text-2xl sm:text-4xl lg:text-6xl font-normal tracking-tight text-white leading-tight">
              Why legacy platforms fail builders.
            </h2>
            <p className="mt-2 sm:mt-4 text-xs sm:text-base text-[#8F94A6] font-light leading-relaxed">
              Centralized market monopolies prioritize corporate banking float and automated customer service bots over the engineers doing the work.
            </p>
          </motion.div>

          {/* Right Column: 3 Stacking Cards with responsive mobile height */}
          <div className="lg:col-span-7 relative h-[360px] sm:h-[440px] lg:h-[480px] w-full mx-auto">
            
            {/* CARD 1: THE 20% CUT */}
            <motion.div
              style={{ scale: card1Scale, opacity: card1Opacity }}
              className="z-[10] absolute inset-0 rounded-2xl border border-white/[0.08] bg-[#111624] p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-2xl origin-top"
            >
              <div>
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06]">
                  <span className="font-mono text-xs text-[#8F94A6] tracking-wider uppercase">
                    01 // THE COMMISSION TAX
                  </span>
                  <span className="font-mono text-xs text-red-400/90 font-medium">
                    Centralized
                  </span>
                </div>
                <div className="mt-4 sm:mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-normal text-white tracking-tight">
                  -20%
                </div>
                <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-[#8F94A6] leading-relaxed font-light">
                  Upwork and Fiverr take a fifth of everything you make to run a database.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-xs text-white/90">
                  BountyBoard takes a transparent 1% protocol fee.
                </span>
                <span className="font-mono text-xs text-[#E8A94D] font-medium shrink-0 ml-2">
                  Save 19%
                </span>
              </div>
            </motion.div>

            {/* CARD 2: 14 DAYS CLEARANCE LAG */}
            <motion.div
              style={{ y: card2Y, scale: card2Scale, opacity: card2Opacity }}
              className="z-[20] absolute inset-0 rounded-2xl border border-white/[0.10] bg-[#141A2B] p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-2xl origin-top"
            >
              <div>
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06]">
                  <span className="font-mono text-xs text-[#8F94A6] tracking-wider uppercase">
                    02 // PAYMENT LATENCY
                  </span>
                  <span className="font-mono text-xs text-amber-400/90 font-medium">
                    Banking Float
                  </span>
                </div>
                <div className="mt-4 sm:mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-normal text-white tracking-tight">
                  14 Days
                </div>
                <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-[#8F94A6] leading-relaxed font-light">
                  Arbitrary payment clearance holds and bank transfer latency keep your capital locked.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-xs text-white/90">
                  Smart contracts settle to your wallet in 2 seconds on Layer-2.
                </span>
                <span className="font-mono text-[#6EE7B7] text-xs font-medium shrink-0 ml-2">
                  Instant
                </span>
              </div>
            </motion.div>

            {/* CARD 3: ONE-SIDED FREEZES */}
            <motion.div
              style={{ y: card3Y, opacity: card3Opacity }}
              className="z-[30] absolute inset-0 rounded-2xl border border-white/[0.12] bg-[#171E33] p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-2xl origin-top"
            >
              <div>
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06]">
                  <span className="font-mono text-xs text-[#8F94A6] tracking-wider uppercase">
                    03 // UNILATERAL ARBITRATION
                  </span>
                  <span className="font-mono text-xs text-red-400/90 font-medium">
                    No Recourse
                  </span>
                </div>
                <div className="mt-4 sm:mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-normal text-white tracking-tight">
                  One-Sided Freezes
                </div>
                <p className="mt-2.5 sm:mt-4 text-xs sm:text-base text-[#8F94A6] leading-relaxed font-light">
                  Support bots freeze your balance with zero legal recourse or transparent hearings.
                </p>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <span className="font-mono text-xs text-white/90">
                  Code-enforced 2-of-3 Arbiter quorum protects both parties.
                </span>
                <span className="font-mono text-xs text-white font-medium shrink-0 ml-2">
                  Multi-sig
                </span>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default CardStackProblem;
