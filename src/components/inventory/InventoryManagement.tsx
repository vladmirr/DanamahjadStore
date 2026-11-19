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
  Calculator,
  History,
  PlusCircle,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatUSD, formatCurrency, formatNumber, roundPrecision } from '../../utils/formatters';
import { Product, Currency } from '../../types';

interface InventoryManagementProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const { products, addProduct, updateProduct, deleteProduct, restockProduct, metrics } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'available'>('all');

  // Edit / Delete State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Restock State
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockUnitType, setRestockUnitType] = useState<'carton' | 'unit'>('carton');
  const [restockQty, setRestockQty] = useState('');
  const [restockBuyPrice, setRestockBuyPrice] = useState('');
  const [restockSellPrice, setRestockSellPrice] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form Fields for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'گشتی',
    costPricePerUnit: '',
    cartons: '',
    unitsPerCarton: '',
    sellingPricePerUnit: '',
    minStockThreshold: '',
    currency: 'IQD' as Currency,
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

  // Monetary stock values separated by currency
  const filteredCostValueIQD = useMemo(() => {
    return filteredProducts
      .filter((p) => p.currency !== 'USD')
      .reduce(
        (acc, p) => acc + (p.costPricePerUnit || 0) * (p.totalUnits || 0),
        0
      );
  }, [filteredProducts]);

  const filteredCostValueUSD = useMemo(() => {
    return filteredProducts
      .filter((p) => p.currency === 'USD')
      .reduce(
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
      cartons: '',
      unitsPerCarton: '',
      sellingPricePerUnit: '',
      minStockThreshold: '',
      currency: 'IQD',
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
      currency: p.currency || 'IQD',
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
    const totalUnits = Math.round(cartons * unitsPerCarton * 100) / 100;
    const currency = formData.currency || 'IQD';

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        category: formData.category.trim(),
        costPricePerUnit,
        cartons,
        unitsPerCarton,
        totalUnits,
        sellingPricePerUnit,
        minStockThreshold,
        currency,
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
        currency,
      });
    }

    setIsAddModalOpen(false);
  };

  // Open modal for restock
  const handleOpenRestock = (p: Product) => {
    setRestockingProduct(p);
    setRestockUnitType('carton');
    setRestockQty('');
    setRestockBuyPrice(p.costPricePerUnit ? p.costPricePerUnit.toString() : '0');
    setRestockSellPrice(p.sellingPricePerUnit ? p.sellingPricePerUnit.toString() : '0');
    setRestockNotes('');
    setShowHistory(false);
  };

  // Submit Restock Form
  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct || restockInputQty <= 0) return;

    try {
      setIsSubmittingRestock(true);
      await restockProduct(restockingProduct.id, {
        addedQty: restockAddedUnits,
        addedCartons: restockAddedCartons,
        newUnitBuyPrice: restockNewUnitBuyPrice,
        newSellingPrice: restockNewSellingPrice > 0 ? restockNewSellingPrice : undefined,
        notes: restockNotes,
      });
      setRestockingProduct(null);
    } catch (err) {
      console.error('Failed to restock product:', err);
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Calculated preview in modal
  const calcCartons = Number(formData.cartons) || 0;
  const calcUnitsPerCarton = Number(formData.unitsPerCarton) || 0;
  const calcTotalUnits = Math.round(calcCartons * calcUnitsPerCarton * 100) / 100;
  const calcCostUnit = Number(formData.costPricePerUnit) || 0;

  // Live calculations for Restock Modal
  const restockUnitsPerCarton = restockingProduct?.unitsPerCarton || 1;
  const restockInputQty = Number(restockQty) || 0;
  const restockAddedUnits = restockUnitType === 'carton' ? restockInputQty * restockUnitsPerCarton : restockInputQty;
  const restockAddedCartons = restockUnitType === 'carton'
    ? restockInputQty
    : (restockUnitsPerCarton > 0 ? restockInputQty / restockUnitsPerCarton : 0);
  const restockNewUnitBuyPrice = Number(restockBuyPrice) || 0;
  const restockNewSellingPrice = Number(restockSellPrice) || 0;

  const restockExistingUnits = restockingProduct?.totalUnits || 0;
  const restockExistingBuyPrice = restockingProduct?.costPricePerUnit || 0;

  const restockOldCapital = roundPrecision(restockExistingUnits * restockExistingBuyPrice, 2);
  const restockNewCapital = roundPrecision(restockAddedUnits * restockNewUnitBuyPrice, 2);
  const restockUpdatedUnits = roundPrecision(restockExistingUnits + restockAddedUnits, 2);
  const restockUpdatedCapital = roundPrecision(restockOldCapital + restockNewCapital, 2);

  const restockRawAvgBuyPrice = restockUpdatedUnits > 0
    ? restockUpdatedCapital / restockUpdatedUnits
    : restockNewUnitBuyPrice;

  const restockCurrency: Currency = restockingProduct?.currency === 'USD' ? 'USD' : 'IQD';
  const restockUpdatedUnitBuyPrice = restockCurrency === 'USD'
    ? roundPrecision(restockRawAvgBuyPrice, 2)
    : (restockRawAvgBuyPrice % 1 === 0 ? restockRawAvgBuyPrice : roundPrecision(restockRawAvgBuyPrice, 2));

  const restockUpdatedCartons = restockUnitsPerCarton > 0
    ? roundPrecision(restockUpdatedUnits / restockUnitsPerCarton, 2)
    : 0;

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

      {/* Single Clean Stock Capital Card */}
      <div className="p-5 rounded-2xl glass-card border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-slate-900/95 shadow-xl shadow-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-300">کۆی بەهای سەرمایەی کاڵاکانی کۆگا (بە پارە)</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              کۆی پارەی تێچووی سەرجەم کاڵاکانی کۆگا بەپێی نرخی کڕین (دینار و دۆلار)
            </p>
          </div>
        </div>

        <div className="text-right sm:text-left flex flex-col sm:items-end gap-1">
          <span className="text-2xl sm:text-3xl font-black text-amber-300 font-numeric tracking-tight">
            {formatIQD(filteredCostValueIQD)}
          </span>
          {filteredCostValueUSD > 0 && (
            <span className="text-lg sm:text-xl font-bold text-emerald-400 font-numeric tracking-tight">
              {formatUSD(filteredCostValueUSD)}
            </span>
          )}
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
                <th className="py-3.5 px-4 font-semibold text-center">دراو</th>
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
                  <td colSpan={9} className="py-12 text-center text-slate-500">
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
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.currency === 'USD'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {p.currency === 'USD' ? '$ USD' : 'د.ع'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white font-numeric">
                        {formatNumber(p.cartons)} CTN
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-numeric">
                        {p.unitsPerCarton} دانە
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-numeric">
                        {formatNumber(p.totalUnits)}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-numeric">
                        {formatCurrency(p.costPricePerUnit, p.currency)}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-amber-300 font-numeric">
                        {formatCurrency(p.totalUnits * p.costPricePerUnit, p.currency)}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenRestock(p)}
                            title="زیادکردنی بڕی نوێ (کڕینەوە)"
                            aria-label="زیادکردنی بڕی نوێ (کڕینەوە)"
                            className="p-1.5 rounded-lg btn-restock-action cursor-pointer shadow-sm"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
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
                <td colSpan={4} className="py-3.5 px-4 text-slate-400">
                  کۆی گشتی ({filteredProducts.length} جۆری کاڵا):
                </td>
                <td className="py-3.5 px-4 font-numeric text-white font-bold">
                  {formatNumber(totalFilteredUnits)} دانە
                </td>
                <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                  کۆی سەرمایەی کۆگا:
                </td>
                <td className="py-3.5 px-4 font-numeric text-amber-300 font-black text-sm">
                  <div>{formatIQD(filteredCostValueIQD)}</div>
                  {filteredCostValueUSD > 0 && (
                    <div className="text-emerald-400 text-xs font-bold mt-0.5">
                      {formatUSD(filteredCostValueUSD)}
                    </div>
                  )}
                </td>
                <td colSpan={2} className="py-3.5 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl glass-card rounded-2xl border border-slate-700 p-4 sm:p-6 my-2 sm:my-8 relative overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
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
                {/* Currency Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    دراوی کڕین و کۆگا (Currency) *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-700 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, currency: 'IQD' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.currency === 'IQD'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>دینار (د.ع IQD)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, currency: 'USD' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        formData.currency === 'USD'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>دۆلار ($ USD)</span>
                    </button>
                  </div>
                </div>

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
                        step="any"
                        inputMode="decimal"
                        min="0"
                        value={formData.cartons}
                        onChange={(e) => setFormData({ ...formData, cartons: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        یەکە لە کارتۆنێکدا
                      </label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        min="1"
                        value={formData.unitsPerCarton}
                        onChange={(e) =>
                          setFormData({ ...formData, unitsPerCarton: e.target.value })
                        }
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        placeholder="0"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-numeric"
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

                {/* Purchase Cost */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    نرخی کڕینی هەر دانەیەک ({formData.currency === 'USD' ? '$ دۆلار' : 'دینار'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={formData.costPricePerUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, costPricePerUnit: e.target.value })
                    }
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    تێچووی هەر کارتۆنێک: {formatCurrency(calcCostUnit * calcUnitsPerCarton, formData.currency)}
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
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
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
                  مەوجوود: {formatNumber(productToDelete.cartons)} کارتۆن ({formatNumber(productToDelete.totalUnits)} دانە)
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

      {/* Restock / Add Stock Modal */}
      <AnimatePresence>
        {restockingProduct && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl glass-card rounded-2xl border border-emerald-500/30 p-4 sm:p-6 my-2 sm:my-8 relative overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>زیادکردنی بڕی نوێ (کڕینەوە / Restock)</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        restockCurrency === 'USD'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      }`}>
                        {restockCurrency === 'USD' ? '$ USD' : 'د.ع IQD'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      کڕینەوە بە نرخی نوێ و هەژمارکردنی خۆکاری تێکڕای تێچووی کڕین (Weighted Average Cost)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Current Product & Stock Summary */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">ناوی کاڵا:</div>
                  <div className="text-sm font-bold text-white">{restockingProduct.name}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">مەوجوودی ئێستا:</span>
                    <span className="font-bold text-white font-numeric">
                      {formatNumber(restockingProduct.totalUnits)} دانە
                    </span>
                    <span className="text-[10px] text-slate-400 block font-numeric">
                      ({formatNumber(restockingProduct.cartons)} کارتۆن)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">یەکە لە کارتۆن:</span>
                    <span className="font-bold text-slate-200 font-numeric">
                      {restockingProduct.unitsPerCarton} دانە
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">نرخی کڕینی ئێستا:</span>
                    <span className="font-bold text-amber-300 font-numeric">
                      {formatCurrency(restockingProduct.costPricePerUnit, restockingProduct.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">سەرمایەی ئێستا:</span>
                    <span className="font-bold text-amber-400 font-numeric">
                      {formatCurrency(restockOldCapital, restockingProduct.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveRestock} className="space-y-4 mt-4">
                {/* Unit Type Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    یەکەی بڕی نوێی کڕدراو (Purchase Unit Type) *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-700 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRestockUnitType('carton')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        restockUnitType === 'carton'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>بە کارتۆن (CTN)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockUnitType('unit')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        restockUnitType === 'unit'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>بە دانە (PCS)</span>
                    </button>
                  </div>
                </div>

                {/* Input 1: Quantity to Add */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      بڕی نوێی کڕدراو ({restockUnitType === 'carton' ? 'کارتۆن' : 'دانە'}) *
                    </label>
                    {restockInputQty > 0 && (
                      <span className="text-[11px] text-emerald-400 font-semibold font-numeric">
                        {restockUnitType === 'carton'
                          ? `= ${formatNumber(restockAddedUnits)} دانە`
                          : `= ${formatNumber(restockAddedCartons)} کارتۆن`}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    required
                    min="0.01"
                    autoFocus
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder={restockUnitType === 'carton' ? 'نموونە: 10 کارتۆن' : 'نموونە: 200 دانە'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric font-bold"
                  />
                </div>

                {/* Input 2: New Unit Buying Price */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      نرخی کڕینی نوێ بۆ هەر دانەیەک ({restockCurrency === 'USD' ? '$ دۆلار' : 'دینار'}) *
                    </label>
                    {restockNewUnitBuyPrice > 0 && restockUnitsPerCarton > 1 && (
                      <span className="text-[11px] text-slate-400 font-numeric">
                        تێچووی یەک کارتۆن: {formatCurrency(roundPrecision(restockNewUnitBuyPrice * restockUnitsPerCarton, 2), restockCurrency)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    required
                    min="0.0001"
                    value={restockBuyPrice}
                    onChange={(e) => setRestockBuyPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>کۆی تێچووی کڕینی نوێ:</span>
                    <span className="font-bold text-emerald-400 font-numeric">
                      {formatCurrency(restockNewCapital, restockCurrency)}
                    </span>
                  </div>
                </div>

                {/* Input 3: Optional New Selling Price */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      نرخی فرۆشتنی نوێ بۆ هەر دانەیەک (ئارەزوومەندانە)
                    </label>
                    {restockNewSellingPrice > 0 && restockUnitsPerCarton > 1 && (
                      <span className="text-[11px] text-slate-400 font-numeric">
                        فرۆشتنی هەر کارتۆنێک: {formatCurrency(roundPrecision(restockNewSellingPrice * restockUnitsPerCarton, 2), restockCurrency)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    min="0"
                    value={restockSellPrice}
                    onChange={(e) => setRestockSellPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    placeholder="نرخی فرۆشتن بگۆڕە ئەگەر پێویستە..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-numeric"
                  />
                </div>

                {/* Input 4: Notes / Supplier / Voucher */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    تێبینی یان ژمارەی پسوولەی کڕین (ئارەزوومەندانە)
                  </label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="نموونە: کڕین لە حاجی ئەحمەد، پسوولەی #204"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Live Preview Box */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 border border-emerald-500/30 space-y-3 shadow-lg restock-preview-box">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Calculator className="w-4 h-4" />
                    <span>پێشبینینی حیساباتی کۆگا دوای زیادکردن (Live Preview)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* 1. New Stock */}
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">کۆی مەوجوودی نوێ:</span>
                      <div className="font-bold text-white font-numeric text-sm">
                        {formatNumber(restockUpdatedUnits)} دانە
                      </div>
                      <div className="text-[11px] text-slate-300 font-numeric">
                        ({formatNumber(restockUpdatedCartons)} کارتۆن)
                      </div>
                      {restockInputQty > 0 && (
                        <div className="text-[10px] text-emerald-400 font-numeric mt-1">
                          +{formatNumber(restockAddedUnits)} دانە زیاد دەبێت
                        </div>
                      )}
                    </div>

                    {/* 2. Weighted Average Buy Price */}
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 block mb-0.5">تێکڕای نرخی کڕینی نوێ:</span>
                      <div className="font-extrabold text-emerald-300 font-numeric text-sm">
                        {formatCurrency(restockUpdatedUnitBuyPrice, restockCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-numeric mt-0.5">
                        بۆ هەر دانەیەک
                      </div>
                      <div className="text-[9px] text-emerald-400/80 mt-1">
                        Weighted Average
                      </div>
                    </div>

                    {/* 3. New Capital Value */}
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-0.5">کۆی سەرمایەی نوێ:</span>
                      <div className="font-extrabold text-amber-300 font-numeric text-sm">
                        {formatCurrency(restockUpdatedCapital, restockCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-numeric mt-0.5">
                        +{formatCurrency(restockNewCapital, restockCurrency)} زیاد دەبێت
                      </div>
                    </div>
                  </div>

                  {/* Math Formula Explanation */}
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>هاوکێشەی تێکڕای نرخ (Weighted Average Formula):</span>
                      <span className="font-numeric">
                        ({formatCurrency(restockOldCapital, restockCurrency)} + {formatCurrency(restockNewCapital, restockCurrency)}) ÷ {formatNumber(restockUpdatedUnits)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Past Purchase History Accordion (if exists) */}
                {restockingProduct.stockHistory && restockingProduct.stockHistory.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-cyan-400" />
                        <span>مێژووی کڕینەوەکانی پێشوو ({restockingProduct.stockHistory.length} جار)</span>
                      </div>
                      <span className="text-slate-500 text-xs">{showHistory ? '▲ شاردنەوە' : '▼ بینین'}</span>
                    </button>

                    {showHistory && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 max-h-40 overflow-y-auto">
                        <table className="w-full text-right text-[11px]">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800">
                              <th className="py-1 px-2">بەروار</th>
                              <th className="py-1 px-2">بڕی زیادکراو</th>
                              <th className="py-1 px-2">نرخی کڕین</th>
                              <th className="py-1 px-2">کۆی تێچوو</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {[...restockingProduct.stockHistory].reverse().map((entry) => (
                              <tr key={entry.id} className="text-slate-300">
                                <td className="py-1.5 px-2 text-slate-400 font-numeric" dir="ltr">
                                  {new Date(entry.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-1.5 px-2 font-numeric text-white">
                                  +{formatNumber(entry.addedQty)} دانە
                                  {entry.addedCartons ? ` (${formatNumber(entry.addedCartons)} کارتۆن)` : ''}
                                </td>
                                <td className="py-1.5 px-2 font-numeric text-emerald-400">
                                  {formatCurrency(entry.unitPrice, restockingProduct.currency)}
                                </td>
                                <td className="py-1.5 px-2 font-numeric text-amber-300">
                                  {formatCurrency(entry.totalAddedCost, restockingProduct.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRestockingProduct(null)}
                    disabled={isSubmittingRestock}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRestock || restockInputQty <= 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{isSubmittingRestock ? 'تۆمار دەکرێت...' : 'تۆمارکردن لە کۆگا و نوێکردنەوەی سەرمایە'}</span>
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
