import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'floderm_firebase_config_v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyC6zc2Eg5wwNb2RKFUszfnvQ5Z8kzaOUyM',
  authDomain: 'mystore-51968.firebaseapp.com',
  projectId: 'mystore-51968',
  storageBucket: 'mystore-51968.firebasestorage.app',
  messagingSenderId: '919200170408',
  appId: '1:919200170408:web:5819fc14502b7fcd489d9d',
};

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

// Parse raw pasted Firebase config (supports JS object, JSON, or text)
export function parseFirebaseConfig(raw: string): FirebaseConfig | null {
  if (!raw || typeof raw !== 'string') return null;

  try {
    // If it's valid JSON
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && parsed.projectId) {
      return {
        apiKey: parsed.apiKey.trim(),
        authDomain: parsed.authDomain?.trim() || `${parsed.projectId}.firebaseapp.com`,
        projectId: parsed.projectId.trim(),
        storageBucket: parsed.storageBucket?.trim() || `${parsed.projectId}.firebasestorage.app`,
        messagingSenderId: parsed.messagingSenderId?.trim() || '',
        appId: parsed.appId?.trim() || '',
      };
    }
  } catch {
    // Fall through to regex extraction
  }

  const extract = (key: string): string => {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`, 'i');
    const match = raw.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extract('apiKey');
  const projectId = extract('projectId');
  const authDomain = extract('authDomain') || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = extract('storageBucket') || (projectId ? `${projectId}.firebasestorage.app` : '');
  const messagingSenderId = extract('messagingSenderId');
  const appId = extract('appId');

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
  }

  return null;
}

// Retrieve saved Firebase config from localStorage or env
export function getSavedFirebaseConfig(): FirebaseConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading saved firebase config:', e);
  }

  // Fallback to Vite env variables if set
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

// Save Firebase config
export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  // Invalidate cached instances to reinitialize
  cachedApp = null;
  cachedDb = null;
}

// Clear Firebase config
export function clearFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  cachedApp = null;
  cachedDb = null;
}

// Initialize and get Firestore
export function getFirebaseDb(overrideConfig?: FirebaseConfig): Firestore | null {
  if (cachedDb && !overrideConfig) {
    return cachedDb;
  }

  const config = overrideConfig || getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    cachedApp = app;
    cachedDb = getFirestore(app);
    return cachedDb;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

// Test Firebase connection
export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testApp = initializeApp(config, 'test-app-' + Date.now());
    const testDb = getFirestore(testApp);

    // Try reading products collection
    const colRef = collection(testDb, 'system_ping');
    await getDocs(colRef);

    return {
      success: true,
      message: 'پەیوەندی بە سەرکەوتوویی لەگەڵ داتابەیسی Firebase بەسترا!',
    };
  } catch (error: any) {
    console.error('Firebase test connection failed:', error);
    let msg = error.message || 'نەتوانرا پەیوەندی ببەسترێت.';
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      msg = 'ڕێپێدان نەدراوە! تکایە لە Firebase Console بڕۆ بەشی Firestore Database > Rules و بیستێتە: allow read, write: if true;';
    } else if (msg.includes('not-found') || msg.includes('Project not found')) {
      msg = 'پڕۆژەکە نەدۆزرایەوە! تکایە دڵنیابەرەوە لە Project ID.';
    }
    return {
      success: false,
      message: msg,
    };
  }
}

// Generic Realtime Collection Subscription
export function subscribeToCloudCollection<T>(
  collectionName: 'inventory' | 'sales' | 'debts' | 'products' | 'payments',
  onData: (items: T[]) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colName = collectionName === 'products' ? 'inventory' : collectionName === 'payments' ? 'debts' : collectionName;
    const colRef = collection(db, colName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as T);
        });
        onData(items);
      },
      (error) => {
        console.warn(`Firestore subscription warning on ${colName}:`, error);
      }
    );
  } catch (error) {
    console.error(`Error subscribing to ${collectionName}:`, error);
    return null;
  }
}

// Save or Update an item in Cloud
export async function saveItemToCloud(
  collectionName: 'inventory' | 'sales' | 'debts' | 'products' | 'payments',
  id: string,
  data: any
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const colName = collectionName === 'products' ? 'inventory' : collectionName === 'payments' ? 'debts' : collectionName;
    const docRef = doc(db, colName, id);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error saving ${collectionName}/${id} to cloud:`, error);
    return false;
  }
}

// Delete an item from Cloud
export async function deleteItemFromCloud(
  collectionName: 'inventory' | 'sales' | 'debts' | 'products' | 'payments',
  id: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const colName = collectionName === 'products' ? 'inventory' : collectionName === 'payments' ? 'debts' : collectionName;
    const docRef = doc(db, colName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting ${collectionName}/${id} from cloud:`, error);
    return false;
  }
}

// Bulk Upload local data to cloud (Initial migration)
export async function bulkUploadToCloud(
  products: any[],
  sales: any[],
  payments: any[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return { success: false, count: 0, error: 'داتابەیسی Firebase پەیوەست نەکراوە.' };
  }

  try {
    const batch = writeBatch(db);
    let count = 0;

    products.forEach((p) => {
      const docRef = doc(db, 'inventory', p.id);
      batch.set(docRef, p);
      count++;
    });

    sales.forEach((s) => {
      const docRef = doc(db, 'sales', s.id);
      batch.set(docRef, s);
      count++;
    });

    payments.forEach((py) => {
      const docRef = doc(db, 'debts', py.id);
      batch.set(docRef, py);
      count++;
    });

    await batch.commit();
    return { success: true, count };
  } catch (error: any) {
    console.error('Error in bulk upload:', error);
    return { success: false, count: 0, error: error.message || 'هەڵە لە بارکردنی داتاکان' };
  }
}
