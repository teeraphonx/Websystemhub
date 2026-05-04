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
const ADMIN_ACCESS_CHECK_TIMEOUT_MS = 12_000;

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

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).some(
      ([role, isEnabled]) =>
        ADMIN_ROLE_VALUES.has(normalizeAdminRole(role)) &&
        hasTruthyAdminFlag(isEnabled),
    );
  }

  return ADMIN_ROLE_VALUES.has(normalizeAdminRole(value));
};

const hasTruthyAdminFlag = (value: unknown) =>
  value === true || value === 1 || normalizeAdminRole(value) === 'true';

const hasFalseyAdminFlag = (value: unknown) =>
  value === false || value === 0 || normalizeAdminRole(value) === 'false';

const isActiveAdminRecord = (data: DocumentData) => {
  if (hasFalseyAdminFlag(data.active) || hasTruthyAdminFlag(data.disabled)) {
    return false;
  }

  return (
    hasTruthyAdminFlag(data.active) ||
    hasTruthyAdminFlag(data.admin) ||
    hasTruthyAdminFlag(data.isAdmin) ||
    hasAdminRole(data.role) ||
    hasAdminRole(data.roles)
  );
};

const isFirestorePermissionDeniedError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const errorRecord = error as { code?: unknown; message?: unknown };
  const errorCode =
    typeof errorRecord.code === 'string' ? errorRecord.code.trim() : '';
  const errorMessage =
    typeof errorRecord.message === 'string' ? errorRecord.message.trim() : '';

  return (
    errorCode === 'permission-denied' ||
    errorCode === 'firestore/permission-denied' ||
    errorMessage.includes('Missing or insufficient permissions')
  );
};

const withAdminAccessTimeout = async <T>(promise: Promise<T>) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              'ตรวจสอบสิทธิ์แอดมินใช้เวลานานเกินไป กรุณาตรวจสอบการตั้งค่า Firebase หรือ env ของ host แล้วลองใหม่อีกครั้ง',
            ),
          );
        }, ADMIN_ACCESS_CHECK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
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

  return withAdminAccessTimeout(
    resolveAdminAccess(uid, email, options.forceRefreshToken),
  );
};

const resolveAdminAccess = async (
  uid: string,
  email = '',
  forceRefreshToken = false,
) => {
  if (await hasAdminClaimAccess(uid, forceRefreshToken)) {
    return true;
  }

  const adminDocumentIds = Array.from(
    new Set([uid, normalizeAdminEmail(email)].filter(Boolean)),
  );
  let permissionDeniedError: unknown = null;

  for (const adminDocumentId of adminDocumentIds) {
    try {
      const adminSnapshot = await getDoc(
        doc(getAdminDb(), ADMINS_COLLECTION, adminDocumentId),
      );

      if (adminSnapshot.exists() && isActiveAdminRecord(adminSnapshot.data())) {
        return true;
      }
    } catch (error) {
      if (!isFirestorePermissionDeniedError(error)) {
        throw error;
      }

      permissionDeniedError ??= error;
    }
  }

  if (permissionDeniedError) {
    throw permissionDeniedError;
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
