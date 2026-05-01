import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase';

const ADMIN_APP_NAME = 'systemhub-admin-auth';
const ADMINS_COLLECTION = 'admins';
const ADMIN_ROLE_VALUES = new Set(['admin', 'administrator', 'superadmin']);

const resolveAdminFirebaseValue = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

const adminFirebaseConfig = {
  apiKey: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_API_KEY,
    firebaseConfig.apiKey,
  ),
  authDomain: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_AUTH_DOMAIN,
    firebaseConfig.authDomain,
  ),
  projectId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_PROJECT_ID,
    firebaseConfig.projectId,
  ),
  storageBucket: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_STORAGE_BUCKET,
    firebaseConfig.storageBucket,
  ),
  messagingSenderId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_MESSAGING_SENDER_ID,
    firebaseConfig.messagingSenderId,
  ),
  appId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_APP_ID,
    firebaseConfig.appId,
  ),
  measurementId: resolveAdminFirebaseValue(
    import.meta.env.VITE_ADMIN_FIREBASE_MEASUREMENT_ID,
    firebaseConfig.measurementId,
  ),
};

const normalizeAdminEmail = (value: string) => value.trim().toLowerCase();
const normalizeAdminUid = (value: string) => value.trim();

const allowedAdminEmails = new Set(
  (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
    .split(/[,\s;]+/)
    .map(normalizeAdminEmail)
    .filter(Boolean),
);

const allowedAdminUids = new Set(
  (import.meta.env.VITE_ADMIN_ALLOWED_UIDS ?? '')
    .split(/[,\s;]+/)
    .map(normalizeAdminUid)
    .filter(Boolean),
);

const hasAllowedAdminEmail = (email: string | null | undefined) =>
  Boolean(email && allowedAdminEmails.has(normalizeAdminEmail(email)));

const hasAllowedAdminUid = (uid: string | null | undefined) =>
  Boolean(uid && allowedAdminUids.has(normalizeAdminUid(uid)));

const normalizeAdminRole = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const hasAdminRole = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.some(hasAdminRole);
  }

  return ADMIN_ROLE_VALUES.has(normalizeAdminRole(value));
};

const hasTruthyAdminFlag = (value: unknown) =>
  value === true || normalizeAdminRole(value) === 'true';

const isActiveAdminRecord = (data: DocumentData) => {
  if (data.active === false || data.disabled === true) {
    return false;
  }

  return (
    data.active === true ||
    hasTruthyAdminFlag(data.admin) ||
    hasTruthyAdminFlag(data.isAdmin) ||
    hasAdminRole(data.role) ||
    hasAdminRole(data.roles)
  );
};

const getCurrentAdminUserByUid = (uid: string) => {
  const currentUser = getAdminAuth().currentUser;

  return currentUser?.uid === uid ? currentUser : null;
};

const hasAdminClaimAccess = async (uid: string, forceRefreshToken = false) => {
  const currentUser = getCurrentAdminUserByUid(uid);

  if (!currentUser) {
    return false;
  }

  const tokenResult = await currentUser.getIdTokenResult(forceRefreshToken);

  return isActiveAdminRecord(tokenResult.claims);
};

let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

export const getOrCreateAdminApp = () => {
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

const getAdminDb = () => {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  adminDbInstance = getFirestore(getOrCreateAdminApp());
  return adminDbInstance;
};

export const setAdminFirebaseAuthPersistence = async (rememberMe: boolean) => {
  await setPersistence(
    getAdminAuth(),
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
};

export const hasAdminAccess = async (
  uid: string,
  email = '',
  options: { forceRefreshToken?: boolean } = {},
) => {
  if (hasAllowedAdminUid(uid) || hasAllowedAdminEmail(email)) {
    return true;
  }

  if (await hasAdminClaimAccess(uid, options.forceRefreshToken)) {
    return true;
  }

  const adminDocumentIds = Array.from(
    new Set([uid, normalizeAdminEmail(email)].filter(Boolean)),
  );

  for (const adminDocumentId of adminDocumentIds) {
    const adminSnapshot = await getDoc(
      doc(getAdminDb(), ADMINS_COLLECTION, adminDocumentId),
    );

    if (adminSnapshot.exists() && isActiveAdminRecord(adminSnapshot.data())) {
      return true;
    }
  }

  return false;
};

export const getAdminAuthToken = async (forceRefresh = false) => {
  if (!isAdminFirebaseConfigured()) {
    return null;
  }

  const currentUser = getAdminAuth().currentUser;

  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken(forceRefresh);
};
