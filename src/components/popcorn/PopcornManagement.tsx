import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Scale,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Phone,
  Settings,
  Coins,
  Globe2,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  Split,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRightLeft,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import {
  PopcornStoreState,
  PopcornTransaction,
  PopcornTruck,
  PopcornExpense,
  PopcornShipmentConfig,
} from '../../types/popcorn';
import {
  loadLocalPopcornStore,
  saveLocalPopcornStore,
  syncPopcornStoreToCloud,
  subscribeToCloudPopcornStore,
  deleteTransactionFromStore,
  unmarkDeletedTransactionId,
  DEFAULT_TRANSACTION,
} from '../../services/popcornStorage';
import { formatUSD, formatIQD, formatNumber, playSound } from '../../utils/formatters';
import { exportPopcornToExcel, exportTrucksToExcel, exportExpensesToExcel } from '../../utils/excelExport';
import { TiltCard } from '../common/TiltCard';
import confetti from 'canvas-confetti';

export const PopcornManagement: React.FC = () => {
  // Multi-Transaction Store State
  const [store, setStore] = useState<PopcornStoreState>(() => loadLocalPopcornStore());
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Active Transaction ID (null = prompts user with transaction selection screen)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState<string>('');

  // Active Transaction Resolver
  const activeTransaction = useMemo(() => {
    if (!selectedTransactionId) return null;
    return store.transactions.find((t) => t.id === selectedTransactionId) || null;
  }, [store.transactions, selectedTransactionId]);

  // Safe fallback transaction to ensure hooks calculate without crashing
  const safeTransaction: PopcornTransaction = useMemo(() => {
    return activeTransaction || store.transactions[0] || DEFAULT_TRANSACTION;
  }, [activeTransaction, store.transactions]);

  // Filtered transactions for the selection screen
  const filteredTransactions = useMemo(() => {
    if (!transactionSearchQuery.trim()) return store.transactions;
    const q = transactionSearchQuery.toLowerCase();
    return store.transactions.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.config?.originCountry?.toLowerCase().includes(q) ||
        t.config?.destinationCity?.toLowerCase().includes(q) ||
        (t.config?.hasPartner && t.config?.partnerName?.toLowerCase().includes(q))
    );
  }, [store.transactions, transactionSearchQuery]);

  // Filters & Tabs for Active Transaction
  const [truckSearch, setTruckSearch] = useState<string>('');
  const [isTruckSectionOpen, setIsTruckSectionOpen] = useState<boolean>(false);
  const [isExpenseSectionOpen, setIsExpenseSectionOpen] = useState<boolean>(false);
  const [activeExpenseTab, setActiveExpenseTab] = useState<'all' | 'iran' | 'iraq'>('all');

  // Modals State
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState<boolean>(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<PopcornTransaction | null>(null);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState<boolean>(false);

  const [isTruckModalOpen, setIsTruckModalOpen] = useState<boolean>(false);
  const [editingTruck, setEditingTruck] = useState<PopcornTruck | null>(null);
  const [truckToDelete, setTruckToDelete] = useState<PopcornTruck | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<PopcornExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<PopcornExpense | null>(null);

  // Form: Create New Transaction
  const [newTransactionForm, setNewTransactionForm] = useState({
    name: '',
    totalTons: '',
    buyPricePerTonUSD: '',
    sellingPricePerTonUSD: '',
    originCountry: '',
    destinationCity: '',
    hasPartner: false,
    partnerName: '',
    partnerSharePercent: '50',
    exchangeRateIQD: '',
    notes: '',
  });

  // Form: Edit Current Transaction
  const [editTransactionForm, setEditTransactionForm] = useState<PopcornShipmentConfig>(
    safeTransaction.config
  );
  const [editTransactionName, setEditTransactionName] = useState<string>(safeTransaction.name);

  // Sync edit form whenever active transaction switches
  useEffect(() => {
    if (activeTransaction) {
      setEditTransactionForm(activeTransaction.config);
      setEditTransactionName(activeTransaction.name);
    }
  }, [activeTransaction?.id, activeTransaction?.name]);

  // Form: Truck
  const [truckForm, setTruckForm] = useState({
    plateNumber: '',
    tonsCarried: '',
    driverName: '',
    destination: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Form: Expense
  const [expenseForm, setExpenseForm] = useState({
    region: 'iran' as 'iran' | 'iraq',
    title: '',
    category: '',
    amountUSD: '',
    amountLocal: '',
    exchangeRate: '',
    date: new Date().toISOString().split('T')[0],
    paidBy: 'me' as 'me' | 'partner' | 'shared',
    notes: '',
  });

  // Real-time Cloud Synchronization
  useEffect(() => {
    const unsubscribe = subscribeToCloudPopcornStore((cloudStore) => {
      setStore(cloudStore);
    });
    return () => unsubscribe();
  }, []);

  // Save changes locally and sync with Firestore
  const persistStore = (updatedStore: PopcornStoreState) => {
    setStore(updatedStore);
    saveLocalPopcornStore(updatedStore);
    setIsCloudSyncing(true);
    syncPopcornStoreToCloud(updatedStore).finally(() => setIsCloudSyncing(false));
  };

  // Helper to mutate the active transaction inside the store
  const updateActiveTransaction = (updater: (current: PopcornTransaction) => PopcornTransaction) => {
    if (!activeTransaction) return;
    const updatedTransactions = store.transactions.map((t) => {
      if (t.id === activeTransaction.id) {
        return {
          ...updater(t),
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    persistStore({
      ...store,
      transactions: updatedTransactions,
    });
  };

  // ----------------------------------------------------
  // ACTIVE TRANSACTION CALCULATIONS & KPIS
  // ----------------------------------------------------
  const { config, trucks, expenses } = safeTransaction;

  // 1. Buying & Selling details
  const totalCargoTons = Number(config.totalTons) || 0;
  const buyPricePerTon = Number(config.buyPricePerTonUSD) || 0;
  const sellPricePerTon = Number(config.sellingPricePerTonUSD) || 0;
  const exchangeRate = Number(config.exchangeRateIQD) || 1530;

  const totalBuyingCost = totalCargoTons * buyPricePerTon; // e.g. 200 * $220 = $44,000
  const expectedTotalRevenue = totalCargoTons * sellPricePerTon; // e.g. 200 * $302 = $60,400
  const grossTradeProfit = expectedTotalRevenue - totalBuyingCost; // e.g. $16,400

  // 2. Transport & Truck Metrics
  const totalTonsCarried = useMemo(() => {
    return trucks.reduce((acc, t) => acc + (Number(t.tonsCarried) || 0), 0);
  }, [trucks]);

  const deliveredTons = useMemo(() => {
    return trucks
      .filter((t) => t.status === 'delivered')
      .reduce((acc, t) => acc + (Number(t.tonsCarried) || 0), 0);
  }, [trucks]);

  const remainingTonsToTransport = Math.max(0, totalCargoTons - totalTonsCarried);

  // 3. Cost Iran Side & Cost Iraq Side
  const iranExpenses = useMemo(() => {
    return expenses.filter((e) => e.region === 'iran');
  }, [expenses]);

  const iraqExpenses = useMemo(() => {
    return expenses.filter((e) => e.region === 'iraq');
  }, [expenses]);

  const totalIranSpending = useMemo(() => {
    return iranExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  }, [iranExpenses]);

  const totalIraqSpending = useMemo(() => {
    return iraqExpenses.reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  }, [iraqExpenses]);

  const totalOperatingExpenses = totalIranSpending + totalIraqSpending;
  const totalOverallProjectCost = totalBuyingCost + totalOperatingExpenses;

  // 4. Net Profit & Partner Split (if any)
  const finalNetProfit = expectedTotalRevenue - totalOverallProjectCost;
  const hasPartner = config.hasPartner !== false;
  const partnerPercent = hasPartner ? Number(config.partnerSharePercent) || 50 : 0;
  const myPercent = 100 - partnerPercent;

  const partnerProfitShare = hasPartner ? (finalNetProfit * partnerPercent) / 100 : 0;
  const myProfitShare = hasPartner ? (finalNetProfit * myPercent) / 100 : finalNetProfit;

  // Track who paid what
  const expensesPaidByPartner = useMemo(() => {
    return expenses
      .filter((e) => e.paidBy === 'partner')
      .reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  }, [expenses]);

  const expensesPaidByMe = useMemo(() => {
    return expenses
      .filter((e) => e.paidBy === 'me')
      .reduce((acc, e) => acc + (Number(e.amountUSD) || 0), 0);
  }, [expenses]);

  const netDueToPartner = partnerProfitShare + expensesPaidByPartner;

  // ----------------------------------------------------
  // FILTERED TRUCKS & EXPENSES
  // ----------------------------------------------------
  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      return (
        truckSearch === '' ||
        t.plateNumber.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.driverName.toLowerCase().includes(truckSearch.toLowerCase()) ||
        (t.destination || '').toLowerCase().includes(truckSearch.toLowerCase())
      );
    });
  }, [trucks, truckSearch]);

  const filteredExpenses = useMemo(() => {
    if (activeExpenseTab === 'all') return expenses;
    return expenses.filter((e) => e.region === activeExpenseTab);
  }, [expenses, activeExpenseTab]);

  // ----------------------------------------------------
  // TRANSACTION HANDLERS
  // ----------------------------------------------------
  const handleOpenCreateTransaction = () => {
    setNewTransactionForm({
      name: '',
      totalTons: '',
      buyPricePerTonUSD: '',
      sellingPricePerTonUSD: '',
      originCountry: '',
      destinationCity: '',
      hasPartner: false,
      partnerName: '',
      partnerSharePercent: '50',
      exchangeRateIQD: '',
      notes: '',
    });
    setIsNewTransactionModalOpen(true);
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTransactionForm.name.trim();
    if (!cleanName) {
      playSound('error');
      return;
    }

    const newId = `trans-${Date.now()}`;
    unmarkDeletedTransactionId(newId);
    const newConfig: PopcornShipmentConfig = {
      id: `config-${Date.now()}`,
      title: cleanName,
      originCountry: newTransactionForm.originCountry.trim() || '',
      destinationCity: newTransactionForm.destinationCity.trim() || 'سلێمانی',
      totalTons: Number(newTransactionForm.totalTons) || 0,
      buyPricePerTonUSD: Number(newTransactionForm.buyPricePerTonUSD) || 0,
      sellingPricePerTonUSD: Number(newTransactionForm.sellingPricePerTonUSD) || 0,
      hasPartner: Boolean(newTransactionForm.hasPartner),
      partnerName: newTransactionForm.partnerName.trim() || '',
      partnerSharePercent: Number(newTransactionForm.partnerSharePercent) || 50,
      exchangeRateIQD: Number(newTransactionForm.exchangeRateIQD) || 1530,
      notes: newTransactionForm.notes.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    const newTrans: PopcornTransaction = {
      id: newId,
      name: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      config: newConfig,
      trucks: [],
      expenses: [],
    };

    persistStore({
      ...store,
      activeTransactionId: newId,
      transactions: [newTrans, ...store.transactions],
    });

    setSelectedTransactionId(newId);
    setIsNewTransactionModalOpen(false);
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
    playSound('success');
  };

  const handleSaveEditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTransactionName.trim()) {
      playSound('error');
      return;
    }

    updateActiveTransaction((current) => ({
      ...current,
      name: editTransactionName.trim(),
      config: {
        ...editTransactionForm,
        title: editTransactionName.trim(),
        totalTons: Number(editTransactionForm.totalTons) || 0,
        buyPricePerTonUSD: Number(editTransactionForm.buyPricePerTonUSD) || 0,
        sellingPricePerTonUSD: Number(editTransactionForm.sellingPricePerTonUSD) || 0,
        partnerSharePercent: Number(editTransactionForm.partnerSharePercent) || 50,
        exchangeRateIQD: Number(editTransactionForm.exchangeRateIQD) || 1530,
        updatedAt: new Date().toISOString(),
      },
    }));

    setIsEditTransactionModalOpen(false);
    playSound('success');
  };

  const handleDeleteTransaction = async (id: string) => {
    if (store.transactions.length <= 1) {
      alert('ناتوانیت تەنها مامەڵەی ماوە بسڕیتەوە!');
      return;
    }

    try {
      setIsDeletingTransaction(true);
      const updated = await deleteTransactionFromStore(id, store);
      if (updated) {
        setStore(updated);
        if (selectedTransactionId === id) {
          setSelectedTransactionId(null);
        }
        playSound('delete');
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setIsDeletingTransaction(false);
      setTransactionToDelete(null);
    }
  };

  // ----------------------------------------------------
  // TRUCK HANDLERS
  // ----------------------------------------------------
  const handleOpenAddTruck = () => {
    setEditingTruck(null);
    setTruckForm({
      plateNumber: '',
      tonsCarried: '',
      driverName: '',
      destination: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsTruckModalOpen(true);
  };

  const handleOpenEditTruck = (truck: PopcornTruck) => {
    setEditingTruck(truck);
    setTruckForm({
      plateNumber: truck.plateNumber,
      tonsCarried: String(truck.tonsCarried),
      driverName: truck.driverName,
      destination: truck.destination || '',
      dispatchDate: truck.dispatchDate,
      notes: truck.notes || '',
    });
    setIsTruckModalOpen(true);
  };

  const handleSaveTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckForm.plateNumber.trim() || !truckForm.tonsCarried || !truckForm.driverName.trim()) {
      playSound('error');
      return;
    }

    const tons = Number(truckForm.tonsCarried) || 0;
    const dest = truckForm.destination.trim() || '';
    const truckNotes = truckForm.notes.trim() || '';

    updateActiveTransaction((current) => {
      let updatedTrucks: PopcornTruck[];
      if (editingTruck) {
        updatedTrucks = current.trucks.map((t) =>
          t.id === editingTruck.id
            ? {
                ...t,
                plateNumber: truckForm.plateNumber.trim(),
                tonsCarried: tons,
                driverName: truckForm.driverName.trim(),
                destination: dest,
                dispatchDate: truckForm.dispatchDate,
                notes: truckNotes,
              }
            : t
        );
      } else {
        const newTruck: PopcornTruck = {
          id: `truck-${Date.now()}`,
          plateNumber: truckForm.plateNumber.trim(),
          tonsCarried: tons,
          driverName: truckForm.driverName.trim(),
          destination: dest,
          dispatchDate: truckForm.dispatchDate,
          notes: truckNotes,
        };
        updatedTrucks = [newTruck, ...current.trucks];
      }
      return {
        ...current,
        trucks: updatedTrucks,
      };
    });

    setIsTruckModalOpen(false);
    playSound('success');
  };

  const handleDeleteTruck = (id: string) => {
    updateActiveTransaction((current) => ({
      ...current,
      trucks: current.trucks.filter((t) => t.id !== id),
    }));
    setTruckToDelete(null);
    playSound('delete');
  };

  // ----------------------------------------------------
  // EXPENSE HANDLERS
  // ----------------------------------------------------
  const handleTomanCalculation = (tomanVal: string, rateVal: string) => {
    const toman = Number(tomanVal) || 0;
    const rate = Number(rateVal) || 0;
    if (toman > 0 && rate > 0) {
      const calculatedUSD = toman / rate;
      const formatted = Math.round(calculatedUSD * 100) / 100;
      setExpenseForm((prev) => ({
        ...prev,
        amountLocal: tomanVal,
        exchangeRate: rateVal,
        amountUSD: formatted.toString(),
      }));
    } else {
      setExpenseForm((prev) => ({
        ...prev,
        amountLocal: tomanVal,
        exchangeRate: rateVal,
      }));
    }
  };

  const handleOpenAddExpense = (defaultRegion?: 'iran' | 'iraq') => {
    setEditingExpense(null);
    setExpenseForm({
      region: defaultRegion || (activeExpenseTab === 'iraq' ? 'iraq' : 'iran'),
      title: '',
      category: '',
      amountUSD: '',
      amountLocal: '',
      exchangeRate: '',
      date: new Date().toISOString().split('T')[0],
      paidBy: 'me',
      notes: '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: PopcornExpense) => {
    setEditingExpense(expense);
    setExpenseForm({
      region: expense.region,
      title: expense.title || '',
      category: expense.category || '',
      amountUSD: String(expense.amountUSD),
      amountLocal: expense.amountLocal ? String(expense.amountLocal) : '',
      exchangeRate: expense.exchangeRate ? String(expense.exchangeRate) : '',
      date: expense.date,
      paidBy: expense.paidBy,
      notes: expense.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amountUSD) {
      playSound('error');
      return;
    }

    const usd = Number(expenseForm.amountUSD) || 0;
    const local = expenseForm.amountLocal ? Number(expenseForm.amountLocal) : 0;
    const exRate = expenseForm.exchangeRate ? Number(expenseForm.exchangeRate) : 0;
    const expNotes = expenseForm.notes.trim() || '';

    updateActiveTransaction((current) => {
      let updatedExpenses: PopcornExpense[];
      if (editingExpense) {
        updatedExpenses = current.expenses.map((ex) =>
          ex.id === editingExpense.id
            ? {
                ...ex,
                region: expenseForm.region,
                title: expenseForm.title?.trim() || (expenseForm.region === 'iran' ? 'خەرجی ئێران' : 'خەرجی عێراق'),
                category: expenseForm.category?.trim() || '',
                amountUSD: usd,
                amountLocal: local,
                exchangeRate: exRate,
                date: expenseForm.date,
                paidBy: expenseForm.paidBy,
                notes: expNotes,
              }
            : ex
        );
      } else {
        const newExpense: PopcornExpense = {
          id: `exp-${Date.now()}`,
          region: expenseForm.region,
          title: expenseForm.title?.trim() || (expenseForm.region === 'iran' ? 'خەرجی ئێران' : 'خەرجی عێراق'),
          category: expenseForm.category?.trim() || '',
          amountUSD: usd,
          amountLocal: local,
          exchangeRate: exRate,
          date: expenseForm.date,
          paidBy: expenseForm.paidBy,
          notes: expNotes,
        };
        updatedExpenses = [newExpense, ...current.expenses];
      }
      return {
        ...current,
        expenses: updatedExpenses,
      };
    });

    setIsExpenseModalOpen(false);
    playSound('success');
  };

  const handleDeleteExpense = (id: string) => {
    updateActiveTransaction((current) => ({
      ...current,
      expenses: current.expenses.filter((e) => e.id !== id),
    }));
    setExpenseToDelete(null);
    playSound('delete');
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    if (!activeTransaction) return;
    const text = `📊 مامەڵەی: ${activeTransaction.name}
----------------------------------------
${config.originCountry ? `📍 سەرچاوە: ${config.originCountry} | ` : ''}🎯 مەبەست: ${config.destinationCity}
⚖️ بڕی بار: ${totalCargoTons} تۆن
💵 نرخی کڕین: $${buyPricePerTon}/تۆن | کۆی کڕین: ${formatUSD(totalBuyingCost)}
📈 نرخی فرۆشتن: $${sellPricePerTon}/تۆن | کۆی داهات: ${formatUSD(expectedTotalRevenue)}
----------------------------------------
🚚 بارهەڵگرەکانی ئێران:
- بڕی باری هاتووی تۆمارکراو: ${totalTonsCarried} تۆن (${trucks.length} بارهەڵگر)
- بڕی ماوە: ${remainingTonsToTransport} تۆن
----------------------------------------
📉 خەرجییەکان:
- خەرجییەکانی ئێران و ترانزێت: ${formatUSD(totalIranSpending)}
- خەرجییەکانی ناوخۆی عێراق و گومرگ: ${formatUSD(totalIraqSpending)}
- کۆی گشتی تێچووی هەموو مامەڵەکە: ${formatUSD(totalOverallProjectCost)}
----------------------------------------
💎 قازانجی پوختەی گشتی (Net): ${formatUSD(finalNetProfit)} (${formatIQD(finalNetProfit * exchangeRate)})
${
  hasPartner
    ? `🤝 حیساباتی شەراکەت (${config.partnerName}):
- پشکی من (%${myPercent}): ${formatUSD(myProfitShare)}
- پشکی هاوبەش (%${partnerPercent}): ${formatUSD(partnerProfitShare)}`
    : `👤 مامەڵەی تەواو تایبەت (بێ هاوبەش - ١٠٠٪ قازانج بۆ خۆت)`
}
----------------------------------------
تۆمارکراوە لە سیستەمی DanaMahjadStore`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    playSound('success');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {!activeTransaction ? (
        /* ====================================================
           TRANSACTION SELECTION VIEW (کام مامەڵە دەتەوێت ببینیت؟)
           ==================================================== */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl bg-[#0f1115] border border-white/[0.08] p-5 sm:p-7 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-neutral-300 mb-3">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  <span>مامەڵەکردنی کاڵا</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  کام مامەڵە دەتەوێت ببینیت؟
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-xl leading-relaxed">
                  تکایە ئەو مامەڵەیە هەڵبژێرە کە دەتەوێت چاودێری و وردەکاریی حیسابات و بارهەڵگرەکانی بکەیت.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOpenCreateTransaction}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer w-full sm:w-auto select-none"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>مامەڵەی نوێ</span>
                </button>
              </div>
            </div>

            {/* Search Input (if multiple transactions) */}
            {store.transactions.length > 1 && (
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="text"
                    value={transactionSearchQuery}
                    onChange={(e) => setTransactionSearchQuery(e.target.value)}
                    placeholder="گەڕان بەپێی ناوی مامەڵە، وڵات یان هاوبەش..."
                    className="w-full bg-[#050505] border border-white/10 focus:border-white/30 rounded-xl pr-10 pl-9 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  />
                  {transactionSearchQuery && (
                    <button
                      onClick={() => setTransactionSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                      title="سڕینەوە"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transactions Grid */}
          {filteredTransactions.length === 0 ? (
            <div className="rounded-2xl bg-[#0f1115] border border-white/[0.08] p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">هیچ مامەڵەیەک نەدۆزرایەوە</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
                {transactionSearchQuery
                  ? 'هیچ مامەڵەیەک بەم ناوە یان وڵاتە نەدۆزرایەوە، دەتوانیت وشەی گەڕان پاکبکەیتەوە.'
                  : 'تۆ تا ئێستا هیچ مامەڵەیەکت تۆمار نەکردووە، یەکەمین مامەڵەت دروست بکە.'}
              </p>
              {transactionSearchQuery ? (
                <button
                  onClick={() => setTransactionSearchQuery('')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>سڕینەوەی گەڕان</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenCreateTransaction}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>مامەڵەی نوێ</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredTransactions.map((trans) => {
                const totalTons = Number(trans.config.totalTons) || 0;
                const buyPrice = Number(trans.config.buyPricePerTonUSD) || 0;
                const sellPrice = Number(trans.config.sellingPricePerTonUSD) || 0;
                const truckCount = trans.trucks?.length || 0;
                const expenseCount = trans.expenses?.length || 0;

                return (
                  <div
                    key={trans.id}
                    onClick={() => {
                      setSelectedTransactionId(trans.id);
                      playSound('click');
                    }}
                    className="rounded-2xl bg-[#0f1115] border border-white/[0.08] hover:border-white/25 hover:bg-[#13161e] p-5 shadow-lg group cursor-pointer flex flex-col justify-between transition-all duration-150 relative"
                  >
                    <div>
                      {/* Card Header: Icon, Name & Status */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white/[0.04] text-white border border-white/[0.08] group-hover:bg-white group-hover:text-black transition-colors shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-white transition-colors line-clamp-1">
                              {trans.name}
                            </h2>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                              {trans.config.originCountry && trans.config.destinationCity ? (
                                <span>
                                  {trans.config.originCountry} ← {trans.config.destinationCity}
                                </span>
                              ) : trans.config.destinationCity ? (
                                <span>بەرەو {trans.config.destinationCity}</span>
                              ) : (
                                <span>هاوردەکردن و بارکردن</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          چالاک
                        </span>
                      </div>

                      {/* 4 Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-white/[0.06] text-xs">
                        <div className="p-2.5 rounded-xl bg-[#050505] border border-white/[0.06]">
                          <span className="text-[10px] text-neutral-400 block mb-0.5">کۆی بار</span>
                          <span className="font-bold text-white">
                            {formatNumber(totalTons)} <span className="text-[10px] font-normal text-neutral-400">تۆن</span>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#050505] border border-white/[0.06]">
                          <span className="text-[10px] text-neutral-400 block mb-0.5">بارهەڵگرەکان</span>
                          <span className="font-bold text-white">
                            {truckCount} <span className="text-[10px] font-normal text-neutral-400">بار</span>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#050505] border border-white/[0.06]">
                          <span className="text-[10px] text-neutral-400 block mb-0.5">نرخی کڕین</span>
                          <span className="font-bold text-white">
                            ${formatNumber(buyPrice)} <span className="text-[10px] font-normal text-neutral-400">/ تۆن</span>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#050505] border border-white/[0.06]">
                          <span className="text-[10px] text-neutral-400 block mb-0.5">نرخی فرۆشتن</span>
                          <span className="font-bold text-white">
                            ${formatNumber(sellPrice)} <span className="text-[10px] font-normal text-neutral-400">/ تۆن</span>
                          </span>
                        </div>
                      </div>

                      {/* Partner info and expenses badge */}
                      <div className="text-[11px] text-neutral-400 flex items-center justify-between pb-3">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-neutral-500" />
                          <span>
                            {trans.config.hasPartner ? (
                              trans.config.partnerName ? `${trans.config.partnerName} (${trans.config.partnerSharePercent}%)` : `هاوبەش (${trans.config.partnerSharePercent}%)`
                            ) : (
                              'بێ هاوبەش (تایبەت)'
                            )}
                          </span>
                        </span>
                        <span>{expenseCount} خەرجی تۆمارکراو</span>
                      </div>
                    </div>

                    {/* Card Footer: Open CTA */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:text-neutral-200 transition-colors">
                        <span>بینینی ئەم مامەڵەیە</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                      </div>

                      {store.transactions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTransactionToDelete(trans);
                          }}
                          className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="سڕینەوەی ئەم مامەڵەیە"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ====================================================
           ACTIVE TRANSACTION DASHBOARD VIEW
           ==================================================== */
        <>
          {/* ====================================================
              TOP HERO & TRANSACTION SWITCHER BAR (MINIMALIST DARK)
              ==================================================== */}
          <div className="rounded-2xl bg-[#0f1115] border border-white/[0.08] p-5 md:p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              {/* Left: Transaction Brand & Back Button */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedTransactionId(null);
                    playSound('click');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#050505] hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 hover:border-white/25 text-xs font-semibold transition-colors cursor-pointer select-none"
                  title="گەڕانەوە بۆ هەڵبژاردنی مامەڵە"
                >
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                  <span>هەڵبژاردنی مامەڵە</span>
                </button>

                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {activeTransaction.name}
                </h1>
              </div>

              {/* Right: Modern Command Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
                {/* Transaction Dropdown Switcher */}
                <div className="relative flex items-center bg-[#050505] hover:bg-[#12141a] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 transition-colors">
                  <Layers className="w-4 h-4 text-neutral-400 ml-2 shrink-0" />
                  <select
                    value={activeTransaction.id}
                    onChange={(e) => {
                      setSelectedTransactionId(e.target.value);
                      persistStore({
                        ...store,
                        activeTransactionId: e.target.value,
                      });
                      playSound('click');
                    }}
                    className="bg-transparent text-xs font-semibold text-white pr-2 pl-4 focus:outline-none cursor-pointer"
                  >
                    {store.transactions.map((trans) => (
                      <option key={trans.id} value={trans.id} className="bg-[#0f1115] text-white">
                        {trans.name} ({trans.config.totalTons} تۆن)
                      </option>
                    ))}
                  </select>
                </div>

            {/* CREATE NEW TRANSACTION BUTTON */}
            <button
              onClick={handleOpenCreateTransaction}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="دروستکردنی مامەڵەی نوێ بۆ پۆپکورن"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>مامەڵەی نوێ</span>
            </button>

            {/* Action Group: Settings, Excel, Copy, Delete */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#050505] border border-white/10">
              {/* Edit Active Transaction Settings */}
              <button
                onClick={() => {
                  setEditTransactionForm(config);
                  setEditTransactionName(activeTransaction.name);
                  setIsEditTransactionModalOpen(true);
                }}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="دەستکاریکردنی ناوی مامەڵە، نرخەکان و شەراکەت"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Export Excel for this transaction */}
              <button
                onClick={() => {
                  exportPopcornToExcel({
                    config,
                    trucks,
                    expenses,
                  });
                  playSound('success');
                }}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                title="داگرتنی ئێکسڵی ئەم مامەڵەیە"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              {/* Copy Summary */}
              <button
                onClick={handleCopySummary}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="کۆپیکردنی پوختەی ئەم مامەڵەیە بۆ واتساپ"
              >
                {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Delete Transaction (if more than 1) */}
              {store.transactions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTransactionToDelete(activeTransaction)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="سڕینەوەی ئەم مامەڵەیە"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          1. FINANCIAL KPIS (5 UNIFIED MINIMALIST CARDS)
          ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              پوختەی دارایی و حیساباتی سەرەکی (Financial Metrics)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* 1. Buying Details */}
          <TiltCard className="bg-[#0f1115] border border-white/[0.08] hover:border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">تێچووی کڕین (Buying Cost)</p>
                <h3 className="text-2xl font-bold text-white mt-2 font-numeric tracking-tight">
                  {formatUSD(totalBuyingCost)}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                <Globe2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 font-numeric">
              <span>{totalCargoTons} تۆن × {formatUSD(buyPricePerTon)}</span>
              <span className="text-neutral-300 font-medium">
                {config.originCountry || config.destinationCity || 'هاوردەکراو'}
              </span>
            </div>
          </TiltCard>

          {/* 2. Selling Revenue */}
          <TiltCard className="bg-[#0f1115] border border-white/[0.08] hover:border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">داهاتی فرۆش (Selling Revenue)</p>
                <h3 className="text-2xl font-bold text-white mt-2 font-numeric tracking-tight">
                  {sellPricePerTon > 0 ? formatUSD(expectedTotalRevenue) : 'دیارینەکراوە'}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 font-numeric">
              <span>
                {sellPricePerTon > 0
                  ? `فرۆشتن: ${formatUSD(sellPricePerTon)}/تۆن`
                  : 'نرخی فرۆشتن دیارینەکراوە'}
              </span>
              {sellPricePerTon > 0 && (
                <span className="text-neutral-300 font-semibold">
                  +{formatUSD(grossTradeProfit)} جیاوازی
                </span>
              )}
            </div>
          </TiltCard>

          {/* 3. Cost Iran Side + Cost Iraq Side */}
          <TiltCard className="bg-[#0f1115] border border-white/[0.08] hover:border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">کۆی خەرجییەکان (Expenses)</p>
                <h3 className="text-2xl font-bold text-white mt-2 font-numeric tracking-tight">
                  {formatUSD(totalOperatingExpenses)}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 font-numeric">
              <span>ئێران: {formatUSD(totalIranSpending)}</span>
              <span className="text-neutral-300 font-medium">
                عێراق: {formatUSD(totalIraqSpending)}
              </span>
            </div>
          </TiltCard>

          {/* 4. Net Profit */}
          <TiltCard className="bg-[#0f1115] border border-white/[0.08] hover:border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">قازانجی پوختەی مامەڵە (Net)</p>
                <h3
                  className={`text-2xl font-bold mt-2 font-numeric tracking-tight ${
                    sellPricePerTon > 0
                      ? finalNetProfit >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : 'text-white'
                  }`}
                >
                  {sellPricePerTon > 0 ? formatUSD(finalNetProfit) : 'چاوەڕوانی فرۆشتن'}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 font-numeric">
              {sellPricePerTon > 0 ? (
                <>
                  <span>قازانجی سەدەهاوردە:</span>
                  <span
                    className={`font-semibold ${
                      finalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {finalNetProfit >= 0 ? '+ قازانج' : '- زیان'}
                  </span>
                </>
              ) : (
                <>
                  <span>کۆی تێچوو تا ئێستا:</span>
                  <span className="text-neutral-300 font-semibold">
                    {formatUSD(totalOverallProjectCost)}
                  </span>
                </>
              )}
            </div>
          </TiltCard>

          {/* 5. Calculate with Partner if there is any */}
          <TiltCard className="bg-[#0f1115] border border-white/[0.08] hover:border-white/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  {hasPartner ? `پشکی هاوبەش (%${partnerPercent})` : 'پشکی من (بێ هاوبەش)'}
                </p>
                <h3 className="text-2xl font-bold text-white mt-2 font-numeric tracking-tight">
                  {sellPricePerTon > 0
                    ? hasPartner
                      ? formatUSD(partnerProfitShare)
                      : formatUSD(myProfitShare)
                    : 'چاوەڕوانی فرۆشتن'}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                {hasPartner ? <Split className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 font-numeric">
              <span>{hasPartner ? `پشکی من (%${myPercent}):` : '١٠٠٪ بۆ خۆت:'}</span>
              <span className="text-neutral-300 font-semibold">
                {sellPricePerTon > 0 ? formatUSD(myProfitShare) : 'چاوەڕوانی فرۆشتن'}
              </span>
            </div>
          </TiltCard>
        </div>
      </div>

      {/* ====================================================
          2. TRUCK & TRANSPORT MANAGEMENT (COLLAPSIBLE SECTION)
          ==================================================== */}
      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => setIsTruckSectionOpen(!isTruckSectionOpen)}
            className="w-full p-4 sm:p-5 rounded-2xl bg-[#0f1115] hover:bg-[#14171d] border border-white/[0.08] hover:border-white/20 shadow-md flex items-center justify-between gap-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>بەڕێوەبردنی بارهەڵگرەکان</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  تۆمارکردن و بەدواداچوونی وردی بارهەڵگرەکانی ئەم مامەڵەیە لە ئێرانەوە بۆ سلێمانی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#050505] border border-white/10 text-neutral-300 font-numeric font-medium text-xs">
                <span>{trucks.length} بارهەڵگر</span>
                <span className="text-neutral-600">|</span>
                <span>{totalTonsCarried} لە {totalCargoTons} تۆن</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/15 text-[10px] font-bold">
                  {Math.min(100, Math.round((totalTonsCarried / (totalCargoTons || 1)) * 100))}%
                </span>
              </span>

              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isTruckSectionOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Expandable Section Content */}
        <AnimatePresence>
          {isTruckSectionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-4 pt-1"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#0f1115] border border-white/[0.08] shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>زانیاری بارهەڵگرەکان</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/10 font-numeric font-medium">
                        {trucks.length} بارهەڵگر ({totalTonsCarried} لە {totalCargoTons} تۆن)
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      تۆمارکردن و بەدواداچوونی وردی بارهەڵگرەکانی ئەم مامەڵەیە
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {/* Export Driver & Truck Information to Excel */}
                  <button
                    onClick={() => {
                      exportTrucksToExcel(truckSearch.trim() ? filteredTrucks : trucks, safeTransaction.name);
                      playSound('success');
                    }}
                    disabled={trucks.length === 0}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#050505] hover:bg-white/10 text-neutral-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none shadow-sm"
                    title="داگرتنی داتای شۆفێر و بارهەڵگرەکان بە فایلی ئێکسڵ"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>ئێکسڵی شۆفێران</span>
                  </button>

                  <button
                    onClick={handleOpenAddTruck}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-colors cursor-pointer shadow-sm select-none"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>زیادکردنی بارهەڵگرتنی نوێ</span>
                  </button>
                  <button
                    onClick={() => setIsTruckSectionOpen(false)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                    title="داخستنی بەشەکە"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>داخستن</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-3.5 rounded-2xl bg-[#0f1115] border border-white/[0.08] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    value={truckSearch}
                    onChange={(e) => setTruckSearch(e.target.value)}
                    placeholder="گەڕان بەپێی تابلۆ، ناوی شۆفێر یان شوێن..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 pr-10"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="text-xs text-neutral-400 font-medium font-numeric">
                  کۆی گشتی تۆمارکراو: <span className="text-white font-bold">{trucks.length}</span> بارهەڵگر ({totalTonsCarried} تۆن)
                </div>
              </div>

              {/* Truck Table */}
              <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-[#050505] border-b border-white/[0.08] text-neutral-400">
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">ژمارەی تابلۆی بارهەڵگر</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">ناوی شۆفێر</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">بڕی بار بە تۆن</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">شوێنی گەیندن / مەبەست</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">بەرواری بارکردن</th>
                        <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">کردارەکان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredTrucks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-neutral-500">
                            هیچ بارهەڵگرێک بۆ ئەم مامەڵەیە تۆمار نەکراوە!
                          </td>
                        </tr>
                      ) : (
                        filteredTrucks.map((truck) => {
                          return (
                            <tr key={truck.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 font-mono font-bold text-white text-xs">
                                  <Truck className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>{truck.plateNumber}</span>
                                </div>
                                {truck.notes && (
                                  <div className="text-[10px] text-neutral-500 mt-1 max-w-xs truncate">
                                    {truck.notes}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-neutral-400" />
                                  <span>{truck.driverName}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-bold text-white font-numeric text-sm whitespace-nowrap">
                                {formatNumber(truck.tonsCarried)} تۆن
                              </td>

                              <td className="py-3 px-4 text-neutral-300 whitespace-nowrap">
                                {truck.destination ? (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                    <span>{truck.destination}</span>
                                  </div>
                                ) : (
                                  <span className="text-neutral-500">—</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-neutral-400 font-numeric whitespace-nowrap">
                                {truck.dispatchDate}
                              </td>

                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditTruck(truck)}
                                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                    title="دەستکاریکردن"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setTruckToDelete(truck)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                                    title="سڕینەوە"
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
                    {filteredTrucks.length > 0 && (
                      <tfoot>
                        <tr className="bg-[#050505] font-bold border-t border-white/10 text-neutral-300">
                          <td className="py-3 px-4 text-white">کۆی گشتی ({filteredTrucks.length} بارهەڵگر)</td>
                          <td className="py-3 px-4 text-neutral-500">—</td>
                          <td className="py-3 px-4 text-white font-numeric text-sm">
                            {formatNumber(filteredTrucks.reduce((acc, t) => acc + (Number(t.tonsCarried) || 0), 0))} تۆن
                          </td>
                          <td className="py-3 px-4 text-neutral-500">—</td>
                          <td className="py-3 px-4 text-neutral-500">—</td>
                          <td className="py-3 px-4 text-center text-neutral-500">—</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ====================================================
          3. EXPENSES & PARTNER ACCOUNTING (COLLAPSIBLE SECTION)
          ==================================================== */}
      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => setIsExpenseSectionOpen(!isExpenseSectionOpen)}
            className="w-full p-4 sm:p-5 rounded-2xl bg-[#0f1115] hover:bg-[#14171d] border border-white/[0.08] hover:border-white/20 shadow-md flex items-center justify-between gap-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>خەرجییەکانی ئێران و عێراق و حیساباتی شەراکەت</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  تێچووی گواستنەوەی ئێران و ترانزێت + گومرگ و خەرجی ناوخۆی عێراق و دابەشکردنی قازانج
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#050505] border border-white/10 text-neutral-300 font-numeric font-medium text-xs">
                <span>کۆی گشتی: {formatUSD(totalOperatingExpenses)}</span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-300 text-[11px]">🇮🇷 {formatUSD(totalIranSpending)}</span>
                <span className="text-neutral-300 text-[11px]">🇮🇶 {formatUSD(totalIraqSpending)}</span>
              </span>

              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpenseSectionOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Expandable Section Content */}
        <AnimatePresence>
          {isExpenseSectionOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-4 pt-1"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Cost Iran Side & Cost Iraq Side (2 Cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#0f1115] border border-white/[0.08] shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-neutral-300">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          خەرجییەکانی ئێران و عێراق
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          تێچووی گواستنەوەی ئێران و ترانزێت + گومرگ و خەرجی ناوخۆی عێراق
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Excel Export Button for Expenses (Two Tables: Iran & Iraq) */}
                      <button
                        onClick={() => {
                          exportExpensesToExcel(expenses, safeTransaction.name);
                          playSound('success');
                        }}
                        disabled={expenses.length === 0}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#050505] hover:bg-white/10 text-neutral-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none shadow-sm"
                        title="داگرتنی خەرجییەکان بە فایلی ئێکسڵ (دوو خشتە: ئێران و عێراق)"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>ئێکسڵی خەرجییەکان</span>
                      </button>

                      <button
                        onClick={() => handleOpenAddExpense('iran')}
                        className="px-3 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm select-none"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>خەرجی ئێران</span>
                      </button>
                      <button
                        onClick={() => handleOpenAddExpense('iraq')}
                        className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm select-none"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>خەرجی عێراق</span>
                      </button>
                      <button
                        onClick={() => setIsExpenseSectionOpen(false)}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-white/10 select-none"
                        title="داخستنی بەشەکە"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span>داخستن</span>
                      </button>
                    </div>
                  </div>

                  {/* Region Tabs (Minimalist Segmented Control) */}
                  <div className="flex items-center justify-between p-1 bg-[#050505] rounded-xl border border-white/[0.08] text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveExpenseTab('all')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                          activeExpenseTab === 'all'
                            ? 'bg-white/10 text-white font-bold border border-white/15'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        هەموو خەرجییەکان ({formatUSD(totalOperatingExpenses)})
                      </button>
                      <button
                        onClick={() => setActiveExpenseTab('iran')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                          activeExpenseTab === 'iran'
                            ? 'bg-white/10 text-white font-bold border border-white/15'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        🇮🇷 لقی ئێران ({formatUSD(totalIranSpending)})
                      </button>
                      <button
                        onClick={() => setActiveExpenseTab('iraq')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                          activeExpenseTab === 'iraq'
                            ? 'bg-white/10 text-white font-bold border border-white/15'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        🇮🇶 لقی عێراق ({formatUSD(totalIraqSpending)})
                      </button>
                    </div>
                  </div>

                  {/* Expenses Table */}
                  <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-[#050505] border-b border-white/[0.08] text-neutral-400">
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">خەرجی (لق)</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">بڕ بە دۆلار ($)</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">بەروار</th>
                            <th className="py-3 px-4 font-semibold whitespace-nowrap">دراوە لەلایەن</th>
                            <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">کردارەکان</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredExpenses.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-neutral-500">
                                هیچ خەرجییەک بۆ ئەم بەشە تۆمار نەکراوە!
                              </td>
                            </tr>
                          ) : (
                            filteredExpenses.map((expense) => {
                              return (
                                <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-white flex items-center gap-1.5">
                                      <span className="text-base">{expense.region === 'iran' ? '🇮🇷' : '🇮🇶'}</span>
                                      <span>{expense.title || (expense.region === 'iran' ? 'خەرجی ئێران' : 'خەرجی عێراق')}</span>
                                    </div>
                                    {expense.region === 'iran' && expense.amountLocal ? (
                                      <div className="text-[10px] text-neutral-300 font-numeric mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 font-bold">
                                          {formatNumber(expense.amountLocal)} تمەن
                                        </span>
                                        {expense.exchangeRate ? (
                                          <span className="text-neutral-400">
                                            (صەرف: {formatNumber(expense.exchangeRate)})
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    {expense.region === 'iraq' && expense.amountLocal ? (
                                      <div className="text-[10px] text-neutral-300 font-numeric mt-1">
                                        {formatNumber(expense.amountLocal)} دینار
                                      </div>
                                    ) : null}
                                    {expense.notes && (
                                      <div className="text-[10px] text-neutral-400 mt-1">
                                        {expense.notes}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-white font-numeric text-sm whitespace-nowrap">
                                    {formatUSD(expense.amountUSD)}
                                  </td>
                                  <td className="py-3 px-4 text-neutral-400 font-numeric whitespace-nowrap">
                                    {expense.date}
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        expense.paidBy === 'partner'
                                          ? 'bg-white/10 text-neutral-200 border-white/20'
                                          : expense.paidBy === 'me'
                                          ? 'bg-white/[0.05] text-neutral-300 border-white/10'
                                          : 'bg-white/[0.05] text-neutral-300 border-white/10'
                                      }`}
                                    >
                                      {expense.paidBy === 'partner'
                                        ? 'شەریک / هاوبەش'
                                        : expense.paidBy === 'me'
                                        ? 'لەلایەن منەوە'
                                        : 'هاوبەش'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditExpense(expense)}
                                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                        title="دەستکاریکردن"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setExpenseToDelete(expense)}
                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                                        title="سڕینەوە"
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
                </div>

                {/* Calculate with Partner Waterfall (1 Col - Minimalist Dark) */}
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#0f1115] border border-white/[0.08] space-y-4 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-300">
                          {hasPartner ? <Split className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {hasPartner ? 'حیساباتی شەراکەت' : 'حیساباتی مامەڵەی سەربەخۆ'}
                          </h4>
                          <p className="text-[11px] text-neutral-400">
                            {hasPartner ? 'Partner Profit Sharing' : 'Solo Transaction (No Partner)'}
                          </p>
                        </div>
                      </div>

                      {hasPartner ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-neutral-200 border border-white/15 font-numeric">
                          %{partnerPercent} / %{myPercent}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-neutral-300 border border-white/10 font-numeric">
                          ١٠٠٪ بۆ من
                        </span>
                      )}
                    </div>

                    {/* Waterfall Breakdown */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-neutral-400">کۆی داهاتی فرۆش ({totalCargoTons} تۆن):</span>
                        <span className="font-bold text-white font-numeric">{formatUSD(expectedTotalRevenue)}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 text-neutral-300">
                        <span>- تێچووی کڕین{config.originCountry ? ` لە ${config.originCountry}` : ''}:</span>
                        <span className="font-bold font-numeric text-rose-400">-{formatUSD(totalBuyingCost)}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 text-neutral-300">
                        <span>- خەرجییەکانی گواستنەوەی ئێران:</span>
                        <span className="font-bold font-numeric text-rose-400">-{formatUSD(totalIranSpending)}</span>
                      </div>

                      <div className="flex justify-between items-center py-1 text-neutral-300">
                        <span>- خەرجییەکانی ناوخۆی عێراق:</span>
                        <span className="font-bold font-numeric text-rose-400">-{formatUSD(totalIraqSpending)}</span>
                      </div>

                      <div className="h-[1px] bg-white/[0.08] my-2" />

                      <div className="flex justify-between items-center py-1 text-sm font-bold">
                        <span className="text-white">قازانجی پوختەی ماوە:</span>
                        <span className={`${sellPricePerTon > 0 ? (finalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-white'} font-numeric`}>
                          {sellPricePerTon > 0 ? formatUSD(finalNetProfit) : 'چاوەڕوانی فرۆشتن'}
                        </span>
                      </div>
                    </div>

                    {/* Split Breakdown / Partner details */}
                    {hasPartner ? (
                      <>
                        <div className="p-3.5 rounded-xl bg-[#050505] border border-white/[0.08] space-y-2.5">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-white">{config.partnerName || 'هاوبەش'}</div>
                              <div className="text-[11px] text-neutral-400 font-numeric">پشکی قازانج (%{partnerPercent})</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white font-numeric text-sm">
                                {sellPricePerTon > 0 ? formatUSD(partnerProfitShare) : 'چاوەڕوانی فرۆشتن'}
                              </div>
                            </div>
                          </div>

                          <div className="h-[1px] bg-white/[0.06]" />

                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-white">پشکی من (My Share)</div>
                              <div className="text-[11px] text-neutral-400 font-numeric">پشکی قازانج (%{myPercent})</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white font-numeric text-sm">
                                {sellPricePerTon > 0 ? formatUSD(myProfitShare) : 'چاوەڕوانی فرۆشتن'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#050505] border border-white/[0.08] text-[11px] space-y-2">
                          <div className="text-neutral-400 font-medium flex items-center justify-between">
                            <span>خەرجی دراو لەلایەن هاوبەش:</span>
                            <span className="text-white font-numeric font-bold">{formatUSD(expensesPaidByPartner)}</span>
                          </div>
                          <div className="text-neutral-400 font-medium flex items-center justify-between">
                            <span>خەرجی دراو لەلایەن من:</span>
                            <span className="text-white font-numeric font-bold">{formatUSD(expensesPaidByMe)}</span>
                          </div>

                          <div className="h-[1px] bg-white/[0.06] my-1" />

                          <div className="flex items-center justify-between font-bold text-xs pt-1">
                            <span className="text-white">کۆی شایستەی هاوبەش:</span>
                            <span className="text-emerald-400 font-numeric">
                              {sellPricePerTon > 0 ? formatUSD(netDueToPartner) : formatUSD(expensesPaidByPartner)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#050505] border border-white/[0.08] text-center space-y-2">
                        <p className="text-xs text-neutral-400">
                          ئەم مامەڵەیە شەراکەتی تێدانییە و تەواوی قازانجی پوخت بۆ خۆت پاشەکەوت دەبێت.
                        </p>
                        <div className="text-xl font-bold text-white font-numeric">
                          {formatUSD(myProfitShare)}
                        </div>
                        <button
                          onClick={() => {
                            setEditTransactionForm({
                              ...config,
                              hasPartner: true,
                            });
                            setIsEditTransactionModalOpen(true);
                          }}
                          className="text-xs text-neutral-300 hover:text-white underline cursor-pointer pt-1"
                        >
                          + زیادکردنی شەراکەت بۆ ئەم مامەڵەیە
                        </button>
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="space-y-2 pt-1">
                      <button
                        onClick={handleCopySummary}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold shadow-sm cursor-pointer transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copiedSummary ? 'کۆپیکرا بۆ کلیپبۆرد!' : 'کۆپیکردنی پوختەی ئەم مامەڵەیە'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}

      {/* ====================================================
          MODAL: CREATE NEW TRANSACTION
          ==================================================== */}
      <AnimatePresence>
        {isNewTransactionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewTransactionModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.05] text-white border border-white/10">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">دروستکردنی مامەڵەی نوێ</h3>
                    <p className="text-xs text-neutral-400">دیاریکردنی ناو، نرخەکانی کڕین، فرۆشتن و شەراکەت</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewTransactionModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
                {/* 1. Transaction Name (Mandatory) */}
                <div>
                  <label className="block text-neutral-200 font-bold mb-1">
                    ناوی کاڵا <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="ناوی کاڵا بنووسە (نموونە: پۆپکۆرن، وەجبەی دووەم)"
                    value={newTransactionForm.name}
                    onChange={(e) =>
                      setNewTransactionForm({ ...newTransactionForm, name: e.target.value })
                    }
                    className="w-full bg-[#050505] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-semibold placeholder-neutral-500 focus:outline-none focus:border-white/35"
                  />
                </div>

                {/* 2. Buying Details */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <span className="font-bold text-neutral-200 block mb-2">زانیاری کڕین (Buying Details):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-300 font-medium mb-1">بڕی بار بە تۆن</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="نموونە: 200"
                        value={newTransactionForm.totalTons}
                        onChange={(e) =>
                          setNewTransactionForm({ ...newTransactionForm, totalTons: e.target.value })
                        }
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-300 font-medium mb-1">نرخی کڕین ($/تۆن)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="نموونە: 220"
                        value={newTransactionForm.buyPricePerTonUSD}
                        onChange={(e) =>
                          setNewTransactionForm({
                            ...newTransactionForm,
                            buyPricePerTonUSD: e.target.value,
                          })
                        }
                        className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Selling Informations */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <span className="font-bold text-neutral-200 block mb-2">زانیاری فرۆشتن (Selling Informations):</span>
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">
                      نرخی فرۆشتن ($/تۆن) <span className="text-neutral-500 font-normal text-[11px]">(ئارەزوومەندانە / Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="ئارەزوومەندانە (نموونە: 302)"
                      value={newTransactionForm.sellingPricePerTonUSD}
                      onChange={(e) =>
                        setNewTransactionForm({
                          ...newTransactionForm,
                          sellingPricePerTonUSD: e.target.value,
                        })
                      }
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* 4. Partner Calculation if any */}
                <div className="pt-2 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between bg-[#050505] p-3 rounded-xl border border-white/[0.08]">
                    <div>
                      <span className="font-bold text-white block">حیساباتی شەراکەت (Partner Calculation)</span>
                      <span className="text-[11px] text-neutral-400">ئایا ئەم مامەڵەیە شەراکەت/هاوبەشی تێدایە؟</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTransactionForm.hasPartner}
                        onChange={(e) =>
                          setNewTransactionForm({ ...newTransactionForm, hasPartner: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white after:peer-checked:bg-black cursor-pointer" />
                    </label>
                  </div>

                  {newTransactionForm.hasPartner && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#050505] border border-white/10">
                      <div>
                        <label className="block text-neutral-300 font-medium mb-1">ناوی هاوبەش / شەریک</label>
                        <input
                          type="text"
                          placeholder="ناوی هاوبەش بنووسە..."
                          value={newTransactionForm.partnerName}
                          onChange={(e) =>
                            setNewTransactionForm({
                              ...newTransactionForm,
                              partnerName: e.target.value,
                            })
                          }
                          className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-300 font-medium mb-1">
                          ڕێژەی پشکی هاوبەش (%): {newTransactionForm.partnerSharePercent || 50}%
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={newTransactionForm.partnerSharePercent || '50'}
                          onChange={(e) =>
                            setNewTransactionForm({
                              ...newTransactionForm,
                              partnerSharePercent: e.target.value,
                            })
                          }
                          className="w-full accent-white cursor-pointer mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsNewTransactionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 font-medium transition-colors cursor-pointer border border-white/[0.08]"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    دروستکردن و تۆمارکردن
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          MODAL: EDIT CURRENT TRANSACTION SETTINGS
          ==================================================== */}
      <AnimatePresence>
        {isEditTransactionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditTransactionModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.05] text-white border border-white/10">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">دەستکاریکردنی ئەم مامەڵەیە</h3>
                    <p className="text-xs text-neutral-400">ناوی مامەڵە، نرخەکان و شەراکەت</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditTransactionModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTransaction} className="space-y-4 text-xs">
                {/* Transaction Name */}
                <div>
                  <label className="block text-neutral-200 font-bold mb-1">ناوی کاڵا</label>
                  <input
                    type="text"
                    required
                    value={editTransactionName}
                    onChange={(e) => setEditTransactionName(e.target.value)}
                    className="w-full bg-[#050505] border border-white/15 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-white/35"
                  />
                </div>

                {/* Tons & Buy Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">بڕ بە تۆن</label>
                    <input
                      type="number"
                      required
                      value={editTransactionForm.totalTons}
                      onChange={(e) =>
                        setEditTransactionForm({
                          ...editTransactionForm,
                          totalTons: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">نرخی کڕین ($/تۆن)</label>
                    <input
                      type="number"
                      required
                      value={editTransactionForm.buyPricePerTonUSD}
                      onChange={(e) =>
                        setEditTransactionForm({
                          ...editTransactionForm,
                          buyPricePerTonUSD: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Sell Price (Optional) */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    نرخی فرۆشتن ($/تۆن) <span className="text-neutral-500 font-normal text-[11px]">(ئارەزوومەندانە / Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="ئارەزوومەندانە (نموونە: 302)"
                    value={editTransactionForm.sellingPricePerTonUSD || ''}
                    onChange={(e) =>
                      setEditTransactionForm({
                        ...editTransactionForm,
                        sellingPricePerTonUSD: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white font-numeric placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Partner Settings */}
                <div className="pt-2 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between bg-[#050505] p-3 rounded-xl border border-white/[0.08]">
                    <div>
                      <span className="font-bold text-white block">حیساباتی شەراکەت</span>
                      <span className="text-[11px] text-neutral-400">ئایا شەراکەتی تێدایە؟</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTransactionForm.hasPartner !== false}
                        onChange={(e) =>
                          setEditTransactionForm({
                            ...editTransactionForm,
                            hasPartner: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white after:peer-checked:bg-black" />
                    </label>
                  </div>

                  {editTransactionForm.hasPartner !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#050505] border border-white/10">
                      <div>
                        <label className="block text-neutral-300 font-medium mb-1">ناوی هاوبەش</label>
                        <input
                          type="text"
                          value={editTransactionForm.partnerName}
                          onChange={(e) =>
                            setEditTransactionForm({
                              ...editTransactionForm,
                              partnerName: e.target.value,
                            })
                          }
                          className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-300 font-medium mb-1">
                          ڕێژەی پشکی هاوبەش (%): {editTransactionForm.partnerSharePercent}%
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={editTransactionForm.partnerSharePercent}
                          onChange={(e) =>
                            setEditTransactionForm({
                              ...editTransactionForm,
                              partnerSharePercent: Number(e.target.value),
                            })
                          }
                          className="w-full accent-white cursor-pointer mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsEditTransactionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 font-medium transition-colors cursor-pointer border border-white/[0.08]"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    پاشەکەوتکردن
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          MODAL: ADD / EDIT TRUCK
          ==================================================== */}
      <AnimatePresence>
        {isTruckModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTruckModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.05] text-white border border-white/10">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingTruck ? 'دەستکاریکردنی بارهەڵگر' : 'زیادکردنی بارهەڵگری نوێ'}
                    </h3>
                    <p className="text-xs text-neutral-400">بۆ مامەڵەی: {safeTransaction.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTruckModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTruck} className="space-y-4 text-xs">
                {/* Plate & Driver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      ژمارەی تابلۆی بارهەڵگر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="نموونە: ایران 23 / 789 ب 12"
                      value={truckForm.plateNumber}
                      onChange={(e) => setTruckForm({ ...truckForm, plateNumber: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      ناوی شۆفێر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ناوی تەواوی شۆفێر"
                      value={truckForm.driverName}
                      onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Tons & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      بڕی بار بە تۆن <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="نموونە: 25.5"
                      value={truckForm.tonsCarried}
                      onChange={(e) => setTruckForm({ ...truckForm, tonsCarried: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      شوێنی گەیندن / مەبەست <span className="text-neutral-500 font-normal text-[11px]">(ئارەزوومەندانە)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="نموونە: سلێمانی - کۆگای سەرەکی عەلوە"
                      value={truckForm.destination}
                      onChange={(e) => setTruckForm({ ...truckForm, destination: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Dispatch Date */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">بەرواری بارکردن / دەرچوون</label>
                  <input
                    type="date"
                    value={truckForm.dispatchDate}
                    onChange={(e) => setTruckForm({ ...truckForm, dispatchDate: e.target.value })}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">تێبینی</label>
                  <textarea
                    rows={2}
                    placeholder="کوالیتی بار، دۆخی پشکنین، هتد..."
                    value={truckForm.notes}
                    onChange={(e) => setTruckForm({ ...truckForm, notes: e.target.value })}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsTruckModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 font-medium transition-colors cursor-pointer border border-white/[0.08]"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    {editingTruck ? 'پاشەکەوتکردنی گۆڕانکاری' : 'زیادکردنی بارهەڵگر'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          MODAL: ADD / EDIT EXPENSE
          ==================================================== */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/[0.05] text-white border border-white/10">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{editingExpense ? 'دەستکاریکردنی مەسروف' : 'تۆمارکردنی خەرجی نوێ'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/10 text-neutral-300 border border-white/15">
                        {expenseForm.region === 'iran' ? '🇮🇷 لقی ئێران' : '🇮🇶 لقی عێراق'}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400">بۆ مامەڵەی: {safeTransaction.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
                {/* Amount Inputs */}
                {expenseForm.region === 'iran' ? (
                  /* IRAN EXPENSE: Toman & Exchange Rate Calculator */
                  <div className="p-4 rounded-xl bg-[#050505] border border-white/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇮🇷</span>
                        <span className="font-bold text-white text-xs">
                          خەرجی بە دراوی تمەن و گۆڕینەوە بۆ دۆلار
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-numeric">
                        تمەن ÷ صەرف = $ دۆلار
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Toman Amount */}
                      <div>
                        <label className="block text-neutral-300 font-semibold mb-1 text-[11px]">
                          بڕی خەرجی بە تمەن <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="نموونە: 500000000"
                          value={expenseForm.amountLocal}
                          onChange={(e) => handleTomanCalculation(e.target.value, expenseForm.exchangeRate)}
                          className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                        />
                        {expenseForm.amountLocal && Number(expenseForm.amountLocal) > 0 && (
                          <div className="text-[10px] text-neutral-300 mt-1 font-numeric">
                            {formatNumber(Number(expenseForm.amountLocal))} تمەن
                          </div>
                        )}
                      </div>

                      {/* 2. Exchange Rate per $1 */}
                      <div>
                        <label className="block text-neutral-300 font-semibold mb-1 text-[11px]">
                          نرخی ١ دۆلار بە تمەن (صەرف) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="نموونە: 265000"
                          value={expenseForm.exchangeRate}
                          onChange={(e) => handleTomanCalculation(expenseForm.amountLocal, e.target.value)}
                          className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                        />
                        {expenseForm.exchangeRate && Number(expenseForm.exchangeRate) > 0 && (
                          <div className="text-[10px] text-neutral-400 mt-1 font-numeric">
                            $1 = {formatNumber(Number(expenseForm.exchangeRate))} تمەن
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result: Dollar USD */}
                    <div className="pt-2 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <label className="block text-white font-bold mb-0.5 text-xs">
                          کۆی خەرجی بە دۆلار ($ USD) <span className="text-rose-400">*</span>
                        </label>
                        <p className="text-[10px] text-neutral-400">
                          بە خۆکاری حیسابکراوە
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {expenseForm.amountUSD && !Number.isInteger(Number(expenseForm.amountUSD)) && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpenseForm((prev) => ({
                                ...prev,
                                amountUSD: Math.round(Number(prev.amountUSD)).toString(),
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-[11px] font-semibold cursor-pointer transition-colors"
                            title="گردکردنەوە بۆ ژمارەی تەواو"
                          >
                            گردکردنەوە: ${Math.round(Number(expenseForm.amountUSD))}
                          </button>
                        )}
                        <div className="relative flex-1 sm:w-36">
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="1887"
                            value={expenseForm.amountUSD}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amountUSD: e.target.value })}
                            className="w-full bg-[#0f1115] border border-white/20 rounded-xl px-3 py-2 text-white font-bold font-numeric text-base focus:outline-none focus:border-white/40"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">$</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* IRAQ EXPENSE: Amount USD */
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">
                      بڕ بە دۆلار ($ USD) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="نموونە: 650"
                      value={expenseForm.amountUSD}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amountUSD: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>
                )}

                {/* Paid By & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">دراوە لەلایەن کێ؟</label>
                    <select
                      value={expenseForm.paidBy}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          paidBy: e.target.value as 'me' | 'partner' | 'shared',
                        })
                      }
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                      <option value="me">لەلایەن منەوە (من داومە)</option>
                      <option value="partner">لەلایەن شەریکەوە (هاوبەش داویەتی)</option>
                      <option value="shared">لەسەر حسابی هاوبەش دراوە</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">بەروار</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">تێبینی یان ژمارەی وەسڵ</label>
                  <textarea
                    rows={2}
                    placeholder="ژمارەی پسوولەی فەرمی..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 font-medium transition-colors cursor-pointer border border-white/[0.08]"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    {editingExpense ? 'پاشەکەوتکردن' : 'تۆمارکردنی خەرجی'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          CONFIRM DELETE TRANSACTION MODAL
          ==================================================== */}
      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransactionToDelete(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0f1115] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی ئەم مامەڵەیە؟</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی مامەڵەی <strong className="text-white">{transactionToDelete.name}</strong>؟ سەرجەم بارهەڵگرەکان و خەرجییەکانی ئەم وەجبەیە دەسڕدرێنەوە.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingTransaction}
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 text-xs font-semibold border border-white/[0.08] cursor-pointer disabled:opacity-50"
                >
                  نەخێر، پەشیمانم
                </button>
                <button
                  type="button"
                  disabled={isDeletingTransaction}
                  onClick={() => handleDeleteTransaction(transactionToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 min-w-[110px]"
                >
                  {isDeletingTransaction ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>دەسڕدرێتەوە...</span>
                    </>
                  ) : (
                    <span>بەڵێ، بیسڕەوە</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Truck Confirm */}
      <AnimatePresence>
        {truckToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTruckToDelete(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0f1115] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی بارهەڵگر؟</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی بارهەڵگری <strong className="text-white">{truckToDelete.plateNumber}</strong> بە بڕی {truckToDelete.tonsCarried} تۆن؟
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setTruckToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 text-xs font-semibold border border-white/[0.08]"
                >
                  نەخێر
                </button>
                <button
                  onClick={() => handleDeleteTruck(truckToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
                >
                  بەڵێ، بیسڕەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Expense Confirm */}
      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpenseToDelete(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0f1115] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی مەسروف؟</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی خەرجی <strong className="text-white">{expenseToDelete.notes || expenseToDelete.title || (expenseToDelete.region === 'iran' ? 'خەرجی لقی ئێران' : 'خەرجی لقی عێراق')}</strong> بە بڕی {formatUSD(expenseToDelete.amountUSD)}؟
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setExpenseToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-neutral-300 text-xs font-semibold border border-white/[0.08]"
                >
                  نەخێر
                </button>
                <button
                  onClick={() => handleDeleteExpense(expenseToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
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
