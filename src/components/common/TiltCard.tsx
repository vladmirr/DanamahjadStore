import React from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'gold' | 'amber' | 'emerald' | 'cyan' | 'rose' | 'indigo' | 'neutral';
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl p-5 bg-[#0d1017]/90 backdrop-blur-xl border border-white/[0.07] hover:border-white/20 transition-all duration-200 shadow-lg shadow-black/40 ${className}`}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
