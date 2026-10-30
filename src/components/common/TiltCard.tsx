import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'gold' | 'amber' | 'emerald' | 'cyan' | 'rose' | 'indigo';
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  glowColor = 'gold',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse coordinate motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for smooth buttery tilt
  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const glowBorderClass = {
    gold: 'hover:border-amber-400/50 hover:shadow-amber-500/15',
    amber: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
    emerald: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
    cyan: 'hover:border-cyan-500/40 hover:shadow-cyan-500/10',
    rose: 'hover:border-rose-500/40 hover:shadow-rose-500/10',
    indigo: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10',
  }[glowColor];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`glass-card rounded-2xl p-6 transition-all duration-300 relative group overflow-hidden ${glowBorderClass} ${className}`}
    >
      {/* Light sheen specular reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.04] via-transparent to-amber-200/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div style={{ transform: 'translateZ(20px)' }} className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
