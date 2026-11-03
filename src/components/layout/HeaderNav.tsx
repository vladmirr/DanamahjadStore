import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Wallet,
  History,
  FileSpreadsheet,
  Truck,
  Sparkles,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HeaderNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsSidebarOpen } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navMenuItems = [
    {
      id: 'popcorn',
      label: 'پۆپکورن (Popcorn Import & Partnership)',
      sublabel: 'هاوردەکردن لە ڕووسیا، بارهەڵگرەکانی ئێران و شەراکەت',
      icon: Truck,
      isFeatured: true,
      badgeText: 'نوێ / NEW',
    },
    {
      id: 'dashboard',
      label: 'داشبۆردی سەرەکی',
      sublabel: 'پوختەی دارایی و ئامارەکانی فرۆش',
      icon: LayoutDashboard,
      isFeatured: false,
    },
    {
      id: 'pos',
      label: 'بەشی فرۆشتن (POS)',
      sublabel: 'فرۆشتنی خێرا و دەرکردنی پسوولە',
      icon: ShoppingCart,
      isFeatured: false,
    },
    {
      id: 'inventory',
      label: 'کۆگا و کاڵاکان',
      sublabel: 'بەڕێوەبردنی بڕ و سەرمایەی کاڵاکان',
      icon: Boxes,
      isFeatured: false,
    },
    {
      id: 'payments',
      label: 'پارەدان و قەرزەکان',
      sublabel: 'وەسڵی پارەدان و دەفتەری قەرز',
      icon: Wallet,
      isFeatured: false,
    },
    {
      id: 'reports',
      label: 'مێژووی ڕاپۆرتەکان',
      sublabel: 'تۆماری تەواوی فرۆشتن و وەسڵەکان',
      icon: History,
      isFeatured: false,
    },
    {
      id: 'backup',
      label: 'پاراستن و ئێکسڵ',
      sublabel: 'داگرتنی داتا و پاشەکەوتکردن',
      icon: FileSpreadsheet,
      isFeatured: false,
    },
  ];

  const currentItem = navMenuItems.find((i) => i.id === activeTab) || navMenuItems[1];

  const handleSelectPage = (id: string) => {
    setActiveTab(id);
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#08090d]/85 backdrop-blur-xl border-b border-amber-500/15 px-4 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/35 p-1 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <img
              src="/logo-icon.png"
              alt="DanaMahjadStore"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]"
            />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-sm tracking-wide">
              DanaMahjadStore
            </span>
            <div className="text-[10px] text-slate-400 -mt-0.5">سیستەمی کۆگا و فرۆشتن</div>
          </div>
        </div>

        {/* Center / Right: Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Quick Shortcut to Popcorn */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('popcorn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === 'popcorn'
                ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 text-amber-300 border border-amber-400/60 shadow-lg shadow-amber-500/20'
                : 'bg-[#0e111a]/90 hover:bg-[#151926] text-slate-300 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50'
            }`}
            title="چوون بۆ بەشی پۆپکورن"
          >
            <span className="text-sm">🍿</span>
            <span className="hidden md:inline">پۆپکورن (Popcorn)</span>
            <span className="md:hidden">پۆپکورن</span>
            {activeTab !== 'popcorn' && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                نوێ
              </span>
            )}
          </motion.button>

          {/* Dedicated Header Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e111a]/95 hover:bg-[#151926] border border-amber-500/35 hover:border-amber-500/60 text-slate-100 shadow-md transition-all cursor-pointer select-none group"
              title="هەڵبژاردنی پەڕەکان لە مێنۆی سەرەوە"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <span>پەڕەکان:</span>
                <span className="text-white max-w-[110px] sm:max-w-none truncate">
                  {currentItem.label}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </motion.button>

            {/* Dropdown Popover */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 sm:left-auto right-0 sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0a0c12]/98 border border-amber-500/30 shadow-2xl shadow-black/90 backdrop-blur-2xl p-2 z-50 text-right space-y-1"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-amber-500/15 mb-1">
                    <span>پێڕستی هەموو پەڕەکان</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>

                  {navMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectPage(item.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer group text-right ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/35 shadow-sm'
                            : item.isFeatured
                            ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-white hover:bg-amber-500/15 border border-amber-500/25'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isActive
                                ? 'bg-amber-500/25 text-amber-400'
                                : item.isFeatured
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-900 text-slate-400 group-hover:text-amber-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-1.5">
                              <span>{item.label}</span>
                              {item.badgeText && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/25 text-amber-300 font-bold border border-amber-500/30">
                                  {item.badgeText}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
                              {item.sublabel}
                            </div>
                          </div>
                        </div>

                        {isActive && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slide-out Sidebar Drawer Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e111a]/95 hover:bg-[#151926] border border-amber-500/35 hover:border-amber-500/60 text-white shadow-md transition-all cursor-pointer group select-none"
            title="کردنەوەی مێنۆی تەواو"
          >
            <Menu className="w-4 h-4 text-amber-400 transition-transform group-hover:scale-110" />
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
              مێنۆ
            </span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
