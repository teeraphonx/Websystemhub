import type {
  AdminBooking,
  AdminBookingStatus,
  AppState,
  CategoryId,
  CategoryItemsMap,
  CalendarDayType,
  EquipmentItem,
  UserTab,
} from '../types';
import { createSuccessModal, createWarningModal } from '../utils/modal';

const AUTO_CLOSE_MS = 1400;
const THAI_TIME_ZONE = 'Asia/Bangkok';

const thaiTimeFormatter = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: THAI_TIME_ZONE,
});

const thaiDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: THAI_TIME_ZONE,
});

const createBangkokDateKey = (date: Date) => {
  const parts = thaiDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '2026';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
};

const createUserAvatar = (label: string) => {
  const initials = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'US';
};

const findInventoryEntry = (
  categoryItems: CategoryItemsMap,
  itemId: string,
):
  | {
      categoryId: CategoryId;
      itemIndex: number;
      item: EquipmentItem;
    }
  | null => {
  for (const categoryId of Object.keys(categoryItems) as CategoryId[]) {
    const itemIndex = categoryItems[categoryId].findIndex(
      (item) => item.equipId === itemId,
    );

    if (itemIndex === -1) {
      continue;
    }

    return {
      categoryId,
      itemIndex,
      item: categoryItems[categoryId][itemIndex],
    };
  }

  return null;
};

const updateInventoryStock = (
  categoryItems: CategoryItemsMap,
  itemId: string,
  delta: number,
) => {
  const inventoryEntry = findInventoryEntry(categoryItems, itemId);

  if (!inventoryEntry) {
    return categoryItems;
  }

  return {
    ...categoryItems,
    [inventoryEntry.categoryId]: categoryItems[inventoryEntry.categoryId].map(
      (item, index) =>
        index === inventoryEntry.itemIndex
          ? { ...item, stock: Math.max(item.stock + delta, 0) }
          : item,
    ),
  };
};

const getApprovedQuantity = (
  booking: AdminBooking,
  categoryItems: CategoryItemsMap,
) => {
  const inventoryEntry = findInventoryEntry(categoryItems, booking.itemId);

  if (!inventoryEntry) {
    return booking.availableQuantity;
  }

  return Math.min(booking.availableQuantity, inventoryEntry.item.stock);
};

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

    if (nextView !== 'admin') {
      state.setAdminUsername('');
      state.setAdminPassword('');
      state.setAdminRememberMe(false);
      state.setShowAdminPassword(false);
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
    state.setAdminUsername('');
    state.setAdminPassword('');
    state.setAdminRememberMe(false);
    state.setShowAdminPassword(false);
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
    if (item.stock <= 0) {
      state.setModalState(
        createWarningModal(
          'สต็อกไม่เพียงพอ',
          'อุปกรณ์รายการนี้ไม่มีสต็อกพร้อมให้จองในขณะนี้',
        ),
      );
      return;
    }

    const now = new Date();
    const requesterName =
      state.username.trim() || state.email.trim() || 'ผู้ใช้งานระบบ';
    const nextBookingId = String(Date.now());
    const nextBooking: AdminBooking = {
      id: nextBookingId,
      user: requesterName,
      userAvatar: createUserAvatar(requesterName),
      itemId: item.equipId,
      itemName: item.name,
      time: `${thaiTimeFormatter.format(now)} น.`,
      date: createBangkokDateKey(now),
      requestedQuantity: 1,
      availableQuantity: 1,
      status: 'รออนุมัติ',
    };

    state.setAdminBookings((bookings) => [nextBooking, ...bookings]);
    state.setAdminNotifications((notifications) => [
      {
        id: `notif-${nextBookingId}`,
        bookingId: nextBookingId,
        title: 'มีคำขอจองใหม่',
        desc: `${requesterName} จอง ${item.name}`,
        time: thaiTimeFormatter.format(now),
        isRead: false,
      },
      ...notifications,
    ]);
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
    const targetBooking = state.adminBookings.find((booking) => booking.id === id);

    if (!targetBooking) {
      return;
    }

    if (
      targetBooking.status !== 'อนุมัติแล้ว' &&
      newStatus === 'อนุมัติแล้ว'
    ) {
      const approvedQuantity = getApprovedQuantity(
        targetBooking,
        state.categoryItems,
      );

      if (approvedQuantity <= 0) {
        state.setModalState(
          createWarningModal(
            'สต็อกไม่เพียงพอ',
            'ไม่สามารถอนุมัติรายการนี้ได้ เพราะสต็อกคงเหลือไม่พอ',
          ),
        );
        return;
      }

      state.setAdminBookings((bookings) =>
        bookings.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: newStatus,
                availableQuantity: approvedQuantity,
              }
            : booking,
        ),
      );
      state.setCategoryItems((categoryItems) =>
        updateInventoryStock(
          categoryItems,
          targetBooking.itemId,
          -approvedQuantity,
        ),
      );
      state.setModalState(
        createSuccessModal(
          'ทำรายการสำเร็จ',
          `อัปเดตสถานะเป็น "${newStatus}" และตัดสต็อก ${approvedQuantity} ชิ้นแล้ว`,
        ),
      );
      window.setTimeout(closeModal, 1200);
      return;
    }

    if (
      targetBooking.status === 'อนุมัติแล้ว' &&
      newStatus !== 'อนุมัติแล้ว'
    ) {
      state.setAdminBookings((bookings) =>
        bookings.map((booking) =>
          booking.id === id ? { ...booking, status: newStatus } : booking,
        ),
      );
      state.setCategoryItems((categoryItems) =>
        updateInventoryStock(
          categoryItems,
          targetBooking.itemId,
          targetBooking.availableQuantity,
        ),
      );
      state.setModalState(
        createSuccessModal(
          'ทำรายการสำเร็จ',
          `อัปเดตสถานะเป็น "${newStatus}" และคืนสต็อก ${targetBooking.availableQuantity} ชิ้นแล้ว`,
        ),
      );
      window.setTimeout(closeModal, 1200);
      return;
    }

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

  const handleUpdateBookingAvailableQuantity = (
    id: string,
    quantity: number,
  ) => {
    const targetBooking = state.adminBookings.find((booking) => booking.id === id);

    if (!targetBooking) {
      return;
    }

    const inventoryEntry = findInventoryEntry(state.categoryItems, targetBooking.itemId);
    const maxFromStock = inventoryEntry
      ? targetBooking.status === 'อนุมัติแล้ว'
        ? inventoryEntry.item.stock + targetBooking.availableQuantity
        : inventoryEntry.item.stock
      : targetBooking.requestedQuantity;
    const normalizedQuantity = Math.min(
      Math.max(quantity, 0),
      targetBooking.requestedQuantity,
      maxFromStock,
    );

    state.setAdminBookings((bookings) =>
      bookings.map((booking) => {
        if (booking.id !== id) {
          return booking;
        }

        return {
          ...booking,
          availableQuantity: normalizedQuantity,
        };
      }),
    );

    if (targetBooking.status === 'อนุมัติแล้ว') {
      state.setCategoryItems((categoryItems) =>
        updateInventoryStock(
          categoryItems,
          targetBooking.itemId,
          targetBooking.availableQuantity - normalizedQuantity,
        ),
      );
    }
  };

  const handleMarkAllAdminNotificationsRead = () => {
    state.setAdminNotifications((notifications) =>
      notifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );
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
    handleUpdateBookingAvailableQuantity,
    handleMarkAllAdminNotificationsRead,
    handlePasswordChangeSuccess,
    handlePasswordChangeError,
    handleContactSuccess,
    handlePrevMonth,
    handleNextMonth,
    handleSelectAdminDate,
  };
};