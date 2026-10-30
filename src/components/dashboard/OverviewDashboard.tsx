import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Wallet,
  Receipt,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatNumber } from '../../utils/formatters';
import { TiltCard } from '../common/TiltCard';

interface OverviewDashboardProps {
  onOpenAddProductModal?: () => void;
  onOpenQuickPaymentModal?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = () => {
  const {
    metrics,
    sales,
    customers,
    setActiveTab,
    setViewingStatementCustomer,
  } = useApp();

  // Profit margin percentage
  const profitMargin =
    metrics.totalGrossSales > 0
      ? Math.round((metrics.totalGrossProfit / metrics.totalGrossSales) * 100)
      : 0;

  // Collection rate percentage
  const collectionRate =
    metrics.totalGrossSales > 0
      ? Math.round((metrics.totalCashReceived / metrics.totalGrossSales) * 100)
      : 0;

  // Indebted customers
  const indebtedCustomers = customers.filter((c) => c.outstandingDebt > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Bar Centered with Logo */}
      <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-2xl glass-card border border-amber-500/20 relative overflow-hidden shadow-xl">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/35 p-1.5 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <img
              src="/logo-icon.png"
              alt="DanaMahjadStore Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
            />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-wide">
            داشبۆردی سەرەکی <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">DanaMahjadStore</span>
          </h2>
        </div>
        <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-xl">
          خوێندنەوەی ڕاستەوخۆی فرۆشتن، تێچووی کۆگا و پارەدانەکان بە دیناری عێراقی (IQD)
        </p>
      </div>

      {/* 5 Core Accounting KPI Metric Cards with 3D Tilt Effect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. کۆی فرۆشی گشتی (Total Gross Sales) */}
        <TiltCard glowColor="gold">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">کۆی فرۆشی گشتی</p>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 mt-1.5 font-numeric">
                {formatIQD(metrics.totalGrossSales)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>کۆی گشتی هەموو پسوولەکان</span>
            <span className="text-amber-400 font-medium font-numeric">
              {sales.length} مامەڵە
            </span>
          </div>
        </TiltCard>

        {/* 2. تێچووی فرۆشراو (Cost of Goods Sold - COGS) */}
        <TiltCard glowColor="amber">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">تێچووی فرۆشراو (COGS)</p>
              <h3 className="text-xl font-bold text-slate-200 mt-1.5 font-numeric">
                {formatIQD(metrics.totalCOGS)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>تێچووی کڕینی کاڵای فرۆشراو</span>
            <span className="text-slate-400 font-numeric font-medium">سەرمایە</span>
          </div>
        </TiltCard>

        {/* 3. کۆی قازانجی گشتی (Total Gross Profit) */}
        <TiltCard glowColor="gold">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">کۆی قازانجی گشتی</p>
              <h3 className="text-xl font-bold text-yellow-300 mt-1.5 font-numeric">
                {formatIQD(metrics.totalGrossProfit)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 shadow-sm shadow-yellow-500/10">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>ڕێژەی قازانج لە فرۆش</span>
            <span className="text-amber-300 font-semibold font-numeric">
              %{profitMargin} Margin
            </span>
          </div>
        </TiltCard>

        {/* 4. کۆی پارەی وەرگیراو (Total Cash Received) */}
        <TiltCard glowColor="gold">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">کۆی پارەی وەرگیراو</p>
              <h3 className="text-xl font-bold text-amber-400 mt-1.5 font-numeric">
                {formatIQD(metrics.totalCashReceived)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>کاش لە فرۆش + قیستەکان</span>
            <span className="text-amber-400 font-semibold font-numeric">
              %{collectionRate} دراوە
            </span>
          </div>
        </TiltCard>

        {/* 5. بڕی پارەی ماوە (Remaining Balance / Debt) */}
        <TiltCard glowColor={metrics.totalOutstandingDebt > 0 ? 'rose' : 'gold'}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">بڕی پارەی ماوە (قەرز)</p>
              <h3
                className={`text-xl font-bold mt-1.5 font-numeric ${
                  metrics.totalOutstandingDebt > 0 ? 'text-amber-500' : 'text-slate-300'
                }`}
              >
                {formatIQD(metrics.totalOutstandingDebt)}
              </h3>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                metrics.totalOutstandingDebt > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>قەرزی لای کڕیاران</span>
            <span
              className={`font-semibold ${
                metrics.totalOutstandingDebt > 0 ? 'text-amber-400' : 'text-yellow-400'
              }`}
            >
              {metrics.totalOutstandingDebt > 0 ? 'ماوەتەوە' : 'پاکتاوە'}
            </span>
          </div>
        </TiltCard>
      </div>

      {/* Indebted Customers Snapshot */}
      <div className="glass-card rounded-2xl p-6 border border-amber-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-amber-500/15">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">حسابی کڕیارە قەرزدارەکان</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                لیستی ئەو کڕیارانەی کە قەرزیان لەسەر ماوەتەوە لەگەڵ بەستەری ڕاستەوخۆ بۆ کەشف حساب
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('payments')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer self-start sm:self-auto"
          >
            <span>بەڕێوەبردنی سەرجەم کڕیار و قەرزەکان</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {indebtedCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            هیچ قەرزێک لەسەر کڕیاران نەماوەتەوە! هەموو حسابەکان پاکتاوکراون. 🎉
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {indebtedCustomers.map((cust) => (
              <div
                key={cust.name}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{cust.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-numeric">
                      {cust.invoicesCount} وەسڵ • کڕین: {formatNumber(cust.totalPurchases)} د.ع
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    قەرزدار
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">بڕی قەرز:</span>
                    <span className="text-sm font-bold text-amber-400 font-numeric">
                      {formatIQD(cust.outstandingDebt)}
                    </span>
                  </div>

                  <button
                    onClick={() => setViewingStatementCustomer(cust.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-medium cursor-pointer"
                  >
                    کەشف حساب
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
