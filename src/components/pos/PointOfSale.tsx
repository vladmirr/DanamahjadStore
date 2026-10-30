import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Search,
  Sparkles,
  Phone,
  FileText,
  Boxes,
  Minus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIQD, formatNumber } from '../../utils/formatters';
import { Product } from '../../types';

interface CartLine {
  productId: string;
  productName: string;
  unitType: 'carton' | 'unit';
  quantity: number;
  unitPrice: number; // Editable selling price per selected unit
  unitsPerCarton: number;
  availableUnits: number;
}

export const PointOfSale: React.FC = () => {
  const { products, customers, createSale, setViewingInvoice } = useApp();

  // Sale form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Selected item adder controls
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<'carton' | 'unit'>('unit');
  const [selectedQuantity, setSelectedQuantity] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');

  // Find currently selected product in dropdown
  const currentProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Suggest default price when unit or product changes
  const defaultPrice = useMemo(() => {
    if (!currentProduct) return 0;
    if (selectedUnitType === 'carton') {
      return currentProduct.sellingPricePerUnit * currentProduct.unitsPerCarton;
    }
    return currentProduct.sellingPricePerUnit;
  }, [currentProduct, selectedUnitType]);

  // Handle product selection
  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setSelectedUnitType('unit');
    setSelectedQuantity('');
    setCustomPrice('');
  };

  // Change unit type
  const handleUnitTypeChange = (type: 'carton' | 'unit') => {
    setSelectedUnitType(type);
    setCustomPrice('');
  };

  // Add line to cart
  const handleAddToCart = () => {
    if (!currentProduct) return;

    const qty = parseInt(selectedQuantity);
    if (!qty || qty < 1) {
      alert('تکایە ژمارە / بڕی فرۆشتن بنووسە');
      return;
    }

    const unitPrice = Number(customPrice) || defaultPrice;
    const requiredUnits =
      selectedUnitType === 'carton' ? qty * currentProduct.unitsPerCarton : qty;

    if (requiredUnits > currentProduct.totalUnits) {
      alert(`ببورە! لە کۆگادا تەنها ${currentProduct.totalUnits} دانە بەردەستە.`);
      return;
    }

    // Check if line already in cart
    const existingIndex = cart.findIndex(
      (c) => c.productId === currentProduct.id && c.unitType === selectedUnitType
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + qty;
      const newRequiredUnits =
        selectedUnitType === 'carton'
          ? newQty * currentProduct.unitsPerCarton
          : newQty;

      if (newRequiredUnits > currentProduct.totalUnits) {
        alert(`ببورە! ناتوانیت زیاتر لە مەوجوودی کۆگا زیاد بکەیت.`);
        return;
      }

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].unitPrice = unitPrice;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: currentProduct.id,
          productName: currentProduct.name,
          unitType: selectedUnitType,
          quantity: qty,
          unitPrice,
          unitsPerCarton: currentProduct.unitsPerCarton,
          availableUnits: currentProduct.totalUnits,
        },
      ]);
    }

    // Reset adder
    setSelectedQuantity('');
    setCustomPrice('');
  };

  // Remove item from cart
  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Update cart item quantity
  const handleUpdateQty = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveFromCart(index);
      return;
    }

    const prod = products.find((p) => p.id === item.productId);
    const requiredUnits =
      item.unitType === 'carton' ? newQty * (prod?.unitsPerCarton || 1) : newQty;

    if (prod && requiredUnits > prod.totalUnits) {
      alert(`تەنها ${prod.totalUnits} دانە لەم کاڵایە لە کۆگادا بەردەستە.`);
      return;
    }

    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Cart calculations
  const totalGrossAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [cart]);

  // Down payment calculations
  const parsedPaid = Math.min(Number(paidAmount) || 0, totalGrossAmount);
  const remainingDebt = Math.max(0, totalGrossAmount - parsedPaid);

  // Quick payment presets
  const handleSetFullPayment = () => {
    setPaidAmount(totalGrossAmount.toString());
  };
  const handleSetZeroPayment = () => {
    setPaidAmount('0');
  };
  const handleSetHalfPayment = () => {
    setPaidAmount(Math.round(totalGrossAmount / 2).toString());
  };

  // Submit sale transaction
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('تکایە ناوی کڕیار دیاری بکە یان بنووسە');
      return;
    }

    if (cart.length === 0) {
      alert('تکایە لانیکەم یەک کاڵا زیاد بکە بۆ سەبەتەی کڕین');
      return;
    }

    const newSale = createSale({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: cart.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        unitType: c.unitType,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      paidAmount: parsedPaid,
      notes,
    });

    if (newSale) {
      // Clear cart
      setCart([]);
      setPaidAmount('');
      setNotes('');
      // Open invoice modal immediately
      setViewingInvoice(newSale);
    }
  };

  // Filtered products for quick picker
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Matching customer names for autocomplete
  const matchingCustomers = useMemo(() => {
    if (!customerName.trim()) return customers.slice(0, 5);
    return customers
      .filter((c) => c.name.toLowerCase().includes(customerName.toLowerCase()))
      .slice(0, 5);
  }, [customers, customerName]);

  return (
    <div className="space-y-6">
      {/* POS Top Banner */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">بەشی فرۆشتن</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            دروستکردنی پسوولەی فرۆشتن، کەمکردنەوەی خۆکاری کۆگا و تۆمارکردنی کاش و قەرز بە دینار
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">کاڵا لە سەبەتەدا: </span>
            <span className="font-bold text-emerald-400 font-numeric">{cart.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-bold font-numeric">
            کۆی گشتی: {formatIQD(totalGrossAmount)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Product Selector & Quick Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Item Selector Box */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <span>هەڵبژاردنی کاڵا و شێوازی یەکە</span>
            </h3>

            {/* Product Quick Search / Dropdown */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                هەڵبژاردنی کاڵا (Dropdown search)
              </label>
              <div className="relative">
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) handleSelectProduct(prod);
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- کاڵایەک هەڵبژێرە لە کۆگا --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (مەوجوود: {p.cartons} کارتۆن / {p.totalUnits} دانە) - {formatIQD(p.sellingPricePerUnit)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Packaging Unit & Price & Quantity Adjuster */}
            {currentProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4"
              >
                {/* Product stock info */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
                  <div className="text-slate-300">
                    <span className="font-semibold text-white">{currentProduct.name}</span>
                    <span className="text-[11px] text-slate-500 block">
                      هەر کارتۆنێک {currentProduct.unitsPerCarton} دانەیە
                    </span>
                  </div>
                  <div className="text-left font-numeric">
                    <span className="text-slate-400 text-[11px]">مەوجوودی کۆگا: </span>
                    <span
                      className={`font-bold ${
                        currentProduct.totalUnits <= currentProduct.minStockThreshold
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {currentProduct.cartons} CTN ({currentProduct.totalUnits} دانە)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Unit Packaging Selector (کارتۆن / دانە) */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">
                      شێوازی یەکە (Packaging Unit)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUnitTypeChange('unit')}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedUnitType === 'unit'
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        دانە (Unit)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitTypeChange('carton')}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedUnitType === 'carton'
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        کارتۆن (CTN)
                      </button>
                    </div>
                  </div>

                  {/* Quantity to sell */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">
                      ژمارە / بڕی فرۆشتن ({selectedUnitType === 'carton' ? 'کارتۆن' : 'دانە'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-numeric font-bold"
                    />
                  </div>

                  {/* Dynamic Selling Price */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">
                      نرخی فرۆشتن (دینار - پێشنیارکراو)
                    </label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      placeholder={defaultPrice > 0 ? defaultPrice.toString() : '0'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-400 placeholder-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-500 font-numeric font-bold"
                    />
                  </div>
                </div>

                {/* Subtotal line & Add button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs">
                    <span className="text-slate-400">کۆی ئەم کاڵایە: </span>
                    <span className="text-sm font-bold text-amber-300 font-numeric">
                      {formatIQD((parseInt(selectedQuantity) || 0) * (Number(customPrice) || defaultPrice))}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      کۆی دانەی کەمکراوە: {selectedUnitType === 'carton' ? (parseInt(selectedQuantity) || 0) * currentProduct.unitsPerCarton : (parseInt(selectedQuantity) || 0)} دانە
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleAddToCart}
                    className="px-4 py-2 rounded-xl text-xs font-bold btn-gold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>زیادکردن بۆ پسوولە</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick Product Grid for Fast Touch/Click */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>هەڵبژاردنی خێرای کاڵاکان</span>
              </h3>
              <div className="relative w-44">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="گەڕان..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none pr-7"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
              {filteredProducts.map((p) => {
                const isSelected = selectedProductId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.barcode || p.id}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 font-numeric">
                        {formatIQD(p.sellingPricePerUnit)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-numeric">
                        {p.cartons} CTN
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Invoice Summary & Customer Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleCompleteSale}
            className="p-6 rounded-2xl glass-card border border-slate-800 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">پسوولەی فرۆشتن</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date().toLocaleDateString('en-GB')}
              </span>
            </div>

            {/* Customer Name & Phone */}
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>ناوی کڕیار (Customer Name) *</span>
                  <span className="text-[10px] text-slate-500">هەڵبژێرە یان بنووسە</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="نموونە: هاڤاڵ کاروان"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-9"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Autocomplete dropdown */}
                {isCustomerDropdownOpen && matchingCustomers.length > 0 && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-30 max-h-40 overflow-y-auto">
                    {matchingCustomers.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setCustomerName(c.name);
                          if (c.phone) setCustomerPhone(c.phone);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-slate-800 text-slate-200 border-b border-slate-800/60 last:border-0 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.outstandingDebt > 0 && (
                          <span className="text-[10px] text-amber-400 font-numeric">
                            قەرزی پێشوو: {formatIQD(c.outstandingDebt)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  ژمارەی مۆبایل (ئارەزوومەندانە)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0750 000 0000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-9 text-right"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">
                کاڵاکانی ناو پسوولە ({cart.length})
              </label>

              {cart.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  سەبەتەی فرۆشتن بەتاڵە! کاڵایەک هەڵبژێرە لە بەشی ڕاست.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.productId}-${item.unitType}-${idx}`}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-1">
                        <p className="font-semibold text-white line-clamp-1">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-numeric">
                          {item.quantity} {item.unitType === 'carton' ? 'کارتۆن' : 'دانە'} × {formatIQD(item.unitPrice)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Qty +/- buttons */}
                        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-white font-numeric">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line total */}
                        <span className="font-bold text-white font-numeric w-20 text-left">
                          {formatIQD(item.quantity * item.unitPrice)}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Checkout Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
              {/* Gross Total */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">کۆی گشتی فرۆش:</span>
                <span className="text-base font-bold text-white font-numeric">
                  {formatIQD(totalGrossAmount)}
                </span>
              </div>

              {/* Down Payment / Cash Paid Upfront */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="text-slate-300 font-medium">
                    بڕی پارەی دراو لە کاتی کڕین (Down payment):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSetFullPayment}
                      className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      تەواو کاش
                    </button>
                    <button
                      type="button"
                      onClick={handleSetZeroPayment}
                      className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 cursor-pointer"
                    >
                      هەمووی قەرز
                    </button>
                    <button
                      type="button"
                      onClick={handleSetHalfPayment}
                      className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 cursor-pointer"
                    >
                      نیوە
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={totalGrossAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-numeric font-bold"
                />
              </div>

              {/* Remaining Debt on this transaction */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400">بڕی پارەی ماوە (قەرزی ئەم پسوولەیە):</span>
                <span
                  className={`text-sm font-bold font-numeric ${
                    remainingDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {formatIQD(remainingDebt)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                تێبینی (ئارەزوومەندانە)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="نموونە: پسوولەی کۆگا، بڕی داشکاندن یان شوێنی گەیاندن"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Complete Sale Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm btn-gold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>پەسەندکردنی فرۆشتن و دەرهێنانی وەسڵ</span>
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
};
