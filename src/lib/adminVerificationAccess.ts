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
  type Firestore,
} from 'firebase/firestore';
import { getOrCreateAdminApp } from './adminFirebase';
import {
  type OrganizationVerificationRequestRecord,
  type UserProfileRecord,
} from './firebase';

export type { OrganizationVerificationRequestRecord } from './firebase';
const ORGANIZATION_UNIT = 'บก.สอท.1';
const ORGANIZATION_STATUS_VERIFIED = 'verified';
const PROFILES_COLLECTION = 'profiles';
const USERNAMES_COLLECTION = 'usernames';
const ORGANIZATION_MEMBERS_COLLECTION = 'organizationMembers';
const ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION =
  'organizationVerificationRequests';

type OrganizationStatus = UserProfileRecord['organizationStatus'];
type OrganizationVerificationRequestStatus =
  UserProfileRecord['organizationVerificationRequestStatus'];

interface OrganizationMemberRecord {
  email?: string;
  officerId?: string;
  fullName?: string;
  unit?: string;
  department?: string;
  active?: boolean;
}

type OrganizationVerificationRequestDocument =
  Partial<OrganizationVerificationRequestRecord> & {
    officerId?: string;
    fullName?: string;
  };

let adminVerificationAccessDbInstance: Firestore | null = null;

const getAdminVerificationAccessDb = () => {
  if (adminVerificationAccessDbInstance) {
    return adminVerificationAccessDbInstance;
  }

  adminVerificationAccessDbInstance = getFirestore(getOrCreateAdminApp());
  return adminVerificationAccessDbInstance;
};

const normalizeUsername = (value: string) => value.trim().toLowerCase();
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
    fallbackData?.username?.trim() || primaryData?.username?.trim() || '';

  return {
    uid: primaryData?.uid ?? fallbackData?.uid ?? uid,
    username,
    normalizedUsername:
      fallbackData?.normalizedUsername ??
      primaryData?.normalizedUsername ??
      normalizeUsername(username),
    email,
    officerId: fallbackData?.officerId ?? primaryData?.officerId ?? '',
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
    lastActiveAt: fallbackData?.lastActiveAt ?? primaryData?.lastActiveAt,
    lastInactiveAt:
      fallbackData?.lastInactiveAt ?? primaryData?.lastInactiveAt,
    activityUpdatedAt:
      fallbackData?.activityUpdatedAt ?? primaryData?.activityUpdatedAt,
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
      collection(getAdminVerificationAccessDb(), USERNAMES_COLLECTION),
      where('email', '==', normalizedEmail),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as Partial<UserProfileRecord>;
};

const getUserProfileForAdminAccess = async (uid: string, fallbackEmail = '') => {
  const profileSnapshot = await getDoc(
    doc(getAdminVerificationAccessDb(), PROFILES_COLLECTION, uid),
  );
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

export const fetchAdminUserProfiles = async () => {
  const db = getAdminVerificationAccessDb();
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

const verifyOrganizationMemberForAdminAccess = async ({
  email,
  officerId,
}: {
  email: string;
  officerId?: string;
}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanOfficerId = normalizeOfficerId(officerId ?? '');
  const memberByEmailSnapshot = await getDoc(
    doc(getAdminVerificationAccessDb(), ORGANIZATION_MEMBERS_COLLECTION, cleanEmail),
  );
  const memberData = memberByEmailSnapshot.exists()
    ? (memberByEmailSnapshot.data() as OrganizationMemberRecord)
    : null;

  if (!memberData) {
    throw new Error('ไม่พบข้อมูลเจ้าหน้าที่นี้ในรายชื่อ บก.สอท.1');
  }

  const member = normalizeOrganizationMember(memberData);

  if (!member.active) {
    throw new Error('บัญชีเจ้าหน้าที่นี้ยังไม่ได้รับอนุญาตให้ใช้งานระบบ');
  }

  if (
    member.email !== cleanEmail ||
    (cleanOfficerId && member.officerId !== cleanOfficerId) ||
    member.unit !== ORGANIZATION_UNIT
  ) {
    throw new Error('อีเมลนี้ไม่ตรงกับรายชื่อ บก.สอท.1');
  }

  return {
    ...member,
    unit: ORGANIZATION_UNIT,
  };
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
  const profiles = await fetchAdminUserProfiles();

  return profiles
    .filter(
      (profile) =>
        profile.organizationVerificationRequestStatus === 'pending' &&
        Boolean(profile.organizationVerificationRequestedAt),
    )
    .map(buildOrganizationVerificationRequestRecordFromProfile);
};

export const fetchAdminPendingOrganizationVerificationRequests = async () => {
  const db = getAdminVerificationAccessDb();

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

export const approveAdminOrganizationVerificationRequest = async ({
  uid,
  email,
  officerId,
}: {
  uid: string;
  email: string;
  officerId?: string;
}) => {
  const db = getAdminVerificationAccessDb();
  const member = await verifyOrganizationMemberForAdminAccess({ email, officerId });
  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const requestRef = doc(db, ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION, uid);

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

  return getUserProfileForAdminAccess(uid, email);
};

export const rejectAdminOrganizationVerificationRequest = async ({
  uid,
  email = '',
}: {
  uid: string;
  email?: string;
}) => {
  const db = getAdminVerificationAccessDb();
  const profileRef = doc(db, PROFILES_COLLECTION, uid);
  const requestRef = doc(db, ORGANIZATION_VERIFICATION_REQUESTS_COLLECTION, uid);

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

  return getUserProfileForAdminAccess(uid, email);
};
