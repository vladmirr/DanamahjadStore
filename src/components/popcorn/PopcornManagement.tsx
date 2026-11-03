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
  Building2,
  Globe2,
  Copy,
  Check,
  AlertCircle,
  X,
  FileSpreadsheet,
  Split,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  PopcornProjectData,
  PopcornTruck,
  PopcornExpense,
  PopcornShipmentConfig,
} from '../../types/popcorn';
import {
  loadLocalPopcornData,
  saveLocalPopcornData,
  syncPopcornDataToCloud,
  subscribeToCloudPopcornData,
  DEFAULT_POPCORN_DATA,
} from '../../services/popcornStorage';
import { formatUSD, formatIQD, formatNumber, playSound } from '../../utils/formatters';
import { exportPopcornToExcel } from '../../utils/excelExport';
import { TiltCard } from '../common/TiltCard';
import confetti from 'canvas-confetti';

export const PopcornManagement: React.FC = () => {
  // Main Project State
  const [data, setData] = useState<PopcornProjectData>(() => loadLocalPopcornData());
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Filters & Tabs
  const [truckSearch, setTruckSearch] = useState<string>('');
  const [truckStatusFilter, setTruckStatusFilter] = useState<'all' | 'delivered' | 'in_transit' | 'at_border'>('all');
  const [activeExpenseTab, setActiveExpenseTab] = useState<'all' | 'iran' | 'iraq'>('all');

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState<boolean>(false);
  const [editingTruck, setEditingTruck] = useState<PopcornTruck | null>(null);
  const [truckToDelete, setTruckToDelete] = useState<PopcornTruck | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<PopcornExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<PopcornExpense | null>(null);

  // Form states
  const [truckForm, setTruckForm] = useState({
    plateNumber: '',
    tonsCarried: '',
    driverName: '',
    driverPhone: '',
    destination: 'سلێمانی - کۆگای سەرەکی عەلوە',
    status: 'in_transit' as 'in_transit' | 'at_border' | 'delivered',
    transitCostUSD: '650',
    dispatchDate: new Date().toISOString().split('T')[0],
    arrivalDate: '',
    notes: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    region: 'iran' as 'iran' | 'iraq',
    title: '',
    category: 'کرێی بارهەڵگر (Truck Freight)',
    amountUSD: '',
    amountLocal: '',
    date: new Date().toISOString().split('T')[0],
    paidBy: 'me' as 'me' | 'partner' | 'shared',
    notes: '',
  });

  const [configForm, setConfigForm] = useState<PopcornShipmentConfig>(data.config);

  // Real-time Cloud Synchronization
  useEffect(() => {
    const unsubscribe = subscribeToCloudPopcornData((cloudData) => {
      setData(cloudData);
      setConfigForm(cloudData.config);
    });
    return () => unsubscribe();
  }, []);

  // Save changes locally and attempt sync to cloud
  const persistChanges = (updatedData: PopcornProjectData) => {
    setData(updatedData);
    saveLocalPopcornData(updatedData);
    setIsCloudSyncing(true);
    syncPopcornDataToCloud(updatedData)
      .finally(() => setIsCloudSyncing(false));
  };

  // ----------------------------------------------------
  // CALCULATIONS & KPIS
  // ----------------------------------------------------
  const { config, trucks, expenses } = data;

  // 1. Cargo & Purchasing
  const totalCargoTons = Number(config.totalTons) || 200;
  const buyPricePerTon = Number(config.buyPricePerTonUSD) || 220;
  const sellPricePerTon = Number(config.sellingPricePerTonUSD) || 302;
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
  const transportProgressPercent = Math.min(100, Math.round((totalTonsCarried / (totalCargoTons || 1)) * 100));

  // 3. Expenses
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

  // 4. Net Profit & Partner Split
  const finalNetProfit = expectedTotalRevenue - totalOverallProjectCost;
  const partnerPercent = Number(config.partnerSharePercent) || 50;
  const myPercent = 100 - partnerPercent;

  const partnerProfitShare = (finalNetProfit * partnerPercent) / 100;
  const myProfitShare = (finalNetProfit * myPercent) / 100;

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

  // Final Settlement Due
  // If partner spent money on expenses, they get: PartnerProfitShare + expensesPaidByPartner
  const netDueToPartner = partnerProfitShare + expensesPaidByPartner;
  const netDueToMe = myProfitShare + expensesPaidByMe;

  // ----------------------------------------------------
  // FILTERED TRUCKS & EXPENSES
  // ----------------------------------------------------
  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      const matchSearch =
        t.plateNumber.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.driverName.toLowerCase().includes(truckSearch.toLowerCase()) ||
        t.destination.toLowerCase().includes(truckSearch.toLowerCase());

      const matchStatus =
        truckStatusFilter === 'all' ? true : t.status === truckStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [trucks, truckSearch, truckStatusFilter]);

  const filteredExpenses = useMemo(() => {
    if (activeExpenseTab === 'all') return expenses;
    return expenses.filter((e) => e.region === activeExpenseTab);
  }, [expenses, activeExpenseTab]);

  // ----------------------------------------------------
  // HANDLERS FOR TRUCKS
  // ----------------------------------------------------
  const handleOpenAddTruck = () => {
    setEditingTruck(null);
    setTruckForm({
      plateNumber: '',
      tonsCarried: '',
      driverName: '',
      driverPhone: '',
      destination: 'سلێمانی - کۆگای سەرەکی عەلوە',
      status: 'in_transit',
      transitCostUSD: '650',
      dispatchDate: new Date().toISOString().split('T')[0],
      arrivalDate: '',
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
      driverPhone: truck.driverPhone || '',
      destination: truck.destination,
      status: truck.status,
      transitCostUSD: String(truck.transitCostUSD || 0),
      dispatchDate: truck.dispatchDate,
      arrivalDate: truck.arrivalDate || '',
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
    const cost = Number(truckForm.transitCostUSD) || 0;

    let updatedTrucks: PopcornTruck[];
    if (editingTruck) {
      updatedTrucks = trucks.map((t) =>
        t.id === editingTruck.id
          ? {
              ...t,
              plateNumber: truckForm.plateNumber.trim(),
              tonsCarried: tons,
              driverName: truckForm.driverName.trim(),
              driverPhone: truckForm.driverPhone.trim(),
              destination: truckForm.destination.trim(),
              status: truckForm.status,
              transitCostUSD: cost,
              dispatchDate: truckForm.dispatchDate,
              arrivalDate: truckForm.arrivalDate || undefined,
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
        driverPhone: truckForm.driverPhone.trim(),
        destination: truckForm.destination.trim(),
        status: truckForm.status,
        transitCostUSD: cost,
        dispatchDate: truckForm.dispatchDate,
        arrivalDate: truckForm.arrivalDate || undefined,
        notes: truckForm.notes.trim() || undefined,
      };
      updatedTrucks = [newTruck, ...trucks];
    }

    persistChanges({
      ...data,
      trucks: updatedTrucks,
    });

    setIsTruckModalOpen(false);
    playSound('success');
  };

  const handleDeleteTruck = (id: string) => {
    const updatedTrucks = trucks.filter((t) => t.id !== id);
    persistChanges({
      ...data,
      trucks: updatedTrucks,
    });
    setTruckToDelete(null);
    playSound('delete');
  };

  // ----------------------------------------------------
  // HANDLERS FOR EXPENSES
  // ----------------------------------------------------
  const handleOpenAddExpense = (defaultRegion?: 'iran' | 'iraq') => {
    setEditingExpense(null);
    setExpenseForm({
      region: defaultRegion || (activeExpenseTab === 'iraq' ? 'iraq' : 'iran'),
      title: '',
      category: defaultRegion === 'iraq' || activeExpenseTab === 'iraq' ? 'گومرگی عێراق (Iraq Customs)' : 'کرێی بارهەڵگر (Truck Freight)',
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

    let updatedExpenses: PopcornExpense[];
    if (editingExpense) {
      updatedExpenses = expenses.map((ex) =>
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
      updatedExpenses = [newExpense, ...expenses];
    }

    persistChanges({
      ...data,
      expenses: updatedExpenses,
    });

    setIsExpenseModalOpen(false);
    playSound('success');
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    persistChanges({
      ...data,
      expenses: updatedExpenses,
    });
    setExpenseToDelete(null);
    playSound('delete');
  };

  // ----------------------------------------------------
  // CONFIG HANDLER
  // ----------------------------------------------------
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig: PopcornShipmentConfig = {
      ...configForm,
      totalTons: Number(configForm.totalTons) || 200,
      buyPricePerTonUSD: Number(configForm.buyPricePerTonUSD) || 220,
      sellingPricePerTonUSD: Number(configForm.sellingPricePerTonUSD) || 302,
      partnerSharePercent: Number(configForm.partnerSharePercent) || 50,
      exchangeRateIQD: Number(configForm.exchangeRateIQD) || 1530,
      updatedAt: new Date().toISOString(),
    };

    persistChanges({
      ...data,
      config: updatedConfig,
    });

    setIsSettingsModalOpen(false);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
    playSound('success');
  };

  // ----------------------------------------------------
  // RESET / REVERT TO DEFAULT
  // ----------------------------------------------------
  const handleResetToDefaults = () => {
    if (window.confirm('ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم داتاکانی پۆپکورن بۆ دۆخی سەرەتایی بنەڕەت؟')) {
      persistChanges(DEFAULT_POPCORN_DATA);
      setConfigForm(DEFAULT_POPCORN_DATA.config);
      playSound('success');
    }
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `📊 پڕۆژەی هاوردەکردنی پۆپکورن (Popcorn Import & Partnership)
----------------------------------------
📍 وڵاتی سەرچاوە: ${config.originCountry}
🎯 مەبەست: ${config.destinationCity}
⚖️ بڕی گشتی بار: ${totalCargoTons} تۆن
💵 نرخی کڕین (بۆ هەر تۆنێک): $${buyPricePerTon}
💰 کۆی پارەی کڕین: ${formatUSD(totalBuyingCost)}
📈 نرخی پێشبینیکراوی فرۆشتن: $${sellPricePerTon}
💵 کۆی داهاتی پێشبینیکراو: ${formatUSD(expectedTotalRevenue)}
----------------------------------------
🚚 بارهەڵگرەکان (Iran to Sulaimani):
- بڕی باری هاتووی تۆمارکراو: ${totalTonsCarried} تۆن (${trucks.length} بارهەڵگر)
- بڕی ماوە بۆ هێنان: ${remainingTonsToTransport} تۆن
----------------------------------------
📉 خەرجییەکان:
- خەرجییەکانی ئێران و گواستنەوە: ${formatUSD(totalIranSpending)}
- خەرجییەکانی ناوخۆی عێراق و گومرگ: ${formatUSD(totalIraqSpending)}
- کۆی گشتی هەموو خەرجییەکان: ${formatUSD(totalOverallProjectCost)}
----------------------------------------
💎 قازانجی پوختەی گشتی: ${formatUSD(finalNetProfit)} (${formatIQD(finalNetProfit * exchangeRate)})
🤝 دابەشکردنی شەراکەت (${config.partnerName}):
- پشکی من (${myPercent}%): ${formatUSD(myProfitShare)}
- پشکی هاوبەش (${partnerPercent}%): ${formatUSD(partnerProfitShare)}
----------------------------------------
تۆمارکراوە لە سیستەمی DanaMahjadStore`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    playSound('success');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ====================================================
          HEADER BAR & HERO
          ==================================================== */}
      <div className="relative overflow-hidden rounded-3xl glass-card border border-amber-500/25 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-600/10 via-yellow-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-amber-600/30 border border-amber-500/40 p-2 flex items-center justify-center shadow-lg shadow-amber-500/20 text-3xl shrink-0">
                🍿
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                    پۆپکورن <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">(Popcorn Import & Partnership)</span>
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5" />
                    هاوردەکردن لە {config.originCountry}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  بەڕێوەبردنی کڕینی {totalCargoTons} تۆن دانەوێڵە، گواستنەوەی بارهەڵگرەکانی ئێران بۆ سلێمانی و حیساباتی هاوبەشی
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
            {/* Cloud Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isCloudSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>{isCloudSyncing ? 'هاوکات دەکرێت...' : 'کڵاود و ئۆفلاین ئامادەیە'}</span>
            </div>

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title="کۆپیکردنی پوختەی پڕۆژە بۆ واتساپ"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              <span>{copiedSummary ? 'کۆپیکرا!' : 'کۆپیکردنی پوختە'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={() => {
                exportPopcornToExcel(data);
                playSound('success');
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title="داگرتنی داتای پۆپکورن بە شێوەی ئێکسڵ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">داگرتنی ئێکسڵ</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title="چاپکردنی ڕاپۆرت"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">چاپکردن</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => {
                setConfigForm(config);
                setIsSettingsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-lg cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>ڕێکخستنی نرخ و پلان</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          1. SHIPMENT SUMMARY & 5 KPI CARDS
          ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              پوختەی دارایی و کڕینی دانەوێڵە (Shipment Financial KPIs)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-numeric">
            نرخی هەر دۆلارێک: {formatNumber(exchangeRate)} د.ع
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Card 1: Purchase Total Cost */}
          <TiltCard glowColor="gold">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">کۆی تێچووی کڕین (ڕووسیا)</p>
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
                {formatIQD(totalBuyingCost * exchangeRate)}
              </span>
            </div>
          </TiltCard>

          {/* Card 2: Expected Selling Revenue */}
          <TiltCard glowColor="amber">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">کۆی داهاتی فرۆش (سلێمانی)</p>
                <h3 className="text-xl font-black text-slate-100 mt-1.5 font-numeric">
                  {formatUSD(expectedTotalRevenue)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>نرخی فرۆشتن: {formatUSD(sellPricePerTon)}/تۆن</span>
              <span className="text-emerald-400 font-semibold font-numeric">
                +{formatUSD(grossTradeProfit)} جیاوازی
              </span>
            </div>
          </TiltCard>

          {/* Card 3: Combined Transport & Local Expenses */}
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

          {/* Card 4: Final Net Profit */}
          <TiltCard glowColor="emerald">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">قازانجی پوختەی گشتی (Net)</p>
                <h3 className={`text-xl font-black mt-1.5 font-numeric ${finalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatUSD(finalNetProfit)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>بە دیناری عێراقی</span>
              <span className="text-emerald-400 font-bold font-numeric">
                {formatIQD(finalNetProfit * exchangeRate)}
              </span>
            </div>
          </TiltCard>

          {/* Card 5: Partner Split 50/50 */}
          <TiltCard glowColor="gold">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">پشکی هاوبەش ({partnerPercent}%)</p>
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 mt-1.5 font-numeric">
                  {formatUSD(partnerProfitShare)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Split className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>پشکی من ({myPercent}%):</span>
              <span className="text-amber-400 font-bold font-numeric">
                {formatUSD(myProfitShare)}
              </span>
            </div>
          </TiltCard>
        </div>
      </div>

      {/* Cargo Logistics Progress Bar */}
      <div className="p-5 rounded-2xl glass-card border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              ڕەوشی بارکردن و گواستنەوەی ٢٠٠ تۆن دانەوێڵە
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            تۆمارکراو لە ڕێگای بارهەڵگرەکان: <strong className="text-amber-300 font-numeric">{totalTonsCarried} تۆن</strong> لە کۆی <strong className="text-white font-numeric">{totalCargoTons} تۆن</strong> (ماوە: <strong className="text-rose-400 font-numeric">{remainingTonsToTransport} تۆن</strong>)
          </p>
        </div>

        <div className="w-full md:w-72 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">پێشکەوتنی گواستنەوە</span>
            <span className="text-amber-400 font-numeric">{transportProgressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-md shadow-amber-500/50"
              style={{ width: `${transportProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ====================================================
          2. TRUCK & TRANSPORT MANAGEMENT TABLE (لقی بارهەڵگرەکان)
          ==================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>لقی بارهەڵگرەکان (Iran to Sulaimani Transport)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-numeric">
                    {trucks.length} بارهەڵگر
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  تۆمارکردن و بەدواداچوونی وردی بارهەڵگرە ئێرانییەکان و بارە گەیشتووەکان بۆ سلێمانی
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAddTruck}
            className="flex items-center gap-2 px-4 py-2 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>زیادکردنی بارهەڵگر (Add Truck)</span>
          </button>
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

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setTruckStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                truckStatusFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هەمووی ({trucks.length})
            </button>
            <button
              onClick={() => setTruckStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                truckStatusFilter === 'delivered'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              گەیشتووە ({trucks.filter((t) => t.status === 'delivered').length})
            </button>
            <button
              onClick={() => setTruckStatusFilter('in_transit')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                truckStatusFilter === 'in_transit'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              لە ڕێگایە ({trucks.filter((t) => t.status === 'in_transit').length})
            </button>
            <button
              onClick={() => setTruckStatusFilter('at_border')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                truckStatusFilter === 'at_border'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              لە مەرز / گومرگ ({trucks.filter((t) => t.status === 'at_border').length})
            </button>
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
                  <th className="py-3.5 px-4 font-semibold">کرێی ترانزێت</th>
                  <th className="py-3.5 px-4 font-semibold">دۆخ</th>
                  <th className="py-3.5 px-4 font-semibold text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrucks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      هیچ بارهەڵگرێک نەدۆزرایەوە بەم مەرجانە!
                    </td>
                  </tr>
                ) : (
                  filteredTrucks.map((truck) => {
                    const statusConfig = {
                      delivered: {
                        label: 'گەیشتووە (Delivered)',
                        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                        icon: CheckCircle2,
                      },
                      in_transit: {
                        label: 'لە ڕێگایە (In Transit)',
                        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                        icon: Clock,
                      },
                      at_border: {
                        label: 'لە گومرگە (At Border)',
                        className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
                        icon: ShieldCheck,
                      },
                    }[truck.status];

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr
                        key={truck.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Plate */}
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

                        {/* Driver */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{truck.driverName}</span>
                          </div>
                          {truck.driverPhone && (
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{truck.driverPhone}</span>
                            </div>
                          )}
                        </td>

                        {/* Tons */}
                        <td className="py-3.5 px-4 font-bold text-amber-300 font-numeric text-sm">
                          {formatNumber(truck.tonsCarried)} تۆن
                        </td>

                        {/* Destination */}
                        <td className="py-3.5 px-4 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{truck.destination}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-400 font-numeric">
                          {truck.dispatchDate}
                        </td>

                        {/* Cost */}
                        <td className="py-3.5 px-4 font-medium text-slate-300 font-numeric">
                          {truck.transitCostUSD > 0 ? formatUSD(truck.transitCostUSD) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.className}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig.label}</span>
                          </span>
                        </td>

                        {/* Actions */}
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
              {/* Summary Footer Row */}
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
                    <td className="py-3 px-4 text-amber-300 font-numeric">
                      {formatUSD(filteredTrucks.reduce((acc, t) => acc + (Number(t.transitCostUSD) || 0), 0))}
                    </td>
                    <td className="py-3 px-4 text-slate-400">—</td>
                    <td className="py-3 px-4 text-center text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ====================================================
          3. EXPENSES & PARTNER ACCOUNTING SECTION
          ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses List & Tab (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  خەرجییەکانی پڕۆژە (Project Expenses)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تۆماری خەرجییەکانی ئێران (گواستنەوە و ترانزێت) و عێراق (گومرگ، داگرتن، عەمبار)
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
                    <th className="py-3 px-4 font-semibold">پۆلێن / بەش</th>
                    <th className="py-3 px-4 font-semibold">بڕ بە دۆلار ($)</th>
                    <th className="py-3 px-4 font-semibold">بەروار</th>
                    <th className="py-3 px-4 font-semibold">دراوە لەلایەن</th>
                    <th className="py-3 px-4 font-semibold text-center">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        هیچ خەرجییەک لەم بەشەدا تۆمار نەکراوە!
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => {
                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
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
                          <td className="py-3 px-4 text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px]">
                              {expense.category}
                            </span>
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
                              {expense.paidBy === 'partner' ? 'شەریک / هاوبەش' : expense.paidBy === 'me' ? 'لەلایەن منەوە' : 'هاوبەش'}
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

        {/* ====================================================
            4. PARTNER PROFIT SHARING & SETTLEMENT CARD (1 Col)
            ==================================================== */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-card border border-amber-500/30 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 shadow-md">
                  <Split className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">حیساباتی شەراکەت</h4>
                  <p className="text-xs text-slate-400">Partner Profit Sharing</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 font-numeric">
                %{partnerPercent} / %{myPercent}
              </span>
            </div>

            {/* Step-by-Step Accounting Waterfall */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">کۆی داهاتی فرۆش (٢٠٠ تۆن):</span>
                <span className="font-bold text-white font-numeric">{formatUSD(expectedTotalRevenue)}</span>
              </div>

              <div className="flex justify-between items-center py-1 text-rose-400">
                <span>- تێچووی کڕین لە ڕووسیا:</span>
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
                <span className="text-emerald-400 font-numeric">{formatUSD(finalNetProfit)}</span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white">{config.partnerName}</div>
                  <div className="text-[11px] text-slate-400 font-numeric">پشکی قازانج (%{partnerPercent})</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-amber-300 font-numeric text-sm">
                    {formatUSD(partnerProfitShare)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-numeric">
                    {formatIQD(partnerProfitShare * exchangeRate)}
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
                    {formatUSD(myProfitShare)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-numeric">
                    {formatIQD(myProfitShare * exchangeRate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Capital / Expenses Contribution Tracking */}
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
                <span className="text-emerald-400 font-numeric">{formatUSD(netDueToPartner)}</span>
              </div>
            </div>

            {/* Quick Share / Settlement Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopySummary}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl btn-gold text-xs font-bold text-slate-950 shadow-md cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSummary ? 'کۆپیکرا بۆ کلیپبۆرد!' : 'کۆپیکردنی پسوولەی شەراکەت'}</span>
              </button>

              <button
                onClick={handleResetToDefaults}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-slate-400 hover:text-rose-400 text-[11px] hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>گەڕاندنەوە بۆ داتای بنەڕەت</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
                    <p className="text-xs text-slate-400">لقی گواستنەوەی ئێران بۆ سلێمانی</p>
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

                {/* Tons & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      بڕی بار بە تۆن <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="نموونە: 25.5"
                      value={truckForm.tonsCarried}
                      onChange={(e) => setTruckForm({ ...truckForm, tonsCarried: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ژمارەی مۆبایلی شۆفێر
                    </label>
                    <input
                      type="text"
                      placeholder="0918... یان 0770..."
                      value={truckForm.driverPhone}
                      onChange={(e) => setTruckForm({ ...truckForm, driverPhone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    شوێنی گەیندن / مەبەست <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: سلێمانی - کۆگای سەرەکی عەلوە"
                    value={truckForm.destination}
                    onChange={(e) => setTruckForm({ ...truckForm, destination: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                {/* Status & Transit Cost */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      دۆخی بار (Status)
                    </label>
                    <select
                      value={truckForm.status}
                      onChange={(e) =>
                        setTruckForm({
                          ...truckForm,
                          status: e.target.value as 'in_transit' | 'at_border' | 'delivered',
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                      <option value="in_transit">لە ڕێگایە (In Transit)</option>
                      <option value="at_border">لە مەرز / گومرگ (At Border)</option>
                      <option value="delivered">گەیشتووە و تەسلیمکراوە (Delivered)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      کرێی گواستنەوە بە دۆلار ($)
                    </label>
                    <input
                      type="number"
                      placeholder="650"
                      value={truckForm.transitCostUSD}
                      onChange={(e) => setTruckForm({ ...truckForm, transitCostUSD: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">بەرواری دەرچوون</label>
                    <input
                      type="date"
                      value={truckForm.dispatchDate}
                      onChange={(e) => setTruckForm({ ...truckForm, dispatchDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">بەرواری گەیشتن (ئەگەر گەیشتبێت)</label>
                    <input
                      type="date"
                      value={truckForm.arrivalDate}
                      onChange={(e) => setTruckForm({ ...truckForm, arrivalDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
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
                    <h3 className="text-base font-bold text-white">
                      {editingExpense ? 'دەستکاریکردنی مەسروف' : 'تۆمارکردنی خەرجی نوێ'}
                    </h3>
                    <p className="text-xs text-slate-400">حیساباتی تێچووی ئێران و عێراق</p>
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
                {/* Region & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      لقی خەرجی (Region) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={expenseForm.region}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, region: e.target.value as 'iran' | 'iraq' })
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                    >
                      <option value="iran">🇮🇷 لقی ئێران (گواستنەوە و ترانزێت)</option>
                      <option value="iraq">🇮🇶 لقی عێراق (گومرگ و ناوخۆ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      پۆلێن / بەش
                    </label>
                    <input
                      type="text"
                      list="categories-list"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      placeholder="کرێی بارهەڵگر، گومرگ، داگرتن..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <datalist id="categories-list">
                      <option value="کرێی بارهەڵگر (Truck Freight)" />
                      <option value="گومرگ و تەخلیس (Border Customs)" />
                      <option value="گومرگی عێراق (Iraq Customs)" />
                      <option value="داگرتن و کرێکار (Labor & Offloading)" />
                      <option value="عەمبار و کۆگا (Storage)" />
                      <option value="پشکنین و تاقیگە (Quality Inspection)" />
                      <option value="شارەوانی و ڕسوومات" />
                    </datalist>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    ناونیشانی مەسروف / خەرجی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: کرێی داگرتنی ٢ بارهەڵگر لە عەلوە"
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
                      placeholder="650"
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
                    <label className="block text-slate-300 font-semibold mb-1">
                      دراوە لەلایەن کێ؟ (Paid By)
                    </label>
                    <select
                      value={expenseForm.paidBy}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, paidBy: e.target.value as 'me' | 'partner' | 'shared' })
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
                    placeholder="ژمارەی پسوولەی فەرمی، ناو و ژمارەی بەردەست..."
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
          MODAL: SHIPMENT CONFIG / SETTINGS
          ==================================================== */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
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
                    <h3 className="text-base font-bold text-white">ڕێکخستنی نرخ، بڕ و شەراکەت</h3>
                    <p className="text-xs text-slate-400">گۆڕینی نرخی کڕین، فرۆشتن و پشکی هاوبەش</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                {/* Total Tons & Buy Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      بڕی بار بە تۆن (Total Tons)
                    </label>
                    <input
                      type="number"
                      required
                      value={configForm.totalTons}
                      onChange={(e) => setConfigForm({ ...configForm, totalTons: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">بنەڕەت: ٢٠٠ تۆن</p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      نرخی کڕینی ١ تۆن بە دۆلار ($)
                    </label>
                    <input
                      type="number"
                      required
                      value={configForm.buyPricePerTonUSD}
                      onChange={(e) => setConfigForm({ ...configForm, buyPricePerTonUSD: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">بنەڕەت: $٢٢٠ (کۆی کڕین: ${totalCargoTons * configForm.buyPricePerTonUSD})</p>
                  </div>
                </div>

                {/* Sell Price & Exchange Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      نرخی پێشبینیکراوی فرۆشتن ($/تۆن)
                    </label>
                    <input
                      type="number"
                      required
                      value={configForm.sellingPricePerTonUSD}
                      onChange={(e) => setConfigForm({ ...configForm, sellingPricePerTonUSD: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">بنەڕەت: $٣٠٢</p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      نرخی دۆلار بە دیناری عێراقی (IQD)
                    </label>
                    <input
                      type="number"
                      required
                      value={configForm.exchangeRateIQD}
                      onChange={(e) => setConfigForm({ ...configForm, exchangeRateIQD: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-numeric focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">نموونە: 1530 دینار بۆ 1 دۆلار</p>
                  </div>
                </div>

                {/* Partner Name & Percent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ناوی هاوبەش / شەریک
                    </label>
                    <input
                      type="text"
                      required
                      value={configForm.partnerName}
                      onChange={(e) => setConfigForm({ ...configForm, partnerName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      ڕێژەی پشکی هاوبەش (%): {configForm.partnerSharePercent}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="99"
                      value={configForm.partnerSharePercent}
                      onChange={(e) => setConfigForm({ ...configForm, partnerSharePercent: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-numeric">
                      <span>پشکی من: {100 - configForm.partnerSharePercent}%</span>
                      <span>پشکی هاوبەش: {configForm.partnerSharePercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Countries / Cities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">وڵاتی کڕین (سەرچاوە)</label>
                    <input
                      type="text"
                      value={configForm.originCountry}
                      onChange={(e) => setConfigForm({ ...configForm, originCountry: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">شوێنی فرۆشتن (مەبەست)</label>
                    <input
                      type="text"
                      value={configForm.destinationCity}
                      onChange={(e) => setConfigForm({ ...configForm, destinationCity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer"
                  >
                    داخستن
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl btn-gold font-bold text-slate-950 shadow-md cursor-pointer"
                  >
                    پاشەکەوتکردنی ڕێکخستنەکان
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          CONFIRM DELETE MODALS
          ==================================================== */}
      {/* Truck Delete Confirm */}
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
                  نەخێر، پەشیمانم
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

      {/* Expense Delete Confirm */}
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
                  نەخێر، پەشیمانم
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
