import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC6zc2Eg5wwNb2RKFUszfnvQ5Z8kzaOUyM",
  authDomain: "mystore-51968.firebaseapp.com",
  projectId: "mystore-51968",
  storageBucket: "mystore-51968.firebasestorage.app",
  messagingSenderId: "919200170408",
  appId: "1:919200170408:web:5819fc14502b7fcd489d9d",
};

async function test() {
  console.log('Connecting to Firebase with project:', firebaseConfig.projectId);
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('Testing Firestore read...');
    const snapshot = await getDocs(collection(db, 'system_test'));
    console.log('SUCCESS! Read docs count:', snapshot.size);

    console.log('Testing Firestore write...');
    await setDoc(doc(db, 'system_test', 'ping'), {
      status: 'connected',
      timestamp: new Date().toISOString()
    });
    console.log('SUCCESS! Wrote test document to Firestore!');
  } catch (error) {
    console.error('FIREBASE_ERROR:', error.message);
  }
}

test();
