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
      className={`metric-card rounded-2xl p-5 ${className}`}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
