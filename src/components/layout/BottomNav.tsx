import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, metrics } = useApp();

  // When on the Popcorn page, show ONLY "داشبۆردی سەرەکی"
  if (activeTab === 'popcorn') {
    return (
      <nav
        aria-label="خوارەوەی پەڕە - گەڕانەوە بۆ داشبۆرد"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0f1115]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-2xl py-2.5 select-none"
      >
        <div className="w-full max-w-md mx-auto px-4 flex items-center justify-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 shadow-sm font-semibold transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 text-neutral-300" />
            <span className="text-xs sm:text-sm font-semibold">داشبۆردی سەرەکی</span>
          </button>
        </div>
      </nav>
    );
  }

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
      className="fixed bottom-0 inset-x-0 z-40 bg-[#0f1115]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-2xl py-2.5 select-none"
    >
      <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-center">
        {/* Navigation Items */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl transition-colors duration-150 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-neutral-400'
                    }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span className="text-xs sm:text-sm whitespace-nowrap">
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
