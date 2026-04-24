import { getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';

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
  organizationDivision: string;
  organizationStatus: 'verified' | 'pending' | 'rejected';
  organizationVerifiedAt: number;
  organizationVerificationRequestedAt?: number;
  organizationVerificationRequestStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  lastActiveAt?: number;
  lastInactiveAt?: number;
  activityUpdatedAt?: number;
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
  'อีเมลนี้ไม่ตรงกับรายชื่อ บก.สอท.1';
const ORGANIZATION_UNIT = 'บก.สอท.1';
const ORGANIZATION_STATUS_VERIFIED = 'verified';
const PROFILES_COLLECTION = 'profiles';
const USERNAMES_COLLECTION = 'usernames';
const ORGANIZATION_MEMBERS_COLLECTION = 'organizationMembers';
const ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION =
  'organizationVerificationRequests';
const ORGANIZATION_VERIFICATION_UPLOADS_PATH = 'organization-verifications';
const MAX_VERIFICATION_CARD_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_VERIFICATION_CARD_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const defaultFirebaseApp = getApps().find((app) => app.name === '[DEFAULT]');
const firebaseApp = defaultFirebaseApp ?? initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

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
const normalizeDivision = (value: string) => value.trim();
const normalizeCardNumber = (value: string) =>
  value.trim().replace(/\s+/g, '').toUpperCase();

const looksLikeEmail = (value: string) => value.includes('@');

const getVerificationCardImageExtension = (file: File) => {
  const extension = file.name.split('.').pop()?.trim().toLowerCase();

  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
    return extension;
  }

  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
};

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
    organizationDivision:
      fallbackData?.organizationDivision?.trim() ||
      primaryData?.organizationDivision?.trim() ||
      '',
    organizationStatus:
      fallbackData?.organizationStatus ??
      primaryData?.organizationStatus ??
      'pending',
    organizationVerifiedAt:
      fallbackData?.organizationVerifiedAt ??
      primaryData?.organizationVerifiedAt ??
      0,
    organizationVerificationRequestedAt:
      fallbackData?.organizationVerificationRequestedAt ??
      primaryData?.organizationVerificationRequestedAt,
    organizationVerificationRequestStatus:
      fallbackData?.organizationVerificationRequestStatus ??
      primaryData?.organizationVerificationRequestStatus,
    isActive: fallbackData?.isActive ?? primaryData?.isActive,
    lastActiveAt:
      fallbackData?.lastActiveAt ?? primaryData?.lastActiveAt,
    lastInactiveAt:
      fallbackData?.lastInactiveAt ?? primaryData?.lastInactiveAt,
    activityUpdatedAt:
      fallbackData?.activityUpdatedAt ?? primaryData?.activityUpdatedAt,
    createdAt: primaryData?.createdAt ?? fallbackData?.createdAt ?? 0,
  };
};

export const verifyOrganizationMember = async ({
  email,
  officerId,
}: {
  email: string;
  officerId?: string;
}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanOfficerId = normalizeOfficerId(officerId ?? '');

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
    (cleanOfficerId && member.officerId !== cleanOfficerId) ||
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
  organizationDivision = '',
  organizationStatus = 'pending',
  organizationVerifiedAt = 0,
}: Pick<UserProfileRecord, 'uid' | 'username' | 'email'> &
  Partial<
    Pick<
      UserProfileRecord,
      | 'officerId'
      | 'fullName'
      | 'organizationUnit'
      | 'organizationDivision'
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
    const createdAt = Date.now();

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
      organizationDivision: normalizeDivision(organizationDivision),
      organizationStatus,
      organizationVerifiedAt,
      isActive: true,
      lastActiveAt: createdAt,
      activityUpdatedAt: createdAt,
      createdAt,
    };

    transaction.set(usernameRef, profileRecord);
    transaction.set(profileRef, profileRecord);
  });
};

export const updateUserActivity = async ({
  uid,
  email = '',
  normalizedUsername = '',
  isActive,
}: {
  uid: string;
  email?: string;
  normalizedUsername?: string;
  isActive: boolean;
}) => {
  const updatedAt = Date.now();
  const cleanEmail = normalizeEmail(email);
  const cleanUsername = normalizeUsername(normalizedUsername);
  const activityUpdates = {
    uid,
    ...(cleanEmail ? { email: cleanEmail } : {}),
    isActive,
    activityUpdatedAt: updatedAt,
    ...(isActive
      ? { lastActiveAt: updatedAt }
      : { lastInactiveAt: updatedAt }),
  };
  const writes = [
    setDoc(doc(db, PROFILES_COLLECTION, uid), activityUpdates, { merge: true }),
  ];

  if (cleanUsername) {
    writes.push(
      setDoc(doc(db, USERNAMES_COLLECTION, cleanUsername), activityUpdates, {
        merge: true,
      }),
    );
  }

  await Promise.all(writes);
};

export const submitOrganizationVerificationRequest = async ({
  uid,
  email,
  division,
  cardNumber,
  cardImage,
}: {
  uid: string;
  email: string;
  division: string;
  cardNumber: string;
  cardImage: File | null;
}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanDivision = normalizeDivision(division);
  const cleanCardNumber = normalizeCardNumber(cardNumber);

  if (!cleanDivision) {
    throw new Error('กรุณาระบุกองกำกับการ');
  }

  if (cleanDivision.length > 120) {
    throw new Error('กองกำกับการต้องยาวไม่เกิน 120 ตัวอักษร');
  }

  if (!cleanCardNumber) {
    throw new Error('กรุณากรอกเลขบัตร');
  }

  if (!/^[A-Z0-9/-]{4,32}$/.test(cleanCardNumber)) {
    throw new Error('เลขบัตรต้องเป็นตัวอักษร ตัวเลข ขีดกลาง หรือ / ความยาว 4-32 ตัว');
  }

  if (!cardImage) {
    throw new Error('กรุณาแนบรูปบัตร');
  }

  if (!ALLOWED_VERIFICATION_CARD_IMAGE_TYPES.has(cardImage.type)) {
    throw new Error('รองรับเฉพาะไฟล์รูป JPG, PNG, WebP, HEIC หรือ HEIF');
  }

  if (cardImage.size > MAX_VERIFICATION_CARD_IMAGE_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์รูปบัตรต้องไม่เกิน 5MB');
  }

  const submittedAt = Date.now();
  const extension = getVerificationCardImageExtension(cardImage);
  const cardImagePath = `${ORGANIZATION_VERIFICATION_UPLOADS_PATH}/${uid}/${submittedAt}.${extension}`;
  const cardImageRef = storageRef(storage, cardImagePath);

  await uploadBytes(cardImageRef, cardImage, {
    contentType: cardImage.type,
    customMetadata: {
      uid,
      email: cleanEmail,
      purpose: 'organization-verification',
    },
  });

  const cardImageUrl = await getDownloadURL(cardImageRef);
  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const requestRef = doc(
    db,
    ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION,
    uid,
  );
  const requestStatus = 'pending' as const;

  await runTransaction(db, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);

    if (!profileSnapshot.exists()) {
      throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับส่งคำขอยืนยันตัวตน');
    }

    const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
    const cleanUsername = profileData.username?.trim() ?? '';
    const normalizedUsername =
      profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
    const profileUpdates = {
      organizationUnit: ORGANIZATION_UNIT,
      organizationDivision: cleanDivision,
      organizationStatus: 'pending' as OrganizationStatus,
      organizationVerificationRequestedAt: submittedAt,
      organizationVerificationRequestStatus: requestStatus,
    };

    transaction.set(
      requestRef,
      {
        uid,
        email: cleanEmail,
        username: cleanUsername,
        organizationDivision: cleanDivision,
        cardNumber: cleanCardNumber,
        cardNumberLast4: cleanCardNumber.slice(-4),
        cardImagePath,
        cardImageUrl,
        cardImageName: cardImage.name,
        cardImageContentType: cardImage.type,
        cardImageSize: cardImage.size,
        status: requestStatus,
        submittedAt,
        updatedAt: submittedAt,
      },
      { merge: true },
    );
    transaction.update(profileRef, profileUpdates);

    if (normalizedUsername) {
      const usernameRef = doc(db, USERNAMES_COLLECTION, normalizedUsername);

      transaction.set(
        usernameRef,
        {
          ...profileData,
          uid,
          username: cleanUsername,
          normalizedUsername,
          email: cleanEmail,
          ...profileUpdates,
        },
        { merge: true },
      );
    }
  });

  return getUserProfile(uid, email);
};

export const verifyUserOrganizationProfile = async ({
  uid,
  email,
  officerId,
}: {
  uid: string;
  email: string;
  officerId?: string;
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

const mapProfileSnapshot = (
  snapshot: Awaited<ReturnType<typeof getDocs>>,
): UserProfileRecord[] =>
  snapshot.docs.map((profileDoc) =>
    buildUserProfileRecord(
      profileDoc.id,
      profileDoc.data() as Partial<UserProfileRecord>,
    ),
  );

export const fetchUserProfiles = async () => {
  const [profilesResult, usernamesResult] = await Promise.allSettled([
    getDocs(collection(db, PROFILES_COLLECTION)),
    getDocs(collection(db, USERNAMES_COLLECTION)),
  ]);

  if (profilesResult.status === 'rejected' && usernamesResult.status === 'rejected') {
    throw profilesResult.reason;
  }

  const profileRecords =
    profilesResult.status === 'fulfilled'
      ? mapProfileSnapshot(profilesResult.value)
      : [];
  const usernameRecords =
    usernamesResult.status === 'fulfilled'
      ? mapProfileSnapshot(usernamesResult.value)
      : [];
  const seenKeys = new Set<string>();

  return [...profileRecords, ...usernameRecords]
    .filter((profile) => {
      const profileKeys = [
        profile.uid,
        profile.email,
        profile.normalizedUsername,
      ].filter(Boolean);
      const hasSeenProfile = profileKeys.some((key) => seenKeys.has(key));

      if (hasSeenProfile) {
        return false;
      }

      profileKeys.forEach((key) => seenKeys.add(key));
      return true;
    })
    .sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return right.createdAt - left.createdAt;
      }

      return left.username.localeCompare(right.username, 'th');
    });
};

const isBookingFallbackUid = (uid: string) =>
  uid.startsWith('booking-email:') || uid.startsWith('booking-user:');

export const deleteUserDirectoryEntry = async (
  user: Pick<UserProfileRecord, 'uid' | 'normalizedUsername'>,
) => {
  const deleteOperations: Array<Promise<unknown>> = [];

  if (!isBookingFallbackUid(user.uid)) {
    const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
    const requestRef = doc(
      db,
      ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION,
      user.uid,
    );
    const requestSnapshot = await getDoc(requestRef);

    if (requestSnapshot.exists()) {
      const requestData = requestSnapshot.data() as { cardImagePath?: string };
      const cardImagePath = requestData.cardImagePath?.trim();

      if (cardImagePath) {
        await deleteObject(storageRef(storage, cardImagePath)).catch((error) => {
          console.warn(
            'Failed to delete organization verification image while removing user directory entry.',
            error,
          );
        });
      }

      deleteOperations.push(deleteDoc(requestRef));
    }

    deleteOperations.push(deleteDoc(profileRef));

    if (user.normalizedUsername.trim()) {
      deleteOperations.push(
        deleteDoc(doc(db, USERNAMES_COLLECTION, user.normalizedUsername)),
      );
    }
  }

  if (deleteOperations.length === 0) {
    return;
  }

  await Promise.all(deleteOperations);
};

