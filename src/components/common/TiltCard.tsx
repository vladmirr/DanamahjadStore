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
      className={`rounded-2xl p-5 bg-[#0f1115]/90 backdrop-blur-md border border-white/[0.08] hover:border-white/20 transition-all duration-200 shadow-md ${className}`}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
