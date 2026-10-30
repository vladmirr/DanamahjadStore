import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  ShoppingCart,
  Wallet,
  Search,
  Calendar,
  Eye,
  Trash2,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatDateKurdish, formatShortDate } from '../../utils/formatters';
import { Sale, PaymentVoucher } from '../../types';

export const TransactionHistory: React.FC = () => {
  const { sales, payments, deleteSale, deletePayment, setViewingInvoice, exportExcel } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'payments'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesSearch =
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;
      const saleDate = new Date(s.date).getTime();
      const now = new Date().getTime();
      const diffDays = (now - saleDate) / (1000 * 3600 * 24);

      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === '7days') return diffDays <= 7;
      if (dateFilter === '30days') return diffDays <= 30;

      return true;
    });
  }, [sales, searchTerm, dateFilter]);

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;
      const pDate = new Date(p.date).getTime();
      const now = new Date().getTime();
      const diffDays = (now - pDate) / (1000 * 3600 * 24);

      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === '7days') return diffDays <= 7;
      if (dateFilter === '30days') return diffDays <= 30;

      return true;
    });
  }, [payments, searchTerm, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">مێژوو و ڕاپۆرتە گشتییەکان</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            پێداچوونەوەی تەواوی تۆمارەکانی فرۆشتن و پارەدانەکان لەگەڵ دەرهێنانی پسوولەکان
          </p>
        </div>

        <button
          onClick={() => exportExcel()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>داگرتنی ئێکسڵ</span>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Sub Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700/80 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('sales')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'sales'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>مێژووی فرۆشتنەکان ({sales.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'payments'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>مێژووی وەرگرتنی پارە ({payments.length})</span>
          </button>
        </div>

        {/* Search and Date filter */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="گەڕان بەپێی کڕیار، کاڵا، کۆد..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-9"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">سەرجەم بەروارەکان</option>
            <option value="today">ئەمڕۆ</option>
            <option value="7days">٧ ڕۆژی ڕابردوو</option>
            <option value="30days">٣٠ ڕۆژی ڕابردوو</option>
          </select>
        </div>
      </div>

      {/* Tables based on active tab */}
      {activeSubTab === 'sales' ? (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">ژمارەی وەسڵ</th>
                  <th className="py-3.5 px-4 font-semibold">بەروار و کات</th>
                  <th className="py-3.5 px-4 font-semibold">ناوی کڕیار</th>
                  <th className="py-3.5 px-4 font-semibold">کاڵاکان</th>
                  <th className="py-3.5 px-4 font-semibold">کۆی وەسڵ</th>
                  <th className="py-3.5 px-4 font-semibold">دراو (Down Payment)</th>
                  <th className="py-3.5 px-4 font-semibold">ماوە (قەرز)</th>
                  <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      هیچ تۆمارێکی فرۆشتن نەدۆزرایەوە!
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                        {s.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]" dir="ltr">
                        {formatDateKurdish(s.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {s.customerName}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {s.items.map((i) => `${i.productName} (${i.quantity} ${i.unitType === 'carton' ? 'کارتۆن' : 'دانە'})`).join('، ')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-numeric">
                        {formatIQD(s.totalAmount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-numeric">
                        {formatIQD(s.paidAmount)}
                      </td>
                      <td className="py-3 px-4 font-bold font-numeric">
                        {s.remainingAmount > 0 ? (
                          <span className="text-amber-400">
                            {formatIQD(s.remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-500">پاکتاو</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingInvoice(s)}
                            title="بینینی وەسڵ"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('دڵنیایت لە سڕینەوەی ئەم فرۆشە؟ بڕی مەوجوودی کاڵاکان دەگەڕێتەوە ناو کۆگا.')) {
                                deleteSale(s.id);
                              }
                            }}
                            title="سڕینەوە و گەڕاندنەوەی کۆگا"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">ژمارەی پسوولە</th>
                  <th className="py-3.5 px-4 font-semibold">بەروار و کات</th>
                  <th className="py-3.5 px-4 font-semibold">ناوی کڕیار</th>
                  <th className="py-3.5 px-4 font-semibold">بڕی پارەی وەرگیراو</th>
                  <th className="py-3.5 px-4 font-semibold">تێبینی و ڕوونکردنەوە</th>
                  <th className="py-3.5 px-4 font-semibold text-center">سڕینەوە</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      هیچ تۆمارێکی پارەدان نەدۆزرایەوە!
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-cyan-400">
                        {p.voucherNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]" dir="ltr">
                        {formatDateKurdish(p.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-numeric text-sm">
                        {formatIQD(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('دڵنیایت لە سڕینەوەی ئەم وەسڵی پارەدانە؟')) {
                              deletePayment(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
