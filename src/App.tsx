import { useEffect, useState, type FormEventHandler } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
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
  CategoryId,
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
import AdminLoginPage from './pages/auth/AdminLoginPage';
import UserHomePage from './pages/user/UserHomePage';
import BorrowPage from './pages/user/BorrowPage';
import CategoryDetailPage from './pages/user/CategoryDetailPage';
import ReservationStatusPage from './pages/user/ReservationStatusPage';
import ContactAdminPage from './pages/user/ContactAdminPage';
import UserProfilePage from './pages/user/UserProfilePage';
import ChangePasswordPage from './pages/user/ChangePasswordPage';
import HistoryPage from './pages/user/HistoryPage';
import DashboardPage from './pages/admin/DashboardPage';
import {
  getAdminAuth,
  isAdminFirebaseConfigured,
  setAdminFirebaseAuthPersistence,
} from './lib/adminFirebase';
import {
  auth,
  createUserProfile,
  getFirebaseAuth,
  getUserProfile,
  resolveEmailForAuth,
  setFirebaseAuthPersistence,
} from './lib/firebase';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppState } from './hooks/useAppState';
import { createSuccessModal } from './utils/modal';
import {
  clearPromoPopupSuppression,
  isPromoPopupSuppressed,
  suppressPromoPopupForOneHour,
} from './utils/promo';
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
const REDIRECT_DELAY_MS = 1400;
const PROMO_POPUP_DELAY_MS = 120;
const PROMO_AFTER_AUTH_BUFFER_MS = 500;
const CATEGORY_IDS: CategoryId[] = ['it', 'av', 'furniture', 'inspection'];
const HISTORY_TIME_PATTERN = /(\d{1,2}:\d{2})/;
const DEFAULT_PICKUP_LOCATION = 'ฝ่ายอำนวยการ';

const normalizeIdentity = (value: string) => value.trim().toLowerCase();

const getSortableTime = (value: string) =>
  value.match(HISTORY_TIME_PATTERN)?.[1] ?? '';

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
    default:
      return USER_HOME_ROUTE;
  }
};

const getPostAuthPath = (view: AuthView) =>
  view === 'admin' ? DASHBOARD_ROUTE : USER_HOME_ROUTE;

const getUserDisplayName = (
  user: FirebaseUser,
  profileUsername?: string | null,
) =>
  profileUsername?.trim() ||
  user.displayName?.trim() ||
  user.email?.split('@')[0] ||
  '';

const resolveAppRoute = (pathname: string): AppRouteState | null => {
  const normalizedPathname = normalizePathname(pathname);

  switch (normalizedPathname) {
    case '/login':
      return { kind: 'auth', view: 'login' };
    case '/register':
      return { kind: 'auth', view: 'register' };
    case '/forgot-password':
      return { kind: 'auth', view: 'forgot-password' };
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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAdminAuthReady, setIsAdminAuthReady] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [postAuthRedirectPath, setPostAuthRedirectPath] = useState<string | null>(null);
  const [promoReadyAt, setPromoReadyAt] = useState(0);
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

        if (!nextUser) {
          if (!isMounted) {
            return;
          }

          setPostAuthRedirectPath(null);
          setPromoReadyAt(0);
          setUsername('');
          setEmail('');
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

          setUsername(getUserDisplayName(nextUser, profile?.username));
        } catch {
          if (!isMounted) {
            return;
          }

          setUsername(getUserDisplayName(nextUser));
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
      if (!isMounted) {
        return;
      }

      setAdminUser(nextUser);
      setIsAdminAuthReady(true);

      if (!nextUser) {
        setAdminPassword('');
        setShowAdminPassword(false);
        return;
      }

      setAdminUsername(nextUser.email ?? '');
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
        await signInWithEmailAndPassword(
          getAdminAuth(),
          adminUsername.trim(),
          adminPassword,
        );

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
      const nextPath = getPostAuthPath(currentRoute.view);

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
          setUsername(trimmedUsername);
          setEmail(trimmedEmail);
        } catch (error) {
          await deleteUser(userCredential.user).catch(async () => {
            await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
          });
          throw error;
        }
      } else {
        const resolvedEmail = await resolveEmailForAuth(trimmedUsername);
        await setFirebaseAuthPersistence(rememberMe);
        const userCredential = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          resolvedEmail,
          password,
        );
        try {
          const profile = await getUserProfile(
            userCredential.user.uid,
            userCredential.user.email ?? resolvedEmail,
          );

          setUsername(getUserDisplayName(userCredential.user, profile?.username));
        } catch {
          setUsername(getUserDisplayName(userCredential.user));
        }

        setEmail(userCredential.user.email ?? resolvedEmail);
      }

      const successCopy = getAuthSuccessMessage(currentRoute.view);
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

  const viewerBookings = filterBookingsForViewer(
    state.adminBookings,
    username,
    authUser?.email ?? email,
  );
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
      case 'borrow':
        return <BorrowPage onSelectCategory={handleCategoryRouteChange} />;
      case 'category_detail':
        return currentRoute.categoryId ? (
          <CategoryDetailPage
            categoryId={currentRoute.categoryId}
            items={state.categoryItems[currentRoute.categoryId]}
            onBack={() => handleUserRouteChange('borrow')}
            onReserve={handlers.handleReserveItem}
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
            userReservations={state.userReservations}
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

  if (currentRoute.kind === 'user' && !authUser) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
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
    return <Navigate to={USER_HOME_ROUTE} replace />;
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
            <Navbar
              items={USER_NAV_ITEMS}
              activeTab={currentRoute.userTab}
              onSelect={handleUserRouteChange}
            />
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
            onLogout={handleAdminLogout}
          />
        ) : (
          <>
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
