import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle, Receipt, Building, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatDateKurdish } from '../../utils/formatters';

export const InvoiceModal: React.FC = () => {
  const { viewingInvoice, setViewingInvoice } = useApp();

  if (!viewingInvoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl my-8 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden print-card relative"
      >
        {/* Modal Controls (Hidden in print) */}
        <div className="p-4 bg-slate-950/80 border-b border-amber-500/15 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>وەسڵی فرۆشتن ئامادەیە</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold btn-gold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردنی وەسڵ</span>
            </button>
            <button
              onClick={() => setViewingInvoice(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
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
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 print:text-black">
                    DanaMahjadStore
                  </span>
                </div>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  کۆگای سەرەکی و فرۆشتنی کۆمەڵ و تاک
                </p>
                <p className="text-xs text-slate-400 print:text-slate-600">
                  سلێمانی / هەولێر • تەلەفۆن: 0750 000 0000
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="px-2.5 py-1 rounded bg-emerald-500/15 print:border print:border-black text-emerald-400 print:text-black text-xs font-bold font-mono">
                {viewingInvoice.invoiceNumber}
              </span>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1" dir="ltr">
                {formatDateKurdish(viewingInvoice.date)}
              </p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 print:bg-slate-50 border border-slate-800 print:border-slate-300 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-600">ناوی کڕیار:</span>
              <p className="font-bold text-white print:text-black text-sm mt-0.5">
                {viewingInvoice.customerName}
              </p>
            </div>
            {viewingInvoice.customerPhone && (
              <div>
                <span className="text-slate-400 print:text-slate-600">ژمارەی پەیوەندی:</span>
                <p className="font-semibold text-slate-200 print:text-black font-mono mt-0.5" dir="ltr">
                  {viewingInvoice.customerPhone}
                </p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-700 print:border-black text-slate-300 print:text-black font-semibold">
                  <th className="pb-2.5">ڕیز</th>
                  <th className="pb-2.5">ناوی کاڵا</th>
                  <th className="pb-2.5">یەکە</th>
                  <th className="pb-2.5">بڕ</th>
                  <th className="pb-2.5">نرخی تاک (د.ع)</th>
                  <th className="pb-2.5 text-left">کۆی گشتی (د.ع)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                {viewingInvoice.items.map((item, idx) => (
                  <tr key={idx} className="text-slate-200 print:text-black">
                    <td className="py-2.5 text-slate-400 font-numeric">{idx + 1}</td>
                    <td className="py-2.5 font-medium">{item.productName}</td>
                    <td className="py-2.5 text-slate-400 print:text-slate-700">
                      {item.unitType === 'carton' ? 'کارتۆن' : 'دانە'}
                    </td>
                    <td className="py-2.5 font-bold font-numeric">{item.quantity}</td>
                    <td className="py-2.5 font-numeric">{formatIQD(item.unitPrice)}</td>
                    <td className="py-2.5 text-left font-bold font-numeric">
                      {formatIQD(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Outstanding balance calculation */}
          <div className="pt-4 border-t border-slate-700 print:border-black space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 print:text-slate-700">کۆی گشتی فرۆش:</span>
              <span className="text-base font-bold text-white print:text-black font-numeric">
                {formatIQD(viewingInvoice.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 print:text-slate-700">
                بڕی پارەی دراو (Down Payment):
              </span>
              <span className="text-sm font-semibold text-emerald-400 print:text-black font-numeric">
                {formatIQD(viewingInvoice.paidAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 print:border-slate-300">
              <span className="text-slate-400 print:text-slate-700">
                بڕی پارەی ماوە لەم پسوولەیەدا:
              </span>
              <span
                className={`text-sm font-bold font-numeric ${
                  viewingInvoice.remainingAmount > 0
                    ? 'text-amber-400 print:text-black'
                    : 'text-emerald-400 print:text-black'
                }`}
              >
                {viewingInvoice.remainingAmount > 0
                  ? formatIQD(viewingInvoice.remainingAmount)
                  : 'پاکتاوکراوە (کاش)'}
              </span>
            </div>
          </div>

          {viewingInvoice.notes && (
            <div className="p-3 rounded-lg bg-slate-950/40 print:bg-slate-100 text-xs text-slate-300 print:text-slate-800">
              <span className="text-slate-400 print:text-slate-600 font-semibold">تێبینی: </span>
              <span>{viewingInvoice.notes}</span>
            </div>
          )}

          {/* Kurdish Footer */}
          <div className="text-center pt-4 border-t border-slate-800 print:border-slate-300 text-[11px] text-slate-400 print:text-slate-700 space-y-1">
            <p className="font-semibold text-slate-300 print:text-black">
              سوپاس بۆ مامەڵەکردنتان لەگەڵ کۆگای فلۆدێرم!
            </p>
            <p>کاڵای فرۆشراو دەگۆڕدرێتەوە تا ماوەی ٣ ڕۆژ بە مەرجی پێشکەشکردنی ئەم پسوولەیە.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
