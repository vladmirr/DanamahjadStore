import {
  PopcornStoreState,
  PopcornTransaction,
  PopcornProjectData,
  PopcornShipmentConfig,
  PopcornTruck,
  PopcornExpense,
} from '../types/popcorn';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const POPCORN_STORAGE_KEY = 'floderm_popcorn_multitrans_v1';

export const DEFAULT_TRANSACTION: PopcornTransaction = {
  id: 'trans-russia-200t',
  name: 'وەجبەی ١: هاوردەی ٢٠٠ تۆن لە ڕووسیا',
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: new Date().toISOString(),
  status: 'active',
  config: {
    id: 'config-russia-200t',
    title: 'وەجبەی ١: هاوردەی ٢٠٠ تۆن لە ڕووسیا',
    originCountry: 'ڕووسیا (Russia)',
    destinationCity: 'سلێمانی، هەرێمی کوردستان (Sulaimani)',
    totalTons: 200, // 200 Tons
    buyPricePerTonUSD: 220, // $220 per ton
    sellingPricePerTonUSD: 302, // $302 per ton
    hasPartner: true, // ئایا شەراکەتی تێدایە
    partnerName: 'هاوبەشی پڕۆژە (Partner)',
    partnerSharePercent: 50, // 50%
    exchangeRateIQD: 1530, // 100$ = 153,000 IQD
    notes: 'کڕینی ٢٠٠ تۆن گەنمەشامی (Popcorn) لە ڕووسیا بە نرخی ٢٢٠ دۆلار بۆ هەر تۆنێک و فرۆشتن بە ٣٠٢ دۆلار لە سلێمانی بە شەراکەت.',
    updatedAt: new Date().toISOString(),
  },
  trucks: [
    {
      id: 'truck-1',
      plateNumber: 'ایران 23 / 789 ب 12',
      tonsCarried: 25.5,
      driverName: 'مەهدی ڕەحمانی',
      driverPhone: '09181234567',
      destination: 'سلێمانی - کۆگای سەرەکی عەلوە',
      status: 'delivered',
      transitCostUSD: 650,
      dispatchDate: '2026-10-25',
      arrivalDate: '2026-10-28',
      notes: 'باری تەواو و دروست گەیشت، کوالیتی بەرز',
    },
    {
      id: 'truck-2',
      plateNumber: 'ایران 45 / 312 ج 88',
      tonsCarried: 26.0,
      driverName: 'حەسەن مۆحەممەدی',
      driverPhone: '09189876543',
      destination: 'سلێمانی - کۆگای سەرەکی عەلوە',
      status: 'delivered',
      transitCostUSD: 650,
      dispatchDate: '2026-10-26',
      arrivalDate: '2026-10-29',
      notes: 'تەسلیم بە عەمبار کرا',
    },
    {
      id: 'truck-3',
      plateNumber: 'ایران 18 / 654 ل 34',
      tonsCarried: 24.8,
      driverName: 'عەلی بەهرامی',
      driverPhone: '09121112233',
      destination: 'سلێمانی - مەخزەنی تەکیە',
      status: 'in_transit',
      transitCostUSD: 650,
      dispatchDate: '2026-11-01',
      notes: 'لە ترانزێتی ئێران بەرەو سنووری باشماخ',
    },
    {
      id: 'truck-4',
      plateNumber: 'ایران 98 / 421 د 55',
      tonsCarried: 25.2,
      driverName: 'فەرهاد کەریمی',
      driverPhone: '09183334455',
      destination: 'سلێمانی - کۆگای سەرەکی عەلوە',
      status: 'at_border',
      transitCostUSD: 650,
      dispatchDate: '2026-11-02',
      notes: 'لە گومرگی پەروێزخان لە دۆخی تەخلیسدایە',
    },
  ],
  expenses: [
    // Iran Side Spending
    {
      id: 'exp-iran-1',
      region: 'iran',
      title: 'کرێی گواستنەوە و بارهەڵگرەکانی ئێران (سەرەتا)',
      category: 'کرێی بارهەڵگر (Truck Freight)',
      amountUSD: 2600,
      amountLocal: 1600000000,
      date: '2026-10-25',
      paidBy: 'me',
      notes: 'پێشەکی کرێی گواستنەوە بۆ شۆفێرەکان بە تمەن',
    },
    {
      id: 'exp-iran-2',
      region: 'iran',
      title: 'ڕسوومات و تەخلیسی مەرزی ئێران (تێچووی ترانزێت)',
      category: 'گومرگ و تەخلیس (Border Customs)',
      amountUSD: 950,
      amountLocal: 580000000,
      date: '2026-10-27',
      paidBy: 'me',
      notes: 'مەسروفی کارەکانی دەرچوونی سنوور و ترانزێت',
    },
    {
      id: 'exp-iran-3',
      region: 'iran',
      title: 'پشکنینی تاقیگەی دانەوێڵە و سەلامەتی خۆراک',
      category: 'پشکنین (Inspection)',
      amountUSD: 350,
      date: '2026-10-26',
      paidBy: 'partner',
      notes: 'پشکنینی شێ و پلەی تەقینەوەی گەنمەشامی',
    },
    // Iraq Side Spending
    {
      id: 'exp-iraq-1',
      region: 'iraq',
      title: 'گومرگ و باجی هاوردەکردنی هەرێم لە مەرزی باشماخ/پەروێزخان',
      category: 'گومرگی عێراق (Iraq Customs)',
      amountUSD: 1800,
      amountLocal: 2754000,
      date: '2026-10-28',
      paidBy: 'me',
      notes: 'پسوولەی فەرمی گومرگی هەرێم',
    },
    {
      id: 'exp-iraq-2',
      region: 'iraq',
      title: 'کرێی کرێکار و داگرتنی بار لە عەلوەی سلێمانی',
      category: 'داگرتن و بارکردن (Labor & Offloading)',
      amountUSD: 480,
      amountLocal: 734400,
      date: '2026-10-29',
      paidBy: 'partner',
      notes: 'بۆ ٢ بارهەڵگری یەکەم کە گەیشتن',
    },
    {
      id: 'exp-iraq-3',
      region: 'iraq',
      title: 'کرێی عەمبارکردن و پاراستن لە کۆگای سلێمانی',
      category: 'عەمبار (Storage)',
      amountUSD: 600,
      amountLocal: 918000,
      date: '2026-10-30',
      paidBy: 'me',
      notes: 'بۆ ماوەی یەک مانگ تا کاتی تەواوی ساغکردنەوە',
    },
    {
      id: 'exp-iraq-4',
      region: 'iraq',
      title: 'پشکنینی تاقیگەی تەندروستی سلێمانی و کۆنتڕۆڵی جۆری',
      category: 'کۆنتڕۆڵی جۆری (Health & Quality Testing)',
      amountUSD: 220,
      amountLocal: 336600,
      date: '2026-10-29',
      paidBy: 'shared',
      notes: 'پشتڕاستکردنەوەی ستانداردی کوالیتی پۆپکورن',
    },
  ],
};

export const DEFAULT_STORE_STATE: PopcornStoreState = {
  activeTransactionId: 'trans-russia-200t',
  transactions: [DEFAULT_TRANSACTION],
  lastSyncedAt: new Date().toISOString(),
};

// Backward-compatible single default
export const DEFAULT_POPCORN_DATA: PopcornProjectData = {
  config: DEFAULT_TRANSACTION.config,
  trucks: DEFAULT_TRANSACTION.trucks,
  expenses: DEFAULT_TRANSACTION.expenses,
  lastSyncedAt: DEFAULT_STORE_STATE.lastSyncedAt,
};

/**
 * Load Multi-Transaction store from localStorage (with auto-migration)
 */
export function loadLocalPopcornStore(): PopcornStoreState {
  try {
    const raw = localStorage.getItem(POPCORN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
        return {
          activeTransactionId: parsed.activeTransactionId || parsed.transactions[0].id,
          transactions: parsed.transactions,
          lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
        };
      }
    }

    // Try migrating from older v2 storage key if present
    const oldRaw = localStorage.getItem('floderm_popcorn_data_v2');
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (oldParsed && oldParsed.config && Array.isArray(oldParsed.trucks)) {
        const migratedTrans: PopcornTransaction = {
          id: oldParsed.config.id || 'trans-russia-200t',
          name: oldParsed.config.title || 'وەجبەی ١: هاوردەی ٢٠٠ تۆن لە ڕووسیا',
          createdAt: new Date().toISOString(),
          updatedAt: oldParsed.config.updatedAt || new Date().toISOString(),
          status: 'active',
          config: {
            ...oldParsed.config,
            hasPartner: oldParsed.config.hasPartner !== undefined ? oldParsed.config.hasPartner : true,
          },
          trucks: oldParsed.trucks || [],
          expenses: oldParsed.expenses || [],
        };
        const migratedState: PopcornStoreState = {
          activeTransactionId: migratedTrans.id,
          transactions: [migratedTrans],
          lastSyncedAt: new Date().toISOString(),
        };
        saveLocalPopcornStore(migratedState);
        return migratedState;
      }
    }
  } catch (err) {
    console.error('Failed to parse local popcorn store:', err);
  }
  return DEFAULT_STORE_STATE;
}

/**
 * Save Multi-Transaction store to localStorage
 */
export function saveLocalPopcornStore(state: PopcornStoreState): void {
  try {
    localStorage.setItem(POPCORN_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save popcorn store to localStorage:', err);
  }
}

/**
 * Sync entire Multi-Transaction store to Cloud Firestore
 */
export async function syncPopcornStoreToCloud(state: PopcornStoreState): Promise<boolean> {
  try {
    const docRef = doc(db, 'popcorn', 'multitrans_shipments');
    await setDoc(
      docRef,
      {
        ...state,
        lastSyncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('Firestore multi-transaction sync skipped (offline or permission):', error);
    return false;
  }
}

/**
 * Real-time listener for Multi-Transaction store
 */
export function subscribeToCloudPopcornStore(
  onData: (state: PopcornStoreState) => void
): () => void {
  try {
    const docRef = doc(db, 'popcorn', 'multitrans_shipments');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as PopcornStoreState;
          if (cloudData && Array.isArray(cloudData.transactions) && cloudData.transactions.length > 0) {
            saveLocalPopcornStore(cloudData);
            onData(cloudData);
          }
        }
      },
      (error) => {
        console.warn('Popcorn Firestore multi-transaction subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up cloud popcorn multi-transaction subscription:', err);
    return () => {};
  }
}

// ----------------------------------------------------
// BACKWARD COMPATIBILITY HELPERS
// ----------------------------------------------------
export function loadLocalPopcornData(): PopcornProjectData {
  const store = loadLocalPopcornStore();
  const active =
    store.transactions.find((t) => t.id === store.activeTransactionId) || store.transactions[0];
  return {
    config: active.config,
    trucks: active.trucks,
    expenses: active.expenses,
    lastSyncedAt: store.lastSyncedAt,
  };
}

export function saveLocalPopcornData(data: PopcornProjectData): void {
  const store = loadLocalPopcornStore();
  const updatedTransactions = store.transactions.map((t) =>
    t.id === store.activeTransactionId
      ? {
          ...t,
          config: data.config,
          trucks: data.trucks,
          expenses: data.expenses,
          updatedAt: new Date().toISOString(),
        }
      : t
  );
  saveLocalPopcornStore({
    ...store,
    transactions: updatedTransactions,
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function syncPopcornDataToCloud(data: PopcornProjectData): Promise<boolean> {
  const store = loadLocalPopcornStore();
  const updatedTransactions = store.transactions.map((t) =>
    t.id === store.activeTransactionId
      ? {
          ...t,
          config: data.config,
          trucks: data.trucks,
          expenses: data.expenses,
          updatedAt: new Date().toISOString(),
        }
      : t
  );
  return syncPopcornStoreToCloud({
    ...store,
    transactions: updatedTransactions,
    lastSyncedAt: new Date().toISOString(),
  });
}

export function subscribeToCloudPopcornData(
  onData: (data: PopcornProjectData) => void
): () => void {
  return subscribeToCloudPopcornStore((store) => {
    const active =
      store.transactions.find((t) => t.id === store.activeTransactionId) || store.transactions[0];
    if (active) {
      onData({
        config: active.config,
        trucks: active.trucks,
        expenses: active.expenses,
        lastSyncedAt: store.lastSyncedAt,
      });
    }
  });
}
