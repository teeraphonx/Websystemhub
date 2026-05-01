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
  uploadBytesResumable,
  type StorageReference,
  type UploadMetadata,
} from 'firebase/storage';

export const firebaseConfig = {
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
  organizationVerificationCardNumber?: string;
  organizationVerificationCardNumberLast4?: string;
  organizationVerificationCardImagePath?: string;
  organizationVerificationCardImageUrl?: string;
  organizationVerificationCardImageDataUrl?: string;
  organizationVerificationCardImageName?: string;
  organizationVerificationCardImageContentType?: string;
  organizationVerificationCardImageSize?: number;
  organizationVerificationCardImageStorageStatus?: 'uploaded' | 'embedded';
  organizationVerificationCardImageUploadError?: string;
  isActive?: boolean;
  lastActiveAt?: number;
  lastInactiveAt?: number;
  activityUpdatedAt?: number;
  createdAt: number;
}

type OrganizationStatus = UserProfileRecord['organizationStatus'];
type OrganizationVerificationRequestStatus =
  UserProfileRecord['organizationVerificationRequestStatus'];

export interface OrganizationVerificationRequestRecord {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  organizationDivision: string;
  cardNumber: string;
  cardNumberLast4: string;
  cardImagePath: string;
  cardImageUrl: string;
  cardImageDataUrl: string;
  cardImageName: string;
  cardImageContentType: string;
  cardImageSize: number;
  cardImageStorageStatus: 'uploaded' | 'embedded' | '';
  cardImageUploadError: string;
  status: NonNullable<OrganizationVerificationRequestStatus>;
  submittedAt: number;
  updatedAt: number;
  reviewedAt?: number;
}

interface OrganizationMemberRecord {
  email?: string;
  officerId?: string;
  fullName?: string;
  unit?: string;
  department?: string;
  active?: boolean;
}

type OrganizationVerificationRequestDocument =
  Partial<OrganizationVerificationRequestRecord>;

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
export const MAX_VERIFICATION_CARD_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_VERIFICATION_CARD_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const VERIFICATION_CARD_IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const VERIFICATION_REQUEST_TIMEOUT_MS = 30_000;
const VERIFICATION_CARD_IMAGE_FALLBACK_MAX_BYTES = 700 * 1024;
const VERIFICATION_CARD_IMAGE_FALLBACK_DIMENSIONS = [1200, 1000, 800, 640];
const VERIFICATION_CARD_IMAGE_FALLBACK_QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];

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
const normalizeFullName = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeDivision = (value: string) => value.trim();
const normalizeCardNumber = (value: string) =>
  value.trim().replace(/\s+/g, '').toUpperCase();
const normalizeTimestamp = (value: unknown, fallbackValue = 0) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallbackValue;

const getErrorMessageText = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as { code?: unknown; message?: unknown };
    const errorCode =
      typeof errorRecord.code === 'string' ? errorRecord.code.trim() : '';
    const errorMessage =
      typeof errorRecord.message === 'string' ? errorRecord.message.trim() : '';

    return [errorCode, errorMessage].filter(Boolean).join(': ');
  }

  return 'Unknown error';
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

const looksLikeEmail = (value: string) => value.includes('@');

const getDataUrlSize = (dataUrl: string) => {
  return dataUrl.length;
};

const canvasToJpegDataUrl = (
  canvas: HTMLCanvasElement,
  quality: number,
) =>
  new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('ไม่สามารถบีบอัดรูปบัตรได้'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';

          if (!result) {
            reject(new Error('ไม่สามารถอ่านรูปบัตรที่บีบอัดแล้วได้'));
            return;
          }

          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error('ไม่สามารถอ่านรูปบัตรที่บีบอัดแล้วได้'));
        };
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality,
    );
  });

const loadImageFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('ไม่สามารถอ่านรูปบัตรนี้ได้ กรุณาใช้ไฟล์ JPG, PNG หรือ WebP'));
    };
    image.src = objectUrl;
  });

const createVerificationCardImageDataUrl = async (file: File) => {
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error('ไม่สามารถอ่านขนาดรูปบัตรนี้ได้');
  }

  for (const maxDimension of VERIFICATION_CARD_IMAGE_FALLBACK_DIMENSIONS) {
    const ratio = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
    const targetHeight = Math.max(1, Math.round(sourceHeight * ratio));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('เบราว์เซอร์นี้ไม่รองรับการบีบอัดรูปบัตร');
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    for (const quality of VERIFICATION_CARD_IMAGE_FALLBACK_QUALITIES) {
      const dataUrl = await canvasToJpegDataUrl(canvas, quality);
      const size = getDataUrlSize(dataUrl);

      if (size <= VERIFICATION_CARD_IMAGE_FALLBACK_MAX_BYTES) {
        return {
          dataUrl,
          contentType: 'image/jpeg',
          size,
        };
      }
    }
  }

  throw new Error(
    'ไม่สามารถบีบอัดรูปบัตรให้เล็กพอสำหรับส่งคำขอได้ กรุณาลดขนาดรูปแล้วลองใหม่',
  );
};

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

export const validateVerificationCardImageFile = (file: File | null) => {
  if (!file) {
    return;
  }

  if (!ALLOWED_VERIFICATION_CARD_IMAGE_TYPES.has(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์รูป JPG, PNG, WebP, HEIC หรือ HEIF');
  }

  if (file.size > MAX_VERIFICATION_CARD_IMAGE_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์รูปบัตรต้องไม่เกิน 5MB');
  }
};

const uploadVerificationCardImageWithTimeout = (
  imageRef: StorageReference,
  file: File,
  metadata: UploadMetadata,
) =>
  new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(imageRef, file, metadata);
    let isSettled = false;
    let unsubscribe: (() => void) | null = null;
    const timeoutId = setTimeout(() => {
      settle(() => {
        uploadTask.cancel();
        reject(
          new Error(
            'อัปโหลดรูปบัตรใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตหรือลดขนาดรูปแล้วลองส่งใหม่อีกครั้ง',
          ),
        );
      });
    }, VERIFICATION_CARD_IMAGE_UPLOAD_TIMEOUT_MS);

    const settle = (callback: () => void) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timeoutId);
      unsubscribe?.();
      callback();
    };

    unsubscribe = uploadTask.on(
      'state_changed',
      undefined,
      (error) => {
        settle(() => reject(error));
      },
      () => {
        settle(resolve);
      },
    );
  });

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

const normalizeVerificationRequestStatus = (
  value: OrganizationVerificationRequestStatus | string | undefined,
) => {
  switch (value) {
    case 'approved':
    case 'rejected':
    case 'pending':
      return value;
    default:
      return 'pending';
  }
};

const buildOrganizationVerificationRequestRecord = (
  uid: string,
  data: OrganizationVerificationRequestDocument | null,
): OrganizationVerificationRequestRecord => {
  const cardNumber = normalizeCardNumber(data?.cardNumber ?? '');
  const cardNumberLast4 =
    data?.cardNumberLast4?.trim() || (cardNumber ? cardNumber.slice(-4) : '');
  const cardImageDataUrl = data?.cardImageDataUrl?.trim() ?? '';
  const cardImageUrl = data?.cardImageUrl?.trim() || cardImageDataUrl;
  const cardImageStorageStatus = data?.cardImageStorageStatus ?? '';

  return {
    uid: data?.uid?.trim() || uid,
    email: normalizeEmail(data?.email ?? ''),
    username: data?.username?.trim() ?? '',
    fullName: normalizeFullName(data?.fullName ?? ''),
    organizationDivision: normalizeDivision(data?.organizationDivision ?? ''),
    cardNumber,
    cardNumberLast4,
    cardImagePath: data?.cardImagePath?.trim() ?? '',
    cardImageUrl,
    cardImageDataUrl,
    cardImageName: data?.cardImageName?.trim() ?? '',
    cardImageContentType: data?.cardImageContentType?.trim() ?? '',
    cardImageSize: normalizeTimestamp(data?.cardImageSize),
    cardImageStorageStatus,
    cardImageUploadError: data?.cardImageUploadError?.trim() ?? '',
    status: normalizeVerificationRequestStatus(data?.status),
    submittedAt: normalizeTimestamp(data?.submittedAt),
    updatedAt: normalizeTimestamp(data?.updatedAt),
    reviewedAt:
      typeof data?.reviewedAt === 'number' && Number.isFinite(data.reviewedAt)
        ? data.reviewedAt
        : undefined,
  };
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
    organizationVerificationCardNumber:
      primaryData?.organizationVerificationCardNumber ??
      fallbackData?.organizationVerificationCardNumber,
    organizationVerificationCardNumberLast4:
      primaryData?.organizationVerificationCardNumberLast4 ??
      fallbackData?.organizationVerificationCardNumberLast4,
    organizationVerificationCardImagePath:
      primaryData?.organizationVerificationCardImagePath ??
      fallbackData?.organizationVerificationCardImagePath,
    organizationVerificationCardImageUrl:
      primaryData?.organizationVerificationCardImageUrl ??
      fallbackData?.organizationVerificationCardImageUrl,
    organizationVerificationCardImageDataUrl:
      primaryData?.organizationVerificationCardImageDataUrl ??
      fallbackData?.organizationVerificationCardImageDataUrl,
    organizationVerificationCardImageName:
      primaryData?.organizationVerificationCardImageName ??
      fallbackData?.organizationVerificationCardImageName,
    organizationVerificationCardImageContentType:
      primaryData?.organizationVerificationCardImageContentType ??
      fallbackData?.organizationVerificationCardImageContentType,
    organizationVerificationCardImageSize:
      primaryData?.organizationVerificationCardImageSize ??
      fallbackData?.organizationVerificationCardImageSize,
    organizationVerificationCardImageStorageStatus:
      primaryData?.organizationVerificationCardImageStorageStatus ??
      fallbackData?.organizationVerificationCardImageStorageStatus,
    organizationVerificationCardImageUploadError:
      primaryData?.organizationVerificationCardImageUploadError ??
      fallbackData?.organizationVerificationCardImageUploadError,
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

const buildUsernameMirrorData = (
  profileData: Partial<UserProfileRecord>,
  updates: Partial<UserProfileRecord>,
) => {
  const mirrorData: Partial<UserProfileRecord> = { ...profileData };

  delete mirrorData.organizationVerificationCardImageDataUrl;
  delete mirrorData.organizationVerificationCardImageUploadError;

  return {
    ...mirrorData,
    ...updates,
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
  fullName,
  division,
  cardNumber,
  cardImage,
}: {
  uid: string;
  email: string;
  fullName: string;
  division: string;
  cardNumber: string;
  cardImage: File | null;
}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanFullName = normalizeFullName(fullName);
  const cleanDivision = normalizeDivision(division);
  const cleanCardNumber = normalizeCardNumber(cardNumber);

  if (!cleanFullName) {
    throw new Error('กรุณากรอกชื่อและนามสกุล');
  }

  if (cleanFullName.split(' ').length < 2) {
    throw new Error('กรุณากรอกชื่อและนามสกุลในช่องเดียวกัน');
  }

  if (cleanFullName.length > 120) {
    throw new Error('ชื่อและนามสกุลต้องยาวไม่เกิน 120 ตัวอักษร');
  }

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

  validateVerificationCardImageFile(cardImage);

  const submittedAt = Date.now();
  const extension = getVerificationCardImageExtension(cardImage);
  const cardImagePath = `${ORGANIZATION_VERIFICATION_UPLOADS_PATH}/${uid}/${submittedAt}.${extension}`;
  const cardImageRef = storageRef(storage, cardImagePath);
  let cardImagePayload: Pick<
    OrganizationVerificationRequestRecord,
    | 'cardImagePath'
    | 'cardImageUrl'
    | 'cardImageDataUrl'
    | 'cardImageName'
    | 'cardImageContentType'
    | 'cardImageSize'
    | 'cardImageStorageStatus'
    | 'cardImageUploadError'
  >;

  try {
    await uploadVerificationCardImageWithTimeout(cardImageRef, cardImage, {
      contentType: cardImage.type,
      customMetadata: {
        uid,
        email: cleanEmail,
        purpose: 'organization-verification',
      },
    });

    const cardImageUrl = await withTimeout(
      getDownloadURL(cardImageRef),
      VERIFICATION_REQUEST_TIMEOUT_MS,
      'ดึงลิงก์รูปบัตรใช้เวลานานเกินไป กรุณาลองส่งคำขอใหม่อีกครั้ง',
    );

    cardImagePayload = {
      cardImagePath,
      cardImageUrl,
      cardImageDataUrl: '',
      cardImageName: cardImage.name,
      cardImageContentType: cardImage.type,
      cardImageSize: cardImage.size,
      cardImageStorageStatus: 'uploaded',
      cardImageUploadError: '',
    };
  } catch (error) {
    const uploadErrorMessage = getErrorMessageText(error);
    console.warn(
      'Failed to upload verification card image. Falling back to embedded image data.',
      error,
    );

    const fallbackImage = await createVerificationCardImageDataUrl(cardImage).catch(
      (fallbackError) => {
        throw new Error(
          `อัปโหลดรูปบัตรไม่สำเร็จ (${uploadErrorMessage}) และไม่สามารถบีบอัดรูปสำรองได้ (${getErrorMessageText(fallbackError)})`,
        );
      },
    );

    cardImagePayload = {
      cardImagePath: '',
      cardImageUrl: fallbackImage.dataUrl,
      cardImageDataUrl: fallbackImage.dataUrl,
      cardImageName: cardImage.name,
      cardImageContentType: fallbackImage.contentType,
      cardImageSize: fallbackImage.size,
      cardImageStorageStatus: 'embedded',
      cardImageUploadError: uploadErrorMessage,
    };
  }

  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const requestRef = doc(
    db,
    ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION,
    uid,
  );
  const requestStatus = 'pending' as const;
  const profileUpdates = {
    fullName: cleanFullName,
    organizationUnit: ORGANIZATION_UNIT,
    organizationDivision: cleanDivision,
    organizationStatus: 'pending' as OrganizationStatus,
    organizationVerificationRequestedAt: submittedAt,
    organizationVerificationRequestStatus: requestStatus,
  };
  const profileVerificationUpdates = {
    ...profileUpdates,
    organizationVerificationCardNumber: cleanCardNumber,
    organizationVerificationCardNumberLast4: cleanCardNumber.slice(-4),
    organizationVerificationCardImagePath: cardImagePayload.cardImagePath,
    organizationVerificationCardImageUrl: cardImagePayload.cardImageUrl,
    organizationVerificationCardImageDataUrl: cardImagePayload.cardImageDataUrl,
    organizationVerificationCardImageName: cardImagePayload.cardImageName,
    organizationVerificationCardImageContentType:
      cardImagePayload.cardImageContentType,
    organizationVerificationCardImageSize: cardImagePayload.cardImageSize,
    organizationVerificationCardImageStorageStatus:
      cardImagePayload.cardImageStorageStatus,
    organizationVerificationCardImageUploadError:
      cardImagePayload.cardImageUploadError,
  };

  const writeProfileFallback = async () => {
    const profileSnapshot = await withTimeout(
      getDoc(profileRef),
      VERIFICATION_REQUEST_TIMEOUT_MS,
      'โหลดโปรไฟล์เพื่อบันทึกคำขอยืนยันตัวตนใช้เวลานานเกินไป',
    );

    if (!profileSnapshot.exists()) {
      throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับส่งคำขอยืนยันตัวตน');
    }

    const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
    const cleanUsername = profileData.username?.trim() ?? '';
    const normalizedUsername =
      profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
    const writes = [
      setDoc(profileRef, profileVerificationUpdates, { merge: true }),
    ];

    if (normalizedUsername) {
      writes.push(
        setDoc(
          doc(db, USERNAMES_COLLECTION, normalizedUsername),
          buildUsernameMirrorData(profileData, {
            uid,
            username: cleanUsername,
            normalizedUsername,
            email: cleanEmail,
            ...profileUpdates,
          }),
          { merge: true },
        ),
      );
    }

    await withTimeout(
      Promise.all(writes),
      VERIFICATION_REQUEST_TIMEOUT_MS,
      'บันทึกคำขอยืนยันตัวตนในโปรไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง',
    );
  };

  try {
    await withTimeout(
      runTransaction(db, async (transaction) => {
        const profileSnapshot = await transaction.get(profileRef);

        if (!profileSnapshot.exists()) {
          throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับส่งคำขอยืนยันตัวตน');
        }

        const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
        const cleanUsername = profileData.username?.trim() ?? '';
        const normalizedUsername =
          profileData.normalizedUsername ?? normalizeUsername(cleanUsername);

        transaction.set(
          requestRef,
          {
            uid,
            email: cleanEmail,
            username: cleanUsername,
            fullName: cleanFullName,
            organizationDivision: cleanDivision,
            cardNumber: cleanCardNumber,
            cardNumberLast4: cleanCardNumber.slice(-4),
            ...cardImagePayload,
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
            buildUsernameMirrorData(profileData, {
              uid,
              username: cleanUsername,
              normalizedUsername,
              email: cleanEmail,
              ...profileUpdates,
            }),
            { merge: true },
          );
        }
      }),
      VERIFICATION_REQUEST_TIMEOUT_MS,
      'บันทึกคำขอยืนยันตัวตนใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองส่งใหม่อีกครั้ง',
    );
  } catch (error) {
    console.warn(
      'Failed to write verification request document. Falling back to profile-only verification request.',
      error,
    );

    try {
      await writeProfileFallback();
    } catch (fallbackError) {
      throw new Error(
        `ไม่สามารถบันทึกคำขอยืนยันตัวตนได้ (${getErrorMessageText(error)}) และบันทึกสำรองในโปรไฟล์ไม่สำเร็จ (${getErrorMessageText(fallbackError)})`,
      );
    }
  }

  return withTimeout(
    getUserProfile(uid, email),
    VERIFICATION_REQUEST_TIMEOUT_MS,
    'โหลดสถานะคำขอยืนยันตัวตนใช้เวลานานเกินไป กรุณารีเฟรชหน้าเพื่อตรวจสอบสถานะล่าสุด',
  );
};

const buildOrganizationVerificationRequestRecordFromProfile = (
  profile: UserProfileRecord,
) =>
  buildOrganizationVerificationRequestRecord(profile.uid, {
    uid: profile.uid,
    email: profile.email,
    username: profile.username,
    fullName: profile.fullName,
    organizationDivision: profile.organizationDivision,
    cardNumber: profile.organizationVerificationCardNumber,
    cardNumberLast4: profile.organizationVerificationCardNumberLast4,
    cardImagePath: profile.organizationVerificationCardImagePath,
    cardImageUrl:
      profile.organizationVerificationCardImageUrl ||
      profile.organizationVerificationCardImageDataUrl,
    cardImageDataUrl: profile.organizationVerificationCardImageDataUrl,
    cardImageName: profile.organizationVerificationCardImageName,
    cardImageContentType:
      profile.organizationVerificationCardImageContentType,
    cardImageSize: profile.organizationVerificationCardImageSize,
    cardImageStorageStatus:
      profile.organizationVerificationCardImageStorageStatus,
    cardImageUploadError: profile.organizationVerificationCardImageUploadError,
    status: 'pending',
    submittedAt: profile.organizationVerificationRequestedAt,
    updatedAt:
      profile.organizationVerificationRequestedAt ?? profile.createdAt,
  });

const mergeOrganizationVerificationRequestRecords = (
  records: OrganizationVerificationRequestRecord[],
) => {
  const mergedRecords = new Map<string, OrganizationVerificationRequestRecord>();

  records.forEach((record) => {
    const existingRecord = mergedRecords.get(record.uid);

    if (
      !existingRecord ||
      (!existingRecord.cardImageUrl && record.cardImageUrl) ||
      record.updatedAt > existingRecord.updatedAt
    ) {
      mergedRecords.set(record.uid, {
        ...existingRecord,
        ...record,
        cardImageUrl: record.cardImageUrl || existingRecord?.cardImageUrl || '',
        cardImageDataUrl:
          record.cardImageDataUrl || existingRecord?.cardImageDataUrl || '',
      });
    }
  });

  return [...mergedRecords.values()].sort((left, right) => {
    if (left.submittedAt !== right.submittedAt) {
      return right.submittedAt - left.submittedAt;
    }

    return right.updatedAt - left.updatedAt;
  });
};

const fetchPendingOrganizationVerificationRequestsFromProfiles = async () => {
  const profiles = await fetchUserProfiles();

  return profiles
    .filter(
      (profile) =>
        profile.organizationVerificationRequestStatus === 'pending' &&
        Boolean(profile.organizationVerificationRequestedAt),
    )
    .map(buildOrganizationVerificationRequestRecordFromProfile);
};

export const fetchPendingOrganizationVerificationRequests = async () => {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION),
        where('status', '==', 'pending'),
      ),
    );

    const requestRecords = snapshot.docs
      .map((requestDoc) =>
        buildOrganizationVerificationRequestRecord(
          requestDoc.id,
          requestDoc.data() as OrganizationVerificationRequestDocument,
        ),
      );
    const profileRecords =
      await fetchPendingOrganizationVerificationRequestsFromProfiles().catch(
        () => [],
      );

    return mergeOrganizationVerificationRequestRecords([
      ...profileRecords,
      ...requestRecords,
    ]);
  } catch (error) {
    if (!isFirestorePermissionDeniedError(error)) {
      throw error;
    }

    return mergeOrganizationVerificationRequestRecords(
      await fetchPendingOrganizationVerificationRequestsFromProfiles(),
    );
  }
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
  const requestRef = doc(
    db,
    ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION,
    uid,
  );

  try {
    await runTransaction(db, async (transaction) => {
      const profileSnapshot = await transaction.get(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับยืนยันตัวตน');
      }

      const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
      const requestSnapshot = await transaction.get(requestRef);
      const requestData = requestSnapshot.exists()
        ? (requestSnapshot.data() as OrganizationVerificationRequestDocument)
        : null;
      const cleanUsername = profileData.username?.trim() ?? '';
      const normalizedUsername =
        profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
      const verifiedAt = Date.now();
      const organizationStatus: OrganizationStatus = ORGANIZATION_STATUS_VERIFIED;
      const requestStatus = 'approved' as const;
      const organizationDivision = normalizeDivision(
        requestData?.organizationDivision ?? profileData.organizationDivision ?? '',
      );
      const verifiedFullName =
        normalizeFullName(requestData?.fullName ?? profileData.fullName ?? '') ||
        member.fullName;
      const verificationUpdates = {
        officerId: member.officerId,
        fullName: verifiedFullName,
        organizationUnit: member.unit,
        organizationDivision,
        organizationStatus,
        organizationVerifiedAt: verifiedAt,
        organizationVerificationRequestStatus: requestStatus,
      };

      transaction.update(profileRef, verificationUpdates);

      transaction.set(
        requestRef,
        {
          uid,
          email: normalizeEmail(email),
          username: cleanUsername,
          organizationDivision,
          status: requestStatus,
          reviewedAt: verifiedAt,
          updatedAt: verifiedAt,
          officerId: member.officerId,
          fullName: verifiedFullName,
        },
        { merge: true },
      );

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
  } catch (error) {
    if (!isFirestorePermissionDeniedError(error)) {
      throw error;
    }

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
      const organizationDivision = normalizeDivision(
        profileData.organizationDivision ?? '',
      );
      const verifiedFullName =
        normalizeFullName(profileData.fullName ?? '') || member.fullName;
      const verificationUpdates = {
        officerId: member.officerId,
        fullName: verifiedFullName,
        organizationUnit: member.unit,
        organizationDivision,
        organizationStatus: ORGANIZATION_STATUS_VERIFIED as OrganizationStatus,
        organizationVerifiedAt: verifiedAt,
        organizationVerificationRequestStatus: 'approved' as const,
      };

      transaction.update(profileRef, verificationUpdates);

      if (normalizedUsername) {
        transaction.set(
          doc(db, USERNAMES_COLLECTION, normalizedUsername),
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
  }

  return getUserProfile(uid, email);
};

export const rejectOrganizationVerificationRequest = async ({
  uid,
  email = '',
}: {
  uid: string;
  email?: string;
}) => {
  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const requestRef = doc(
    db,
    ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION,
    uid,
  );

  try {
    await runTransaction(db, async (transaction) => {
      const profileSnapshot = await transaction.get(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับปฏิเสธคำขอยืนยันตัวตน');
      }

      const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
      const requestSnapshot = await transaction.get(requestRef);
      const requestData = requestSnapshot.exists()
        ? (requestSnapshot.data() as OrganizationVerificationRequestDocument)
        : null;
      const cleanUsername =
        profileData.username?.trim() ?? requestData?.username?.trim() ?? '';
      const normalizedUsername =
        profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
      const cleanEmail = normalizeEmail(
        profileData.email ?? requestData?.email ?? email,
      );
      const organizationDivision = normalizeDivision(
        requestData?.organizationDivision ?? profileData.organizationDivision ?? '',
      );
      const reviewedAt = Date.now();
      const organizationStatus: OrganizationStatus = 'rejected';
      const requestStatus = 'rejected' as const;
      const rejectionUpdates = {
        organizationUnit: ORGANIZATION_UNIT,
        organizationDivision,
        organizationStatus,
        organizationVerificationRequestStatus: requestStatus,
      };

      transaction.update(profileRef, rejectionUpdates);
      transaction.set(
        requestRef,
        {
          uid,
          email: cleanEmail,
          username: cleanUsername,
          organizationDivision,
          status: requestStatus,
          reviewedAt,
          updatedAt: reviewedAt,
        },
        { merge: true },
      );

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
            ...rejectionUpdates,
          },
          { merge: true },
        );
      }
    });
  } catch (error) {
    if (!isFirestorePermissionDeniedError(error)) {
      throw error;
    }

    await runTransaction(db, async (transaction) => {
      const profileSnapshot = await transaction.get(profileRef);

      if (!profileSnapshot.exists()) {
        throw new Error('ไม่พบโปรไฟล์ผู้ใช้สำหรับปฏิเสธคำขอยืนยันตัวตน');
      }

      const profileData = profileSnapshot.data() as Partial<UserProfileRecord>;
      const cleanUsername = profileData.username?.trim() ?? '';
      const normalizedUsername =
        profileData.normalizedUsername ?? normalizeUsername(cleanUsername);
      const cleanEmail = normalizeEmail(profileData.email ?? email);
      const organizationDivision = normalizeDivision(
        profileData.organizationDivision ?? '',
      );
      const rejectionUpdates = {
        organizationUnit: ORGANIZATION_UNIT,
        organizationDivision,
        organizationStatus: 'rejected' as OrganizationStatus,
        organizationVerificationRequestStatus: 'rejected' as const,
      };

      transaction.update(profileRef, rejectionUpdates);

      if (normalizedUsername) {
        transaction.set(
          doc(db, USERNAMES_COLLECTION, normalizedUsername),
          {
            ...profileData,
            uid,
            username: cleanUsername,
            normalizedUsername,
            email: cleanEmail,
            ...rejectionUpdates,
          },
          { merge: true },
        );
      }
    });
  }

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

