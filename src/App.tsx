import { useEffect, useState } from 'react';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useAppState } from './hooks/useAppState';
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
import { isPromoPopupSuppressed, suppressPromoPopupForOneHour } from './utils/promo';

function App() {
  const state = useAppState();
  const handlers = useAppHandlers(state);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [dontShowPromo, setDontShowPromo] = useState(false);

  useEffect(() => {
    if (state.view !== 'user-home') {
      setShowPromoPopup(false);
      setDontShowPromo(false);
      return;
    }

    if (isPromoPopupSuppressed()) {
      setShowPromoPopup(false);
      setDontShowPromo(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDontShowPromo(false);
      setShowPromoPopup(true);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [state.view]);

  const handleClosePromoPopup = () => {
    if (dontShowPromo) {
      suppressPromoPopupForOneHour();
    }

    setShowPromoPopup(false);
    setDontShowPromo(false);
  };

  const renderAuthPage = () => {
    switch (state.view) {
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
            onToggleConfirmPassword={() => state.setShowConfirmPassword((value) => !value)}
            onSwitchToLogin={() => handlers.handleAuthViewChange('login')}
            onSubmit={handlers.handleFormSubmit}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPage
            username={state.username}
            onUsernameChange={state.setUsername}
            onSubmit={handlers.handleFormSubmit}
            onBack={() => handlers.handleAuthViewChange('login')}
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
            onForgotPassword={() => handlers.handleAuthViewChange('forgot-password')}
            onSubmit={handlers.handleFormSubmit}
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
            onForgotPassword={() => handlers.handleAuthViewChange('forgot-password')}
            onSwitchToRegister={() => handlers.handleAuthViewChange('register')}
            onSubmit={handlers.handleFormSubmit}
          />
        );
    }
  };

  const renderUserPage = () => {
    switch (state.activeUserTab) {
      case 'borrow':
        return <BorrowPage onSelectCategory={handlers.handleSelectCategory} />;
      case 'category_detail':
        return state.selectedCategoryId ? (
          <CategoryDetailPage
            categoryId={state.selectedCategoryId}
            onBack={() => handlers.handleUserTabChange('borrow')}
            onReserve={handlers.handleReserveItem}
          />
        ) : (
          <BorrowPage onSelectCategory={handlers.handleSelectCategory} />
        );
      case 'status':
        return <ReservationStatusPage onBack={() => handlers.handleUserTabChange('home')} />;
      case 'contact':
        return (
          <ContactAdminPage
            onBack={() => handlers.handleUserTabChange('home')}
            onSuccess={handlers.handleContactSuccess}
          />
        );
      case 'user':
        return (
          <UserProfilePage
            username={state.username}
            userReservations={state.userReservations}
            onOpenChangePassword={() => handlers.handleUserTabChange('change_password')}
            onOpenHistory={() => handlers.handleUserTabChange('history')}
            onLogout={handlers.handleLogout}
          />
        );
      case 'history':
        return (
          <HistoryPage
            filter={state.historyDateFilter}
            onFilterChange={(value) => state.setHistoryDateFilter(value)}
            onClearFilter={() => state.setHistoryDateFilter('')}
            onBack={() => handlers.handleUserTabChange('user')}
          />
        );
      case 'change_password':
        return (
          <ChangePasswordPage
            onBack={() => handlers.handleUserTabChange('user')}
            onSuccess={handlers.handlePasswordChangeSuccess}
            onError={handlers.handlePasswordChangeError}
          />
        );
      default:
        return (
          <UserHomePage
            activeUsers={state.activeUsers}
            totalReservations={state.totalReservations}
            onStartBorrow={() => handlers.handleUserTabChange('borrow')}
            onContact={() => handlers.handleUserTabChange('contact')}
          />
        );
    }
  };

  return (
    <>
      <div className="systemhub-auth-stage relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-10 pt-10 font-sans text-gray-200">
        <div className="systemhub-auth-ambient pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-side-fade pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-vignette pointer-events-none absolute inset-0 z-0"></div>
        <div className="systemhub-auth-focus pointer-events-none absolute left-1/2 top-[4.5rem] z-0 h-[34rem] w-[54rem] -translate-x-1/2"></div>
        <div className="systemhub-auth-horizon pointer-events-none absolute left-0 right-0 top-[6.25rem] z-0 h-px opacity-80"></div>

        {state.view === 'user-home' ? (
          <div className="z-10 w-full max-w-[1200px] min-h-screen p-4 md:p-8">
            <Navbar items={USER_NAV_ITEMS} activeTab={state.activeUserTab} onSelect={handlers.handleUserTabChange} />
            {renderUserPage()}
          </div>
        ) : state.view === 'dashboard' ? (
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
            onLogout={handlers.handleLogout}
          />
        ) : (
          <>
            <div className="systemhub-auth-tabs relative z-10 mb-12 flex animate-fade-up rounded-full p-1.5 backdrop-blur-md">
              {AUTH_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = state.view === tab.id;
                const activeClass = tab.id === 'admin'
                  ? 'systemhub-auth-admin-btn text-white'
                  : 'systemhub-auth-primary-btn text-white';

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handlers.handleAuthViewChange(tab.id)}
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
