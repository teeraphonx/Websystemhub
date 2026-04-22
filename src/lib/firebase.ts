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
  officerId: string;
  fullName: string;
  organizationUnit: string;
  organizationStatus: 'verified' | 'pending' | 'rejected';
  organizationVerifiedAt: number;
  createdAt: number;
}

type OrganizationStatus = UserProfileRecord['organizationStatus'];

interface OrganizationMemberRecord {
  email?: string;
  officerId?: string;
  fullName?: string;
  unit?: string;
  department?: string;
  active?: boolean;
}

const USERNAME_TAKEN_MESSAGE = 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว';
const USERNAME_NOT_FOUND_MESSAGE = 'ไม่พบชื่อผู้ใช้นี้ในระบบ';
const ORGANIZATION_MEMBER_NOT_FOUND_MESSAGE =
  'ไม่พบข้อมูลเจ้าหน้าที่นี้ในรายชื่อ บก.สอท.1';
const ORGANIZATION_MEMBER_INACTIVE_MESSAGE =
  'บัญชีเจ้าหน้าที่นี้ยังไม่ได้รับอนุญาตให้ใช้งานระบบ';
const ORGANIZATION_MEMBER_MISMATCH_MESSAGE =
  'อีเมลหรือรหัสเจ้าหน้าที่ไม่ตรงกับรายชื่อ บก.สอท.1';
const ORGANIZATION_UNIT = 'บก.สอท.1';
const ORGANIZATION_STATUS_VERIFIED = 'verified';
const PROFILES_COLLECTION = 'profiles';
const USERNAMES_COLLECTION = 'usernames';
const ORGANIZATION_MEMBERS_COLLECTION = 'organizationMembers';

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
const normalizeOfficerId = (value: string) => value.trim().toUpperCase();

const looksLikeEmail = (value: string) => value.includes('@');

const normalizeOrganizationMember = (
  data: OrganizationMemberRecord,
): Required<OrganizationMemberRecord> => ({
  email: normalizeEmail(data.email ?? ''),
  officerId: normalizeOfficerId(data.officerId ?? ''),
  fullName: data.fullName?.trim() ?? '',
  unit: data.unit?.trim() ?? '',
  department: data.department?.trim() ?? '',
  active: data.active === true,
});

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
    '';

  return {
    uid: primaryData?.uid ?? fallbackData?.uid ?? uid,
    username,
    normalizedUsername:
      fallbackData?.normalizedUsername ??
      primaryData?.normalizedUsername ??
      normalizeUsername(username),
    email,
    officerId:
      fallbackData?.officerId ?? primaryData?.officerId ?? '',
    fullName:
      fallbackData?.fullName?.trim() || primaryData?.fullName?.trim() || '',
    organizationUnit:
      fallbackData?.organizationUnit?.trim() ||
      primaryData?.organizationUnit?.trim() ||
      '',
    organizationStatus:
      fallbackData?.organizationStatus ??
      primaryData?.organizationStatus ??
      'pending',
    organizationVerifiedAt:
      fallbackData?.organizationVerifiedAt ??
      primaryData?.organizationVerifiedAt ??
      0,
    createdAt: primaryData?.createdAt ?? fallbackData?.createdAt ?? 0,
  };
};

export const verifyOrganizationMember = async ({
  email,
  officerId,
}: {
  email: string;
  officerId: string;
}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanOfficerId = normalizeOfficerId(officerId);

  if (!cleanOfficerId) {
    throw new Error('กรุณากรอกรหัสเจ้าหน้าที่');
  }

  const memberByEmailSnapshot = await getDoc(
    doc(db, ORGANIZATION_MEMBERS_COLLECTION, cleanEmail),
  );

  const memberData = memberByEmailSnapshot.exists()
    ? (memberByEmailSnapshot.data() as OrganizationMemberRecord)
    : null;

  if (!memberData) {
    throw new Error(ORGANIZATION_MEMBER_NOT_FOUND_MESSAGE);
  }

  const member = normalizeOrganizationMember(memberData);

  if (!member.active) {
    throw new Error(ORGANIZATION_MEMBER_INACTIVE_MESSAGE);
  }

  if (
    member.email !== cleanEmail ||
    member.officerId !== cleanOfficerId ||
    member.unit !== ORGANIZATION_UNIT
  ) {
    throw new Error(ORGANIZATION_MEMBER_MISMATCH_MESSAGE);
  }

  return {
    ...member,
    unit: ORGANIZATION_UNIT,
  };
};

export const isVerifiedOrganizationProfile = (
  profile: Pick<
    UserProfileRecord,
    'officerId' | 'organizationUnit' | 'organizationStatus'
  > | null,
) =>
  Boolean(
    profile?.officerId &&
      profile.organizationUnit === ORGANIZATION_UNIT &&
      profile.organizationStatus === ORGANIZATION_STATUS_VERIFIED,
  );

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
  officerId = '',
  fullName = '',
  organizationUnit = '',
  organizationStatus = 'pending',
  organizationVerifiedAt = 0,
}: Pick<UserProfileRecord, 'uid' | 'username' | 'email'> &
  Partial<
    Pick<
      UserProfileRecord,
      | 'officerId'
      | 'fullName'
      | 'organizationUnit'
      | 'organizationStatus'
      | 'organizationVerifiedAt'
    >
  >) => {
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
      officerId: normalizeOfficerId(officerId),
      fullName: fullName.trim(),
      organizationUnit,
      organizationStatus,
      organizationVerifiedAt,
      createdAt: Date.now(),
    };

    transaction.set(usernameRef, profileRecord);
    transaction.set(profileRef, profileRecord);
  });
};

export const verifyUserOrganizationProfile = async ({
  uid,
  email,
  officerId,
}: {
  uid: string;
  email: string;
  officerId: string;
}) => {
  const member = await verifyOrganizationMember({ email, officerId });
  const profileRef = doc(db, PROFILES_COLLECTION, uid);

  await runTransaction(db, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);

    if (!profileSnapshot.exists()) {
      throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับยืนยันตัวตน');
    }

    const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
    const cleanUsername = profileData.username?.trim() ?? '';
    const normalizedUsername =
      profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
    const verifiedAt = Date.now();
    const organizationStatus: OrganizationStatus = ORGANIZATION_STATUS_VERIFIED;
    const verificationUpdates = {
      officerId: member.officerId,
      fullName: member.fullName,
      organizationUnit: member.unit,
      organizationStatus,
      organizationVerifiedAt: verifiedAt,
    };

    transaction.update(profileRef, verificationUpdates);

    if (normalizedUsername) {
      const usernameRef = doc(db, USERNAMES_COLLECTION, normalizedUsername);
      transaction.set(
        usernameRef,
        {
          ...profileData,
          uid,
          username: cleanUsername,
          normalizedUsername,
          email: normalizeEmail(email),
          ...verificationUpdates,
        },
        { merge: true },
      );
    }
  });

  return getUserProfile(uid, email);
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

