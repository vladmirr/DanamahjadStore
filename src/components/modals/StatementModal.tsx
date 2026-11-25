import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, FileText, User, ArrowRight, FileQuestion } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatUSD, formatCurrency, formatShortDate } from '../../utils/formatters';
import { Currency } from '../../types';

export const StatementModal: React.FC = () => {
  const {
    viewingStatementCustomer,
    setViewingStatementCustomer,
    sales = [],
    payments = [],
    customers = [],
  } = useApp();

  // If modal is not triggered, do not render
  if (!viewingStatementCustomer) return null;

  // Active target customer name (trimmed)
  const targetCustomerName = (viewingStatementCustomer || '').trim();

  // Customer summary object matching current target
  const customerObj = useMemo(() => {
    return (
      customers.find(
        (c) => (c?.name || '').trim().toLowerCase() === targetCustomerName.toLowerCase()
      ) || null
    );
  }, [customers, targetCustomerName]);

  // Chronological transaction timeline for this customer
  const timeline = useMemo(() => {
    if (!targetCustomerName) return [];

    const custSales = (sales || [])
      .filter(
        (s) =>
          (s?.customerName || '').trim().toLowerCase() === targetCustomerName.toLowerCase()
      )
      .map((s) => {
        const itemsList = Array.isArray(s?.items) ? s.items : [];
        const itemsDesc = itemsList
          .map((i: any) => i?.productName || i?.name || '')
          .filter(Boolean)
          .join('، ');

        return {
          type: 'sale' as const,
          id: s?.id || `sale-${Math.random()}`,
          number: s?.invoiceNumber || (s?.id ? `INV-${String(s.id).slice(-4)}` : 'INV'),
          date: s?.date || new Date().toISOString(),
          currency: (s?.currency === 'USD' ? 'USD' : 'IQD') as Currency,
          description: s?.notes?.trim()
            ? s.notes
            : itemsDesc
            ? `فرۆشتن: ${itemsDesc}`
            : 'فرۆشتن',
          debit: Number(s?.totalAmount) || 0, // Increases debt
          credit: Number(s?.paidAmount) || 0, // Decreases debt via down payment
          notes: s?.notes || '',
        };
      });

    const custPayments = (payments || [])
      .filter(
        (p) =>
          (p?.customerName || '').trim().toLowerCase() === targetCustomerName.toLowerCase()
      )
      .map((p) => ({
        type: 'payment' as const,
        id: p?.id || `pay-${Math.random()}`,
        number: p?.voucherNumber || (p?.id ? `REC-${String(p.id).slice(-4)}` : 'REC'),
        date: p?.date || new Date().toISOString(),
        currency: (p?.currency === 'USD' ? 'USD' : 'IQD') as Currency,
        description: `وەرگرتنی قیست / پارەدان: ${p?.notes || 'کاش'}`,
        debit: 0,
        credit: Number(p?.amount) || 0, // Decreases debt
        notes: p?.notes || '',
      }));

    // Combine and sort chronologically ascending safely
    const combined = [...custSales, ...custPayments].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeA - timeB;
    });

    // Calculate running balance separately for IQD and USD
    let currentBalanceIQD = 0;
    let currentBalanceUSD = 0;

    return combined.map((entry) => {
      if (entry.currency === 'USD') {
        currentBalanceUSD += entry.debit - entry.credit;
      } else {
        currentBalanceIQD += entry.debit - entry.credit;
      }
      return {
        ...entry,
        runningBalance:
          entry.currency === 'USD'
            ? Math.max(0, currentBalanceUSD)
            : Math.max(0, currentBalanceIQD),
      };
    });
  }, [sales, payments, targetCustomerName]);

  const handlePrint = () => {
    window.print();
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newName = e.target.value;
    if (newName) {
      setViewingStatementCustomer(newName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-4xl my-2 sm:my-8 bg-[#0c0e14] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print-card relative"
      >
        {/* Top Controls Bar (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2 text-cyan-400 text-xs sm:text-sm font-semibold shrink-0">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            <span className="truncate">کەشف حسابی دارایی کڕیار</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Customer Switcher Dropdown */}
            {customers && customers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={targetCustomerName}
                  onChange={handleCustomerChange}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
                  title="گۆڕینی کڕیار"
                >
                  {customers.map((c) => (
                    <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold btn-gold cursor-pointer shadow-sm hover:brightness-110 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردن</span>
            </button>

            <button
              type="button"
              onClick={() => setViewingStatementCustomer(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
              title="داخستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 text-slate-100 bg-[#0c0e14] print:text-black print:bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-amber-500/20 print:border-slate-300 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 print:border-slate-400 p-1 flex items-center justify-center shrink-0">
                <img
                  src="/logo-icon.png"
                  alt="Dana Mahjad"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 print:text-black block truncate">
                  Dana Mahjad
                </h2>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5 truncate">
                  ڕاپۆرتی کەشف حسابی دارایی کڕیار (Customer Statement)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-t-0 shrink-0 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 print:border print:border-black text-cyan-400 print:text-black font-bold">
                کەشف حساب
              </span>
              <p className="text-xs font-semibold text-slate-300 print:text-black font-numeric" dir="ltr">
                {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Customer Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 print:text-slate-600">ناوی کڕیار:</span>
              <p className="font-bold text-white print:text-black text-sm mt-0.5 truncate">
                {targetCustomerName}
              </p>
              {customerObj?.phone && (
                <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                  {customerObj.phone}
                </p>
              )}
            </div>

            <div>
              <span className="text-slate-400 print:text-slate-600">کۆی کڕینەکان:</span>
              <div className="mt-0.5 space-y-0.5 font-numeric">
                <p className="font-bold text-white print:text-black text-xs sm:text-sm">
                  {formatIQD(customerObj?.totalPurchases || 0)}
                </p>
                {(customerObj?.totalPurchasesUSD || 0) > 0 && (
                  <p className="font-bold text-emerald-400 print:text-black text-[11px]">
                    {formatUSD(customerObj?.totalPurchasesUSD || 0)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-slate-600">کۆی پارەی دراو:</span>
              <div className="mt-0.5 space-y-0.5 font-numeric">
                <p className="font-bold text-emerald-400 print:text-black text-xs sm:text-sm">
                  {formatIQD(customerObj?.totalPaid || 0)}
                </p>
                {(customerObj?.totalPaidUSD || 0) > 0 && (
                  <p className="font-bold text-emerald-300 print:text-black text-[11px]">
                    {formatUSD(customerObj?.totalPaidUSD || 0)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-slate-600">قەرزی ماوە:</span>
              <div className="mt-0.5 space-y-0.5 font-numeric">
                {(customerObj?.outstandingDebt || 0) > 0 && (
                  <p className="font-bold text-amber-400 print:text-black text-xs sm:text-sm">
                    {formatIQD(customerObj?.outstandingDebt || 0)}
                  </p>
                )}
                {(customerObj?.outstandingDebtUSD || 0) > 0 && (
                  <p className="font-bold text-emerald-400 print:text-black text-xs sm:text-sm">
                    {formatUSD(customerObj?.outstandingDebtUSD || 0)}
                  </p>
                )}
                {(customerObj?.outstandingDebt || 0) === 0 &&
                  (!customerObj?.outstandingDebtUSD || customerObj?.outstandingDebtUSD === 0) && (
                    <p className="font-bold text-emerald-400 print:text-black text-xs sm:text-sm">
                      پاکتاو (0 د.ع)
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Statement Transaction Table - ALWAYS VISIBLE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">خشتەی مامەڵە داراییەکان</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-numeric bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {timeline.length} مامەڵە
                </span>
              </div>
            </div>

            {timeline.length === 0 ? (
              /* Fallback Clean Empty State */
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <FileQuestion className="w-7 h-7 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    هیچ مامەڵەیەک بۆ ئەم کڕیارە ({targetCustomerName}) تۆمار نەکراوە
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    ئەم کڕیارە هیچ تۆمارێکی فرۆشتن یان پسوولەی پارەدانی نییە لە سیستەمدا.
                  </p>
                </div>
                <div className="pt-2 no-print">
                  <button
                    type="button"
                    onClick={() => setViewingStatementCustomer(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>گەڕانەوە / داخستن</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 sm:mx-0 rounded-xl border border-slate-800/80 bg-slate-950/40 p-1">
                <table className="w-full min-w-[500px] sm:min-w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 print:border-black text-slate-300 print:text-black font-semibold">
                      <th className="pb-2.5 px-2">بەروار</th>
                      <th className="pb-2.5 px-2">جۆری مامەڵە</th>
                      <th className="pb-2.5 px-2">دراو</th>
                      <th className="pb-2.5 px-2">ڕوونکردنەوە</th>
                      <th className="pb-2.5 px-2">کڕین / قەرز (+)</th>
                      <th className="pb-2.5 px-2">دراو / قیست (-)</th>
                      <th className="pb-2.5 px-2 text-left">قەرزی ماوە</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                    {timeline.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="text-slate-200 print:text-black hover:bg-slate-900/40 transition-colors"
                      >
                        <td
                          className="py-2.5 px-2 text-slate-400 print:text-slate-700 text-[11px] font-numeric"
                          dir="ltr"
                        >
                          {formatShortDate(entry.date)}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                              entry.type === 'sale'
                                ? 'bg-emerald-500/10 text-emerald-400 print:border print:border-black print:text-black'
                                : 'bg-cyan-500/10 text-cyan-400 print:border print:border-black print:text-black'
                            }`}
                          >
                            {entry.number}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.currency === 'USD'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            } print:border print:border-black print:text-black`}
                          >
                            {entry.currency === 'USD' ? '$ دۆلار' : 'د.ع'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 max-w-xs truncate text-[11px] text-slate-300 print:text-black">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-2 font-numeric text-white print:text-black font-medium">
                          {entry.debit > 0 ? formatCurrency(entry.debit, entry.currency) : '—'}
                        </td>
                        <td className="py-2.5 px-2 font-numeric text-emerald-400 print:text-black font-medium">
                          {entry.credit > 0 ? formatCurrency(entry.credit, entry.currency) : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-left font-bold font-numeric text-amber-400 print:text-black">
                          {formatCurrency(entry.runningBalance, entry.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Signatures */}
          <div className="pt-4 sm:pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 print:text-slate-700">
            <div>
              <span>مۆری کۆگا و ژمێریاری: ____________________</span>
            </div>
            <div>
              <span>ئیمزای کڕیار: ____________________</span>
            </div>
          </div>

          {/* Bottom Actions Row (Hidden in Print) */}
          <div className="pt-2 flex items-center justify-between gap-3 no-print border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setViewingStatementCustomer(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              داخستن / گەڕانەوە
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold btn-gold cursor-pointer shadow-md hover:brightness-110 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردنی کەشف حساب</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
