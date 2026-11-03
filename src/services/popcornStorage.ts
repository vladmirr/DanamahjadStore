import { PopcornProjectData, PopcornShipmentConfig, PopcornTruck, PopcornExpense } from '../types/popcorn';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const POPCORN_STORAGE_KEY = 'floderm_popcorn_data_v2';

export const DEFAULT_POPCORN_DATA: PopcornProjectData = {
  config: {
    id: 'shipment-russia-200t',
    title: 'پڕۆژەی هاوردەکردنی پۆپکورن (ڕووسیا - سلێمانی)',
    originCountry: 'ڕووسیا (Russia)',
    destinationCity: 'سلێمانی، هەرێمی کوردستان (Sulaimani)',
    totalTons: 200, // 200 Tons
    buyPricePerTonUSD: 220, // $220 per ton
    sellingPricePerTonUSD: 302, // $302 per ton
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
  lastSyncedAt: new Date().toISOString(),
};

/**
 * Load initial data from localStorage if available, or fall back to default specs
 */
export function loadLocalPopcornData(): PopcornProjectData {
  try {
    const raw = localStorage.getItem(POPCORN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.config && Array.isArray(parsed.trucks) && Array.isArray(parsed.expenses)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse local popcorn data:', err);
  }
  return DEFAULT_POPCORN_DATA;
}

/**
 * Save data to localStorage
 */
export function saveLocalPopcornData(data: PopcornProjectData): void {
  try {
    localStorage.setItem(POPCORN_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save popcorn data to localStorage:', err);
  }
}

/**
 * Sync Popcorn data to Firestore document 'popcorn/main_shipment'
 */
export async function syncPopcornDataToCloud(data: PopcornProjectData): Promise<boolean> {
  try {
    const docRef = doc(db, 'popcorn', 'main_shipment');
    await setDoc(docRef, {
      ...data,
      lastSyncedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore popcorn sync skipped (offline or permission):', error);
    return false;
  }
}

/**
 * Subscribe to Firestore real-time updates for Popcorn data
 */
export function subscribeToCloudPopcornData(
  onData: (data: PopcornProjectData) => void
): () => void {
  try {
    const docRef = doc(db, 'popcorn', 'main_shipment');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as PopcornProjectData;
          if (cloudData && cloudData.config && Array.isArray(cloudData.trucks)) {
            saveLocalPopcornData(cloudData);
            onData(cloudData);
          }
        }
      },
      (error) => {
        console.warn('Popcorn Firestore subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up cloud popcorn subscription:', err);
    return () => {};
  }
}

