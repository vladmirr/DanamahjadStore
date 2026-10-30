import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatNumber } from '../../utils/formatters';
import { Product } from '../../types';

interface InventoryManagementProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const { products, addProduct, updateProduct, deleteProduct, metrics } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'available'>('all');

  // Edit / Delete State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form Fields for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'گشتی',
    costPricePerUnit: '',
    cartons: '',
    unitsPerCarton: '',
    sellingPricePerUnit: '',
    minStockThreshold: '24',
  });

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase());

      const isLowStock = p.totalUnits <= p.minStockThreshold;
      const matchesStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'low'
          ? isLowStock
          : !isLowStock;

      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  // Monetary stock values
  const filteredCostValue = useMemo(() => {
    return filteredProducts.reduce(
      (acc, p) => acc + (p.costPricePerUnit || 0) * (p.totalUnits || 0),
      0
    );
  }, [filteredProducts]);

  const filteredSellingValue = useMemo(() => {
    return filteredProducts.reduce(
      (acc, p) => acc + (p.sellingPricePerUnit || 0) * (p.totalUnits || 0),
      0
    );
  }, [filteredProducts]);

  const totalFilteredUnits = useMemo(() => {
    return filteredProducts.reduce((acc, p) => acc + (p.totalUnits || 0), 0);
  }, [filteredProducts]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      category: 'گشتی',
      costPricePerUnit: '',
      cartons: '10',
      unitsPerCarton: '12',
      sellingPricePerUnit: '',
      minStockThreshold: '20',
    });
    setIsAddModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      costPricePerUnit: p.costPricePerUnit.toString(),
      cartons: p.cartons.toString(),
      unitsPerCarton: p.unitsPerCarton.toString(),
      sellingPricePerUnit: p.sellingPricePerUnit.toString(),
      minStockThreshold: p.minStockThreshold.toString(),
    });
    setIsAddModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const costPricePerUnit = Number(formData.costPricePerUnit) || 0;
    const cartons = Number(formData.cartons) || 0;
    const unitsPerCarton = Number(formData.unitsPerCarton) || 1;
    const sellingPricePerUnit = Number(formData.sellingPricePerUnit) || costPricePerUnit * 1.25;
    const minStockThreshold = Number(formData.minStockThreshold) || 20;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category.trim(),
        costPricePerUnit,
        cartons,
        unitsPerCarton,
        totalUnits: cartons * unitsPerCarton,
        sellingPricePerUnit,
        minStockThreshold,
      });
    } else {
      addProduct({
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || `BC-${Date.now().toString().slice(-6)}`,
        category: formData.category.trim() || 'گشتی',
        costPricePerUnit,
        cartons,
        unitsPerCarton,
        sellingPricePerUnit,
        minStockThreshold,
      });
    }

    setIsAddModalOpen(false);
  };

  // Calculated preview in modal
  const calcCartons = Number(formData.cartons) || 0;
  const calcUnitsPerCarton = Number(formData.unitsPerCarton) || 1;
  const calcTotalUnits = calcCartons * calcUnitsPerCarton;
  const calcCostUnit = Number(formData.costPricePerUnit) || 0;

  return (
    <div className="space-y-6">
      {/* Header & Metric Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">بەڕێوەبردنی کۆگا و کاڵاکان</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تۆمارکردنی کاڵاکان بە کارتۆن و دانە، چاودێری کردنی ئاستی کۆگا و نرخەکان بە دینار
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs btn-gold cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>زیادکردنی کاڵای نوێ</span>
        </motion.button>
      </div>

      {/* Inventory Monetary Value Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Value (سەرمایەی کۆگا بە نرخی کڕین) */}
        <div className="p-4 rounded-2xl glass-card border border-amber-500/25 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/90 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">کۆی بەهای سەرمایە (تێچووی کۆگا)</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 font-numeric tracking-tight">
            {formatIQD(filteredCostValue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            کۆی پارەی کاڵاکانی کۆگا بە نرخی کڕین
          </p>
        </div>

        {/* Total Selling Value (بەهای فرۆشتن) */}
        <div className="p-4 rounded-2xl glass-card border border-cyan-500/25 relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-slate-900/60 to-slate-900/90 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">کۆی بەهای فرۆشتن (پێشبینیکراو)</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-numeric tracking-tight">
            {formatIQD(filteredSellingValue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            بەهای پارەی کۆگا لە کاتی فرۆشتندا
          </p>
        </div>

        {/* Expected Net Profit */}
        <div className="p-4 rounded-2xl glass-card border border-emerald-500/25 relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-slate-900/60 to-slate-900/90 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">قازانجی خاوێنی چاوەڕوانکراو</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-numeric tracking-tight">
            {formatIQD(Math.max(0, filteredSellingValue - filteredCostValue))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            جیاوازی فرۆشتن لەگەڵ تێچووی کڕین
          </p>
        </div>

        {/* Total Quantity */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 relative overflow-hidden bg-slate-900/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">کۆی گشتی دانەکانی کۆگا</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-numeric tracking-tight">
            {formatNumber(totalFilteredUnits)} <span className="text-xs font-normal text-slate-400">دانە</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            لە کۆی {filteredProducts.length} جۆری کاڵا
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="گەڕان بەپێی ناوی کاڵا..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-10"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Stock filter toggles */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هەمووی
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-rose-500/20 text-rose-300 font-medium'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              کەمبووەکان ({metrics.lowStockItemsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                <th className="py-3.5 px-4 font-semibold">ناوی کاڵا</th>
                <th className="py-3.5 px-4 font-semibold">بڕ بە کارتۆن</th>
                <th className="py-3.5 px-4 font-semibold">یەکە لە کارتۆن</th>
                <th className="py-3.5 px-4 font-semibold">کۆی دانەکان</th>
                <th className="py-3.5 px-4 font-semibold">نرخی کڕین (دانە)</th>
                <th className="py-3.5 px-4 font-semibold text-amber-300">کۆی بەهای سەرمایە (کڕین)</th>
                <th className="py-3.5 px-4 font-semibold">دۆخ</th>
                <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    هیچ کاڵایەک نەدۆزرایەوە بەم مەرجانە!
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.totalUnits <= p.minStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white font-numeric">
                        {p.cartons} CTN
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-numeric">
                        {p.unitsPerCarton} دانە
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-numeric">
                        {formatNumber(p.totalUnits)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-numeric">
                        {formatIQD(p.costPricePerUnit)}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-amber-300 font-numeric">
                        {formatIQD(p.totalUnits * p.costPricePerUnit)}
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            کەمە ({p.totalUnits})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            بەردەستە
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="دەستکاری"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            title="سڕینەوە"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-950 border-t-2 border-slate-700/90 font-bold text-xs">
              <tr>
                <td colSpan={3} className="py-3.5 px-4 text-slate-400">
                  کۆی گشتی ({filteredProducts.length} جۆری کاڵا):
                </td>
                <td className="py-3.5 px-4 font-numeric text-white font-bold">
                  {formatNumber(totalFilteredUnits)} دانە
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                  کۆی سەرمایەی کۆگا:
                </td>
                <td className="py-3.5 px-4 font-numeric text-amber-300 font-black text-sm">
                  {formatIQD(filteredCostValue)}
                </td>
                <td colSpan={2} className="py-3.5 px-4 text-left font-numeric text-cyan-300 text-[11px]">
                  کۆی بەهای فرۆشتن: {formatIQD(filteredSellingValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl glass-card rounded-2xl border border-slate-700 p-6 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingProduct ? 'دەستکاریکردنی کاڵا' : 'تۆمارکردنی کاڵای نوێ'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      پڕکردنەوەی وردەکارییەکان و هەژمارکردنی یەکەکان بە دینار
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4 mt-5">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ناوی کاڵا (Item Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="نموونە: ڕۆنی زەیتوون 1L"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Cartons, Units Per Carton, Auto Total Units */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>ڕێکخستنی یەکە و کارتۆنەکان</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        بڕ بە کارتۆن (CTN)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.cartons}
                        onChange={(e) => setFormData({ ...formData, cartons: e.target.value })}
                        placeholder="10"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        یەکە لە کارتۆنێکدا
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.unitsPerCarton}
                        onChange={(e) =>
                          setFormData({ ...formData, unitsPerCarton: e.target.value })
                        }
                        placeholder="12"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        کۆی گشتی دانەکان (خۆکار)
                      </label>
                      <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-300 font-bold font-numeric flex items-center justify-between">
                        <span>{calcTotalUnits} دانە</span>
                        <span className="text-[10px] text-emerald-500 font-normal">
                          {calcCartons} × {calcUnitsPerCarton}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Cost (All in IQD) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    نرخی کڕینی هەر دانەیەک (دینار) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.costPricePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, costPricePerUnit: e.target.value })
                    }
                    placeholder="4500"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    تێچووی هەر کارتۆنێک: {formatIQD(calcCostUnit * calcUnitsPerCarton)}
                  </span>
                </div>

                {/* Low stock threshold */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ئاستی کەمترین ئاگادارکردنەوە (دانە)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockThreshold: e.target.value })
                    }
                    placeholder="20"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    کاتێک دانەکان کەمتر بوون لەم بڕە، سیستەم هۆشداری پێ دەدات
                  </span>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold btn-gold cursor-pointer"
                  >
                    {editingProduct ? 'نوێکردنەوەی کاڵا' : 'تۆمارکردن لە کۆگا'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card rounded-2xl border border-rose-500/30 p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">سڕینەوەی کاڵا لە کۆگا</h3>
                  <p className="text-xs text-slate-400">ئایا دڵنیایت لە سڕینەوەی ئەم کاڵایە؟</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-5">
                <span className="text-slate-400">ناوی کاڵا: </span>
                <span className="font-bold text-white">{productToDelete.name}</span>
                <div className="mt-1 text-slate-400">
                  مەوجوود: {productToDelete.cartons} کارتۆن ({productToDelete.totalUnits} دانە)
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  بەڵێ، بیسڕەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
