import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

// Direct Firebase configuration (works on all devices and builds without env vars)
export const firebaseConfig = {
  apiKey: "AIzaSyC6zc2Eg5wwNb2RKFUszfnvQ5Z8kzaOUyM",
  authDomain: "mystore-51968.firebaseapp.com",
  projectId: "mystore-51968",
  storageBucket: "mystore-51968.firebasestorage.app",
  messagingSenderId: "919200170408",
  appId: "1:919200170408:web:5819fc14502b7fcd489d9d",
  measurementId: "G-0B8566TBCX"
};

// Initialize Firebase App & export Cloud Firestore instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection References
export const COLLECTIONS = {
  INVENTORY: 'inventory',
  SALES: 'sales',
  DEBTS: 'debts',
} as const;

export {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
};
