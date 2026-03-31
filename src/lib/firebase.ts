import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBFCcOdy9yvvjmbw-fDP3IBz2mhzJp5JeA',
  authDomain: 'signinandsignupweb.firebaseapp.com',
  projectId: 'signinandsignupweb',
  storageBucket: 'signinandsignupweb.firebasestorage.app',
  messagingSenderId: '568031792138',
  appId: '1:568031792138:web:7174732247f81d92d4e3f3',
  measurementId: 'G-LG3C5VMZHQ',
};

export interface UserProfileRecord {
  uid: string;
  username: string;
  normalizedUsername: string;
  email: string;
  createdAt: number;
}

const USERNAME_TAKEN_MESSAGE = 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว';
const USERNAME_NOT_FOUND_MESSAGE = 'ไม่พบชื่อผู้ใช้นี้ในระบบ';
const PROFILES_COLLECTION = 'profiles';
const USERNAMES_COLLECTION = 'usernames';

const defaultFirebaseApp = getApps().find((app) => app.name === '[DEFAULT]');
const firebaseApp = defaultFirebaseApp ?? initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const getFirebaseConfigErrorMessage = () =>
  'Firebase Auth ยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่าโปรเจกต์อีกครั้ง';

export const getFirebaseAuth = () => auth;

export const setFirebaseAuthPersistence = async (rememberMe: boolean) => {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
};

export const normalizeUsername = (value: string) => value.trim().toLowerCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const looksLikeEmail = (value: string) => value.includes('@');

const buildUserProfileRecord = (
  uid: string,
  primaryData: Partial<UserProfileRecord> | null,
  fallbackData: Partial<UserProfileRecord> | null = null,
  fallbackEmail = '',
): UserProfileRecord => {
  const email = normalizeEmail(
    primaryData?.email ?? fallbackData?.email ?? fallbackEmail,
  );
  const username =
    fallbackData?.username?.trim() ||
    primaryData?.username?.trim() ||
    email.split('@')[0] ||
    '';

  return {
    uid: primaryData?.uid ?? fallbackData?.uid ?? uid,
    username,
    normalizedUsername:
      fallbackData?.normalizedUsername ??
      primaryData?.normalizedUsername ??
      normalizeUsername(username),
    email,
    createdAt: primaryData?.createdAt ?? fallbackData?.createdAt ?? 0,
  };
};

const findUserProfileByEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      collection(db, USERNAMES_COLLECTION),
      where('email', '==', normalizedEmail),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Partial<UserProfileRecord>;
};

export const resolveEmailForAuth = async (identifier: string) => {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    throw new Error('กรุณากรอกชื่อผู้ใช้หรืออีเมล');
  }

  if (looksLikeEmail(trimmedIdentifier)) {
    return trimmedIdentifier;
  }

  const usernameSnapshot = await getDoc(
    doc(db, USERNAMES_COLLECTION, normalizeUsername(trimmedIdentifier)),
  );

  if (!usernameSnapshot.exists()) {
    throw new Error(USERNAME_NOT_FOUND_MESSAGE);
  }

  const data = usernameSnapshot.data() as Partial<UserProfileRecord>;

  if (!data.email) {
    throw new Error('ไม่พบอีเมลของบัญชีนี้');
  }

  return data.email;
};

export const createUserProfile = async ({
  uid,
  username,
  email,
}: Pick<UserProfileRecord, 'uid' | 'username' | 'email'>) => {
  const cleanUsername = username.trim();
  const normalizedUsername = normalizeUsername(cleanUsername);
  const cleanEmail = normalizeEmail(email);

  await runTransaction(db, async (transaction) => {
    const usernameRef = doc(db, USERNAMES_COLLECTION, normalizedUsername);
    const profileRef = doc(db, PROFILES_COLLECTION, uid);
    const existingUsername = await transaction.get(usernameRef);

    if (existingUsername.exists()) {
      throw new Error(USERNAME_TAKEN_MESSAGE);
    }

    const profileRecord: UserProfileRecord = {
      uid,
      username: cleanUsername,
      normalizedUsername,
      email: cleanEmail,
      createdAt: Date.now(),
    };

    transaction.set(usernameRef, profileRecord);
    transaction.set(profileRef, profileRecord);
  });
};

export const getUserProfile = async (uid: string, fallbackEmail = '') => {
  const profileSnapshot = await getDoc(doc(db, PROFILES_COLLECTION, uid));
  const profileData = profileSnapshot.exists()
    ? (profileSnapshot.data() as Partial<UserProfileRecord>)
    : null;

  const fallbackProfileData = await findUserProfileByEmail(
    profileData?.email ?? fallbackEmail,
  );

  if (!profileData && !fallbackProfileData) {
    return null;
  }

  return buildUserProfileRecord(
    uid,
    profileData,
    fallbackProfileData,
    fallbackEmail,
  );
};

