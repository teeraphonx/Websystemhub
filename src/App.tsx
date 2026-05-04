import { useCallback, useEffect, useRef, useState, type FormEventHandler } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type {
  AdminBooking,
  AppView,
  AuthView,
  BookingScheduleInput,
  CategoryId,
  EquipmentItem,
  HistoryRecord,
  UserTab,
} from './types';
import { AUTH_TABS, USER_NAV_ITEMS } from './constants/views';
import Modal from './components/common/Modal';
import PromoPopup from './components/common/PromoPopup';
import Navbar from './components/common/Navbar';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import UserHomePage from './pages/user/UserHomePage';
import BorrowPage from './pages/user/BorrowPage';
import CategoryDetailPage from './pages/user/CategoryDetailPage';
import ReservationStatusPage from './pages/user/ReservationStatusPage';
import ContactAdminPage from './pages/user/ContactAdminPage';
import UserProfilePage from './pages/user/UserProfilePage';
import ChangePasswordPage from './pages/user/ChangePasswordPage';
import HistoryPage from './pages/user/HistoryPage';
import VerifyOrganizationPage from './pages/user/VerifyOrganizationPage';
import DashboardPage from './pages/admin/DashboardPage';
import { appDataStore } from './lib/appDataStore';
import {
  getAdminAuth,
  hasAdminAccess,
  isAdminFirebaseConfigured,
  setAdminFirebaseAuthPersistence,
} from './lib/adminFirebase';
import {
  auth,
  validateVerificationCardImageFile,
  createUserProfile,
  getFirebaseAuth,
  getUserProfile,
  isVerifiedOrganizationProfile,
  resolveEmailForAuth,
  setFirebaseAuthPersistence,
  submitOrganizationVerificationRequest,
  updateUserActivity,
  type UserProfileRecord,
} from './lib/firebase';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppState } from './hooks/useAppState';
import { createErrorModal, createSuccessModal } from './utils/modal';
import {
  clearPromoPopupSuppression,
  isPromoPopupSuppressed,
  suppressPromoPopupForOneHour,
} from './utils/promo';
import {
  buildUserActivityIdentityKeys,
  persistUserActivityIdentityRegistry,
  pruneUserActivityIdentityRegistry,
  readUserActivityIdentityRegistry,
} from './utils/userActivityPresence';
import {
  createAdminFirebaseNotConfiguredModal,
  getAuthSuccessMessage,
  getAuthValidationResult,
  getFirebaseAuthErrorModal,
} from './utils/validation';

type AuthRouteState = {
  kind: 'auth';
  view: AuthView;
};

type UserRouteState = {
  kind: 'user';
  view: Extract<AppView, 'user-home'>;
  userTab: UserTab;
  categoryId: CategoryId | null;
};

type DashboardRouteState = {
  kind: 'dashboard';
  view: Extract<AppView, 'dashboard'>;
};

type AppRouteState = AuthRouteState | UserRouteState | DashboardRouteState;

const DEFAULT_ROUTE = '/login';
const ADMIN_ROUTE = '/admin';
const DASHBOARD_ROUTE = '/dashboard';
const USER_HOME_ROUTE = '/home';
const VERIFY_EMAIL_ROUTE = '/verify-email';
const VERIFY_ORGANIZATION_ROUTE = '/verify-organization';
const REDIRECT_DELAY_MS = 1400;
const PROMO_POPUP_DELAY_MS = 120;
const PROMO_AFTER_AUTH_BUFFER_MS = 500;
const ORGANIZATION_VERIFICATION_SUBMIT_TIMEOUT_MS = 95_000;
const USER_ACTIVITY_HEARTBEAT_MS = 60000;
const USER_ACTIVITY_TABS_STORAGE_KEY = 'systemhub-user-activity-tabs-v1';
const USER_ACTIVITY_TAB_STALE_MS = USER_ACTIVITY_HEARTBEAT_MS * 3;
const CATEGORY_IDS: CategoryId[] = ['it', 'av', 'furniture', 'inspection'];
const HISTORY_TIME_PATTERN = /(\d{1,2}:\d{2})/;
const DEFAULT_PICKUP_LOCATION = 'ฝ่ายอำนวยการ | งานส่งกำลังบำรุงและงานเทคโนฯ';

const withSubmissionTimeout = async <T,>(
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

const getAdminAccessErrorMessage = (uid: string, error?: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as { code?: unknown; message?: unknown };
    const errorCode =
      typeof errorRecord.code === 'string' ? errorRecord.code.trim() : '';
    const errorMessage =
      typeof errorRecord.message === 'string' ? errorRecord.message.trim() : '';

    if (
      errorCode === 'permission-denied' ||
      errorCode === 'firestore/permission-denied' ||
      errorMessage.includes('Missing or insufficient permissions')
    ) {
      return `ยังอ่านสิทธิ์แอดมินไม่ได้ กรุณาเพิ่ม custom claim admin=true หรือ role=admin, เปิดสิทธิ์ให้อ่านเอกสาร admins/${uid} หรือ admins/{email} ใน Firestore หรือเพิ่ม UID ไว้ใน VITE_ADMIN_ALLOWED_UIDS หรืออีเมลไว้ใน VITE_ADMIN_ALLOWED_EMAILS บน host ที่ใช้ deploy ก่อน โปรดทราบว่าไฟล์ .env ในเครื่องไม่ถูก push ขึ้น GitHub`;
    }
  }

  return `บัญชีนี้ยังไม่ได้รับสิทธิ์หน้าแอดมิน กรุณาเพิ่ม custom claim admin=true หรือ role=admin, สร้างเอกสาร admins/${uid} หรือ admins/{email} ใน Firestore แล้วตั้ง active=true/role=admin หรือเพิ่ม UID ไว้ใน VITE_ADMIN_ALLOWED_UIDS หรืออีเมลไว้ใน VITE_ADMIN_ALLOWED_EMAILS บน host ที่ใช้ deploy ก่อน โปรดทราบว่าไฟล์ .env ในเครื่องไม่ถูก push ขึ้น GitHub`;
};

const getEmailVerificationActionSettings = () => ({
  url: `${window.location.origin}${VERIFY_EMAIL_ROUTE}`,
  handleCodeInApp: false,
});

const normalizeIdentity = (value: string) => value.trim().toLowerCase();

const getSortableTime = (value: string) =>
  value.match(HISTORY_TIME_PATTERN)?.[1] ?? '';

type UserActivityTabRegistry = Record<string, Record<string, number>>;

const createUserActivityTabId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const readUserActivityTabRegistry = (): UserActivityTabRegistry => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(USER_ACTIVITY_TABS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (typeof parsedValue !== 'object' || parsedValue === null) {
      return {};
    }

    const normalizedRegistry: UserActivityTabRegistry = {};

    Object.entries(parsedValue as Record<string, unknown>).forEach(
      ([uid, value]) => {
        if (!uid.trim() || typeof value !== 'object' || value === null) {
          return;
        }

        const entries = Object.entries(value as Record<string, unknown>).filter(
          ([tabId, timestamp]) =>
            tabId.trim() &&
            typeof timestamp === 'number' &&
            Number.isFinite(timestamp),
        );

        if (entries.length === 0) {
          return;
        }

        normalizedRegistry[uid] = entries.reduce<Record<string, number>>(
          (currentTabs, [tabId, timestamp]) => {
            currentTabs[tabId] = timestamp as number;
            return currentTabs;
          },
          {},
        );
      },
    );

    return normalizedRegistry;
  } catch {
    return {};
  }
};

const persistUserActivityTabRegistry = (registry: UserActivityTabRegistry) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    USER_ACTIVITY_TABS_STORAGE_KEY,
    JSON.stringify(registry),
  );
};

const pruneUserActivityTabRegistry = (
  registry: UserActivityTabRegistry,
  now: number,
) => {
  const nextRegistry: UserActivityTabRegistry = {};

  Object.entries(registry).forEach(([uid, tabs]) => {
    const activeTabs = Object.entries(tabs).filter(
      ([tabId, lastSeenAt]) =>
        tabId.trim() &&
        Number.isFinite(lastSeenAt) &&
        now - lastSeenAt <= USER_ACTIVITY_TAB_STALE_MS,
    );

    if (activeTabs.length > 0) {
      nextRegistry[uid] = activeTabs.reduce<Record<string, number>>(
        (currentTabs, [tabId, lastSeenAt]) => {
          currentTabs[tabId] = lastSeenAt as number;
          return currentTabs;
        },
        {},
      );
    }
  });

  return nextRegistry;
};

const sortBookingsNewestFirst = (left: AdminBooking, right: AdminBooking) => {
  if (left.date !== right.date) {
    return right.date.localeCompare(left.date);
  }

  const leftTime = getSortableTime(left.time);
  const rightTime = getSortableTime(right.time);

  if (leftTime !== rightTime) {
    return rightTime.localeCompare(leftTime);
  }

  return right.id.localeCompare(left.id);
};

const filterBookingsForViewer = (
  bookings: AdminBooking[],
  currentUsername: string,
  currentEmail: string,
) => {
  const viewerIdentities = [currentUsername, currentEmail]
    .map(normalizeIdentity)
    .filter(Boolean);

  if (viewerIdentities.length === 0) {
    return [];
  }

  return bookings.filter((booking) =>
    [booking.user, booking.userEmail ?? ''].some((identity) =>
      viewerIdentities.includes(normalizeIdentity(identity)),
    ),
  );
};

const getDisplayBookingStatus = (status: AdminBooking['status']) =>
  status === 'รออนุมัติ' ? 'รอตรวจสอบ' : status;

const formatHistoryDateTime = (dateKey: string, time: string) => {
  const matchedTime = time.match(HISTORY_TIME_PATTERN)?.[1];

  return matchedTime ? `${dateKey} ${matchedTime}` : dateKey;
};

const createHistoryRecordsFromBookings = (
  bookings: AdminBooking[],
): HistoryRecord[] =>
  [...bookings].sort(sortBookingsNewestFirst).map((booking) => ({
    id: booking.id,
    itemName: booking.itemName,
    details: [
      `รหัสครุภัณฑ์: ${booking.itemId}`,
      `จำนวนที่จอง: ${booking.requestedQuantity} ชิ้น`,
      `ช่วงยืม: ${booking.date} ${getSortableTime(booking.time) || booking.time}${
        booking.returnDate
          ? ` - ${booking.returnDate} ${
              booking.returnTime
                ? getSortableTime(booking.returnTime) || booking.returnTime
                : ''
            }`
          : ''
      }`,
      `สถานที่รับครุภัณฑ์: ${DEFAULT_PICKUP_LOCATION}`,
    ],
    status: getDisplayBookingStatus(booking.status),
    date: formatHistoryDateTime(booking.date, booking.time),
  }));

const normalizePathname = (pathname: string) => {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

const getPathForAuthView = (view: AuthView) => {
  switch (view) {
    case 'register':
      return '/register';
    case 'forgot-password':
      return '/forgot-password';
    case 'verify-email':
      return VERIFY_EMAIL_ROUTE;
    case 'admin':
      return ADMIN_ROUTE;
    default:
      return DEFAULT_ROUTE;
  }
};

const getPathForUserTab = (
  tab: UserTab,
  categoryId?: CategoryId | null,
) => {
  switch (tab) {
    case 'borrow':
      return '/borrow';
    case 'category_detail':
      return categoryId ? `/borrow/${categoryId}` : '/borrow';
    case 'status':
      return '/status';
    case 'contact':
      return '/contact';
    case 'user':
      return '/profile';
    case 'history':
      return '/profile/history';
    case 'change_password':
      return '/profile/change-password';
    case 'verify_organization':
      return VERIFY_ORGANIZATION_ROUTE;
    default:
      return USER_HOME_ROUTE;
  }
};

const getPostAuthPath = (view: AuthView) => {
  if (view === 'admin') {
    return DASHBOARD_ROUTE;
  }

  if (view === 'register') {
    return VERIFY_EMAIL_ROUTE;
  }

  return USER_HOME_ROUTE;
};

const getUserDisplayName = (
  user: FirebaseUser,
  options: {
    profileUsername?: string | null;
    fallbackUsername?: string | null;
  } = {},
) => {
  const currentAuthUser = getFirebaseAuth().currentUser;
  const syncedDisplayName =
    currentAuthUser?.uid === user.uid ? currentAuthUser.displayName?.trim() : '';

  return (
    options.profileUsername?.trim() ||
    syncedDisplayName ||
    user.displayName?.trim() ||
    options.fallbackUsername?.trim() ||
    ''
  );
};

const resolveAppRoute = (pathname: string): AppRouteState | null => {
  const normalizedPathname = normalizePathname(pathname);

  switch (normalizedPathname) {
    case '/login':
      return { kind: 'auth', view: 'login' };
    case '/register':
      return { kind: 'auth', view: 'register' };
    case '/forgot-password':
      return { kind: 'auth', view: 'forgot-password' };
    case '/verify-email':
      return { kind: 'auth', view: 'verify-email' };
    case '/admin':
      return { kind: 'auth', view: 'admin' };
    case '/dashboard':
      return { kind: 'dashboard', view: 'dashboard' };
    case '/home':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'home',
        categoryId: null,
      };
    case '/borrow':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'borrow',
        categoryId: null,
      };
    case '/status':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'status',
        categoryId: null,
      };
    case '/contact':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'contact',
        categoryId: null,
      };
    case '/profile':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'user',
        categoryId: null,
      };
    case '/profile/history':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'history',
        categoryId: null,
      };
    case '/profile/change-password':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'change_password',
        categoryId: null,
      };
    case '/verify-organization':
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'verify_organization',
        categoryId: null,
      };
    default:
      break;
  }

  if (normalizedPathname.startsWith('/borrow/')) {
    const routeCategoryId = normalizedPathname.replace('/borrow/', '');

    if (CATEGORY_IDS.includes(routeCategoryId as CategoryId)) {
      return {
        kind: 'user',
        view: 'user-home',
        userTab: 'category_detail',
        categoryId: routeCategoryId as CategoryId,
      };
    }

    return {
      kind: 'user',
      view: 'user-home',
      userTab: 'borrow',
      categoryId: null,
    };
  }

  return null;
};

function App() {
  const state = useAppState();
  const handlers = useAppHandlers(state);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [dontShowPromo, setDontShowPromo] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfileRecord | null>(null);
  const [hasLoadedUserProfile, setHasLoadedUserProfile] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdminAuthReady, setIsAdminAuthReady] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isEmailVerificationSubmitting, setIsEmailVerificationSubmitting] =
    useState(false);
  const [
    isOrganizationVerificationSubmitting,
    setIsOrganizationVerificationSubmitting,
  ] = useState(false);
  const [verificationFullName, setVerificationFullName] = useState('');
  const [verificationCardNumber, setVerificationCardNumber] = useState('');
  const [verificationDivision, setVerificationDivision] = useState('');
  const [verificationCardImage, setVerificationCardImage] = useState<File | null>(
    null,
  );
  const [postAuthRedirectPath, setPostAuthRedirectPath] = useState<string | null>(null);
  const [promoReadyAt, setPromoReadyAt] = useState(0);
  const userActivityTabIdRef = useRef(createUserActivityTabId());
  const lastUserActivitySyncAtRef = useRef(0);
  const {
    activeUserTab,
    username,
    email,
    password,
    confirmPassword,
    rememberMe,
    adminUsername,
    adminPassword,
    adminRememberMe,
    selectedCategoryId,
    setActiveUserTab,
    setActiveUsers,
    setAppData,
    setAdminDateFilter,
    setAdminPassword,
    setAdminRememberMe,
    setAdminUsername,
    setConfirmPassword,
    setEmail,
    setHistoryDateFilter,
    setModalState,
    setPassword,
    setRememberMe,
    setSelectedCategoryId,
    setShowAdminPassword,
    setShowConfirmPassword,
    setShowPassword,
    setUsername,
    setUserReservations,
    setView,
    view,
  } = state;
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = resolveAppRoute(location.pathname);
  const isUserHomeRoute =
    currentRoute?.kind === 'user' && currentRoute.userTab === 'home';

  useEffect(() => {
    if (!currentRoute) {
      return;
    }

    if (view !== currentRoute.view) {
      setView(currentRoute.view);
    }

    if (currentRoute.kind === 'user') {
      if (activeUserTab !== currentRoute.userTab) {
        setActiveUserTab(currentRoute.userTab);
      }

      if (selectedCategoryId !== currentRoute.categoryId) {
        setSelectedCategoryId(currentRoute.categoryId);
      }

      return;
    }

    if (selectedCategoryId !== null) {
      setSelectedCategoryId(null);
    }
  }, [
    activeUserTab,
    currentRoute,
    selectedCategoryId,
    setActiveUserTab,
    setSelectedCategoryId,
    setView,
    view,
  ]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      void (async () => {
        setAuthUser(nextUser);
        setActiveUsers(nextUser ? 1 : 0);
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setHasLoadedUserProfile(false);

        if (!nextUser) {
          if (!isMounted) {
            return;
          }

          setCurrentUserProfile(null);
          setPostAuthRedirectPath(null);
          setPromoReadyAt(0);
          setUsername('');
          setEmail('');
          setVerificationFullName('');
          setVerificationCardNumber('');
          setVerificationDivision('');
          setVerificationCardImage(null);
          setRememberMe(false);
          setUserReservations(0);
          setHistoryDateFilter('');
          setAdminDateFilter('');
          setSelectedCategoryId(null);
          setActiveUserTab('home');
          setIsAuthReady(true);
          return;
        }

        setEmail(nextUser.email ?? '');

        try {
          const profile = await getUserProfile(nextUser.uid, nextUser.email ?? '');

          if (!isMounted) {
            return;
          }

          setCurrentUserProfile(profile);
          setHasLoadedUserProfile(true);
          setVerificationFullName(profile?.fullName ?? '');
          setVerificationDivision(profile?.organizationDivision ?? '');
          setUsername((currentUsername) =>
            getUserDisplayName(nextUser, {
              profileUsername: profile?.username,
              fallbackUsername: currentUsername,
            }),
          );
        } catch {
          if (!isMounted) {
            return;
          }

          setHasLoadedUserProfile(true);
          setCurrentUserProfile(null);
          setVerificationFullName('');
          setVerificationDivision('');
          setUsername((currentUsername) =>
            getUserDisplayName(nextUser, {
              fallbackUsername: currentUsername,
            }),
          );
        }

        if (isMounted) {
          setIsAuthReady(true);
        }
      })();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [
    setActiveUserTab,
    setActiveUsers,
    setAdminDateFilter,
    setConfirmPassword,
    setEmail,
    setHistoryDateFilter,
    setPassword,
    setRememberMe,
    setSelectedCategoryId,
    setShowConfirmPassword,
    setShowPassword,
    setUsername,
    setUserReservations,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!isAdminFirebaseConfigured()) {
      setAdminUser(null);
      setIsAdminAuthReady(true);
      return () => undefined;
    }

    const unsubscribe = onAuthStateChanged(getAdminAuth(), (nextUser) => {
      void (async () => {
        if (!isMounted) {
          return;
        }

        if (!nextUser) {
          setAdminUser(null);
          setIsAdminAuthReady(true);
          setAdminPassword('');
          setShowAdminPassword(false);
          return;
        }

        setIsAdminAuthReady(false);

        try {
          const isAdminAuthorized = await hasAdminAccess(
            nextUser.uid,
            nextUser.email ?? '',
          );

          if (!isMounted) {
            return;
          }

          if (!isAdminAuthorized) {
            setAdminUser(null);
            setAdminPassword('');
            setShowAdminPassword(false);
            await firebaseSignOut(getAdminAuth()).catch(() => undefined);
            return;
          }

          setAdminUser(nextUser);
          setAdminUsername(nextUser.email ?? '');
        } catch {
          if (!isMounted) {
            return;
          }

          setAdminUser(null);
        } finally {
          if (isMounted) {
            setIsAdminAuthReady(true);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setAdminPassword, setAdminUsername, setShowAdminPassword]);

  useEffect(() => {
    if (
      !isAuthReady ||
      !authUser ||
      !isUserHomeRoute ||
      postAuthRedirectPath ||
      state.modalState.isOpen ||
      isPromoPopupSuppressed()
    ) {
      return;
    }

    const delayMs = Math.max(PROMO_POPUP_DELAY_MS, promoReadyAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      setDontShowPromo(false);
      setShowPromoPopup(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      setShowPromoPopup(false);
      setDontShowPromo(false);
    };
  }, [
    authUser,
    isAuthReady,
    isUserHomeRoute,
    postAuthRedirectPath,
    promoReadyAt,
    state.modalState.isOpen,
  ]);

  const handleClosePromoPopup = () => {
    if (dontShowPromo) {
      suppressPromoPopupForOneHour();
    }

    setShowPromoPopup(false);
    setDontShowPromo(false);
  };

  const syncUserActivityTabPresence = useCallback((uid: string) => {
    const now = Date.now();
    const nextRegistry = pruneUserActivityTabRegistry(
      readUserActivityTabRegistry(),
      now,
    );
    const currentTabs = {
      ...(nextRegistry[uid] ?? {}),
      [userActivityTabIdRef.current]: now,
    };

    nextRegistry[uid] = currentTabs;
    persistUserActivityTabRegistry(nextRegistry);

    return now;
  }, []);

  const syncUserActivityIdentityPresence = useCallback(
    (uid: string, identityKeys: string[], now: number) => {
      const nextRegistry = pruneUserActivityIdentityRegistry(
        readUserActivityIdentityRegistry(),
        USER_ACTIVITY_TAB_STALE_MS,
        now,
      );

      identityKeys.forEach((identityKey) => {
        nextRegistry[identityKey] = {
          uid,
          lastSeenAt: now,
        };
      });

      persistUserActivityIdentityRegistry(nextRegistry);
    },
    [],
  );

  const clearUserActivityTabPresence = useCallback((uid: string) => {
    const now = Date.now();
    const nextRegistry = pruneUserActivityTabRegistry(
      readUserActivityTabRegistry(),
      now,
    );
    const currentTabs = { ...(nextRegistry[uid] ?? {}) };

    delete currentTabs[userActivityTabIdRef.current];

    if (Object.keys(currentTabs).length > 0) {
      nextRegistry[uid] = currentTabs;
    } else {
      delete nextRegistry[uid];
    }

    persistUserActivityTabRegistry(nextRegistry);

    return Object.keys(currentTabs).length;
  }, []);

  const clearAllUserActivityTabPresence = useCallback((uid: string) => {
    const nextRegistry = pruneUserActivityTabRegistry(
      readUserActivityTabRegistry(),
      Date.now(),
    );

    if (!nextRegistry[uid]) {
      return false;
    }

    delete nextRegistry[uid];
    persistUserActivityTabRegistry(nextRegistry);
    return true;
  }, []);

  const clearUserActivityIdentityPresence = useCallback(
    (uid: string, identityKeys: string[]) => {
      const nextRegistry = pruneUserActivityIdentityRegistry(
        readUserActivityIdentityRegistry(),
        USER_ACTIVITY_TAB_STALE_MS,
        Date.now(),
      );
      let hasChanges = false;

      identityKeys.forEach((identityKey) => {
        if (nextRegistry[identityKey]?.uid !== uid) {
          return;
        }

        delete nextRegistry[identityKey];
        hasChanges = true;
      });

      if (hasChanges) {
        persistUserActivityIdentityRegistry(nextRegistry);
      }
    },
    [],
  );

  const updateCurrentUserActivity = useCallback(
    async (isActive: boolean) => {
      const activityUser = getFirebaseAuth().currentUser ?? authUser;

      if (!activityUser || !currentUserProfile) {
        return;
      }

      try {
        await updateUserActivity({
          uid: activityUser.uid,
          email: activityUser.email ?? email,
          normalizedUsername: currentUserProfile?.normalizedUsername,
          isActive,
        });
      } catch (error) {
        console.error('Failed to sync user activity.', error);
      }
    },
    [authUser, currentUserProfile, email],
  );

  const clearCurrentUserPresenceForLogout = useCallback(async () => {
    const activityUser = getFirebaseAuth().currentUser ?? authUser;

    if (!activityUser) {
      return;
    }

    clearAllUserActivityTabPresence(activityUser.uid);
    clearUserActivityIdentityPresence(
      activityUser.uid,
      buildUserActivityIdentityKeys({
        uid: activityUser.uid,
        email: activityUser.email ?? email,
        normalizedUsername: currentUserProfile?.normalizedUsername ?? '',
      }),
    );
    lastUserActivitySyncAtRef.current = 0;
    await updateCurrentUserActivity(false);
  }, [
    authUser,
    clearAllUserActivityTabPresence,
    clearUserActivityIdentityPresence,
    currentUserProfile?.normalizedUsername,
    email,
    updateCurrentUserActivity,
  ]);

  useEffect(() => {
    if (!authUser || !currentUserProfile) {
      return () => undefined;
    }

    const currentUserUid = authUser.uid;
    const currentUserIdentityKeys = buildUserActivityIdentityKeys({
      uid: currentUserUid,
      email: authUser.email ?? email,
      normalizedUsername: currentUserProfile.normalizedUsername,
    });
    const syncActive = (forceRefresh = false) => {
      const now = syncUserActivityTabPresence(currentUserUid);
      syncUserActivityIdentityPresence(
        currentUserUid,
        currentUserIdentityKeys,
        now,
      );

      if (
        !forceRefresh &&
        now - lastUserActivitySyncAtRef.current < USER_ACTIVITY_HEARTBEAT_MS / 2
      ) {
        return;
      }

      lastUserActivitySyncAtRef.current = now;
      void updateCurrentUserActivity(true);
    };
    const syncInactiveIfLastTab = () => {
      const remainingTabs = clearUserActivityTabPresence(currentUserUid);

      if (remainingTabs > 0) {
        return;
      }

      clearUserActivityIdentityPresence(
        currentUserUid,
        currentUserIdentityKeys,
      );
      lastUserActivitySyncAtRef.current = 0;
      void updateCurrentUserActivity(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncActive(true);
      }
    };
    const handleFocus = () => {
      syncActive(true);
    };
    const handleInteraction = () => {
      syncActive(false);
    };

    syncActive(true);

    const intervalId = window.setInterval(
      () => syncActive(true),
      USER_ACTIVITY_HEARTBEAT_MS,
    );

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('pointerdown', handleInteraction, {
      passive: true,
    });
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('pagehide', syncInactiveIfLastTab);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('pagehide', syncInactiveIfLastTab);
      syncInactiveIfLastTab();
    };
  }, [
    authUser,
    clearUserActivityIdentityPresence,
    clearUserActivityTabPresence,
    currentUserProfile,
    email,
    syncUserActivityIdentityPresence,
    syncUserActivityTabPresence,
    updateCurrentUserActivity,
  ]);

  const handleAuthRouteChange = (nextView: AuthView) => {
    if (isAuthSubmitting) {
      return;
    }

    setPostAuthRedirectPath(null);
    handlers.handleAuthViewChange(nextView);
    navigate(getPathForAuthView(nextView));
  };

  const handleUserRouteChange = (tab: UserTab) => {
    handlers.handleUserTabChange(tab);
    navigate(getPathForUserTab(tab));
  };

  const handleCategoryRouteChange = (categoryId: CategoryId) => {
    handlers.handleSelectCategory(categoryId);
    navigate(getPathForUserTab('category_detail', categoryId));
  };

  const handleAuthSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!currentRoute || currentRoute.kind !== 'auth' || isAuthSubmitting) {
      return;
    }

    if (currentRoute.view === 'admin') {
      const adminValidation = getAuthValidationResult({
        view: 'admin',
        username: adminUsername,
        email: '',
        password: adminPassword,
        confirmPassword: '',
      });

      if (adminValidation.modal) {
        setModalState(adminValidation.modal);
        return;
      }

      try {
        setIsAuthSubmitting(true);
        setPostAuthRedirectPath(DASHBOARD_ROUTE);

        if (!isAdminFirebaseConfigured()) {
          setModalState(createAdminFirebaseNotConfiguredModal());
          setPostAuthRedirectPath(null);
          return;
        }

        await setAdminFirebaseAuthPersistence(adminRememberMe);
        const adminCredential = await signInWithEmailAndPassword(
          getAdminAuth(),
          adminUsername.trim(),
          adminPassword,
        );

        let isAdminAuthorized = false;

        try {
          isAdminAuthorized = await hasAdminAccess(
            adminCredential.user.uid,
            adminCredential.user.email ?? '',
            { forceRefreshToken: true },
          );
        } catch (error) {
          await firebaseSignOut(getAdminAuth()).catch(() => undefined);
          setPostAuthRedirectPath(null);
          setModalState(
            createErrorModal(
              'ตรวจสอบสิทธิ์แอดมินไม่สำเร็จ',
              getAdminAccessErrorMessage(adminCredential.user.uid, error),
            ),
          );
          return;
        }

        if (!isAdminAuthorized) {
          await firebaseSignOut(getAdminAuth());
          setPostAuthRedirectPath(null);
          setModalState(
            createErrorModal(
              'ไม่มีสิทธิ์เข้าใช้งาน',
              getAdminAccessErrorMessage(adminCredential.user.uid),
            ),
          );
          return;
        }

        const successCopy = getAuthSuccessMessage('admin');
        setModalState(createSuccessModal(successCopy.title, successCopy.desc));

        window.setTimeout(() => {
          handlers.closeModal();
          setPostAuthRedirectPath(null);
          navigate(DASHBOARD_ROUTE);
        }, REDIRECT_DELAY_MS);
      } catch (error) {
        console.error('Admin login failed', error);
        setPostAuthRedirectPath(null);
        setModalState(getFirebaseAuthErrorModal(error, 'admin'));
      } finally {
        setIsAuthSubmitting(false);
      }

      return;
    }

    const validation = getAuthValidationResult({
      view: currentRoute.view,
      username,
      email,
      password,
      confirmPassword,
    });

    if (validation.modal) {
      setModalState(validation.modal);
      return;
    }

    try {
      setIsAuthSubmitting(true);
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      let nextPath = getPostAuthPath(currentRoute.view);

      if (currentRoute.view !== 'forgot-password') {
        setPostAuthRedirectPath(nextPath);
      }

      if (currentRoute.view === 'forgot-password') {
        const resolvedEmail = await resolveEmailForAuth(trimmedUsername);
        await sendPasswordResetEmail(getFirebaseAuth(), resolvedEmail);
        const successCopy = getAuthSuccessMessage(currentRoute.view);
        setModalState(createSuccessModal(successCopy.title, successCopy.desc));

        window.setTimeout(() => {
          handlers.closeModal();
          handleAuthRouteChange('login');
        }, REDIRECT_DELAY_MS);
        return;
      }

      if (currentRoute.view === 'register') {
        await setFirebaseAuthPersistence(true);
        const userCredential = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          trimmedEmail,
          password,
        );
        await updateProfile(userCredential.user, {
          displayName: trimmedUsername,
        });

        try {
          await createUserProfile({
            uid: userCredential.user.uid,
            username: trimmedUsername,
            email: trimmedEmail,
          });
          const registeredAt = Date.now();
          setCurrentUserProfile({
            uid: userCredential.user.uid,
            username: trimmedUsername,
            normalizedUsername: trimmedUsername.trim().toLowerCase(),
            email: trimmedEmail,
            officerId: '',
            fullName: '',
            organizationUnit: '',
            organizationDivision: '',
            organizationStatus: 'pending',
            organizationVerifiedAt: 0,
            isActive: true,
            lastActiveAt: registeredAt,
            activityUpdatedAt: registeredAt,
            createdAt: registeredAt,
          });
          setUsername((currentUsername) =>
            getUserDisplayName(userCredential.user, {
              profileUsername: trimmedUsername,
              fallbackUsername: currentUsername || trimmedUsername,
            }),
          );
          setEmail(trimmedEmail);
        } catch (error) {
          await deleteUser(userCredential.user).catch(async () => {
            await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
          });
          throw error;
        }

        await sendEmailVerification(
          userCredential.user,
          getEmailVerificationActionSettings(),
        );
      } else {
        const resolvedEmail = await resolveEmailForAuth(trimmedUsername);
        await setFirebaseAuthPersistence(rememberMe);
        const userCredential = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          resolvedEmail,
          password,
        );

        const profile = await getUserProfile(
          userCredential.user.uid,
          userCredential.user.email ?? resolvedEmail,
        );

        await userCredential.user.reload();

        if (!userCredential.user.emailVerified) {
          nextPath = VERIFY_EMAIL_ROUTE;
          setPostAuthRedirectPath(nextPath);
        }

        setCurrentUserProfile(profile);
        setUsername((currentUsername) =>
          getUserDisplayName(userCredential.user, {
            profileUsername: profile?.username,
            fallbackUsername: currentUsername || trimmedUsername,
          }),
        );
        setEmail(userCredential.user.email ?? resolvedEmail);
      }

      const successCopy =
        nextPath === VERIFY_EMAIL_ROUTE
          ? {
              title: 'ยืนยันอีเมล',
              desc: 'ระบบส่งอีเมลยืนยันให้แล้ว กรุณาตรวจสอบกล่องจดหมายก่อนเข้าใช้งาน',
            }
          : getAuthSuccessMessage(currentRoute.view);
      if (nextPath === USER_HOME_ROUTE) {
        clearPromoPopupSuppression();
        setPromoReadyAt(
          Date.now() + REDIRECT_DELAY_MS + PROMO_AFTER_AUTH_BUFFER_MS,
        );
      }
      setModalState(createSuccessModal(successCopy.title, successCopy.desc));

      window.setTimeout(() => {
        handlers.closeModal();
        setPostAuthRedirectPath(null);
        navigate(nextPath);
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      setPostAuthRedirectPath(null);
      setModalState(getFirebaseAuthErrorModal(error, currentRoute.view));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleUserLogout = async () => {
    try {
      if (authUser) {
        await clearCurrentUserPresenceForLogout();
        await firebaseSignOut(getFirebaseAuth());
      }

      handlers.handleLogout();
      setPostAuthRedirectPath(null);
      navigate(DEFAULT_ROUTE);
    } catch (error) {
      setModalState(getFirebaseAuthErrorModal(error, 'login'));
    }
  };

  const handleAdminLogout = async () => {
    try {
      if (adminUser) {
        await firebaseSignOut(getAdminAuth());
      }

      setPostAuthRedirectPath(null);
      setAdminUsername('');
      setAdminPassword('');
      setAdminRememberMe(false);
      setShowAdminPassword(false);
      navigate(ADMIN_ROUTE);
    } catch (error) {
      setModalState(getFirebaseAuthErrorModal(error, 'admin'));
    }
  };

  const handlePasswordChangeSuccess = () => {
    handlers.handlePasswordChangeSuccess();
    window.setTimeout(() => {
      navigate(getPathForUserTab('user'));
    }, REDIRECT_DELAY_MS);
  };

  const handleResendEmailVerification = async () => {
    const currentUser = getFirebaseAuth().currentUser;

    if (!currentUser?.email) {
      setModalState(
        createErrorModal(
          'ไม่พบอีเมล',
          'กรุณาเข้าสู่ระบบอีกครั้งก่อนส่งอีเมลยืนยัน',
        ),
      );
      return;
    }

    try {
      setIsEmailVerificationSubmitting(true);
      await sendEmailVerification(
        currentUser,
        getEmailVerificationActionSettings(),
      );
      setModalState(
        createSuccessModal(
          'ส่งอีเมลแล้ว',
          'กรุณาตรวจสอบกล่องจดหมายและกดลิงก์ยืนยันอีเมล',
        ),
      );
      window.setTimeout(handlers.closeModal, REDIRECT_DELAY_MS);
    } catch (error) {
      setModalState(getFirebaseAuthErrorModal(error, 'verify-email'));
    } finally {
      setIsEmailVerificationSubmitting(false);
    }
  };

  const handleCheckEmailVerification = async () => {
    const currentUser = getFirebaseAuth().currentUser;

    if (!currentUser) {
      setModalState(
        createErrorModal(
          'ไม่พบ session',
          'กรุณาเข้าสู่ระบบอีกครั้งก่อนตรวจสอบสถานะอีเมล',
        ),
      );
      return;
    }

    try {
      setIsEmailVerificationSubmitting(true);
      await currentUser.reload();

      if (!currentUser.emailVerified) {
        setModalState(
          createErrorModal(
            'ยังไม่ได้ยืนยันอีเมล',
            'กรุณากดลิงก์ยืนยันในอีเมลก่อน แล้วกลับมาตรวจสอบอีกครั้ง',
          ),
        );
        return;
      }

      const nextPath = USER_HOME_ROUTE;

      setPostAuthRedirectPath(nextPath);
      setAuthUser(currentUser);
      clearPromoPopupSuppression();
      setPromoReadyAt(
        Date.now() + REDIRECT_DELAY_MS + PROMO_AFTER_AUTH_BUFFER_MS,
      );
      setModalState(
        createSuccessModal(
          'ยืนยันสำเร็จ',
          'อีเมลของคุณผ่านการยืนยันแล้ว กำลังพาเข้าสู่ระบบ',
        ),
      );

      window.setTimeout(() => {
        handlers.closeModal();
        setPostAuthRedirectPath(null);
        navigate(nextPath);
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      setModalState(getFirebaseAuthErrorModal(error, 'verify-email'));
    } finally {
      setIsEmailVerificationSubmitting(false);
    }
  };

  const handleBackToLoginFromVerification = async () => {
    try {
      if (authUser) {
        await clearCurrentUserPresenceForLogout();
        await firebaseSignOut(getFirebaseAuth());
      }

      handlers.handleLogout();
      setPostAuthRedirectPath(null);
      navigate(DEFAULT_ROUTE);
    } catch (error) {
      setModalState(getFirebaseAuthErrorModal(error, 'verify-email'));
    }
  };

  const handleVerificationCardImageChange = (file: File | null) => {
    try {
      validateVerificationCardImageFile(file);
      setVerificationCardImage(file);
    } catch (error) {
      setVerificationCardImage(null);
      setModalState(
        createErrorModal(
          'ไฟล์รูปไม่ถูกต้อง',
          error instanceof Error && error.message.trim()
            ? error.message
            : 'ไม่สามารถใช้ไฟล์รูปนี้ได้ กรุณาเลือกไฟล์ใหม่อีกครั้ง',
        ),
      );
    }
  };

  const handleOrganizationVerificationSubmit: FormEventHandler<HTMLFormElement> =
    async (event) => {
      event.preventDefault();

      if (!authUser?.email) {
        setModalState(
          createErrorModal(
            'ไม่พบ session',
            'กรุณาเข้าสู่ระบบอีกครั้งก่อนยืนยันตัวตน',
          ),
        );
        return;
      }

      try {
        setIsOrganizationVerificationSubmitting(true);
        const updatedProfile = await withSubmissionTimeout(
          submitOrganizationVerificationRequest({
            uid: authUser.uid,
            email: authUser.email,
            fullName: verificationFullName,
            division: verificationDivision,
            cardNumber: verificationCardNumber,
            cardImage: verificationCardImage,
          }),
          ORGANIZATION_VERIFICATION_SUBMIT_TIMEOUT_MS,
          'ส่งคำขอยืนยันตัวตนใช้เวลานานเกินไป กรุณารีเฟรชหน้า ตรวจสอบอินเทอร์เน็ต แล้วลองส่งใหม่อีกครั้ง',
        );

        setCurrentUserProfile(updatedProfile);
        setHasLoadedUserProfile(true);
        setVerificationCardNumber('');
        setVerificationFullName(updatedProfile?.fullName ?? verificationFullName);
        setVerificationDivision(updatedProfile?.organizationDivision ?? verificationDivision);
        setVerificationCardImage(null);
        setPostAuthRedirectPath(null);
        setModalState(
          createSuccessModal(
            'ส่งคำขอสำเร็จ',
            'ระบบได้รับรูปบัตรและเลขบัตรแล้ว กรุณารอแอดมินตรวจสอบและอนุมัติบัญชี',
          ),
        );

        window.setTimeout(() => {
          handlers.closeModal();
        }, REDIRECT_DELAY_MS);
      } catch (error) {
        console.error('Failed to submit organization verification request.', error);
        setModalState(
          createErrorModal(
            'ส่งคำขอไม่สำเร็จ',
            error instanceof Error
              ? error.message
              : 'ไม่สามารถส่งคำขอยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง',
          ),
        );
      } finally {
        setIsOrganizationVerificationSubmitting(false);
      }
    };

  const canReserveEquipment =
    isVerifiedOrganizationProfile(currentUserProfile);
  const handleVerifiedReserveItem = (
    item: EquipmentItem,
    schedule?: BookingScheduleInput,
  ) => {
    if (!canReserveEquipment) {
      setModalState(
        createErrorModal(
          'ต้องยืนยันตัวตนก่อนจอง',
          'กรุณายืนยันตัวตนในหน้าข้อมูลผู้ใช้ และรอแอดมินอนุมัติก่อนทำรายการจองครุภัณฑ์',
        ),
      );
      return;
    }

    void handlers.handleReserveItem(item, schedule);
  };

  const viewerBookings = filterBookingsForViewer(
    state.adminBookings,
    username,
    authUser?.email ?? email,
  );
  const handleAdminEquipmentCatalogChanged = useCallback(async () => {
    const nextSnapshot = await appDataStore.resetSnapshot();
    setAppData(nextSnapshot);
  }, [setAppData]);
  const approvedViewerBookings = viewerBookings.filter(
    (booking) => booking.status === 'อนุมัติแล้ว',
  );
  const sourceHistoryItems = createHistoryRecordsFromBookings(approvedViewerBookings);
  const historyItems = state.historyDateFilter
    ? sourceHistoryItems.filter(
        (item) => item.date.slice(0, 10) === state.historyDateFilter,
      )
    : sourceHistoryItems;
  const historyEmptyMessage = state.historyDateFilter
    ? 'ไม่พบรายการจองในวันที่เลือก'
    : 'ยังไม่มีประวัติการจองที่แอดมินอนุมัติแล้ว';
  const shouldShowAuthTabs =
    currentRoute?.kind === 'auth' && currentRoute.view !== 'verify-email';
  const shouldShowUserNavigation =
    currentRoute?.kind === 'user' &&
    currentRoute.userTab !== 'verify_organization';

  const renderAuthPage = () => {
    if (!currentRoute || currentRoute.kind !== 'auth') {
      return null;
    }

    switch (currentRoute.view) {
      case 'register':
        return (
          <RegisterPage
            username={username}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            showPassword={state.showPassword}
            showConfirmPassword={state.showConfirmPassword}
            isSubmitting={isAuthSubmitting}
            onUsernameChange={setUsername}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onToggleConfirmPassword={() =>
              setShowConfirmPassword((value) => !value)
            }
            onSwitchToLogin={() => handleAuthRouteChange('login')}
            onSubmit={handleAuthSubmit}
          />
        );
      case 'verify-email':
        return (
          <VerifyEmailPage
            email={authUser?.email ?? email}
            isVerified={authUser?.emailVerified ?? false}
            isSubmitting={isEmailVerificationSubmitting}
            onResendVerification={handleResendEmailVerification}
            onCheckVerification={handleCheckEmailVerification}
            onBackToLogin={handleBackToLoginFromVerification}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPage
            username={username}
            isSubmitting={isAuthSubmitting}
            onUsernameChange={setUsername}
            onSubmit={handleAuthSubmit}
            onBack={() => handleAuthRouteChange('login')}
          />
        );
      case 'admin':
        return (
          <AdminLoginPage
            username={adminUsername}
            password={adminPassword}
            showPassword={state.showAdminPassword}
            rememberMe={adminRememberMe}
            isSubmitting={isAuthSubmitting}
            onUsernameChange={setAdminUsername}
            onPasswordChange={setAdminPassword}
            onTogglePassword={() => setShowAdminPassword((value) => !value)}
            onToggleRememberMe={() => setAdminRememberMe((value) => !value)}
            onSubmit={handleAuthSubmit}
          />
        );
      default:
        return (
          <LoginPage
            username={username}
            password={password}
            showPassword={state.showPassword}
            rememberMe={rememberMe}
            isSubmitting={isAuthSubmitting}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onTogglePassword={() => setShowPassword((value) => !value)}
            onToggleRememberMe={() => setRememberMe((value) => !value)}
            onForgotPassword={() => handleAuthRouteChange('forgot-password')}
            onSwitchToRegister={() => handleAuthRouteChange('register')}
            onSubmit={handleAuthSubmit}
          />
        );
    }
  };

  const renderUserPage = () => {
    if (!currentRoute || currentRoute.kind !== 'user') {
      return null;
    }

    switch (currentRoute.userTab) {
      case 'verify_organization':
        return (
          <VerifyOrganizationPage
            email={authUser?.email ?? email}
            fullName={verificationFullName}
            division={verificationDivision}
            cardNumber={verificationCardNumber}
            cardImage={verificationCardImage}
            hasSubmittedRequest={Boolean(
              currentUserProfile?.organizationVerificationRequestedAt ||
                currentUserProfile?.organizationVerificationRequestStatus === 'pending',
            )}
            isSubmitting={isOrganizationVerificationSubmitting}
            onFullNameChange={setVerificationFullName}
            onDivisionChange={setVerificationDivision}
            onCardNumberChange={setVerificationCardNumber}
            onCardImageChange={handleVerificationCardImageChange}
            onSubmit={handleOrganizationVerificationSubmit}
            onBackToProfile={() => handleUserRouteChange('user')}
          />
        );
      case 'borrow':
        return <BorrowPage onSelectCategory={handleCategoryRouteChange} />;
      case 'category_detail':
        return currentRoute.categoryId ? (
          <CategoryDetailPage
            categoryId={currentRoute.categoryId}
            items={state.categoryItems[currentRoute.categoryId]}
            onBack={() => handleUserRouteChange('borrow')}
            canReserve={canReserveEquipment}
            onReserve={handleVerifiedReserveItem}
            onOpenVerification={() => handleUserRouteChange('verify_organization')}
          />
        ) : (
          <BorrowPage onSelectCategory={handleCategoryRouteChange} />
        );
      case 'status':
        return (
          <ReservationStatusPage
            bookings={state.adminBookings}
            categoryItems={state.categoryItems}
            currentUsername={username}
            currentEmail={authUser?.email ?? email}
            onBack={() => handleUserRouteChange('home')}
          />
        );
      case 'contact':
        return (
          <ContactAdminPage
            onBack={() => handleUserRouteChange('home')}
            onSuccess={handlers.handleContactSuccess}
          />
        );
      case 'user':
        return (
          <UserProfilePage
            username={username}
            email={authUser?.email ?? email}
            fullName={currentUserProfile?.fullName ?? ''}
            organizationDivision={currentUserProfile?.organizationDivision ?? ''}
            organizationStatus={currentUserProfile?.organizationStatus ?? 'pending'}
            organizationVerificationRequestStatus={
              currentUserProfile?.organizationVerificationRequestStatus
            }
            userReservations={state.userReservations}
            onOpenVerification={() => handleUserRouteChange('verify_organization')}
            onOpenChangePassword={() => handleUserRouteChange('change_password')}
            onOpenHistory={() => handleUserRouteChange('history')}
            onLogout={handleUserLogout}
          />
        );
      case 'history':
        return (
          <HistoryPage
            filter={state.historyDateFilter}
            items={historyItems}
            emptyMessage={historyEmptyMessage}
            onFilterChange={state.setHistoryDateFilter}
            onClearFilter={() => state.setHistoryDateFilter('')}
            onBack={() => handleUserRouteChange('user')}
          />
        );
      case 'change_password':
        return (
          <ChangePasswordPage
            onBack={() => handleUserRouteChange('user')}
            onSuccess={handlePasswordChangeSuccess}
            onError={handlers.handlePasswordChangeError}
          />
        );
      default:
        return (
          <UserHomePage
            activeUsers={state.activeUsers}
            totalReservations={state.totalReservations}
            categoryItems={state.categoryItems}
            onStartBorrow={() => handleUserRouteChange('borrow')}
            onContact={() => handleUserRouteChange('contact')}
          />
        );
    }
  };

  if (!currentRoute) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }

  const shouldShowFirebaseBootstrap =
    !state.isAppDataReady ||
    (!isAuthReady && currentRoute.kind === 'user') ||
    (isAuthReady &&
      currentRoute.kind === 'user' &&
      Boolean(authUser) &&
      !hasLoadedUserProfile) ||
    (!isAuthReady && currentRoute.kind === 'auth' && currentRoute.view !== 'admin') ||
    (!isAdminAuthReady &&
      (currentRoute.kind === 'dashboard' ||
        (currentRoute.kind === 'auth' && currentRoute.view === 'admin')));

  if (shouldShowFirebaseBootstrap) {
    return (
      <div className="systemhub-auth-stage relative flex min-h-screen items-center justify-center overflow-hidden px-4 font-sans text-gray-200">
        <div className="systemhub-auth-ambient pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-side-fade pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-vignette pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-panel relative z-10 w-full max-w-[440px] rounded-3xl p-10 text-center backdrop-blur-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--systemhub-accent)]">
            SystemHub
          </p>
          <h1 className="mt-4 text-2xl font-black text-white">
            กำลังเตรียมข้อมูลระบบ
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            โปรดรอสักครู่ ระบบกำลังเชื่อมต่อ Firebase Authentication และชั้นข้อมูลของแอป
          </p>
        </div>
      </div>
    );
  }

  if (currentRoute.kind === 'dashboard' && !adminUser) {
    return <Navigate to={ADMIN_ROUTE} replace />;
  }

  if (
    currentRoute.kind === 'auth' &&
    currentRoute.view === 'verify-email' &&
    !authUser
  ) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }

  if (currentRoute.kind === 'user' && !authUser) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }

  if (currentRoute.kind === 'user' && authUser && !authUser.emailVerified) {
    return <Navigate to={VERIFY_EMAIL_ROUTE} replace />;
  }

  if (
    currentRoute.kind === 'user' &&
    currentRoute.userTab === 'verify_organization' &&
    isVerifiedOrganizationProfile(currentUserProfile)
  ) {
    return <Navigate to={USER_HOME_ROUTE} replace />;
  }

  if (
    currentRoute.kind === 'auth' &&
    currentRoute.view === 'admin' &&
    adminUser &&
    !postAuthRedirectPath
  ) {
    return <Navigate to={DASHBOARD_ROUTE} replace />;
  }

  if (
    currentRoute.kind === 'auth' &&
    currentRoute.view !== 'admin' &&
    authUser &&
    !postAuthRedirectPath
  ) {
    if (!authUser.emailVerified) {
      if (currentRoute.view !== 'verify-email') {
        return <Navigate to={VERIFY_EMAIL_ROUTE} replace />;
      }
    } else {
      return <Navigate to={USER_HOME_ROUTE} replace />;
    }
  }

  return (
    <>
      <div className="systemhub-auth-stage relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-10 pt-10 font-sans text-gray-200">
        <div className="systemhub-auth-ambient pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-side-fade pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-vignette pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-focus pointer-events-none absolute left-1/2 top-[4.5rem] z-0 h-[34rem] w-[54rem] -translate-x-1/2"></div>
        <div className="systemhub-auth-horizon pointer-events-none absolute left-0 right-0 top-[6.25rem] z-0 h-px opacity-80"></div>

        {currentRoute.kind === 'user' ? (
          <div className="z-10 min-h-screen w-full max-w-[1200px] p-4 md:p-8">
            {shouldShowUserNavigation && (
              <Navbar
                items={USER_NAV_ITEMS}
                activeTab={currentRoute.userTab}
                onSelect={handleUserRouteChange}
              />
            )}
            {renderUserPage()}
          </div>
        ) : currentRoute.kind === 'dashboard' ? (
          <DashboardPage
            activeUsers={state.activeUsers}
            adminBookings={state.adminBookings}
            adminNotifications={state.adminNotifications}
            adminDateFilter={state.adminDateFilter}
            adminCalendarView={state.adminCalendarView}
            onDateFilterChange={(value) => state.setAdminDateFilter(value)}
            onPrevMonth={handlers.handlePrevMonth}
            onNextMonth={handlers.handleNextMonth}
            onSelectDate={handlers.handleSelectAdminDate}
            onUpdateStatus={handlers.handleUpdateBookingStatus}
            onUpdateAvailableQuantity={handlers.handleUpdateBookingAvailableQuantity}
            onMarkAllNotificationsRead={handlers.handleMarkAllAdminNotificationsRead}
            onEquipmentCatalogChanged={handleAdminEquipmentCatalogChanged}
            onLogout={handleAdminLogout}
          />
        ) : (
          <>
            {shouldShowAuthTabs && (
              <div className="systemhub-auth-tabs relative z-10 mb-12 flex animate-fade-up rounded-full p-1.5 backdrop-blur-md">
                {AUTH_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive =
                    currentRoute.kind === 'auth' && currentRoute.view === tab.id;
                  const activeClass =
                    tab.id === 'admin'
                      ? 'systemhub-auth-admin-btn text-white'
                      : 'systemhub-auth-primary-btn text-white';

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isAuthSubmitting}
                      onClick={() => handleAuthRouteChange(tab.id)}
                      className={`flex items-center space-x-3 rounded-full px-8 py-3 text-[13px] font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? activeClass : 'bg-transparent text-[var(--systemhub-text-subtle)] hover:text-white'}`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {renderAuthPage()}
          </>
        )}
      </div>

      <Modal state={state.modalState} onClose={handlers.closeModal} />
      <PromoPopup
        isOpen={showPromoPopup && isUserHomeRoute}
        dontShowForHour={dontShowPromo}
        onToggleDontShow={() => setDontShowPromo((value) => !value)}
        onClose={handleClosePromoPopup}
      />
    </>
  );
}

export default App;
