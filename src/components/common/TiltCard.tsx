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
      className={`amber-box rounded-2xl p-5 transition-all duration-300 cursor-default select-none ${className}`}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
