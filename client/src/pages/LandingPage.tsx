import React from 'react';
import { LivingCanvasBackground } from '../components/landing/LivingCanvasBackground';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { CinematicHero } from '../components/landing/CinematicHero';
import { CardStackProblem } from '../components/landing/CardStackProblem';
import { ProtocolVisualizer } from '../components/landing/ProtocolVisualizer';
import { SoulboundBadgeScene } from '../components/landing/SoulboundBadgeScene';
import { LiveProtocolProof } from '../components/landing/LiveProtocolProof';
import { MinimalFooter } from '../components/landing/MinimalFooter';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-[#07090E] text-[#F1EEE6] relative selection:bg-white selection:text-black">
      {/* Living Interactive Ambient Canvas Background (Subtle Node Drift & Torch Glow) */}
      <LivingCanvasBackground />

      {/* Crisp 0.5px Blueprint Grid Background with Edge Fade */}
      <div className="fixed inset-0 bg-blueprint-grid pointer-events-none z-0 opacity-40" />

      {/* Structured Content Track */}
      <div className="relative z-10">
        {/* Minimal Sticky Header */}
        <LandingNavbar onEnterApp={onEnterApp} />

        {/* Scene 0: Immediate Scroll-Driven Kinetic Hero */}
        <CinematicHero onEnterApp={onEnterApp} />

        {/* Scene 1: 3-Layer Sticky Stacking Cards Animation */}
        <CardStackProblem />

        {/* Scene 2: Pinned 4-Phase Interactive Escrow Simulator */}
        <ProtocolVisualizer />

        {/* Scene 3: Minimalist On-Chain Credential Artifact */}
        <SoulboundBadgeScene />

        {/* Scene 4: Hairline Stat Grid & Verified Contract Address */}
        <LiveProtocolProof />

        {/* Scene 5: Clean Launchpad CTA */}
        <MinimalFooter onEnterApp={onEnterApp} />
      </div>
    </div>
  );
};

export default LandingPage;
