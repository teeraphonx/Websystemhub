import { useEffect, useState, type FormEventHandler } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { AppView, AuthView, CategoryId, UserTab } from './types';
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
import HistoryPage from './pages/user/HistoryPage';
import ChangePasswordPage from './pages/user/ChangePasswordPage';
import DashboardPage from './pages/admin/DashboardPage';
import {
  auth,
  createUserProfile,
  getFirebaseAuth,
  getUserProfile,
  isAdminEmail,
  resolveEmailForAuth,
  setFirebaseAuthPersistence,
} from './lib/firebase';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppState } from './hooks/useAppState';
import { createSuccessModal } from './utils/modal';
import {
  isPromoPopupSuppressed,
  suppressPromoPopupForOneHour,
} from './utils/promo';
import {
  createAdminAccessDeniedModal,
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
const REDIRECT_DELAY_MS = 1400;
const CATEGORY_IDS: CategoryId[] = ['it', 'av', 'furniture', 'inspection'];

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
      return '/admin';
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
      return '/home';
  }
};

const getPostAuthPath = (view: AuthView) =>
  view === 'admin' ? '/dashboard' : '/home';

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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [postAuthRedirectPath, setPostAuthRedirectPath] = useState<string | null>(null);
  const {
    activeUserTab,
    username,
    email,
    password,
    confirmPassword,
    rememberMe,
    selectedCategoryId,
    setActiveUserTab,
    setActiveUsers,
    setAdminDateFilter,
    setConfirmPassword,
    setEmail,
    setHistoryDateFilter,
    setModalState,
    setPassword,
    setRememberMe,
    setSelectedCategoryId,
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
  const isAdminUser = isAdminEmail(authUser?.email);
  const authenticatedRedirectPath = isAdminUser ? '/dashboard' : '/home';

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
          const profile = await getUserProfile(nextUser.uid);

          if (!isMounted) {
            return;
          }

          setUsername(profile?.username ?? nextUser.email?.split('@')[0] ?? '');
        } catch {
          if (!isMounted) {
            return;
          }

          setUsername(nextUser.email?.split('@')[0] ?? '');
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
    if (!isAuthReady || !authUser || !isUserHomeRoute || isPromoPopupSuppressed()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDontShowPromo(false);
      setShowPromoPopup(true);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
      setShowPromoPopup(false);
      setDontShowPromo(false);
    };
  }, [authUser, isAuthReady, isUserHomeRoute]);

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

        if (currentRoute.view === 'admin' && !isAdminEmail(resolvedEmail)) {
          setModalState(createAdminAccessDeniedModal());
          return;
        }

        await setFirebaseAuthPersistence(rememberMe);
        await signInWithEmailAndPassword(
          getFirebaseAuth(),
          resolvedEmail,
          password,
        );
      }

      const successCopy = getAuthSuccessMessage(currentRoute.view);
      const nextPath = getPostAuthPath(currentRoute.view);
      setPostAuthRedirectPath(nextPath);
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

  const handleLogout = async () => {
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

  const handlePasswordChangeSuccess = () => {
    handlers.handlePasswordChangeSuccess();
    window.setTimeout(() => {
      navigate(getPathForUserTab('user'));
    }, REDIRECT_DELAY_MS);
  };

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
            onBack={() => handleUserRouteChange('borrow')}
            onReserve={handlers.handleReserveItem}
          />
        ) : (
          <BorrowPage onSelectCategory={handleCategoryRouteChange} />
        );
      case 'status':
        return (
          <ReservationStatusPage onBack={() => handleUserRouteChange('home')} />
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
            onLogout={handleLogout}
          />
        );
      case 'history':
        return (
          <HistoryPage
            filter={state.historyDateFilter}
            onFilterChange={(value) => state.setHistoryDateFilter(value)}
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
            onStartBorrow={() => handleUserRouteChange('borrow')}
            onContact={() => handleUserRouteChange('contact')}
          />
        );
    }
  };

  if (!currentRoute) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }

  if (!isAuthReady) {
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
            กำลังตรวจสอบสถานะการเข้าสู่ระบบ
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            โปรดรอสักครู่ ระบบกำลังเชื่อมต่อ Firebase Authentication
          </p>
        </div>
      </div>
    );
  }

  if (currentRoute.kind === 'dashboard' && !isAdminUser) {
    return <Navigate to={authUser ? '/home' : '/admin'} replace />;
  }

  if (currentRoute.kind === 'user' && !authUser) {
    return <Navigate to={DEFAULT_ROUTE} replace />;
  }

  if (currentRoute.kind === 'auth' && authUser && !postAuthRedirectPath) {
    return <Navigate to={authenticatedRedirectPath} replace />;
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
            adminDateFilter={state.adminDateFilter}
            adminCalendarView={state.adminCalendarView}
            onDateFilterChange={(value) => state.setAdminDateFilter(value)}
            onPrevMonth={handlers.handlePrevMonth}
            onNextMonth={handlers.handleNextMonth}
            onSelectDate={handlers.handleSelectAdminDate}
            onUpdateStatus={handlers.handleUpdateBookingStatus}
            onLogout={handleLogout}
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


