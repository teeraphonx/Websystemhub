import type { FormEvent } from 'react';
import type {
  AdminBookingStatus,
  AppState,
  CalendarDayType,
  CategoryId,
  EquipmentItem,
  UserTab,
} from '../types';
import { createSuccessModal, createWarningModal } from '../utils/modal';
import {
  getAuthSuccessMessage,
  getAuthValidationResult,
  isAuthView,
} from '../utils/validation';

const AUTO_CLOSE_MS = 1400;

export const useAppHandlers = (state: AppState) => {
  const closeModal = () => {
    state.setModalState((current) => ({ ...current, isOpen: false }));
  };

  const handleAuthViewChange = (nextView: AppState['view']) => {
    state.setView(nextView);
    if (nextView !== 'register') {
      state.setConfirmPassword('');
      state.setShowConfirmPassword(false);
    }
    if (nextView === 'forgot-password') {
      state.setPassword('');
      state.setShowPassword(false);
    }
  };

  const handleUserTabChange = (tab: UserTab) => {
    state.setActiveUserTab(tab);
    if (tab === 'home' || tab === 'borrow') {
      state.setSelectedCategoryId(null);
    }
  };

  const handleSelectCategory = (categoryId: CategoryId) => {
    state.setSelectedCategoryId(categoryId);
    state.setActiveUserTab('category_detail');
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthView(state.view)) {
      return;
    }

    const currentView = state.view;
    const validation = getAuthValidationResult({
      view: currentView,
      username: state.username,
      password: state.password,
      confirmPassword: state.confirmPassword,
    });

    if (validation.modal) {
      state.setModalState(validation.modal);

      if (validation.issue === 'invalid-credentials') {
        state.setUsername('');
        state.setPassword('');
      }

      if (validation.issue === 'password-mismatch') {
        state.setPassword('');
        state.setConfirmPassword('');
      }

      return;
    }

    const successCopy = getAuthSuccessMessage(currentView);
    state.setModalState(createSuccessModal(successCopy.title, successCopy.desc));

    if (currentView === 'forgot-password') {
      window.setTimeout(() => {
        closeModal();
        handleAuthViewChange('login');
      }, AUTO_CLOSE_MS);
      return;
    }

    if (currentView === 'login' || currentView === 'register') {
      state.setActiveUsers((count) => count + 1);
    }

    window.setTimeout(() => {
      closeModal();
      state.setActiveUserTab('home');
      state.setSelectedCategoryId(null);
      state.setView(currentView === 'admin' ? 'dashboard' : 'user-home');
    }, AUTO_CLOSE_MS);
  };

  const handleLogout = () => {
    const shouldDecrementActiveUsers = state.view === 'user-home';

    state.setUsername('');
    state.setPassword('');
    state.setConfirmPassword('');
    state.setRememberMe(false);
    state.setShowPassword(false);
    state.setShowConfirmPassword(false);
    state.setUserReservations(0);
    state.setHistoryDateFilter('');
    state.setAdminDateFilter('');
    state.setSelectedCategoryId(null);
    state.setActiveUserTab('home');
    state.setView('login');

    if (shouldDecrementActiveUsers) {
      state.setActiveUsers((count) => Math.max(count - 1, 0));
    }
  };

  const handleReserveItem = (item: EquipmentItem) => {
    state.setTotalReservations((count) => count + 1);
    state.setUserReservations((count) => count + 1);
    state.setModalState(
      createSuccessModal(
        'ทำรายการสำเร็จ',
        `คุณได้ทำการจอง ${item.name} เรียบร้อยแล้ว`,
      ),
    );

    window.setTimeout(closeModal, AUTO_CLOSE_MS);
  };

  const handleUpdateBookingStatus = (
    id: string,
    newStatus: AdminBookingStatus,
  ) => {
    state.setAdminBookings((bookings) =>
      bookings.map((booking) =>
        booking.id === id ? { ...booking, status: newStatus } : booking,
      ),
    );
    state.setModalState(
      createSuccessModal(
        'ทำรายการสำเร็จ',
        `อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`,
      ),
    );
    window.setTimeout(closeModal, 1200);
  };

  const handlePasswordChangeSuccess = () => {
    state.setModalState(
      createSuccessModal('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'),
    );
    window.setTimeout(() => {
      closeModal();
      state.setActiveUserTab('user');
    }, AUTO_CLOSE_MS);
  };

  const handlePasswordChangeError = (message: string) => {
    state.setModalState(createWarningModal('แจ้งเตือน', message));
  };

  const handleContactSuccess = () => {
    state.setModalState(
      createSuccessModal(
        'ส่งข้อความสำเร็จ',
        'ผู้ดูแลระบบจะรีบดำเนินการตรวจสอบและติดต่อกลับ',
      ),
    );
    window.setTimeout(closeModal, 1800);
  };

  const handlePrevMonth = () => {
    state.setAdminCalendarView(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    state.setAdminCalendarView(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  const handleSelectAdminDate = (
    dateString: string,
    type: CalendarDayType,
  ) => {
    state.setAdminDateFilter((current) =>
      current === dateString ? '' : dateString,
    );

    if (type === 'prev') {
      handlePrevMonth();
    }

    if (type === 'next') {
      handleNextMonth();
    }
  };

  return {
    closeModal,
    handleAuthViewChange,
    handleUserTabChange,
    handleSelectCategory,
    handleFormSubmit,
    handleLogout,
    handleReserveItem,
    handleUpdateBookingStatus,
    handlePasswordChangeSuccess,
    handlePasswordChangeError,
    handleContactSuccess,
    handlePrevMonth,
    handleNextMonth,
    handleSelectAdminDate,
  };
};
