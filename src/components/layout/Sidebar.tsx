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
  Cloud,
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

  // The 3 main options requested for this menu
  const primaryMenuItems = [
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
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Slide-out Menu Drawer strictly on the RIGHT side */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-[#0a0c12] border-l border-amber-500/20 shadow-2xl flex flex-col justify-between"
          >
            {/* Top Brand Header */}
            <div>
              <div className="p-5 border-b border-amber-500/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/35 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
                    <img
                      src="/logo-icon.png"
                      alt="DanaMahjadStore Logo"
                      className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                    />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-wider flex items-center gap-1.5">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                        DanaMahjadStore
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-mono font-bold border border-amber-500/20">
                        PRO
                      </span>
                    </h1>
                    <p className="text-[10px] text-slate-400">مێنۆی سەرەکی سیستەم</p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title="داخستن"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Menu List */}
              <div className="py-4 px-3 space-y-1.5">
                <div className="px-3 pb-2 text-[11px] font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-2">
                  <span>بەشەکانی مێنۆ</span>
                  <div className="flex-1 h-[1px] bg-amber-500/20" />
                </div>

                {primaryMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group text-right cursor-pointer relative ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-r-4 border-amber-400 font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-900 text-slate-400 group-hover:text-amber-300 group-hover:bg-amber-500/10 border border-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{item.label}</div>
                          <div className="text-[11px] text-slate-500 group-hover:text-slate-400">
                            {item.sublabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge}
                        {isActive && (
                          <ChevronLeft className="w-4 h-4 text-amber-400 animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Secondary Divider & Links */}
                <div className="pt-4 px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <span>بەستەری خێرا</span>
                  <div className="flex-1 h-[1px] bg-slate-800/80" />
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
                            ? 'text-amber-300 bg-amber-500/10 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  {/* Automatic Cloud Status Indicator */}
                  <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-semibold text-[11px]">پاڵپشتی خۆکاری هەور چالاکە</span>
                    </div>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin User Card & Logout */}
            <div className="p-4 border-t border-amber-500/15 bg-slate-950/80 space-y-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {adminUser?.displayName || 'بەڕێوەبەر'}
                  </div>
                  <div className="text-[11px] text-amber-400/80 font-mono truncate">
                    @{adminUser?.username || 'Danamahjad'}
                  </div>
                </div>
              </div>

              {/* Full-width Logout Button in Menu */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
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
