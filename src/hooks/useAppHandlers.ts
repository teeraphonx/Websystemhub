import type {
  AdminBookingStatus,
  AppState,
  CalendarDayType,
  CategoryId,
  EquipmentItem,
  UserTab,
} from '../types';
import { createSuccessModal, createWarningModal } from '../utils/modal';

const AUTO_CLOSE_MS = 1400;

export const useAppHandlers = (state: AppState) => {
  const closeModal = () => {
    state.setModalState((current) => ({ ...current, isOpen: false }));
  };

  const handleAuthViewChange = (nextView: AppState['view']) => {
    state.setView(nextView);

    if (nextView !== 'register') {
      state.setEmail('');
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

  const handleLogout = () => {
    const shouldDecrementActiveUsers = state.view === 'user-home';

    state.setUsername('');
    state.setEmail('');
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
