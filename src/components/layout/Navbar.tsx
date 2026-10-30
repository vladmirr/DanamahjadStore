import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const { setIsSidebarOpen } = useApp();

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-[#08090d]/90 backdrop-blur-md border-b border-amber-500/15 px-4 py-3 flex items-center justify-between">
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-amber-400 transition-colors"
        aria-label="کردنەوەی مێنۆ"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 tracking-wider">
          DanaMahjadStore
        </span>
        <img src="/logo-icon.png" alt="DanaMahjadStore" className="w-7 h-7 object-contain" />
      </div>
    </header>
  );
};
