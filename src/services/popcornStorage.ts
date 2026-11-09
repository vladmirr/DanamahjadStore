import {
  PopcornStoreState,
  PopcornTransaction,
  PopcornProjectData,
  PopcornShipmentConfig,
  PopcornTruck,
  PopcornExpense,
} from '../types/popcorn';
import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

export const POPCORN_STORAGE_KEY = 'floderm_popcorn_multitrans_v1';
export const POPCORN_DELETED_KEY = 'floderm_popcorn_deleted_ids_v1';

/**
 * Retrieve the set of locally tombstoned / deleted transaction IDs
 */
export function getDeletedTransactionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(POPCORN_DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    console.error('Failed to parse deleted transaction IDs:', e);
  }
  return new Set();
}

/**
 * Mark a transaction ID as permanently deleted so it cannot be resurrected
 */
export function recordDeletedTransactionId(id: string): void {
  try {
    const deleted = getDeletedTransactionIds();
    deleted.add(id);
    localStorage.setItem(POPCORN_DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.error('Failed to record deleted transaction ID:', e);
  }
}

/**
 * Unmark an ID from the deleted set (e.g. if newly created with same ID)
 */
export function unmarkDeletedTransactionId(id: string): void {
  try {
    const deleted = getDeletedTransactionIds();
    if (deleted.has(id)) {
      deleted.delete(id);
      localStorage.setItem(POPCORN_DELETED_KEY, JSON.stringify(Array.from(deleted)));
    }
  } catch (e) {
    console.error('Failed to unmark deleted transaction ID:', e);
  }
}

export function sanitizeTransaction(trans: PopcornTransaction): PopcornTransaction {
  const cleanStr = (s?: string) =>
    s
      ? s
          .replace(/لە ڕووسیا/g, '')
          .replace(/لە روسیا/g, '')
          .replace(/ڕووسیا \(Russia\)/gi, '')
          .replace(/روسیا \(Russia\)/gi, '')
          .replace(/ڕووسیا/g, '')
          .replace(/روسیا/g, '')
          .replace(/\(Russia\)/gi, '')
          .replace(/Russia/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';

  return {
    ...trans,
    name: cleanStr(trans.name) || 'وەجبەی هاوردەکراو',
    config: {
      ...trans.config,
      title: cleanStr(trans.config?.title) || cleanStr(trans.name) || 'وەجبەی هاوردەکراو',
      originCountry: cleanStr(trans.config?.originCountry),
      notes: cleanStr(trans.config?.notes),
    },
  };
}

export const DEFAULT_TRANSACTION: PopcornTransaction = {
  id: 'trans-default-200t',
  name: 'وەجبەی ١: هاوردەی ٢٠٠ تۆن',
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: new Date().toISOString(),
  status: 'active',
  config: {
    id: 'config-default-200t',
    title: 'وەجبەی ١: هاوردەی ٢٠٠ تۆن',
    originCountry: '',
    destinationCity: 'سلێمانی، هەرێمی کوردستان',
    totalTons: 200, // 200 Tons
    buyPricePerTonUSD: 220, // $220 per ton
    sellingPricePerTonUSD: 302, // $302 per ton
    hasPartner: true, // ئایا شەراکەتی تێدایە
    partnerName: 'هاوبەشی پڕۆژە (Partner)',
    partnerSharePercent: 50, // 50%
    exchangeRateIQD: 1530, // 100$ = 153,000 IQD
    notes: 'کڕینی ٢٠٠ تۆن گەنمەشامی بە نرخی ٢٢٠ دۆلار بۆ هەر تۆنێک و فرۆشتن بە ٣٠٢ دۆلار لە سلێمانی بە شەراکەت.',
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
      notes: 'پشتڕاستکردنەوەی ستانداردی کوالیتی کاڵا',
    },
  ],
};

export const DEFAULT_STORE_STATE: PopcornStoreState = {
  activeTransactionId: 'trans-default-200t',
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
    const deletedIds = getDeletedTransactionIds();
    const raw = localStorage.getItem(POPCORN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
        const remaining: PopcornTransaction[] = parsed.transactions.filter(
          (t: any) => t && t.id && !deletedIds.has(t.id)
        );
        if (remaining.length > 0) {
          const sanitized: PopcornTransaction[] = remaining.map(sanitizeTransaction);
          const activeValid = sanitized.some((t: PopcornTransaction) => t.id === parsed.activeTransactionId);
          const state: PopcornStoreState = {
            activeTransactionId: activeValid ? parsed.activeTransactionId : sanitized[0].id,
            transactions: sanitized,
            lastSyncedAt: parsed.lastSyncedAt || new Date().toISOString(),
          };
          saveLocalPopcornStore(state);
          return state;
        }
      }
    }

    // Try migrating from older v2 storage key if present
    const oldRaw = localStorage.getItem('floderm_popcorn_data_v2');
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (oldParsed && oldParsed.config && Array.isArray(oldParsed.trucks)) {
        const migratedTrans: PopcornTransaction = sanitizeTransaction({
          id: oldParsed.config.id || 'trans-default-200t',
          name: oldParsed.config.title || 'وەجبەی ١: هاوردەی ٢٠٠ تۆن',
          createdAt: new Date().toISOString(),
          updatedAt: oldParsed.config.updatedAt || new Date().toISOString(),
          status: 'active',
          config: {
            ...oldParsed.config,
            hasPartner: oldParsed.config.hasPartner !== undefined ? oldParsed.config.hasPartner : true,
          },
          trucks: oldParsed.trucks || [],
          expenses: oldParsed.expenses || [],
        });
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
 * Recursively remove undefined values so Firestore never throws
 */
export function stripUndefined<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (val === undefined ? null : val))
  );
}

/**
 * Save / Create an individual transaction directly to Cloud Firestore collection "transactions"
 * Zero localStorage fallback - writes directly to Firestore
 */
export async function saveTransactionToCloud(trans: PopcornTransaction): Promise<void> {
  const clean = stripUndefined(sanitizeTransaction(trans));
  const docRef = doc(db, 'transactions', clean.id);
  await setDoc(docRef, clean, { merge: true });

  // Update localStorage as offline read cache only
  try {
    const rawStore = loadLocalPopcornStore();
    const exists = rawStore.transactions.some((t) => t.id === clean.id);
    const updated = exists
      ? rawStore.transactions.map((t) => (t.id === clean.id ? clean : t))
      : [clean, ...rawStore.transactions];
    saveLocalPopcornStore({ ...rawStore, transactions: updated });
  } catch {}
}

/**
 * Delete an individual transaction directly from Cloud Firestore collection "transactions"
 */
export async function deleteTransactionFromCloud(id: string): Promise<void> {
  recordDeletedTransactionId(id);
  const docRef = doc(db, 'transactions', id);
  await deleteDoc(docRef);

  // Update localStorage cache
  try {
    const rawStore = loadLocalPopcornStore();
    const remaining = rawStore.transactions.filter((t) => t.id !== id);
    saveLocalPopcornStore({ ...rawStore, transactions: remaining });
  } catch {}
}

/**
 * Real-time listener for the Firestore "transactions" collection
 * Replaces one-time getDocs() with real-time multi-device onSnapshot()
 */
export function subscribeToCloudTransactions(
  onData: (transactions: PopcornTransaction[]) => void,
  onError?: (error: Error) => void,
  onStatusChange?: (status: PopcornDbStatus) => void
): () => void {
  try {
    const colRef = collection(db, 'transactions');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const deletedIds = getDeletedTransactionIds();
        const list: PopcornTransaction[] = [];
        snapshot.forEach((docSnap) => {
          if (!deletedIds.has(docSnap.id)) {
            const raw = docSnap.data();
            list.push(sanitizeTransaction({ ...raw, id: docSnap.id } as PopcornTransaction));
          }
        });

        // Sort descending by createdAt so latest added deals always render at the top across all connected screens
        list.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        if (onStatusChange) {
          onStatusChange({
            connected: true,
            latencyMs: 0,
            lastSyncedAt: new Date().toISOString(),
            transactionCount: list.length,
            fromCache: snapshot.metadata.fromCache,
          });
        }

        // Cache locally for offline read access only
        if (list.length > 0) {
          try {
            const current = loadLocalPopcornStore();
            saveLocalPopcornStore({
              ...current,
              transactions: list,
              lastSyncedAt: new Date().toISOString(),
            });
          } catch {}
        }

        onData(list);
      },
      (error) => {
        console.error('Firestore real-time subscription error on transactions:', error);
        if (onError) onError(error);
        if (onStatusChange) {
          onStatusChange({
            connected: false,
            latencyMs: 0,
            lastSyncedAt: '',
            transactionCount: 0,
            fromCache: true,
            error: error.message,
          });
        }
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to initialize Firestore listener on transactions:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Sync entire Multi-Transaction store to Cloud Firestore
 */
export async function syncPopcornStoreToCloud(state: PopcornStoreState): Promise<boolean> {
  try {
    const deletedIds = getDeletedTransactionIds();
    const cleanTransactions = (state.transactions || [])
      .filter((t) => t && t.id && !deletedIds.has(t.id));

    // Write all transactions individually to the transactions collection for multi-device sync
    await Promise.all(
      cleanTransactions.map((t) => saveTransactionToCloud(t).catch(() => {}))
    );

    const cleanState = stripUndefined({
      activeTransactionId: state.activeTransactionId || '',
      transactions: cleanTransactions,
      lastSyncedAt: new Date().toISOString(),
    });

    const docRef = doc(db, 'popcorn', 'multitrans_shipments');
    await setDoc(docRef, cleanState);
    return true;
  } catch (error) {
    console.error('Firestore multi-transaction sync error:', error);
    return false;
  }
}

/**
 * Permanently delete a transaction from local state and Cloud Firestore
 */
export async function deleteTransactionFromStore(
  id: string,
  currentStore: PopcornStoreState
): Promise<PopcornStoreState | null> {
  if (currentStore.transactions.length <= 1) {
    return null;
  }

  // 1. Mark ID in tombstone set so incoming Firestore snapshots never resurrect it
  recordDeletedTransactionId(id);

  // 2. Delete from individual Firestore collection document
  await deleteTransactionFromCloud(id).catch(() => {});

  // 3. Filter out deleted transaction
  const remaining = currentStore.transactions.filter((t) => t.id !== id);
  const nextActiveId =
    currentStore.activeTransactionId === id
      ? remaining[0]?.id || ''
      : currentStore.activeTransactionId;

  const updatedStore: PopcornStoreState = {
    activeTransactionId: nextActiveId,
    transactions: remaining,
    lastSyncedAt: new Date().toISOString(),
  };

  // 4. Immediately save clean store locally
  saveLocalPopcornStore(updatedStore);

  // 5. Overwrite legacy cloud document with clean remaining transactions
  await syncPopcornStoreToCloud(updatedStore);

  return updatedStore;
}

/**
 * Database connectivity information
 */
export interface PopcornDbStatus {
  connected: boolean;
  latencyMs: number;
  lastSyncedAt: string;
  transactionCount: number;
  fromCache: boolean;
  error?: string;
}

/**
 * Perform a live ping / test read directly against Cloud Firestore collection "transactions"
 */
export async function testPopcornDatabaseConnection(): Promise<PopcornDbStatus> {
  const startTime = performance.now();
  try {
    const colRef = collection(db, 'transactions');
    const snap = await getDocs(colRef);
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      connected: true,
      latencyMs,
      lastSyncedAt: new Date().toISOString(),
      transactionCount: snap.size,
      fromCache: snap.metadata?.fromCache ?? false,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      connected: false,
      latencyMs,
      lastSyncedAt: '',
      transactionCount: 0,
      fromCache: true,
      error: err?.message || 'نەتوانرا پەیوەندی بە داتابەیسەوە ببەسترێت',
    };
  }
}

/**
 * Asynchronously fetch all active transactions from Cloud Firestore
 * with fallback to local store
 */
export async function fetchAllCloudTransactions(): Promise<PopcornTransaction[]> {
  try {
    const colRef = collection(db, 'transactions');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const deletedIds = getDeletedTransactionIds();
      const list: PopcornTransaction[] = [];
      snap.forEach((docSnap) => {
        if (!deletedIds.has(docSnap.id)) {
          const raw = docSnap.data();
          list.push(sanitizeTransaction({ ...raw, id: docSnap.id } as PopcornTransaction));
        }
      });
      if (list.length > 0) {
        list.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        // Cache to local store
        try {
          const current = loadLocalPopcornStore();
          saveLocalPopcornStore({
            ...current,
            transactions: list,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch {}
        return list;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch transactions from cloud:', err);
  }
  const local = loadLocalPopcornStore();
  return local.transactions && local.transactions.length > 0 ? local.transactions : [DEFAULT_TRANSACTION];
}

/**
 * Real-time listener for Multi-Transaction store
 */
export function subscribeToCloudPopcornStore(
  onData: (state: PopcornStoreState) => void,
  onStatusChange?: (status: {
    connected: boolean;
    fromCache: boolean;
    lastSyncedAt: string;
    error?: string;
  }) => void
): () => void {
  try {
    const docRef = doc(db, 'popcorn', 'multitrans_shipments');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (onStatusChange) {
          onStatusChange({
            connected: true,
            fromCache: docSnap.metadata.fromCache ?? false,
            lastSyncedAt: new Date().toISOString(),
          });
        }
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as PopcornStoreState;
          if (cloudData && Array.isArray(cloudData.transactions)) {
            const deletedIds = getDeletedTransactionIds();

            // Filter out tombstoned deleted transactions
            const validCloudTransactions = cloudData.transactions
              .filter((t: any) => t && t.id && !deletedIds.has(t.id))
              .map(sanitizeTransaction);

            if (validCloudTransactions.length === 0) {
              return;
            }

            const cloudIds = new Set(validCloudTransactions.map((t) => t.id));

            // Preserve local transactions not yet reflected in cloud, ignoring deleted
            let localTransactions: PopcornTransaction[] = [];
            try {
              const rawLocal = localStorage.getItem(POPCORN_STORAGE_KEY);
              if (rawLocal) {
                const parsedLocal = JSON.parse(rawLocal);
                if (Array.isArray(parsedLocal.transactions)) {
                  localTransactions = parsedLocal.transactions
                    .filter((lt: any) => lt && lt.id && !deletedIds.has(lt.id))
                    .map(sanitizeTransaction);
                }
              }
            } catch {}

            const unSyncedLocal = localTransactions.filter((lt) => !cloudIds.has(lt.id));
            const mergedTransactions = [...unSyncedLocal, ...validCloudTransactions];

            const activeValid = mergedTransactions.some((t: PopcornTransaction) => t.id === cloudData.activeTransactionId);
            const mergedStore: PopcornStoreState = {
              activeTransactionId: activeValid ? cloudData.activeTransactionId : mergedTransactions[0]?.id || '',
              transactions: mergedTransactions,
              lastSyncedAt: new Date().toISOString(),
            };

            saveLocalPopcornStore(mergedStore);
            onData(mergedStore);

            // If cloud still has tombstoned/deleted transactions or we have unsynced local ones, purge cloud!
            const cloudHadDeleted = cloudData.transactions.length !== validCloudTransactions.length;
            if (cloudHadDeleted || unSyncedLocal.length > 0) {
              syncPopcornStoreToCloud(mergedStore).catch(() => {});
            }
          }
        }
      },
      (error) => {
        console.warn('Popcorn Firestore multi-transaction subscription warning:', error);
        if (onStatusChange) {
          onStatusChange({
            connected: false,
            fromCache: true,
            lastSyncedAt: '',
            error: error.message,
          });
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up cloud popcorn multi-transaction subscription:', err);
    if (onStatusChange) {
      onStatusChange({
        connected: false,
        fromCache: true,
        lastSyncedAt: '',
        error: String(err),
      });
    }
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
