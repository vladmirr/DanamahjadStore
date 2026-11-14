import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatUSD, formatCurrency, formatShortDate } from '../../utils/formatters';
import { Currency } from '../../types';

export const StatementModal: React.FC = () => {
  const { viewingStatementCustomer, setViewingStatementCustomer, sales, payments, customers } =
    useApp();

  if (!viewingStatementCustomer) return null;

  const customerObj = customers.find((c) => c.name === viewingStatementCustomer);

  // Chronological transaction timeline for this customer
  const timeline = useMemo(() => {
    const custSales = sales
      .filter((s) => s.customerName === viewingStatementCustomer)
      .map((s) => ({
        type: 'sale' as const,
        id: s.id,
        number: s.invoiceNumber,
        date: s.date,
        currency: (s.currency || 'IQD') as Currency,
        description: `فرۆشتن: ${s.items.map((i) => i.productName).join('، ')}`,
        debit: s.totalAmount, // Increases debt
        credit: s.paidAmount, // Decreases debt via down payment
        notes: s.notes,
      }));

    const custPayments = payments
      .filter((p) => p.customerName === viewingStatementCustomer)
      .map((p) => ({
        type: 'payment' as const,
        id: p.id,
        number: p.voucherNumber,
        date: p.date,
        currency: (p.currency || 'IQD') as Currency,
        description: `وەرگرتنی قیست / پارەدان: ${p.notes || 'کاش'}`,
        debit: 0,
        credit: p.amount, // Decreases debt
        notes: p.notes,
      }));

    // Combine and sort chronologically ascending
    const combined = [...custSales, ...custPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

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
  }, [sales, payments, viewingStatementCustomer]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl my-2 sm:my-8 bg-[#0c0e14] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden print-card relative"
      >
        {/* Controls */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 sm:gap-2 text-cyan-400 text-xs font-semibold shrink-0">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
            <span className="truncate">کەشف حسابی تەواوی کڕیار</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold btn-gold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردن</span>
            </button>
            <button
              onClick={() => setViewingStatementCustomer(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="داخستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 text-slate-100 bg-[#0c0e14] print:text-black print:bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-amber-500/20 print:border-slate-300 pb-4 sm:pb-5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 print:border-slate-400 p-1 flex items-center justify-center shrink-0">
                <img
                  src="/logo-icon.png"
                  alt="Dana Mahjad"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 print:text-black block truncate">
                  Dana Mahjad
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 print:text-slate-600 mt-0.5 truncate">
                  ڕاپۆرتی کەشف حسابی دارایی کڕیار (Customer Statement)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-t-0 shrink-0 text-xs">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/15 print:border print:border-black text-cyan-400 print:text-black font-bold">
                کەشف حساب
              </span>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-300 print:text-black" dir="ltr">
                {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Customer Summary Box */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 print:text-slate-600">ناوی کڕیار:</span>
              <p className="font-bold text-white print:text-black text-sm mt-0.5 truncate">
                {viewingStatementCustomer}
              </p>
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
                {(customerObj?.outstandingDebt || 0) === 0 && (!customerObj?.outstandingDebtUSD || customerObj?.outstandingDebtUSD === 0) && (
                  <p className="font-bold text-emerald-400 print:text-black text-xs sm:text-sm">
                    پاکتاو (0 د.ع)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Table */}
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full min-w-[500px] sm:min-w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-700 print:border-black text-slate-300 print:text-black font-semibold">
                  <th className="pb-2.5 px-1.5">بەروار</th>
                  <th className="pb-2.5 px-1.5">جۆری مامەڵە</th>
                  <th className="pb-2.5 px-1.5">دراو</th>
                  <th className="pb-2.5 px-1.5">ڕوونکردنەوە</th>
                  <th className="pb-2.5 px-1.5">کڕین / قەرز (+)</th>
                  <th className="pb-2.5 px-1.5">دراو / قیست (-)</th>
                  <th className="pb-2.5 px-1.5 text-left">قەرزی ماوە</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {timeline.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      هیچ تۆمارێکی دارایی نییە بۆ ئەم کڕیارە!
                    </td>
                  </tr>
                ) : (
                  timeline.map((entry, idx) => (
                    <tr key={idx} className="text-slate-200 print:text-black">
                      <td className="py-2.5 px-1.5 text-slate-400 print:text-slate-700 text-[11px]" dir="ltr">
                        {formatShortDate(entry.date)}
                      </td>
                      <td className="py-2.5 px-1.5">
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
                      <td className="py-2.5 px-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          entry.currency === 'USD'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        } print:border print:border-black print:text-black`}>
                          {entry.currency === 'USD' ? '$ دۆلار' : 'د.ع'}
                        </span>
                      </td>
                      <td className="py-2.5 px-1.5 max-w-xs truncate text-[11px] text-slate-300 print:text-black">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-1.5 font-numeric text-white print:text-black font-medium">
                        {entry.debit > 0 ? formatCurrency(entry.debit, entry.currency) : '—'}
                      </td>
                      <td className="py-2.5 px-1.5 font-numeric text-emerald-400 print:text-black font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit, entry.currency) : '—'}
                      </td>
                      <td className="py-2.5 px-1.5 text-left font-bold font-numeric text-amber-400 print:text-black">
                        {formatCurrency(entry.runningBalance, entry.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-4 sm:pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 print:text-slate-700">
            <div>
              <span>مۆری کۆگا و ژمێریاری: ____________________</span>
            </div>
            <div>
              <span>ئیمزای کڕیار: ____________________</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
