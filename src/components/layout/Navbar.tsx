import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const { setIsSidebarOpen } = useApp();

  return (
    <header className="lg:hidden sticky top-3 z-30 px-4 select-none">
      <div className="bg-[#0b0e14]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          aria-label="کردنەوەی مێنۆ"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm tracking-wider">
            Dana Mahjad
          </span>
          <img src="/logo-icon.png" alt="Dana Mahjad" className="w-6 h-6 object-contain" />
        </div>
      </div>
    </header>
  );
};
