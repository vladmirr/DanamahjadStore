import React, { useState, useMemo } from 'react';
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
import { formatIQD, formatUSD, formatNumber } from '../../utils/formatters';
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

  const [currencyView, setCurrencyView] = useState<'all' | 'USD' | 'IQD'>('all');

  // Profit margin percentage (IQD and USD)
  const profitMarginIQD =
    metrics.totalGrossSales > 0
      ? Math.round((metrics.totalGrossProfit / metrics.totalGrossSales) * 100)
      : 0;
  const profitMarginUSD =
    metrics.totalGrossSalesUSD > 0
      ? Math.round((metrics.totalGrossProfitUSD / metrics.totalGrossSalesUSD) * 100)
      : 0;

  // Collection rate percentage
  const collectionRateIQD =
    metrics.totalGrossSales > 0
      ? Math.round((metrics.totalCashReceived / metrics.totalGrossSales) * 100)
      : 0;
  const collectionRateUSD =
    metrics.totalGrossSalesUSD > 0
      ? Math.round((metrics.totalCashReceivedUSD / metrics.totalGrossSalesUSD) * 100)
      : 0;

  // Filter indebted customers based on active currency view
  const indebtedCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (currencyView === 'USD') return (c.outstandingDebtUSD || 0) > 0;
      if (currencyView === 'IQD') return c.outstandingDebt > 0;
      return c.outstandingDebt > 0 || (c.outstandingDebtUSD || 0) > 0;
    });
  }, [customers, currencyView]);

  return (
    <div className="space-y-6">
      {/* Welcome Bar Centered with Logo */}
      <div className="flex flex-col items-center justify-center text-center p-6 md:p-7 rounded-2xl bg-[#0f1115] border border-white/[0.08] shadow-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/logo-icon.png"
              alt="Dana Mahjad Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            داشبۆردی سەرەکی <span className="text-white">Dana Mahjad</span>
          </h2>
        </div>
        <p className="text-xs md:text-sm text-neutral-400 mt-2 max-w-xl">
          خوێندنەوەی دارایی ڕاستەوخۆ بە دۆلاری ئەمریکی ($ USD) و دیناری عێراقی (د.ع IQD)
        </p>

        {/* Global Currency View Filter Toggle */}
        <div className="mt-4 flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs">
          <button
            onClick={() => setCurrencyView('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
              currencyView === 'all'
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            هەردوو دراو (Dual Currency)
          </button>
          <button
            onClick={() => setCurrencyView('USD')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium flex items-center gap-1 ${
              currencyView === 'USD'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 font-semibold'
                : 'text-neutral-400 hover:text-emerald-300'
            }`}
          >
            <span>دۆلار ($ USD)</span>
          </button>
          <button
            onClick={() => setCurrencyView('IQD')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium flex items-center gap-1 ${
              currencyView === 'IQD'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-neutral-400 hover:text-amber-300'
            }`}
          >
            <span>دینار (د.ع IQD)</span>
          </button>
        </div>
      </div>

      {/* 5 Core Accounting KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. کۆی فرۆشی گشتی (Total Gross Sales) */}
        <TiltCard className="metric-revenue-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-400">کۆی فرۆشی گشتی</p>
              {currencyView === 'all' ? (
                <div className="mt-1.5 space-y-1">
                  <div className="text-lg font-bold text-white font-numeric flex items-baseline gap-1.5">
                    <span>{formatNumber(metrics.totalGrossSales)}</span>
                    <span className="text-xs font-semibold text-blue-400/90">د.ع</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-numeric">
                    {formatUSD(metrics.totalGrossSalesUSD)}
                  </div>
                </div>
              ) : currencyView === 'USD' ? (
                <h3 className="text-xl font-bold text-emerald-400 mt-1.5 font-numeric">
                  {formatUSD(metrics.totalGrossSalesUSD)}
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-white mt-1.5 font-numeric flex items-baseline gap-1.5">
                  <span>{formatNumber(metrics.totalGrossSales)}</span>
                  <span className="text-xs font-semibold text-blue-400/90">د.ع</span>
                </h3>
              )}
            </div>
            <div className="p-2 rounded-xl metric-icon-box">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>کۆی پسوولەکان</span>
            <span className="text-white font-medium font-numeric">
              {sales.length} مامەڵە
            </span>
          </div>
        </TiltCard>

        {/* 2. تێچووی فرۆشراو (Cost of Goods Sold - COGS) */}
        <TiltCard className="metric-cost-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-400">تێچووی فرۆشراو (COGS)</p>
              {currencyView === 'all' ? (
                <div className="mt-1.5 space-y-1">
                  <div className="text-lg font-bold text-white font-numeric flex items-baseline gap-1.5">
                    <span>{formatNumber(metrics.totalCOGS)}</span>
                    <span className="text-xs font-semibold text-rose-400/90">د.ع</span>
                  </div>
                  <div className="text-sm font-bold text-rose-400 font-numeric">
                    {formatUSD(metrics.totalCOGSUSD)}
                  </div>
                </div>
              ) : currencyView === 'USD' ? (
                <h3 className="text-xl font-bold text-rose-400 mt-1.5 font-numeric">
                  {formatUSD(metrics.totalCOGSUSD)}
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-white mt-1.5 font-numeric flex items-baseline gap-1.5">
                  <span>{formatNumber(metrics.totalCOGS)}</span>
                  <span className="text-xs font-semibold text-rose-400/90">د.ع</span>
                </h3>
              )}
            </div>
            <div className="p-2 rounded-xl metric-icon-box">
              <DollarSign className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>تێچووی سەرمایە</span>
            <span className="text-neutral-300 font-numeric font-medium">سەرمایە</span>
          </div>
        </TiltCard>

        {/* 3. کۆی قازانجی گشتی (Total Gross Profit) */}
        <TiltCard className="metric-profit-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-400">کۆی قازانجی گشتی</p>
              {currencyView === 'all' ? (
                <div className="mt-1.5 space-y-1">
                  <div className="text-lg font-bold text-white font-numeric flex items-baseline gap-1.5">
                    <span>{formatNumber(metrics.totalGrossProfit)}</span>
                    <span className="text-xs font-semibold text-emerald-400/90">د.ع</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-numeric">
                    {formatUSD(metrics.totalGrossProfitUSD)}
                  </div>
                </div>
              ) : currencyView === 'USD' ? (
                <h3 className="text-xl font-bold text-emerald-400 mt-1.5 font-numeric">
                  {formatUSD(metrics.totalGrossProfitUSD)}
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-white mt-1.5 font-numeric flex items-baseline gap-1.5">
                  <span>{formatNumber(metrics.totalGrossProfit)}</span>
                  <span className="text-xs font-semibold text-emerald-400/90">د.ع</span>
                </h3>
              )}
            </div>
            <div className="p-2 rounded-xl metric-icon-box">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>ڕێژەی قازانج</span>
            <span className="text-white font-semibold font-numeric">
              {currencyView === 'USD' ? `%${profitMarginUSD}` : `%${profitMarginIQD}`} Margin
            </span>
          </div>
        </TiltCard>

        {/* 4. کۆی پارەی وەرگیراو (Total Cash Received) */}
        <TiltCard className="metric-card-emerald">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-400">کۆی پارەی وەرگیراو</p>
              {currencyView === 'all' ? (
                <div className="mt-1.5 space-y-1">
                  <div className="text-lg font-bold text-white font-numeric flex items-baseline gap-1.5">
                    <span>{formatNumber(metrics.totalCashReceived)}</span>
                    <span className="text-xs font-semibold text-emerald-400/90">د.ع</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-numeric">
                    {formatUSD(metrics.totalCashReceivedUSD)}
                  </div>
                </div>
              ) : currencyView === 'USD' ? (
                <h3 className="text-xl font-bold text-emerald-400 mt-1.5 font-numeric">
                  {formatUSD(metrics.totalCashReceivedUSD)}
                </h3>
              ) : (
                <h3 className="text-xl font-bold text-white mt-1.5 font-numeric flex items-baseline gap-1.5">
                  <span>{formatNumber(metrics.totalCashReceived)}</span>
                  <span className="text-xs font-semibold text-emerald-400/90">د.ع</span>
                </h3>
              )}
            </div>
            <div className="p-2 rounded-xl metric-icon-box">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>ڕێژەی پارەدان</span>
            <span className="text-white font-semibold font-numeric">
              {currencyView === 'USD' ? `%${collectionRateUSD}` : `%${collectionRateIQD}`} دراوە
            </span>
          </div>
        </TiltCard>

        {/* 5. بڕی پارەی ماوە (Remaining Balance / Debt) */}
        <TiltCard className="metric-debt-card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-neutral-400">بڕی پارەی ماوە (قەرز)</p>
              {currencyView === 'all' ? (
                <div className="mt-1.5 space-y-1">
                  <div className={`text-lg font-bold font-numeric flex items-baseline gap-1.5 ${
                    metrics.totalOutstandingDebt > 0 ? 'text-[#fbbf24]' : 'text-neutral-300'
                  }`}>
                    <span>{formatNumber(metrics.totalOutstandingDebt)}</span>
                    <span className="text-xs font-semibold text-amber-400/90">د.ع</span>
                  </div>
                  <div className={`text-sm font-bold font-numeric ${
                    metrics.totalOutstandingDebtUSD > 0 ? 'text-[#fbbf24]' : 'text-neutral-400'
                  }`}>
                    {formatUSD(metrics.totalOutstandingDebtUSD)}
                  </div>
                </div>
              ) : currencyView === 'USD' ? (
                <h3 className={`text-xl font-bold mt-1.5 font-numeric ${
                  metrics.totalOutstandingDebtUSD > 0 ? 'text-[#fbbf24]' : 'text-neutral-300'
                }`}>
                  {formatUSD(metrics.totalOutstandingDebtUSD)}
                </h3>
              ) : (
                <h3
                  className={`text-xl font-bold mt-1.5 font-numeric flex items-baseline gap-1.5 ${
                    metrics.totalOutstandingDebt > 0 ? 'text-[#fbbf24]' : 'text-neutral-300'
                  }`}
                >
                  <span>{formatNumber(metrics.totalOutstandingDebt)}</span>
                  <span className={`text-xs font-semibold ${metrics.totalOutstandingDebt > 0 ? 'text-amber-400/90' : 'text-neutral-400'}`}>
                    د.ع
                  </span>
                </h3>
              )}
            </div>
            <div className="p-2 rounded-xl metric-icon-box">
              <Receipt className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
            <span>قەرزی لای کڕیاران</span>
            <span
              className={`font-semibold ${
                (currencyView === 'USD' ? metrics.totalOutstandingDebtUSD : metrics.totalOutstandingDebt) > 0 ? 'text-[#fbbf24]' : 'text-neutral-300'
              }`}
            >
              {(currencyView === 'USD' ? metrics.totalOutstandingDebtUSD : metrics.totalOutstandingDebt) > 0 ? 'ماوەتەوە' : 'پاکتاوە'}
            </span>
          </div>
        </TiltCard>
      </div>

      {/* Indebted Customers Snapshot */}
      <div className="rounded-2xl p-5 md:p-6 bg-[#0f1115] border border-white/[0.08] shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">حسابی کڕیارە قەرزدارەکان</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                لیستی ئەو کڕیارانەی کە قەرزیان لەسەر ماوەتەوە بە دۆلار و بە دینار
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('payments')}
            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer self-start sm:self-auto transition-colors"
          >
            <span>بەڕێوەبردنی سەرجەم کڕیار و قەرزەکان</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {indebtedCustomers.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-xs">
            هیچ قەرزێک لەسەر کڕیاران نەماوەتەوە! هەموو حسابەکان پاکتاوکراون. 🎉
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {indebtedCustomers.map((cust) => (
              <div
                key={cust.name}
                className="p-4 rounded-xl bg-[#050505] border border-white/[0.08] hover:border-white/20 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{cust.name}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-numeric">
                      {cust.invoicesCount} وەسڵ
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    قەرزدار
                  </span>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block mb-0.5">بڕی قەرز:</span>
                    <div className="space-y-0.5">
                      {cust.outstandingDebt > 0 && (
                        <span className="text-xs font-bold text-amber-400 font-numeric block">
                          {formatIQD(cust.outstandingDebt)}
                        </span>
                      )}
                      {(cust.outstandingDebtUSD || 0) > 0 && (
                        <span className="text-xs font-bold text-emerald-400 font-numeric block">
                          {formatUSD(cust.outstandingDebtUSD)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingStatementCustomer(cust.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/12 text-white border border-white/10 text-xs font-medium cursor-pointer transition-colors"
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
