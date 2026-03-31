import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';

const ADMIN_APP_NAME = 'systemhub-admin-auth';

const adminFirebaseConfig = {
  apiKey: import.meta.env.VITE_ADMIN_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_ADMIN_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_ADMIN_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_ADMIN_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_ADMIN_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_ADMIN_FIREBASE_APP_ID ?? '',
  measurementId: import.meta.env.VITE_ADMIN_FIREBASE_MEASUREMENT_ID ?? '',
};

let adminAuthInstance: Auth | null = null;

const getOrCreateAdminApp = () => {
  const existingApp = getApps().find((app) => app.name === ADMIN_APP_NAME);

  if (existingApp) {
    return existingApp;
  }

  return initializeApp(adminFirebaseConfig, ADMIN_APP_NAME);
};

export const isAdminFirebaseConfigured = () =>
  Boolean(
    adminFirebaseConfig.apiKey &&
      adminFirebaseConfig.authDomain &&
      adminFirebaseConfig.projectId &&
      adminFirebaseConfig.storageBucket &&
      adminFirebaseConfig.messagingSenderId &&
      adminFirebaseConfig.appId,
  );

export const getAdminAuth = () => {
  if (!isAdminFirebaseConfigured()) {
    throw new Error('Admin Firebase config is missing');
  }

  if (adminAuthInstance) {
    return adminAuthInstance;
  }

  adminAuthInstance = getAuth(getOrCreateAdminApp());
  return adminAuthInstance;
};

export const setAdminFirebaseAuthPersistence = async (rememberMe: boolean) => {
  await setPersistence(
    getAdminAuth(),
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
};
