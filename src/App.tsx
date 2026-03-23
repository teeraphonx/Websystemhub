import { useEffect, useState, type FormEventHandler } from 'react';
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
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppState } from './hooks/useAppState';
import { isPromoPopupSuppressed, suppressPromoPopupForOneHour } from './utils/promo';
import { getAuthValidationResult } from './utils/validation';

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
  const {
    activeUserTab,
    selectedCategoryId,
    setActiveUserTab,
    setSelectedCategoryId,
    setView,
    view,
  } = state;
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = resolveAppRoute(location.pathname);
  const routeKind = currentRoute?.kind ?? null;
  const routeView = currentRoute?.view ?? null;
  const routeUserTab = currentRoute?.kind === 'user' ? currentRoute.userTab : null;
  const routeCategoryId =
    currentRoute?.kind === 'user' ? currentRoute.categoryId : null;
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
    routeCategoryId,
    routeKind,
    routeUserTab,
    routeView,
    selectedCategoryId,
    setActiveUserTab,
    setSelectedCategoryId,
    setView,
    view,
  ]);

  useEffect(() => {
    if (!isUserHomeRoute || isPromoPopupSuppressed()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDontShowPromo(false);
      setShowPromoPopup(true);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
      setShowPromoPopup(false);
      setDontShowPromo(false);
    };
  }, [isUserHomeRoute]);

  const handleClosePromoPopup = () => {
    if (dontShowPromo) {
      suppressPromoPopupForOneHour();
    }

    setShowPromoPopup(false);
    setDontShowPromo(false);
  };

  const handleAuthRouteChange = (nextView: AuthView) => {
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

  const handleAuthSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    if (currentRoute?.kind === 'auth') {
      const validation = getAuthValidationResult({
        view: currentRoute.view,
        username: state.username,
        password: state.password,
        confirmPassword: state.confirmPassword,
      });

      handlers.handleFormSubmit(event);

      if (!validation.modal) {
        const nextPath =
          currentRoute.view === 'forgot-password'
            ? getPathForAuthView('login')
            : getPostAuthPath(currentRoute.view);

        window.setTimeout(() => {
          navigate(nextPath);
        }, REDIRECT_DELAY_MS);
      }

      return;
    }

    handlers.handleFormSubmit(event);
  };

  const handleLogout = () => {
    handlers.handleLogout();
    navigate(DEFAULT_ROUTE);
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
            username={state.username}
            password={state.password}
            confirmPassword={state.confirmPassword}
            showPassword={state.showPassword}
            showConfirmPassword={state.showConfirmPassword}
            onUsernameChange={state.setUsername}
            onPasswordChange={state.setPassword}
            onConfirmPasswordChange={state.setConfirmPassword}
            onTogglePassword={() => state.setShowPassword((value) => !value)}
            onToggleConfirmPassword={() =>
              state.setShowConfirmPassword((value) => !value)
            }
            onSwitchToLogin={() => handleAuthRouteChange('login')}
            onSubmit={handleAuthSubmit}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPage
            username={state.username}
            onUsernameChange={state.setUsername}
            onSubmit={handleAuthSubmit}
            onBack={() => handleAuthRouteChange('login')}
          />
        );
      case 'admin':
        return (
          <AdminLoginPage
            username={state.username}
            password={state.password}
            showPassword={state.showPassword}
            rememberMe={state.rememberMe}
            onUsernameChange={state.setUsername}
            onPasswordChange={state.setPassword}
            onTogglePassword={() => state.setShowPassword((value) => !value)}
            onToggleRememberMe={() => state.setRememberMe((value) => !value)}
            onForgotPassword={() => handleAuthRouteChange('forgot-password')}
            onSubmit={handleAuthSubmit}
          />
        );
      default:
        return (
          <LoginPage
            username={state.username}
            password={state.password}
            showPassword={state.showPassword}
            rememberMe={state.rememberMe}
            onUsernameChange={state.setUsername}
            onPasswordChange={state.setPassword}
            onTogglePassword={() => state.setShowPassword((value) => !value)}
            onToggleRememberMe={() => state.setRememberMe((value) => !value)}
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
            username={state.username}
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
                    onClick={() => handleAuthRouteChange(tab.id)}
                    className={`flex items-center space-x-3 rounded-full px-8 py-3 text-[13px] font-bold transition-all duration-300 ${isActive ? activeClass : 'bg-transparent text-[var(--systemhub-text-subtle)] hover:text-white'}`}
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
        isOpen={showPromoPopup && state.view === 'user-home'}
        dontShowForHour={dontShowPromo}
        onToggleDontShow={() => setDontShowPromo((value) => !value)}
        onClose={handleClosePromoPopup}
      />
    </>
  );
}

export default App;
