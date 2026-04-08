import type {
  AdminBooking,
  AdminBookingStatus,
  AppState,
  CategoryId,
  CategoryItemsMap,
  CalendarDayType,
  ContactAdminSubmission,
  EquipmentItem,
  UserTab,
} from '../types';
import { markAllContactNotificationsRead, submitContactNotification } from '../lib/contactNotificationsApi';
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

const createCalendarDateFromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
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

const bookingConsumesStock = (status: AdminBookingStatus) =>
  status === 'รออนุมัติ' || status === 'อนุมัติแล้ว';

const getFulfillableQuantity = (
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
    state.setCategoryItems((categoryItems) =>
      updateInventoryStock(
        categoryItems,
        nextBooking.itemId,
        -nextBooking.availableQuantity,
      ),
    );
    state.setAdminDateFilter(nextBooking.date);
    state.setAdminCalendarView(createCalendarDateFromDateKey(nextBooking.date));
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

    if (!targetBooking || targetBooking.status === newStatus) {
      return;
    }

    if (newStatus === 'อนุมัติแล้ว') {
      if (bookingConsumesStock(targetBooking.status)) {
        if (targetBooking.availableQuantity <= 0) {
          state.setModalState(
            createWarningModal(
              'ยังไม่สามารถอนุมัติได้',
              'กรุณาระบุจำนวนเบิกได้มากกว่า 0 ก่อนอนุมัติรายการนี้',
            ),
          );
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
        return;
      }

      const approvedQuantity = getFulfillableQuantity(
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
      bookingConsumesStock(targetBooking.status) &&
      !bookingConsumesStock(newStatus)
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

    if (
      !bookingConsumesStock(targetBooking.status) &&
      bookingConsumesStock(newStatus)
    ) {
      const reservedQuantity = getFulfillableQuantity(
        targetBooking,
        state.categoryItems,
      );

      if (reservedQuantity <= 0) {
        state.setModalState(
          createWarningModal(
            'สต็อกไม่เพียงพอ',
            'ไม่สามารถอัปเดตสถานะรายการนี้ได้ เพราะสต็อกคงเหลือไม่พอ',
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
                availableQuantity: reservedQuantity,
              }
            : booking,
        ),
      );
      state.setCategoryItems((categoryItems) =>
        updateInventoryStock(
          categoryItems,
          targetBooking.itemId,
          -reservedQuantity,
        ),
      );
      state.setModalState(
        createSuccessModal(
          'ทำรายการสำเร็จ',
          `อัปเดตสถานะเป็น "${newStatus}" และตัดสต็อก ${reservedQuantity} ชิ้นแล้ว`,
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
      ? bookingConsumesStock(targetBooking.status)
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

    if (bookingConsumesStock(targetBooking.status)) {
      state.setCategoryItems((categoryItems) =>
        updateInventoryStock(
          categoryItems,
          targetBooking.itemId,
          targetBooking.availableQuantity - normalizedQuantity,
        ),
      );
    }
  };

  const handleMarkAllAdminNotificationsRead = async () => {
    state.setAdminNotifications((notifications) =>
      notifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );

    try {
      await markAllContactNotificationsRead();
    } catch (error) {
      console.error('Failed to sync read notifications to backend.', error);
    }
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

  const handleContactSuccess = async ({
    subject,
    message,
  }: ContactAdminSubmission) => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      state.setModalState(
        createWarningModal('แจ้งเตือน', 'กรุณากรอกหัวข้อและรายละเอียดให้ครบถ้วน'),
      );
      return false;
    }

    try {
      const notification = await submitContactNotification({
        subject: trimmedSubject,
        message: trimmedMessage,
        senderName: state.username.trim() || undefined,
        senderEmail: state.email.trim() || undefined,
      });

      state.setAdminNotifications((notifications) => [
        notification,
        ...notifications.filter((current) => current.id !== notification.id),
      ]);
      state.setModalState(
        createSuccessModal(
          'ส่งข้อความสำเร็จ',
          'ข้อความของคุณถูกส่งไปยังการแจ้งเตือนของผู้ดูแลแล้ว',
        ),
      );
      window.setTimeout(closeModal, 1800);
      return true;
    } catch (error) {
      console.error('Failed to submit contact message.', error);
      state.setModalState(
        createWarningModal(
          'ส่งข้อความไม่สำเร็จ',
          'ไม่สามารถส่งข้อความถึงผู้ดูแลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
      return false;
    }
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



