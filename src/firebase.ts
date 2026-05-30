import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, enableIndexedDbPersistence, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Fallbacks keep unit tests stable in CI where VITE_* can be unset.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDUMMY_KEY_FOR_TESTS_1234567890',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-test-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-test-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:1234567890:web:demo',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
const firestoreEmulatorPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT ?? 8080);
const authEmulatorPort = Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? 9099);
const useStorageEmulator = import.meta.env.VITE_USE_STORAGE_EMULATOR === 'true';
const storageEmulatorPort = Number(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT ?? 9199);

if (useFirebaseEmulators) {
  connectFirestoreEmulator(db, emulatorHost, firestoreEmulatorPort);
  connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`, {
    disableWarnings: true,
  });

  if (useStorageEmulator) {
    connectStorageEmulator(storage, emulatorHost, storageEmulatorPort);
  }
}

// Включити offline persistence для Firestore
if (!useFirebaseEmulators) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.log('The current browser does not support all of the features required to enable persistence');
    }
  });
}
