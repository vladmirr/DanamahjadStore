import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  // When on the Popcorn page, show ONLY floating pill "داشبۆردی سەرەکی"
  if (activeTab === 'popcorn') {
    return (
      <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-1rem)] select-none">
        <nav
          aria-label="خوارەوەی پەڕە - گەڕانەوە بۆ داشبۆرد"
          className="bg-[#0b0e14]/90 hover:bg-[#121620]/95 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-full shadow-2xl shadow-black/80 p-1 sm:p-1.5 transition-all duration-200"
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 rounded-full bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 hover:border-white/20 shadow-sm transition-all cursor-pointer group touch-manipulation"
          >
            <span className="text-xs sm:text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">
              داشبۆردی سەرەکی
            </span>
            <LayoutDashboard className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all shrink-0 nav-icon nav-icon-dashboard" />
          </button>
        </nav>
      </div>
    );
  }

  // The 3 daily primary options in the bottom bar (Dashboard centered in the middle)
  const navItems = [
    {
      id: 'pos',
      label: 'بەشی فرۆشتن',
      shortLabel: 'فرۆشتن',
      icon: ShoppingCart,
      colorClass: 'text-blue-400/80 group-hover:text-blue-300',
      activeColorClass: 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.75)]',
      badge: null,
    },
    {
      id: 'dashboard',
      label: 'داشبۆردی سەرەکی',
      shortLabel: 'داشبۆرد',
      icon: LayoutDashboard,
      colorClass: 'text-emerald-400/80 group-hover:text-emerald-300',
      activeColorClass: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]',
      badge: null,
    },
    {
      id: 'payments',
      label: 'پارەدان و قەرزەکان',
      shortLabel: 'قەرزەکان',
      icon: Wallet,
      colorClass: 'text-amber-400/80 group-hover:text-amber-300',
      activeColorClass: 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.75)]',
      badge: null,
    },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-1rem)] select-none">
      <nav
        aria-label="خوارەوەی پەڕە - پێڕستی سەرەکی"
        className="bg-[#0b0e14]/90 hover:bg-[#121620]/95 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-full shadow-2xl shadow-black/80 p-1 sm:p-1.5 flex items-center transition-all duration-200"
      >
        {/* Navigation Items: Single Row with Smooth Sliding Indicator & Icon Micro-Animations */}
        <div className="relative flex items-center gap-1 sm:gap-2 w-auto nav-pill-container">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors duration-200 cursor-pointer shrink-0 select-none group touch-manipulation nav-item ${
                  isActive
                    ? 'text-white font-bold nav-item-active'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] font-medium'
                }`}
              >
                {/* 1. Sliding Active Indicator Pill (iOS / Dynamic Island Physics) */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-full shadow-lg shadow-black/50 pointer-events-none active-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                )}

                <span className="relative z-10 text-xs sm:text-sm whitespace-nowrap">
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>

                <div className="relative z-10 shrink-0 flex items-center gap-1.5">
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-200 shrink-0 nav-icon nav-icon-${item.id} ${
                      isActive ? item.activeColorClass : item.colorClass
                    }`}
                  />
                  {item.badge && item.badge}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
