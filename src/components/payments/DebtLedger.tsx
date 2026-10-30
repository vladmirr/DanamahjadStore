import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  PlusCircle,
  Search,
  User,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Printer,
  ChevronLeft,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatNumber } from '../../utils/formatters';
import { CustomerDebtSummary } from '../../types';

interface DebtLedgerProps {
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  presetCustomerName?: string;
}

export const DebtLedger: React.FC<DebtLedgerProps> = ({
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  presetCustomerName,
}) => {
  const {
    customers,
    createPayment,
    deleteCustomer,
    metrics,
    setViewingStatementCustomer,
    exportExcel,
  } = useApp();

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'settled'>('all');

  // Customer deletion state
  const [customerToDelete, setCustomerToDelete] = useState<CustomerDebtSummary | null>(null);
  const [rollbackStockOnDelete, setRollbackStockOnDelete] = useState<boolean>(true);

  // Payment form state
  const [targetCustomer, setTargetCustomer] = useState(presetCustomerName || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Open modal with preselected customer
  const handleOpenForCustomer = (name: string, debt?: number) => {
    setTargetCustomer(name);
    if (debt && debt > 0) {
      setAmount(debt.toString());
    } else {
      setAmount('');
    }
    setNotes('وەرگیرا بە کاش');
    setIsPaymentModalOpen(true);
  };

  // Submit payment voucher
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomer.trim() || !amount) return;

    createPayment({
      customerName: targetCustomer.trim(),
      amount: Number(amount),
      notes: notes.trim() || 'وەرگیرا لە دەستی کڕیار',
      date: new Date().toISOString(),
    });

    setIsPaymentModalOpen(false);
    setAmount('');
    setNotes('');
  };

  // Find target customer debt
  const selectedCustObj = customers.find((c) => c.name === targetCustomer);

  // Filter customers list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isDebtor = c.outstandingDebt > 0;

    if (filterType === 'debtors') return matchesSearch && isDebtor;
    if (filterType === 'settled') return matchesSearch && !isDebtor;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">پارەدان و قەرزەکانی کڕیاران</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تۆمارکردنی قیست و پارەدانەکانی کڕیار، چاپکردنی کەشف حساب و چاودێری کردنی تەواوی قەرزەکان
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => exportExcel()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 cursor-pointer"
            title="داگرتنی داتاکان بە شێوەی ئێکسڵ"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>داگرتنی ئێکسڵ</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTargetCustomer('');
              setAmount('');
              setNotes('وەرگیرا بە کاش');
              setIsPaymentModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs btn-gold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تۆمارکردنی پسوولەی وەرگرتنی پارە</span>
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <p className="text-xs text-slate-400">کۆی قەرزی ماوە لەسەر کڕیاران</p>
          <p className="text-xl font-bold text-amber-400 mt-1.5 font-numeric">
            {formatIQD(metrics.totalOutstandingDebt)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {customers.filter((c) => c.outstandingDebt > 0).length} کڕیاری قەرزدار
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <p className="text-xs text-slate-400">کۆی پارەی وەرگیراو لە کڕیاران</p>
          <p className="text-xl font-bold text-emerald-400 mt-1.5 font-numeric">
            {formatIQD(metrics.totalCashReceived)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">فرۆشتنی کاش + قیستە وەرگیراوەکان</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <p className="text-xs text-slate-400">ژمارەی گشتی کڕیاران</p>
          <p className="text-xl font-bold text-white mt-1.5 font-numeric">
            {customers.length} کەس
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {customers.filter((c) => c.outstandingDebt === 0).length} کڕیاری پاکتاوکراو
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="گەڕان بەپێی ناوی کڕیار..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80 text-xs w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            هەموو کڕیاران ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('debtors')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'debtors'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            قەرزدارەکان ({customers.filter((c) => c.outstandingDebt > 0).length})
          </button>
          <button
            onClick={() => setFilterType('settled')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'settled'
                ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            پاکتاوکراوەکان ({customers.filter((c) => c.outstandingDebt === 0).length})
          </button>
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">ناوی کڕیار</th>
                <th className="py-3.5 px-4 font-semibold">ژمارەی وەسڵ</th>
                <th className="py-3.5 px-4 font-semibold">کۆی کڕینەکان</th>
                <th className="py-3.5 px-4 font-semibold">کۆی پارەی دراو</th>
                <th className="py-3.5 px-4 font-semibold">بڕی ماوە (قەرز)</th>
                <th className="py-3.5 px-4 font-semibold">دۆخی حساب</th>
                <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    هیچ کڕیارێک بەردەست نییە بەپێی ئەم فلتەرە!
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDebt = cust.outstandingDebt > 0;

                  return (
                    <tr
                      key={cust.name}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{cust.name}</div>
                        {cust.phone && (
                          <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                            {cust.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-numeric text-slate-300">
                        {cust.invoicesCount} پسوولە
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-numeric">
                        {formatIQD(cust.totalPurchases)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-numeric">
                        {formatIQD(cust.totalPaid)}
                      </td>
                      <td className="py-3 px-4 font-bold font-numeric">
                        {hasDebt ? (
                          <span className="text-amber-400 font-numeric">
                            {formatIQD(cust.outstandingDebt)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-numeric">0 د.ع</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {hasDebt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                            قەرزدارە
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            پاکتاوکراوە
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {hasDebt && (
                            <button
                              onClick={() => handleOpenForCustomer(cust.name, cust.outstandingDebt)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium cursor-pointer"
                            >
                              وەرگرتنی پارە
                            </button>
                          )}
                          <button
                            onClick={() => setViewingStatementCustomer(cust.name)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            کەشف حساب
                          </button>
                          <button
                            onClick={() => exportExcel(cust.name)}
                            title={`داگرتنی ئێکسڵ بۆ ${cust.name}`}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            <span>ئێکسڵ</span>
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(cust)}
                            title="سڕینەوەی حسابی ئەم کڕیارە"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Voucher Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-card rounded-2xl border border-slate-700 p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      پسوولەی وەرگرتنی پارە لە کڕیار
                    </h3>
                    <p className="text-xs text-slate-400">
                      تۆمارکردنی وەسڵی وەرگرتن و کەمکردنەوەی قەرز بە دینار
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4 mt-5">
                {/* Customer name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ناوی کڕیار (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    placeholder="نموونە: هاڤاڵ کاروان"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {selectedCustObj && (
                    <div className="mt-1.5 text-xs text-amber-400 flex items-center justify-between">
                      <span>قەرزی ئێستای ئەم کڕیارە:</span>
                      <span className="font-bold font-numeric">
                        {formatIQD(selectedCustObj.outstandingDebt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount received */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      بڕی پارەی وەرگیراو بە دینار (Amount Received) *
                    </label>
                    {selectedCustObj && selectedCustObj.outstandingDebt > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(selectedCustObj.outstandingDebt.toString())}
                        className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        دانەوەی تەواوی قەرزەکە
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 font-numeric"
                  />
                  {/* Quick amount shortcuts */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 font-numeric cursor-pointer"
                      >
                        +{formatNumber(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note / Memo */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    تێبینی و ڕوونکردنەوە (Note / Memo)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="نموونە: کاش درا، حەواڵە، قیستی مانگی تشرین"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Remaining calculation preview */}
                {selectedCustObj && amount && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400">قەرزی نوێ دوای ئەم پارەدانە:</span>
                    <span className="font-bold text-emerald-400 font-numeric">
                      {formatIQD(Math.max(0, selectedCustObj.outstandingDebt - Number(amount)))}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold btn-gold cursor-pointer"
                  >
                    تۆمارکردن لە حساب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Customer Confirmation Modal */}
      <AnimatePresence>
        {customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md glass-card rounded-2xl border border-rose-500/40 p-6 relative overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">سڕینەوەی حسابی کڕیار</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ئایا دڵنیایت لە سڕینەوەی ئەم کڕیارە لە سیستم؟
                  </p>
                </div>
              </div>

              {/* Customer details card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs mb-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">ناوی کڕیار:</span>
                  <span className="font-bold text-white text-sm">
                    {customerToDelete.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ژمارەی پسوولەکان:</span>
                  <span className="font-numeric text-slate-200">
                    {customerToDelete.invoicesCount} وەسڵ
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">کۆی گشتی کڕین:</span>
                  <span className="font-numeric text-slate-200">
                    {formatIQD(customerToDelete.totalPurchases)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">کۆی پارەی دراو:</span>
                  <span className="font-numeric text-emerald-400">
                    {formatIQD(customerToDelete.totalPaid)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-semibold">بڕی قەرزی ماوە:</span>
                  <span className="font-bold text-amber-400 font-numeric text-sm">
                    {formatIQD(customerToDelete.outstandingDebt)}
                  </span>
                </div>
              </div>

              {/* Stock Rollback Toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-5 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={rollbackStockOnDelete}
                  onChange={(e) => setRollbackStockOnDelete(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium text-slate-200 block">
                    گەڕاندنەوەی بڕی کاڵا فرۆشراوەکان بۆ کۆگا
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ئەگەر چالاک بێت، سەرجەم ئەو کاڵایانەی ئەم کڕیارە کڕیونی دەگەڕێنەوە سەر مەوجوودی کۆگا.
                  </span>
                </div>
              </label>

              {/* Warning Notice */}
              <p className="text-[11px] text-rose-300/90 mb-5 flex items-center gap-1.5 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  بە سڕینەوەی ئەم کڕیارە، سەرجەم فرۆشتنەکان و وەسڵەکانی پارەدانیشی بە تەواوی لە سیستەمەکە دەسڕدرێنەوە.
                </span>
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteCustomer(customerToDelete.name, rollbackStockOnDelete);
                    setCustomerToDelete(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>بەڵێ، حسابەکەی بسڕەوە</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
