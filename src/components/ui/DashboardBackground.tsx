import React, { useEffect, useRef } from 'react';
import { initDashboardBackground } from '../../utils/dashboardBg';

export interface DashboardBackgroundProps {
  className?: string;
}

export const DashboardBackground: React.FC<DashboardBackgroundProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cleanup = initDashboardBackground({ canvasId: 'dashboard-bg' });
    return () => {
      cleanup();
    };
  }, []);

  return (
    <canvas
      id="dashboard-bg"
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none w-full h-full select-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default DashboardBackground;
