import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  History,
  FileSpreadsheet,
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  LogOut,
  X,
  Shield,
  AlertTriangle,
  ChevronLeft,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    logout,
    adminUser,
    metrics,
  } = useApp();

  // The main options for this menu
  const primaryMenuItems = [
    {
      id: 'popcorn',
      label: 'مامەڵکردنی کاڵا',
      sublabel: '',
      icon: Truck,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          نوێ / NEW
        </span>
      ),
    },
    {
      id: 'inventory',
      label: 'کۆگا و کاڵاکان',
      sublabel: 'بەڕێوەبردنی کاڵا و بڕی مەخزەن',
      icon: Boxes,
      badge:
        metrics.lowStockItemsCount > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {metrics.lowStockItemsCount}
          </span>
        ) : null,
    },
    {
      id: 'reports',
      label: 'مێژووی ڕاپۆرتەکان',
      sublabel: 'تۆماری فرۆشتن، پسوولە و داتاکان',
      icon: History,
      badge: null,
    },
    {
      id: 'backup',
      label: 'پاراستن و ئێکسڵ',
      sublabel: 'داگرتنی داتاکان بە شێوەی ئێکسڵ',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  // Secondary quick navigation
  const secondaryItems = [
    {
      id: 'dashboard',
      label: 'داشبۆردی سەرەکی',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'بەشی فرۆشتن',
      icon: ShoppingCart,
    },
    {
      id: 'payments',
      label: 'پارەدان و قەرزەکان',
      icon: Wallet,
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsSidebarOpen(false);
  };

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Slide-out Menu Drawer strictly on the RIGHT side */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-[#0b0e14]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col justify-between select-none"
          >
            {/* Top Brand Header */}
            <div>
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 p-2 flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src="/logo-icon.png"
                      alt="DanaMahjadStore Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                      <span>DanaMahjadStore</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
                        PRO
                      </span>
                    </h1>
                    <p className="text-[10px] text-neutral-400 mt-0.5">مێنۆی سەرەکی سیستەم</p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                  title="داخستن"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Menu List */}
              <div className="py-4 px-3 space-y-1.5">
                <div className="px-3 pb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <span>بەشەکانی مێنۆ</span>
                  <div className="flex-1 h-[1px] bg-white/[0.08]" />
                </div>

                {primaryMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-150 group text-right cursor-pointer select-none ${
                        isActive
                          ? 'bg-white/10 text-white font-bold border border-white/20 shadow-sm'
                          : 'text-neutral-300 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl transition-all ${
                            isActive
                              ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                              : 'bg-white/[0.04] text-neutral-400 group-hover:text-white border border-white/10'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span>{item.label}</span>
                          </div>
                          {item.sublabel ? (
                            <div className="text-[11px] text-neutral-400 mt-0.5">
                              {item.sublabel}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge}
                        {isActive ? (
                          <span className="relative flex h-2 w-2 shrink-0 ml-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        ) : (
                          <ChevronLeft className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Secondary Divider & Links */}
                <div className="pt-4 px-3 pb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <span>بەستەری خێرا</span>
                  <div className="flex-1 h-[1px] bg-white/[0.08]" />
                </div>

                <div className="space-y-1">
                  {secondaryItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer text-right select-none ${
                          isActive
                            ? 'text-white bg-white/10 font-bold border border-white/20 shadow-sm'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                          <span>{item.label}</span>
                        </div>

                        {isActive && (
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Admin User Card & Logout */}
            <div className="p-4 border-t border-white/10 bg-[#07090c] space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b0e14] border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 relative">
                  <Shield className="w-5 h-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0b0e14]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {adminUser?.displayName || 'بەڕێوەبەری سەرەکی'}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate">
                    @{adminUser?.username || 'Danamahjad'}
                  </div>
                </div>
              </div>

              {/* Full-width Logout Button in Menu */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>چوونەدەرەوە لە سیستم (Logout)</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
