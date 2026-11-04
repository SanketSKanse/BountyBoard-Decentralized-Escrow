import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  color: string;
}

export const LivingCanvasBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Subtle, elegant monochrome palette
    const colors = ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#94A3B8'];
    let particles: Particle[] = [];

    const initParticles = () => {
      const count = Math.min(Math.floor((width * height) / 14000), 90);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          // Subtle, delicate node size (0.8px to 1.2px) instead of large dots
          size: Math.random() * 0.4 + 0.8,
          // Soft, non-distracting opacity (0.18 to 0.28)
          baseAlpha: Math.random() * 0.1 + 0.18,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    initParticles();

    // Render loop
    const render = () => {
      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw ambient torch / mouse hover glow that highlights the grid lines
      if (mouseRef.current.x > 0 && mouseRef.current.y > 0) {
        const glow = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          380
        );
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.03)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Draw crisp connecting constellation lines (preserved line effect)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 145;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.28;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 3. Update & Draw Particles with delicate, subtle node rendering
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges smoothly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Interactive mouse repulsion
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          const force = (110 - dist) / 110;
          p.x -= (dx / dist) * force * 1.8;
          p.y -= (dy / dist) * force * 1.8;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.baseAlpha;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};
