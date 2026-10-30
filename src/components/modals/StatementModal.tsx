import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, User, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatDateKurdish, formatShortDate } from '../../utils/formatters';

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
        description: `وەرگرتنی قیست / پارەدان: ${p.notes || 'کاش'}`,
        debit: 0,
        credit: p.amount, // Decreases debt
        notes: p.notes,
      }));

    // Combine and sort chronologically ascending
    const combined = [...custSales, ...custPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let currentBalance = 0;
    return combined.map((entry) => {
      currentBalance += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: Math.max(0, currentBalance),
      };
    });
  }, [sales, payments, viewingStatementCustomer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl my-8 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden print-card relative"
      >
        {/* Controls */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
            <FileText className="w-4 h-4" />
            <span>کەشف حسابی تەواوی کڕیار</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold btn-gold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردنی کەشف حساب</span>
            </button>
            <button
              onClick={() => setViewingStatementCustomer(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Container */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-100 bg-[#0c0e14] print:text-black print:bg-white">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-amber-500/20 print:border-slate-300 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 print:border-slate-400 p-1 flex items-center justify-center shrink-0">
                <img
                  src="/logo-icon.png"
                  alt="DanaMahjadStore"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 print:text-black">
                  DanaMahjadStore
                </h2>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  ڕاپۆرتی کەشف حسابی دارایی کڕیار (Customer Statement)
                </p>
              </div>
            </div>

            <div className="text-left text-xs">
              <span className="text-slate-400 print:text-slate-600">بەرواری دەرهێنان:</span>
              <p className="font-semibold text-white print:text-black mt-0.5" dir="ltr">
                {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Customer Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-600">ناوی کڕیار:</span>
              <p className="font-bold text-white print:text-black text-sm mt-0.5">
                {viewingStatementCustomer}
              </p>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600">کۆی کڕینەکان:</span>
              <p className="font-bold text-white print:text-black font-numeric mt-0.5">
                {formatIQD(customerObj?.totalPurchases || 0)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600">کۆی پارەی دراو:</span>
              <p className="font-bold text-emerald-400 print:text-black font-numeric mt-0.5">
                {formatIQD(customerObj?.totalPaid || 0)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600">قەرزی ماوە (کۆتایی):</span>
              <p
                className={`font-bold font-numeric mt-0.5 ${
                  (customerObj?.outstandingDebt || 0) > 0
                    ? 'text-amber-400 print:text-black text-sm'
                    : 'text-emerald-400 print:text-black'
                }`}
              >
                {formatIQD(customerObj?.outstandingDebt || 0)}
              </p>
            </div>
          </div>

          {/* Timeline Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-700 print:border-black text-slate-300 print:text-black font-semibold">
                  <th className="pb-2.5">بەروار</th>
                  <th className="pb-2.5">جۆری مامەڵە</th>
                  <th className="pb-2.5">ڕوونکردنەوە</th>
                  <th className="pb-2.5">کڕین / قەرز (+)</th>
                  <th className="pb-2.5">دراو / قیست (-)</th>
                  <th className="pb-2.5 text-left">قەرزی ماوە</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {timeline.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      هیچ تۆمارێکی دارایی نییە بۆ ئەم کڕیارە!
                    </td>
                  </tr>
                ) : (
                  timeline.map((entry, idx) => (
                    <tr key={idx} className="text-slate-200 print:text-black">
                      <td className="py-2.5 text-slate-400 print:text-slate-700 text-[11px]" dir="ltr">
                        {formatShortDate(entry.date)}
                      </td>
                      <td className="py-2.5">
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
                      <td className="py-2.5 max-w-xs truncate text-[11px] text-slate-300 print:text-black">
                        {entry.description}
                      </td>
                      <td className="py-2.5 font-numeric text-white print:text-black font-medium">
                        {entry.debit > 0 ? formatIQD(entry.debit) : '—'}
                      </td>
                      <td className="py-2.5 font-numeric text-emerald-400 print:text-black font-medium">
                        {entry.credit > 0 ? formatIQD(entry.credit) : '—'}
                      </td>
                      <td className="py-2.5 text-left font-bold font-numeric text-amber-400 print:text-black">
                        {formatIQD(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-xs text-slate-400 print:text-slate-700">
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
