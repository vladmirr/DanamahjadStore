import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, metrics } = useApp();

  // The 3 daily primary options in the bottom bar
  const navItems = [
    {
      id: 'dashboard',
      label: 'داشبۆردی سەرەکی',
      shortLabel: 'داشبۆرد',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'pos',
      label: 'بەشی فرۆشتن',
      shortLabel: 'فرۆشتن',
      icon: ShoppingCart,
      badge: null,
    },
    {
      id: 'payments',
      label: 'پارەدان و قەرزەکان',
      shortLabel: 'قەرزەکان',
      icon: Wallet,
      badge:
        metrics.totalOutstandingDebt > 0 ? (
          <span className="w-2 h-2 rounded-full bg-amber-400" />
        ) : null,
    },
  ];

  return (
    <nav
      aria-label="خوارەوەی پەڕە - پێڕستی سەرەکی"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#090b10]/95 backdrop-blur-xl border-t border-amber-500/20 shadow-[0_-8px_32px_rgba(0,0,0,0.7)] py-2 select-none"
    >
      <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-center">
        {/* Navigation Items - Perfectly Centered without Overflow Clipping */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavGlow"
                    className="absolute -top-1 inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <div className="relative shrink-0">
                  <Icon
                    className={`w-4 h-4 transition-transform ${
                      isActive ? 'text-amber-400 scale-110' : 'text-slate-400'
                    }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span className="text-xs sm:text-sm whitespace-nowrap font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
