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
  UserX,
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
  DEFAULT_TRANSACTION,
} from '../../services/popcornStorage';
import { formatUSD, formatIQD, formatNumber, playSound } from '../../utils/formatters';
import { exportPopcornToExcel } from '../../utils/excelExport';
import { TiltCard } from '../common/TiltCard';
import confetti from 'canvas-confetti';

export const PopcornManagement: React.FC = () => {
  // Multi-Transaction Store State
  const [store, setStore] = useState<PopcornStoreState>(() => loadLocalPopcornStore());
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Active Transaction Resolver
  const activeTransaction: PopcornTransaction = useMemo(() => {
    return (
      store.transactions.find((t) => t.id === store.activeTransactionId) ||
      store.transactions[0] ||
      DEFAULT_TRANSACTION
    );
  }, [store]);

  // Filters & Tabs for Active Transaction
  const [truckSearch, setTruckSearch] = useState<string>('');
  const [isTruckSectionOpen, setIsTruckSectionOpen] = useState<boolean>(false);
  const [isExpenseSectionOpen, setIsExpenseSectionOpen] = useState<boolean>(false);
  const [activeExpenseTab, setActiveExpenseTab] = useState<'all' | 'iran' | 'iraq'>('all');

  // Modals State
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState<boolean>(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<PopcornTransaction | null>(null);

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
    activeTransaction.config
  );
  const [editTransactionName, setEditTransactionName] = useState<string>(activeTransaction.name);

  // Sync edit form whenever active transaction switches
  useEffect(() => {
    setEditTransactionForm(activeTransaction.config);
    setEditTransactionName(activeTransaction.name);
  }, [activeTransaction.id, activeTransaction.name]);

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
  const { config, trucks, expenses } = activeTransaction;

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
    const newConfig: PopcornShipmentConfig = {
      id: `config-${Date.now()}`,
      title: cleanName,
      originCountry: newTransactionForm.originCountry.trim() || 'ڕووسیا (Russia)',
      destinationCity: newTransactionForm.destinationCity.trim() || 'سلێمانی',
      totalTons: Number(newTransactionForm.totalTons) || 0,
      buyPricePerTonUSD: Number(newTransactionForm.buyPricePerTonUSD) || 0,
      sellingPricePerTonUSD: Number(newTransactionForm.sellingPricePerTonUSD) || 0,
      hasPartner: newTransactionForm.hasPartner,
      partnerName: newTransactionForm.partnerName.trim() || '',
      partnerSharePercent: Number(newTransactionForm.partnerSharePercent) || 50,
      exchangeRateIQD: Number(newTransactionForm.exchangeRateIQD) || 1530,
      notes: newTransactionForm.notes.trim() || undefined,
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

  const handleDeleteTransaction = (id: string) => {
    if (store.transactions.length <= 1) {
      alert('ناتوانیت تەنها مامەڵەی ماوە بسڕیتەوە!');
      return;
    }

    const remaining = store.transactions.filter((t) => t.id !== id);
    const nextActiveId = remaining[0].id;

    persistStore({
      ...store,
      activeTransactionId: nextActiveId,
      transactions: remaining,
    });

    setTransactionToDelete(null);
    playSound('delete');
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
                destination: truckForm.destination.trim(),
                dispatchDate: truckForm.dispatchDate,
                notes: truckForm.notes.trim() || undefined,
              }
            : t
        );
      } else {
        const newTruck: PopcornTruck = {
          id: `truck-${Date.now()}`,
          plateNumber: truckForm.plateNumber.trim(),
          tonsCarried: tons,
          driverName: truckForm.driverName.trim(),
          destination: truckForm.destination.trim(),
          dispatchDate: truckForm.dispatchDate,
          notes: truckForm.notes.trim() || undefined,
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
  const handleOpenAddExpense = (defaultRegion?: 'iran' | 'iraq') => {
    setEditingExpense(null);
    setExpenseForm({
      region: defaultRegion || (activeExpenseTab === 'iraq' ? 'iraq' : 'iran'),
      title: '',
      category: '',
      amountUSD: '',
      amountLocal: '',
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
      title: expense.title,
      category: expense.category,
      amountUSD: String(expense.amountUSD),
      amountLocal: expense.amountLocal ? String(expense.amountLocal) : '',
      date: expense.date,
      paidBy: expense.paidBy,
      notes: expense.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amountUSD) {
      playSound('error');
      return;
    }

    const usd = Number(expenseForm.amountUSD) || 0;
    const local = expenseForm.amountLocal ? Number(expenseForm.amountLocal) : undefined;

    updateActiveTransaction((current) => {
      let updatedExpenses: PopcornExpense[];
      if (editingExpense) {
        updatedExpenses = current.expenses.map((ex) =>
          ex.id === editingExpense.id
            ? {
                ...ex,
                region: expenseForm.region,
                title: expenseForm.title.trim(),
                category: expenseForm.category.trim(),
                amountUSD: usd,
                amountLocal: local,
                date: expenseForm.date,
                paidBy: expenseForm.paidBy,
                notes: expenseForm.notes.trim() || undefined,
              }
            : ex
        );
      } else {
        const newExpense: PopcornExpense = {
          id: `exp-${Date.now()}`,
          region: expenseForm.region,
          title: expenseForm.title.trim(),
          category: expenseForm.category.trim(),
          amountUSD: usd,
          amountLocal: local,
          date: expenseForm.date,
          paidBy: expenseForm.paidBy,
          notes: expenseForm.notes.trim() || undefined,
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
    const text = `📊 مامەڵەی: ${activeTransaction.name}
----------------------------------------
📍 سەرچاوە: ${config.originCountry} | 🎯 مەبەست: ${config.destinationCity}
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
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ====================================================
          TOP HERO & TRANSACTION SWITCHER BAR
          ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl glass-card border border-amber-500/25 p-5 md:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Transaction Header Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-amber-600/30 border border-amber-500/40 p-2 flex items-center justify-center shadow-lg shadow-amber-500/20 text-2xl shrink-0">
                🍿
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                    {activeTransaction.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5" />
                    {config.originCountry} ➔ {config.destinationCity}
                  </span>
                  {hasPartner ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      شەراکەت (%{partnerPercent})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <UserX className="w-3 h-3" />
                      بێ هاوبەش (تایبەت)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  کڕین: {totalCargoTons} تۆن بە {formatUSD(buyPricePerTon)} {sellPricePerTon > 0 ? `| فرۆشتن بە ${formatUSD(sellPricePerTon)}` : '| فرۆشتن: دیارینەکراوە'} | {trucks.length} بارهەڵگر تۆمارکراوە
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Switcher & Actions */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            {/* Transaction Dropdown Switcher */}
            <div className="relative flex items-center bg-slate-900 border border-amber-500/35 rounded-xl px-2.5 py-1.5 shadow-md">
              <Layers className="w-4 h-4 text-amber-400 ml-2 shrink-0" />
              <select
                value={store.activeTransactionId}
                onChange={(e) => {
                  persistStore({
                    ...store,
                    activeTransactionId: e.target.value,
                  });
                  playSound('click');
                }}
                className="bg-transparent text-xs font-bold text-white pr-2 pl-4 focus:outline-none cursor-pointer"
              >
                {store.transactions.map((trans) => (
                  <option key={trans.id} value={trans.id} className="bg-slate-900 text-white">
                    {trans.name} ({trans.config.totalTons} تۆن)
                  </option>
                ))}
              </select>
            </div>

            {/* CREATE NEW TRANSACTION BUTTON */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenCreateTransaction}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-gold text-xs font-black text-slate-950 shadow-lg cursor-pointer"
              title="دروستکردنی مامەڵەی نوێ بۆ پۆپکورن"
            >
              <Plus className="w-4 h-4" />
              <span>+ مامەڵەی نوێ (New Transaction)</span>
            </motion.button>

            {/* Edit Active Transaction Settings */}
            <button
              onClick={() => {
                setEditTransactionForm(config);
                setEditTransactionName(activeTransaction.name);
                setIsEditTransactionModalOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="دەستکاریکردنی ناوی مامەڵە، نرخەکان و شەراکەت"
            >
              <Settings className="w-4 h-4 text-amber-400" />
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
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
              title="داگرتنی ئێکسڵی ئەم مامەڵەیە"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
              title="کۆپیکردنی پوختەی ئەم مامەڵەیە بۆ واتساپ"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Delete Transaction (if more than 1) */}
            {store.transactions.length > 1 && (
              <button
                onClick={() => setTransactionToDelete(activeTransaction)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                title="سڕینەوەی ئەم مامەڵەیە"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================
          1. BUYING DETAILS, SELLING INFORMATIONS & FINANCIAL KPIS
          ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              وردەکاری دارایی مامەڵە (Buying & Selling Financials)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* 1. Buying Details */}
          <TiltCard glowColor="gold">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">وردەکاری کڕین (Buying Cost)</p>
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 mt-1.5 font-numeric">
                  {formatUSD(totalBuyingCost)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
                <Globe2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>{totalCargoTons} تۆن × {formatUSD(buyPricePerTon)}</span>
              <span className="text-amber-400 font-medium font-numeric">
                تێچووی کڕین
              </span>
            </div>
          </TiltCard>

          {/* 2. Selling Informations */}
          <TiltCard glowColor="amber">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">داهاتی فرۆش (Selling Revenue)</p>
                <h3 className="text-xl font-black text-slate-100 mt-1.5 font-numeric">
                  {sellPricePerTon > 0 ? formatUSD(expectedTotalRevenue) : 'دیارینەکراوە'}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {sellPricePerTon > 0
                  ? `نرخی فرۆشتن: ${formatUSD(sellPricePerTon)}/تۆن`
                  : 'نرخی فرۆشتن دیارینەکراوە'}
              </span>
              {sellPricePerTon > 0 && (
                <span className="text-emerald-400 font-semibold font-numeric">
                  +{formatUSD(grossTradeProfit)} جیاوازی
                </span>
              )}
            </div>
          </TiltCard>

          {/* 3. Cost Iran Side + Cost Iraq Side */}
          <TiltCard glowColor="rose">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">خەرجییەکانی ئێران + عێراق</p>
                <h3 className="text-xl font-black text-rose-300 mt-1.5 font-numeric">
                  {formatUSD(totalOperatingExpenses)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-rose-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>ئێران: {formatUSD(totalIranSpending)}</span>
              <span className="text-slate-300 font-medium font-numeric">
                عێراق: {formatUSD(totalIraqSpending)}
              </span>
            </div>
          </TiltCard>

          {/* 4. Net Profit */}
          <TiltCard glowColor="emerald">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">قازانجی پوختەی مامەڵە (Net)</p>
                <h3
                  className={`text-xl font-black mt-1.5 font-numeric ${
                    sellPricePerTon > 0
                      ? finalNetProfit >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {sellPricePerTon > 0 ? formatUSD(finalNetProfit) : 'چاوەڕوانی فرۆشتن'}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-slate-400">
              {sellPricePerTon > 0 ? (
                <>
                  <span>قازانجی سەدەهاوردە:</span>
                  <span
                    className={`font-bold font-numeric ${
                      finalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {finalNetProfit >= 0 ? '+ قازانج' : '- زیان'}
                  </span>
                </>
              ) : (
                <>
                  <span>کۆی تێچوو تا ئێستا:</span>
                  <span className="text-amber-300 font-bold font-numeric">
                    {formatUSD(totalOverallProjectCost)}
                  </span>
                </>
              )}
            </div>
          </TiltCard>

          {/* 5. Calculate with Partner if there is any */}
          <TiltCard glowColor="gold">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {hasPartner ? `پشکی هاوبەش (%${partnerPercent})` : 'پشکی من (بێ هاوبەش)'}
                </p>
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 mt-1.5 font-numeric">
                  {sellPricePerTon > 0
                    ? hasPartner
                      ? formatUSD(partnerProfitShare)
                      : formatUSD(myProfitShare)
                    : 'چاوەڕوانی فرۆشتن'}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                {hasPartner ? <Split className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>{hasPartner ? `پشکی من (%${myPercent}):` : '١٠٠٪ بۆ خۆت:'}</span>
              <span className="text-amber-400 font-bold font-numeric">
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
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsTruckSectionOpen(!isTruckSectionOpen)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md flex items-center justify-between sm:justify-start gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>زیادکردنی بارهەڵگر بۆ ئەم مامەڵەیە</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 font-numeric font-extrabold text-[11px]">
                {trucks.length} بارهەڵگر ({totalTonsCarried} تۆن)
              </span>
              {isTruckSectionOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-amber-500/25">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>زانیاری بارهەڵگرەکان (Truck Information)</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-numeric">
                        {trucks.length} بارهەڵگر ({totalTonsCarried} لە {totalCargoTons} تۆن)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      تۆمارکردن و بەدواداچوونی وردی بارهەڵگرەکانی ئەم مامەڵەیە لە ئێرانەوە بۆ سلێمانی
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenAddTruck}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md cursor-pointer hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ فۆڕمی بارهەڵگری نوێ</span>
                  </button>
                  <button
                    onClick={() => setIsTruckSectionOpen(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="داخستنی بەشەکە"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>داخستن</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-3.5 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    value={truckSearch}
                    onChange={(e) => setTruckSearch(e.target.value)}
                    placeholder="گەڕان بەپێی تابلۆ، ناوی شۆفێر یان شوێن..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-10"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  کۆی گشتی تۆمارکراو: <span className="text-amber-400 font-bold font-numeric">{trucks.length}</span> بارهەڵگر ({totalTonsCarried} تۆن)
                </div>
              </div>

              {/* Truck Table */}
              <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400">
                        <th className="py-3.5 px-4 font-semibold">ژمارەی تابلۆی بارهەڵگر</th>
                        <th className="py-3.5 px-4 font-semibold">ناوی شۆفێر</th>
                        <th className="py-3.5 px-4 font-semibold">بڕی بار بە تۆن</th>
                        <th className="py-3.5 px-4 font-semibold">شوێنی گەیندن / مەبەست</th>
                        <th className="py-3.5 px-4 font-semibold">بەرواری بارکردن</th>
                        <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredTrucks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            هیچ بارهەڵگرێک بۆ ئەم مامەڵەیە تۆمار نەکراوە!
                          </td>
                        </tr>
                      ) : (
                        filteredTrucks.map((truck) => {
                          return (
                            <tr key={truck.id} className="hover:bg-slate-800/40 transition-colors group">
                              <td className="py-3.5 px-4">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-amber-300 text-xs shadow-inner">
                                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{truck.plateNumber}</span>
                                </div>
                                {truck.notes && (
                                  <div className="text-[10px] text-slate-500 mt-1 max-w-xs truncate">
                                    {truck.notes}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{truck.driverName}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-bold text-amber-300 font-numeric text-sm">
                                {formatNumber(truck.tonsCarried)} تۆن
                              </td>

                              <td className="py-3.5 px-4 text-slate-300">
                                {truck.destination ? (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>{truck.destination}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-slate-400 font-numeric">
                                {truck.dispatchDate}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditTruck(truck)}
                                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                        <tr className="bg-slate-900/90 font-bold border-t-2 border-amber-500/20 text-slate-200">
                          <td className="py-3 px-4 text-amber-400">کۆی گشتی ({filteredTrucks.length} بارهەڵگر)</td>
                          <td className="py-3 px-4 text-slate-400">—</td>
                          <td className="py-3 px-4 text-amber-300 font-numeric text-sm">
                            {formatNumber(filteredTrucks.reduce((acc, t) => acc + (Number(t.tonsCarried) || 0), 0))} تۆن
                          </td>
                          <td className="py-3 px-4 text-slate-400">—</td>
                          <td className="py-3 px-4 text-slate-400">—</td>
                          <td className="py-3 px-4 text-center text-slate-400">—</td>
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
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsExpenseSectionOpen(!isExpenseSectionOpen)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md flex items-center justify-between sm:justify-start gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>خەرجییەکانی ئێران و عێراق (Expenses)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 font-numeric font-extrabold text-[11px]">
                {formatUSD(totalOperatingExpenses)}
              </span>
              {isExpenseSectionOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cost Iran Side & Cost Iraq Side (2 Cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-amber-400" />
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          خەرجییەکانی ئێران و عێراق (Iran & Iraq Expenses)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        تێچووی گواستنەوەی ئێران و ترانزێت + گومرگ و خەرجی ناوخۆی عێراق بۆ ئەم مامەڵەیە
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAddExpense('iran')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ خەرجی ئێران</span>
                      </button>
                      <button
                        onClick={() => handleOpenAddExpense('iraq')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ خەرجی عێراق</span>
                      </button>
                      <button
                        onClick={() => setIsExpenseSectionOpen(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="داخستنی بەشەکە"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span>داخستن</span>
                      </button>
                    </div>
                  </div>

          {/* Region Tabs */}
          <div className="flex items-center justify-between p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveExpenseTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeExpenseTab === 'all'
                    ? 'bg-slate-800 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                هەموو خەرجییەکان ({formatUSD(totalOperatingExpenses)})
              </button>
              <button
                onClick={() => setActiveExpenseTab('iran')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeExpenseTab === 'iran'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                🇮🇷 لقی ئێران ({formatUSD(totalIranSpending)})
              </button>
              <button
                onClick={() => setActiveExpenseTab('iraq')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeExpenseTab === 'iraq'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                🇮🇶 لقی عێراق ({formatUSD(totalIraqSpending)})
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-4 font-semibold">ناونیشانی خەرجی</th>
                    <th className="py-3 px-4 font-semibold">بڕ بە دۆلار ($)</th>
                    <th className="py-3 px-4 font-semibold">بەروار</th>
                    <th className="py-3 px-4 font-semibold">دراوە لەلایەن</th>
                    <th className="py-3 px-4 font-semibold text-center">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        هیچ خەرجییەک بۆ ئەم بەشە تۆمار نەکراوە!
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => {
                      return (
                        <tr key={expense.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span className="text-base">{expense.region === 'iran' ? '🇮🇷' : '🇮🇶'}</span>
                              <span>{expense.title}</span>
                            </div>
                            {expense.notes && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {expense.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-rose-300 font-numeric text-sm">
                            {formatUSD(expense.amountUSD)}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-numeric">
                            {expense.date}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                expense.paidBy === 'partner'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : expense.paidBy === 'me'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {expense.paidBy === 'partner'
                                ? 'شەریک / هاوبەش'
                                : expense.paidBy === 'me'
                                ? 'لەلایەن منەوە'
                                : 'هاوبەش'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditExpense(expense)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
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

        {/* Calculate with Partner if there is any (1 Col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-card border border-amber-500/30 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-md">
                  {hasPartner ? <Split className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {hasPartner ? 'حیساباتی شەراکەت' : 'حیساباتی مامەڵەی سەربەخۆ'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {hasPartner ? 'Partner Profit Sharing' : 'Solo Transaction (No Partner)'}
                  </p>
                </div>
              </div>

              {hasPartner ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 font-numeric">
                  %{partnerPercent} / %{myPercent}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-numeric">
                  ١٠٠٪ بۆ من
                </span>
              )}
            </div>

            {/* Waterfall Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">کۆی داهاتی فرۆش ({totalCargoTons} تۆن):</span>
                <span className="font-bold text-white font-numeric">{formatUSD(expectedTotalRevenue)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-rose-400">
                <span>- تێچووی کڕین لە {config.originCountry}:</span>
                <span className="font-bold font-numeric">-{formatUSD(totalBuyingCost)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-rose-400">
                <span>- خەرجییەکانی گواستنەوەی ئێران:</span>
                <span className="font-bold font-numeric">-{formatUSD(totalIranSpending)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-rose-400">
                <span>- خەرجییەکانی ناوخۆی عێراق:</span>
                <span className="font-bold font-numeric">-{formatUSD(totalIraqSpending)}</span>
              </div>

              <div className="h-[1px] bg-amber-500/20 my-2" />

              <div className="flex justify-between items-center py-1 text-sm font-black">
                <span className="text-amber-400">قازانجی پوختەی ماوە:</span>
                <span className={`${sellPricePerTon > 0 ? (finalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-amber-400'} font-numeric`}>
                  {sellPricePerTon > 0 ? formatUSD(finalNetProfit) : 'چاوەڕوانی فرۆشتن'}
                </span>
              </div>
            </div>

            {/* Split Breakdown / Partner details */}
            {hasPartner ? (
              <>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{config.partnerName || 'هاوبەش'}</div>
                      <div className="text-[11px] text-slate-400 font-numeric">پشکی قازانج (%{partnerPercent})</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-amber-300 font-numeric text-sm">
                        {sellPricePerTon > 0 ? formatUSD(partnerProfitShare) : 'چاوەڕوانی فرۆشتن'}
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-slate-800" />

                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">پشکی من (My Share)</div>
                      <div className="text-[11px] text-slate-400 font-numeric">پشکی قازانج (%{myPercent})</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-amber-300 font-numeric text-sm">
                        {sellPricePerTon > 0 ? formatUSD(myProfitShare) : 'چاوەڕوانی فرۆشتن'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-2">
                  <div className="text-slate-400 font-semibold flex items-center justify-between">
                    <span>خەرجی دراو لەلایەن هاوبەش:</span>
                    <span className="text-white font-numeric font-bold">{formatUSD(expensesPaidByPartner)}</span>
                  </div>
                  <div className="text-slate-400 font-semibold flex items-center justify-between">
                    <span>خەرجی دراو لەلایەن من:</span>
                    <span className="text-white font-numeric font-bold">{formatUSD(expensesPaidByMe)}</span>
                  </div>

                  <div className="h-[1px] bg-slate-800 my-1" />

                  <div className="flex items-center justify-between font-bold text-xs pt-1">
                    <span className="text-amber-400">کۆی شایستەی هاوبەش:</span>
                    <span className="text-emerald-400 font-numeric">
                      {sellPricePerTon > 0 ? formatUSD(netDueToPartner) : formatUSD(expensesPaidByPartner)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  ئەم مامەڵەیە شەراکەتی تێدانییە و تەواوی قازانجی پوخت بۆ خۆت پاشەکەوت دەبێت.
                </p>
                <div className="text-xl font-black text-emerald-400 font-numeric">
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
                  className="text-xs text-amber-400 hover:underline cursor-pointer pt-1"
                >
                  + زیادکردنی شەراکەت بۆ ئەم مامەڵەیە
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopySummary}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md cursor-pointer"
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
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e111a] border border-amber-500/30 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">دروستکردنی مامەڵەی نوێ</h3>
                    <p className="text-xs text-slate-400">دیاریکردنی ناو، نرخەکانی کڕین، فرۆشتن و شەراکەت</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsNewTransactionModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
                {/* 1. Transaction Name (Mandatory) */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    ناوی مامەڵە (Transaction Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="ناوی مامەڵە بنووسە (نموونە: وەجبەی دووەم)"
                    value={newTransactionForm.name}
                    onChange={(e) =>
                      setNewTransactionForm({ ...newTransactionForm, name: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* 2. Buying Details */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-amber-300 block mb-2">زانیاری کڕین (Buying Details):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">بڕی بار بە تۆن</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="نموونە: 200"
                        value={newTransactionForm.totalTons}
                        onChange={(e) =>
                          setNewTransactionForm({ ...newTransactionForm, totalTons: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">نرخی کڕین ($/تۆن)</label>
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Selling Informations */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="font-bold text-emerald-300 block mb-2">زانیاری فرۆشتن (Selling Informations):</span>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      نرخی فرۆشتن ($/تۆن) <span className="text-slate-400 font-normal text-[11px]">(ئارەزوومەندانە / Optional)</span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* 4. Partner Calculation if any */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-white block">حیساباتی شەراکەت (Partner Calculation)</span>
                      <span className="text-[11px] text-slate-400">ئایا ئەم مامەڵەیە شەراکەت/هاوبەشی تێدایە؟</span>
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
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 cursor-pointer" />
                    </label>
                  </div>

                  {newTransactionForm.hasPartner && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/40 border border-amber-500/20">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">ناوی هاوبەش / شەریک</label>
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
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
                          className="w-full accent-amber-500 cursor-pointer mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewTransactionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-gold font-bold text-slate-950 shadow-md cursor-pointer"
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
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e111a] border border-amber-500/30 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">دەستکاریکردنی ئەم مامەڵەیە</h3>
                    <p className="text-xs text-slate-400">ناوی مامەڵە، نرخەکان و شەراکەت</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditTransactionModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTransaction} className="space-y-4 text-xs">
                {/* Transaction Name */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">ناوی مامەڵە</label>
                  <input
                    type="text"
                    required
                    value={editTransactionName}
                    onChange={(e) => setEditTransactionName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Tons & Buy Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">بڕ بە تۆن</label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">نرخی کڕین ($/تۆن)</label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Sell Price (Optional) */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    نرخی فرۆشتن ($/تۆن) <span className="text-slate-400 font-normal text-[11px]">(ئارەزوومەندانە / Optional)</span>
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-numeric placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Partner Settings */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-white block">حیساباتی شەراکەت</span>
                      <span className="text-[11px] text-slate-400">ئایا شەراکەتی تێدایە؟</span>
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
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                  </div>

                  {editTransactionForm.hasPartner !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/40 border border-amber-500/20">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">ناوی هاوبەش</label>
                        <input
                          type="text"
                          value={editTransactionForm.partnerName}
                          onChange={(e) =>
                            setEditTransactionForm({
                              ...editTransactionForm,
                              partnerName: e.target.value,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
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
                          className="w-full accent-amber-500 cursor-pointer mt-2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditTransactionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-gold font-bold text-slate-950 shadow-md cursor-pointer"
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
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e111a] border border-amber-500/30 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingTruck ? 'دەستکاریکردنی بارهەڵگر' : 'زیادکردنی بارهەڵگری نوێ'}
                    </h3>
                    <p className="text-xs text-slate-400">بۆ مامەڵەی: {activeTransaction.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsTruckModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTruck} className="space-y-4 text-xs">
                {/* Plate & Driver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ژمارەی تابلۆی بارهەڵگر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="نموونە: ایران 23 / 789 ب 12"
                      value={truckForm.plateNumber}
                      onChange={(e) => setTruckForm({ ...truckForm, plateNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ناوی شۆفێر <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ناوی تەواوی شۆفێر"
                      value={truckForm.driverName}
                      onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Tons & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      بڕی بار بە تۆن <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="نموونە: 25.5"
                      value={truckForm.tonsCarried}
                      onChange={(e) => setTruckForm({ ...truckForm, tonsCarried: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      شوێنی گەیندن / مەبەست <span className="text-slate-400 font-normal text-[11px]">(ئارەزوومەندانە / Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="نموونە: سلێمانی - کۆگای سەرەکی عەلوە"
                      value={truckForm.destination}
                      onChange={(e) => setTruckForm({ ...truckForm, destination: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Dispatch Date */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">بەرواری بارکردن / دەرچوون</label>
                  <input
                    type="date"
                    value={truckForm.dispatchDate}
                    onChange={(e) => setTruckForm({ ...truckForm, dispatchDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تێبینی</label>
                  <textarea
                    rows={2}
                    placeholder="کوالیتی بار، دۆخی پشکنین، هتد..."
                    value={truckForm.notes}
                    onChange={(e) => setTruckForm({ ...truckForm, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsTruckModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-gold font-bold text-slate-950 shadow-md cursor-pointer"
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
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-[#0e111a] border border-amber-500/30 rounded-3xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{editingExpense ? 'دەستکاریکردنی مەسروف' : 'تۆمارکردنی خەرجی نوێ'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        expenseForm.region === 'iran'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {expenseForm.region === 'iran' ? '🇮🇷 لقی ئێران' : '🇮🇶 لقی عێراق'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">بۆ مامەڵەی: {activeTransaction.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ناونیشانی مەسروف / خەرجی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: کرێی داگرتنی ٢ بارهەڵگر لە عەلوە، گومرگ، کرێی ترانزێت..."
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Amount USD & Local */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      بڕ بە دۆلار ($ USD) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="نموونە: 650"
                      value={expenseForm.amountUSD}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amountUSD: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      بڕ بە دراوی ناوخۆ (تمەن یان دینار)
                    </label>
                    <input
                      type="number"
                      placeholder="نموونە: 918000"
                      value={expenseForm.amountLocal}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amountLocal: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Paid By & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">دراوە لەلایەن کێ؟</label>
                    <select
                      value={expenseForm.paidBy}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          paidBy: e.target.value as 'me' | 'partner' | 'shared',
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                      <option value="me">لەلایەن منەوە (من داومە)</option>
                      <option value="partner">لەلایەن شەریکەوە (هاوبەش داویەتی)</option>
                      <option value="shared">لەسەر حسابی هاوبەش دراوە</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">بەروار</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تێبینی یان ژمارەی وەسڵ</label>
                  <textarea
                    rows={2}
                    placeholder="ژمارەی پسوولەی فەرمی..."
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    پەشیمانبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-gold font-bold text-slate-950 shadow-md cursor-pointer"
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0e111a] border border-rose-500/30 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی ئەم مامەڵەیە؟</h4>
                <p className="text-xs text-slate-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی مامەڵەی <strong className="text-white">{transactionToDelete.name}</strong>؟ سەرجەم بارهەڵگرەکان و خەرجییەکانی ئەم وەجبەیە دەسڕدرێنەوە.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  نەخێر، پەشیمانم
                </button>
                <button
                  onClick={() => handleDeleteTransaction(transactionToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg"
                >
                  بەڵێ، بیسڕەوە
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0e111a] border border-rose-500/30 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی بارهەڵگر؟</h4>
                <p className="text-xs text-slate-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی بارهەڵگری <strong className="text-white">{truckToDelete.plateNumber}</strong> بە بڕی {truckToDelete.tonsCarried} تۆن؟
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setTruckToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  نەخێر
                </button>
                <button
                  onClick={() => handleDeleteTruck(truckToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg"
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0e111a] border border-rose-500/30 rounded-2xl p-5 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">سڕینەوەی مەسروف؟</h4>
                <p className="text-xs text-slate-400 mt-1">
                  ئایا دڵنیایت لە سڕینەوەی خەرجی <strong className="text-white">{expenseToDelete.title}</strong> بە بڕی {formatUSD(expenseToDelete.amountUSD)}؟
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setExpenseToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  نەخێر
                </button>
                <button
                  onClick={() => handleDeleteExpense(expenseToDelete.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg"
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
