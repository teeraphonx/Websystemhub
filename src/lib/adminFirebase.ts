import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';

const ADMIN_APP_NAME = 'systemhub-admin-auth';

const adminFirebaseFallbackConfig = {
  apiKey: 'AIzaSyBQZU_Z2iDoJQh3lC_7JtEZtRtZnS4g9oI',
  authDomain: 'adminloginweb.firebaseapp.com',
  projectId: 'adminloginweb',
  storageBucket: 'adminloginweb.firebasestorage.app',
  messagingSenderId: '406257828201',
  appId: '1:406257828201:web:5f000fde566138e9567df8',
  measurementId: 'G-S6ZGKFB95S',
};

const resolveAdminFirebaseValue = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

const adminFirebaseConfig = {
  apiKey: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_API_KEY,
    adminFirebaseFallbackConfig.apiKey,
  ),
  authDomain: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_AUTH_DOMAIN,
    adminFirebaseFallbackConfig.authDomain,
  ),
  projectId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_PROJECT_ID,
    adminFirebaseFallbackConfig.projectId,
  ),
  storageBucket: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_STORAGE_BUCKET,
    adminFirebaseFallbackConfig.storageBucket,
  ),
  messagingSenderId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_MESSAGING_SENDER_ID,
    adminFirebaseFallbackConfig.messagingSenderId,
  ),
  appId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_APP_ID,
    adminFirebaseFallbackConfig.appId,
  ),
  measurementId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_MEASUREMENT_ID,
    adminFirebaseFallbackConfig.measurementId,
  ),
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
