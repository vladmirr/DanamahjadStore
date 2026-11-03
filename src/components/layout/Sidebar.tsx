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
      label: 'پۆپکورن (Popcorn Import & Partnership)',
      sublabel: 'هاوردەکردن لە ڕووسیا، بارهەڵگرەکانی ئێران و شەراکەت',
      icon: Truck,
      badge: (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-neutral-300 border border-white/15">
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
            className="fixed inset-y-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-[#0f1115] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between"
          >
            {/* Top Brand Header */}
            <div>
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src="/logo-icon.png"
                      alt="DanaMahjadStore Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                      <span>DanaMahjadStore</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-mono font-bold border border-white/15">
                        PRO
                      </span>
                    </h1>
                    <p className="text-[10px] text-neutral-400">مێنۆی سەرەکی سیستەم</p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
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
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-colors duration-150 group text-right cursor-pointer relative ${
                        isActive
                          ? 'bg-white/10 text-white font-bold border-r-2 border-white'
                          : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-white/15 text-white border border-white/20'
                              : 'bg-white/[0.03] text-neutral-400 group-hover:text-white border border-white/[0.06]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{item.label}</div>
                          <div className="text-[11px] text-neutral-400">
                            {item.sublabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge}
                        {isActive && (
                          <ChevronLeft className="w-4 h-4 text-white" />
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-right ${
                          isActive
                            ? 'text-white bg-white/10 font-bold'
                            : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Admin User Card & Logout */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0c0d10] space-y-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#14161b] border border-white/[0.08]">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {adminUser?.displayName || 'بەڕێوەبەر'}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate">
                    @{adminUser?.username || 'Danamahjad'}
                  </div>
                </div>
              </div>

              {/* Full-width Logout Button in Menu */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>چوونەدەروە لە سیستم (Logout)</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
