import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Edit2,
  X,
  Plus,
  Minus,
  Package,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatUSD, formatCurrency, formatDateKurdish, formatShortDate, formatNumber } from '../../utils/formatters';
import { Sale, PaymentVoucher, Currency } from '../../types';

export const TransactionHistory: React.FC = () => {
  const {
    sales,
    payments,
    customers,
    products,
    deleteSale,
    deletePayment,
    updatePayment,
    updateSale,
    setViewingInvoice,
    exportExcel,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'payments'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleCustomerName, setEditSaleCustomerName] = useState('');
  const [editSaleCustomerPhone, setEditSaleCustomerPhone] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editSalePaidAmount, setEditSalePaidAmount] = useState('');
  const [editSaleNotes, setEditSaleNotes] = useState('');
  const [editSaleCurrency, setEditSaleCurrency] = useState<Currency>('IQD');
  const [editSaleItems, setEditSaleItems] = useState<Sale['items']>([]);
  const [isSubmittingEditSale, setIsSubmittingEditSale] = useState(false);

  const handleOpenEditSale = (s: Sale) => {
    setEditingSale(s);
    setEditSaleCustomerName(s.customerName || '');
    setEditSaleCustomerPhone(s.customerPhone || '');
    setEditSalePaidAmount(s.paidAmount !== undefined ? s.paidAmount.toString() : '0');
    setEditSaleNotes(s.notes || '');
    setEditSaleCurrency(s.currency || 'IQD');
    setEditSaleItems(JSON.parse(JSON.stringify(s.items || [])));

    try {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        setEditSaleDate(local.toISOString().slice(0, 16));
      } else {
        setEditSaleDate('');
      }
    } catch {
      setEditSaleDate('');
    }
  };

  const handleCloseEditSale = () => {
    setEditingSale(null);
    setEditSaleCustomerName('');
    setEditSaleCustomerPhone('');
    setEditSaleDate('');
    setEditSalePaidAmount('');
    setEditSaleNotes('');
    setEditSaleCurrency('IQD');
    setEditSaleItems([]);
    setIsSubmittingEditSale(false);
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setEditSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const prod = products.find((p) => p.id === item.productId);
      const unitsPerCarton =
        prod?.unitsPerCarton ||
        (item.quantity > 0 ? Math.round(item.quantityInUnits / item.quantity) : 1) ||
        1;
      const quantityInUnits = item.unitType === 'carton' ? newQty * unitsPerCarton : newQty;
      const total =
        item.unitType === 'carton'
          ? newQty * unitsPerCarton * item.unitPrice
          : newQty * item.unitPrice;
      const totalCost = quantityInUnits * (item.costPricePerUnit || prod?.costPricePerUnit || 0);

      copy[index] = {
        ...item,
        quantity: newQty,
        quantityInUnits,
        total,
        totalCost,
      };
      return copy;
    });
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setEditSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      const prod = products.find((p) => p.id === item.productId);
      const unitsPerCarton =
        prod?.unitsPerCarton ||
        (item.quantity > 0 ? Math.round(item.quantityInUnits / item.quantity) : 1) ||
        1;
      const total =
        item.unitType === 'carton'
          ? item.quantity * unitsPerCarton * newPrice
          : item.quantity * newPrice;

      copy[index] = {
        ...item,
        unitPrice: newPrice,
        total,
      };
      return copy;
    });
  };

  const removeItem = (index: number) => {
    if (editSaleItems.length <= 1) {
      alert('وەسڵ ناتوانێت بەبێ هیچ کاڵایەک بمێنێتەوە!');
      return;
    }
    setEditSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const editSaleTotalAmount = useMemo(() => {
    return editSaleItems.reduce((acc, item) => acc + (item.total || 0), 0);
  }, [editSaleItems]);

  const editSaleRemainingAmount = useMemo(() => {
    const paid = Number(editSalePaidAmount) || 0;
    return Math.max(0, editSaleTotalAmount - paid);
  }, [editSaleTotalAmount, editSalePaidAmount]);

  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    if (!editSaleCustomerName.trim()) {
      alert('تکایە ناوی کڕیار بنووسە!');
      return;
    }
    if (editSaleItems.length === 0) {
      alert('تکایە لانیکەم یەک کاڵا دیاریبکە!');
      return;
    }

    setIsSubmittingEditSale(true);
    try {
      let isoDate = editingSale.date;
      if (editSaleDate) {
        const parsed = new Date(editSaleDate);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString();
        }
      }

      await updateSale(editingSale.id, {
        customerName: editSaleCustomerName.trim(),
        customerPhone: editSaleCustomerPhone.trim(),
        currency: editSaleCurrency,
        paidAmount: Number(editSalePaidAmount) || 0,
        notes: editSaleNotes.trim(),
        date: isoDate,
        items: editSaleItems,
      });

      handleCloseEditSale();
    } catch (err) {
      console.error('Failed to update sale:', err);
    } finally {
      setIsSubmittingEditSale(false);
    }
  };

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<PaymentVoucher | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentCurrency, setEditPaymentCurrency] = useState<Currency>('IQD');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleOpenEditPayment = (p: PaymentVoucher) => {
    setEditingPayment(p);
    setEditCustomerName(p.customerName || '');
    setEditAmount(p.amount ? p.amount.toString() : '');
    setEditNotes(p.notes || '');
    setEditPaymentCurrency(p.currency || 'IQD');

    try {
      const d = new Date(p.date);
      if (!isNaN(d.getTime())) {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        setEditDate(local.toISOString().slice(0, 16));
      } else {
        setEditDate('');
      }
    } catch {
      setEditDate('');
    }
  };

  const handleCloseEditPayment = () => {
    setEditingPayment(null);
    setEditCustomerName('');
    setEditAmount('');
    setEditNotes('');
    setEditDate('');
    setEditPaymentCurrency('IQD');
    setIsSubmittingEdit(false);
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    if (!editCustomerName.trim() || !editAmount || Number(editAmount) <= 0) return;

    setIsSubmittingEdit(true);
    try {
      let isoDate = editingPayment.date;
      if (editDate) {
        const parsed = new Date(editDate);
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString();
        }
      }

      await updatePayment(editingPayment.id, {
        customerName: editCustomerName.trim(),
        amount: Number(editAmount),
        currency: editPaymentCurrency,
        notes: editNotes.trim(),
        date: isoDate,
      });

      handleCloseEditPayment();
    } catch (err) {
      console.error('Failed to update payment voucher:', err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
                  <th className="py-3.5 px-4 font-semibold">دراو</th>
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
                    <td colSpan={9} className="py-12 text-center text-slate-500">
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
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.currency === 'USD'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {s.currency === 'USD' ? '$ USD' : 'د.ع IQD'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {s.items.map((i) => `${i.productName} (${i.quantity} ${i.unitType === 'carton' ? 'کارتۆن' : 'دانە'})`).join('، ')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-numeric">
                        {formatCurrency(s.totalAmount, s.currency || 'IQD')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400 font-numeric">
                        {formatCurrency(s.paidAmount, s.currency || 'IQD')}
                      </td>
                      <td className="py-3 px-4 font-bold font-numeric">
                        {s.remainingAmount > 0 ? (
                          <span className="text-amber-400">
                            {formatCurrency(s.remainingAmount, s.currency || 'IQD')}
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
                            onClick={() => handleOpenEditSale(s)}
                            title="دەستکاریکردنی فرۆش"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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
                  <th className="py-3.5 px-4 font-semibold">دراو</th>
                  <th className="py-3.5 px-4 font-semibold">بڕی پارەی وەرگیراو</th>
                  <th className="py-3.5 px-4 font-semibold">تێبینی و ڕوونکردنەوە</th>
                  <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
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
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.currency === 'USD'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {p.currency === 'USD' ? '$ USD' : 'د.ع IQD'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-numeric text-sm">
                        {formatCurrency(p.amount, p.currency || 'IQD')}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditPayment(p)}
                            title="دەستکاریکردنی وەسڵ"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('دڵنیایت لە سڕینەوەی ئەم وەسڵی پارەدانە؟')) {
                                deletePayment(p.id);
                              }
                            }}
                            title="سڕینەوەی وەسڵ"
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
      )}

      {/* Edit Payment Voucher Modal */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg glass-card rounded-2xl border border-slate-700/80 p-6 relative overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      دەستکاریکردنی وەسڵی پارەدان
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      پسوولەی ژمارە:{' '}
                      <span className="font-mono text-cyan-400 font-semibold">
                        {editingPayment.voucherNumber}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEditPayment}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEditPayment} className="space-y-4">
                {/* Currency Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    دراوی پسوولە (Currency)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentCurrency('IQD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        editPaymentCurrency === 'IQD'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      دینار (د.ع IQD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentCurrency('USD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        editPaymentCurrency === 'USD'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      دۆلار ($ USD)
                    </button>
                  </div>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ناوی کڕیار (Customer Name)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="edit-payment-customers"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="ناوی کڕیار بنووسە..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <datalist id="edit-payment-customers">
                      {customers.map((c) => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      بڕی پارەی وەرگیراو ({editPaymentCurrency === 'USD' ? '$ دۆلار' : 'د.ع دینار'})
                    </label>
                    {editAmount && Number(editAmount) > 0 && (
                      <span className="text-xs font-bold text-emerald-400 font-numeric">
                        {formatCurrency(Number(editAmount), editPaymentCurrency)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 font-numeric"
                  />
                  {/* Quick shortcuts */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {(editPaymentCurrency === 'USD' ? [50, 100, 250, 500, 1000] : [25000, 50000, 100000, 250000, 500000, 1000000]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setEditAmount(amt.toString())}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 font-numeric cursor-pointer"
                      >
                        +{editPaymentCurrency === 'USD' ? `$${amt}` : formatNumber(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    بەروار و کاتی وەرگرتن (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    dir="ltr"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    تێبینی و ڕوونکردنەوە (Notes)
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="نموونە: وەرگیرا بە کاش، حەواڵە..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEditPayment}
                    className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmittingEdit ? 'پاشەکەوت دەکرێت...' : 'پاشەکەوتکردنی گۆڕانکارییەکان'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Sale Modal */}
      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col glass-card rounded-2xl border border-slate-700/80 p-6 relative overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      دەستکاریکردنی وەسڵی فرۆشتن
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      پسوولەی ژمارە:{' '}
                      <span className="font-mono text-emerald-400 font-semibold">
                        {editingSale.invoiceNumber}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEditSale}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveEditSale} className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Currency Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    دراوی فرۆشتن (Currency)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSaleCurrency('IQD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        editSaleCurrency === 'IQD'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      دینار (د.ع IQD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSaleCurrency('USD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        editSaleCurrency === 'USD'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      دۆلار ($ USD)
                    </button>
                  </div>
                </div>

                {/* Customer Info & Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ناوی کڕیار (Customer)
                    </label>
                    <input
                      type="text"
                      required
                      list="edit-sale-customers"
                      value={editSaleCustomerName}
                      onChange={(e) => setEditSaleCustomerName(e.target.value)}
                      placeholder="ناوی کڕیار بنووسە..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="edit-sale-customers">
                      {customers.map((c) => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ژمارەی مۆبایل (Phone)
                    </label>
                    <input
                      type="text"
                      value={editSaleCustomerPhone}
                      onChange={(e) => setEditSaleCustomerPhone(e.target.value)}
                      placeholder="0750xxxxxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      dir="ltr"
                    />
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      بەروار و کات (Date & Time)
                    </label>
                    <input
                      type="datetime-local"
                      value={editSaleDate}
                      onChange={(e) => setEditSaleDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Items in Invoice */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      <span>کاڵاکانی ناو ئەم وەسڵە ({editSaleItems.length})</span>
                    </label>
                  </div>

                  <div className="space-y-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 max-h-56 overflow-y-auto">
                    {editSaleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Name and unit */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.unitType === 'carton' ? 'کارتۆن' : 'دانە'}
                            </span>
                            {item.unitType === 'carton' && (
                              <span>({item.quantityInUnits} دانە)</span>
                            )}
                          </div>
                        </div>

                        {/* Controls: Quantity & Price */}
                        <div className="flex items-center gap-3">
                          {/* Quantity */}
                          <div className="flex items-center gap-1 bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, Math.max(1, item.quantity - 1))}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(idx, Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-12 text-center bg-transparent text-white font-numeric font-bold text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Unit Price */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItemPrice(idx, Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-numeric font-semibold text-center focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-slate-400">
                              {editSaleCurrency === 'USD' ? '$' : 'د.ع'}
                            </span>
                          </div>

                          {/* Line Total */}
                          <div className="w-24 text-left font-numeric font-bold text-emerald-400 text-xs">
                            {formatCurrency(item.total, editSaleCurrency)}
                          </div>

                          {/* Delete Item Button */}
                          {editSaleItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              title="سڕینەوەی ئەم کاڵایە لە وەسڵ"
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary & Down Payment */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Total Amount */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block mb-0.5">کۆی گشتی فرۆش:</span>
                      <span className="text-sm font-bold text-white font-numeric">
                        {formatCurrency(editSaleTotalAmount, editSaleCurrency)}
                      </span>
                    </div>

                    {/* Paid Amount */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block mb-0.5">بڕی دراو (پێشەکی):</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        max={editSaleTotalAmount}
                        value={editSalePaidAmount}
                        onChange={(e) => setEditSalePaidAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold font-numeric focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Remaining Amount */}
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block mb-0.5">ماوە (قەرز):</span>
                      <span className="text-sm font-bold font-numeric">
                        {editSaleRemainingAmount > 0 ? (
                          <span className="text-amber-400">
                            {formatCurrency(editSaleRemainingAmount, editSaleCurrency)}
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {editSaleCurrency === 'USD' ? 'پاکتاو ($0.00)' : 'پاکتاو (0 د.ع)'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Quick Payment Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400">دیاریکردنی خێرا:</span>
                    <button
                      type="button"
                      onClick={() => setEditSalePaidAmount(editSaleTotalAmount.toString())}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium hover:bg-emerald-500/20 cursor-pointer transition-colors"
                    >
                      هەمووی دراوە (کاش تەواو)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSalePaidAmount('0')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium hover:bg-amber-500/20 cursor-pointer transition-colors"
                    >
                      هیچ نەدراوە (سەرجەمی بە قەرز)
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    تێبینی و ڕوونکردنەوە (Notes)
                  </label>
                  <input
                    type="text"
                    value={editSaleNotes}
                    onChange={(e) => setEditSaleNotes(e.target.value)}
                    placeholder="تێبینی دەربارەی ئەم فرۆشە بنووسە..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseEditSale}
                    className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEditSale}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmittingEditSale ? 'پاشەکەوت دەکرێت...' : 'پاشەکەوتکردنی گۆڕانکارییەکان'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
