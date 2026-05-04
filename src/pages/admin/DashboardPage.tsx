import {
  Bell,
  CalendarDays,
  CheckCircle,
  Clock3,
  LogOut,
  Package,
  PackagePlus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminBookingTable from '../../components/admin/AdminBookingTable';
import AdminCalendar from '../../components/admin/AdminCalendar';
import AdminEquipmentCreateModal from '../../components/admin/AdminEquipmentCreateModal';
import AdminUserDirectory from '../../components/admin/AdminUserDirectory';
import AdminVerificationRequestsPanel from '../../components/admin/AdminVerificationRequestsPanel';
import { useThaiDateTime } from '../../hooks/useThaiDateTime';
import { ApiError } from '../../lib/api';
import { fetchAdminUserProfiles } from '../../lib/adminVerificationAccess';
import {
  deleteEquipment,
  fetchAdminEquipmentList,
  type AdminEquipmentListItem,
  type EquipmentConditionStatus,
} from '../../lib/equipmentApi';
import { type UserProfileRecord } from '../../lib/firebase';
import {
  getDirectoryIdentityKeys,
  isBookingFallbackDirectoryUser,
  readDismissedBookingDirectoryUserKeys,
  readHiddenDirectoryUserKeys,
} from '../../utils/adminUserDirectory';
import { getThaiMonthYearLabel } from '../../utils/date';
import type {
  AdminBooking,
  AdminBookingStatus,
  AdminNotification,
  CalendarDayType,
} from '../../types';

interface DashboardPageProps {
  activeUsers: number;
  adminBookings: AdminBooking[];
  adminNotifications: AdminNotification[];
  adminDateFilter: string;
  adminCalendarView: Date;
  onDateFilterChange: (value: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateString: string, type: CalendarDayType) => void;
  onUpdateStatus: (id: string, status: AdminBookingStatus) => void;
  onUpdateAvailableQuantity: (id: string, quantity: number) => void;
  onMarkAllNotificationsRead: () => void;
  onEquipmentCatalogChanged: () => Promise<void> | void;
  onLogout: () => void;
}

type PendingDeleteEquipment = AdminEquipmentListItem & {
  bookingKey: string;
  activeBookingCount: number;
};

type AdminBookingStatusFilter = AdminBookingStatus | 'all';

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const USER_DIRECTORY_REFRESH_INTERVAL_MS = 30000;
const ADMIN_EQUIPMENT_PAGE_SIZE = 50;
const MAX_VISIBLE_EQUIPMENT_PAGE_BUTTONS = 8;
const ACTIVE_BOOKING_STATUSES = new Set<AdminBookingStatus>([
  'รออนุมัติ',
  'อนุมัติแล้ว',
]);
const SHOW_EQUIPMENT_DELETE_PANEL = true;

const EQUIPMENT_CONDITION_LABELS: Record<EquipmentConditionStatus, string> = {
  normal: 'ปกติ',
  damaged: 'ชำรุด',
  lost: 'สูญหาย',
  deteriorated: 'เสื่อมสภาพ',
  unknown: 'ไม่ระบุ',
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

const isDateInCalendarMonth = (dateKey: string, currentMonth: Date) => {
  const parsedDate = parseDateKey(dateKey);

  return (
    parsedDate.getFullYear() === currentMonth.getFullYear() &&
    parsedDate.getMonth() === currentMonth.getMonth()
  );
};

const normalizeDirectoryKey = (value: string) => value.trim().toLowerCase();

const getEquipmentBookingKey = (equipment: AdminEquipmentListItem) =>
  equipment.assetCode || equipment.serialNumber || `EQ-${equipment.id}`;

const buildVisibleEquipmentPages = (currentPage: number, totalPages: number) => {
  if (totalPages <= MAX_VISIBLE_EQUIPMENT_PAGE_BUTTONS) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const maxStartPage = totalPages - MAX_VISIBLE_EQUIPMENT_PAGE_BUTTONS + 1;
  const startPage = Math.min(
    Math.max(currentPage - Math.floor(MAX_VISIBLE_EQUIPMENT_PAGE_BUTTONS / 2), 1),
    maxStartPage,
  );

  return Array.from(
    { length: MAX_VISIBLE_EQUIPMENT_PAGE_BUTTONS },
    (_, index) => startPage + index,
  );
};

const getConditionBadgeClass = (conditionStatus: EquipmentConditionStatus) => {
  switch (conditionStatus) {
    case 'normal':
      return 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.12)] text-[#86efac]';
    case 'damaged':
      return 'border-[rgba(245,158,11,0.36)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]';
    case 'lost':
      return 'border-[rgba(239,68,68,0.36)] bg-[rgba(127,29,29,0.22)] text-[#fca5a5]';
    case 'deteriorated':
      return 'border-[rgba(244,114,182,0.32)] bg-[rgba(131,24,67,0.2)] text-[#f9a8d4]';
    default:
      return 'border-[rgba(148,163,184,0.22)] bg-[rgba(15,23,42,0.72)] text-gray-300';
  }
};

const getEquipmentErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'สิทธิ์แอดมินหมดอายุหรือ backend ยังตรวจสอบ Firebase admin token ไม่ผ่าน กรุณาเข้าสู่ระบบแอดมินใหม่อีกครั้ง';
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const getUserProfilesErrorMessage = (error: unknown) => {
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
      return 'บัญชีแอดมินนี้ยังไม่มีสิทธิ์อ่านรายชื่อผู้ใช้จาก Firestore จะแสดงได้เฉพาะผู้ใช้ที่มีข้อมูลจากรายการจอง';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง';
};

const createFallbackProfileFromBooking = (
  booking: AdminBooking,
): UserProfileRecord | null => {
  const username = booking.user.trim();
  const email = normalizeDirectoryKey(booking.userEmail ?? '');

  if (!username && !email) {
    return null;
  }

  const normalizedUsername = normalizeDirectoryKey(username || email);

  return {
    uid: email ? `booking-email:${email}` : `booking-user:${normalizedUsername}`,
    username: username || email,
    normalizedUsername,
    email,
    officerId: '',
    fullName: '',
    organizationUnit: '',
    organizationDivision: '',
    organizationStatus: 'pending',
    organizationVerifiedAt: 0,
    isActive: false,
    createdAt: 0,
  };
};

const mergeUserProfiles = (
  profileRecords: UserProfileRecord[],
  bookingRecords: UserProfileRecord[],
) => {
  const mergedProfiles: UserProfileRecord[] = [];
  const seenKeys = new Set<string>();

  for (const profile of [...profileRecords, ...bookingRecords]) {
    const profileKeys = [
      profile.uid,
      profile.email,
      profile.normalizedUsername,
      profile.username,
    ]
      .map(normalizeDirectoryKey)
      .filter(Boolean);

    if (profileKeys.some((key) => seenKeys.has(key))) {
      continue;
    }

    profileKeys.forEach((key) => seenKeys.add(key));
    mergedProfiles.push(profile);
  }

  return mergedProfiles.sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt;
    }

    return left.username.localeCompare(right.username, 'th');
  });
};

export default function DashboardPage({
  activeUsers,
  adminBookings,
  adminNotifications,
  adminDateFilter,
  adminCalendarView,
  onDateFilterChange,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onUpdateStatus,
  onUpdateAvailableQuantity,
  onMarkAllNotificationsRead,
  onEquipmentCatalogChanged,
  onLogout,
}: DashboardPageProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserDirectoryOpen, setIsUserDirectoryOpen] = useState(false);
  const [isEquipmentCreateOpen, setIsEquipmentCreateOpen] = useState(false);
  const [isEquipmentDeleteOpen, setIsEquipmentDeleteOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfileRecord[]>([]);
  const [isUserProfilesLoading, setIsUserProfilesLoading] = useState(false);
  const [hiddenDirectoryUserKeys, setHiddenDirectoryUserKeys] = useState<Set<string>>(
    readHiddenDirectoryUserKeys,
  );
  const [dismissedBookingDirectoryUserKeys, setDismissedBookingDirectoryUserKeys] =
    useState<Set<string>>(readDismissedBookingDirectoryUserKeys);
  const [hasLoadedUserProfiles, setHasLoadedUserProfiles] = useState(false);
  const [userProfilesError, setUserProfilesError] = useState('');
  const [userDirectorySearch, setUserDirectorySearch] = useState('');
  const [adminBookingStatusFilter, setAdminBookingStatusFilter] =
    useState<AdminBookingStatusFilter>('all');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentPage, setEquipmentPage] = useState(1);
  const [adminEquipment, setAdminEquipment] = useState<AdminEquipmentListItem[]>([]);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState('');
  const [equipmentActionMessage, setEquipmentActionMessage] = useState('');
  const [pendingDeleteEquipment, setPendingDeleteEquipment] =
    useState<PendingDeleteEquipment | null>(null);
  const [isDeletingEquipmentId, setIsDeletingEquipmentId] = useState<number | null>(
    null,
  );
  const [animatedBookingCounts, setAnimatedBookingCounts] = useState<number[]>(() =>
    WEEKDAY_LABELS.map(() => 0),
  );
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const equipmentDeleteModalRef = useRef<HTMLDivElement | null>(null);
  const isDashboardMountedRef = useRef(false);
  const userProfilesRequestRef = useRef(0);
  const equipmentRequestRef = useRef(0);
  const bookingsForSelectedDate = useMemo(
    () =>
      adminDateFilter
        ? adminBookings.filter((booking) => booking.date === adminDateFilter)
        : adminBookings,
    [adminBookings, adminDateFilter],
  );
  const filteredBookings = useMemo(() => {
    if (adminBookingStatusFilter === 'all') {
      return bookingsForSelectedDate;
    }

    return bookingsForSelectedDate.filter(
      (booking) => booking.status === adminBookingStatusFilter,
    );
  }, [adminBookingStatusFilter, bookingsForSelectedDate]);
  const bookingDateCounts = adminBookings.reduce<Record<string, number>>(
    (counts, booking) => ({
      ...counts,
      [booking.date]: (counts[booking.date] ?? 0) + 1,
    }),
    {},
  );
  const monthlyBookings = useMemo(
    () =>
      adminBookings.filter((booking) =>
        isDateInCalendarMonth(booking.date, adminCalendarView),
      ),
    [adminBookings, adminCalendarView],
  );
  const bookingStatsByWeekday = useMemo(
    () =>
      WEEKDAY_LABELS.map((label, index) => ({
        label,
        count: monthlyBookings.filter(
          (booking) => parseDateKey(booking.date).getDay() === index,
        ).length,
      })),
    [monthlyBookings],
  );
  const bookingUserProfiles = useMemo(
    () =>
      adminBookings
        .map(createFallbackProfileFromBooking)
        .filter((profile): profile is UserProfileRecord => Boolean(profile)),
    [adminBookings],
  );
  const directoryUsers = useMemo(
    () =>
      mergeUserProfiles(userProfiles, bookingUserProfiles).filter((user) => {
        if (!isBookingFallbackDirectoryUser(user)) {
          return true;
        }

        return !getDirectoryIdentityKeys(user).some((key) =>
          dismissedBookingDirectoryUserKeys.has(key),
        );
      }),
    [bookingUserProfiles, dismissedBookingDirectoryUserKeys, userProfiles],
  );
  const hiddenDirectoryUserCount = useMemo(
    () =>
      directoryUsers.filter((user) =>
        getDirectoryIdentityKeys(user).some((key) =>
          hiddenDirectoryUserKeys.has(key),
        ),
      ).length,
    [directoryUsers, hiddenDirectoryUserKeys],
  );
  const activeBookingCountByKey = useMemo(
    () =>
      adminBookings.reduce<Record<string, number>>((counts, booking) => {
        if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) {
          return counts;
        }

        return {
          ...counts,
          [booking.itemId]: (counts[booking.itemId] ?? 0) + 1,
        };
      }, {}),
    [adminBookings],
  );
  const filteredAdminEquipment = useMemo(() => {
    const normalizedSearch = normalizeDirectoryKey(equipmentSearch);

    if (!normalizedSearch) {
      return adminEquipment;
    }

    return adminEquipment.filter((equipment) =>
      [
        equipment.name,
        equipment.category,
        equipment.location,
        equipment.assetCode,
        equipment.serialNumber,
        getEquipmentBookingKey(equipment),
      ]
        .map(normalizeDirectoryKey)
        .some((value) => value.includes(normalizedSearch)),
    );
  }, [adminEquipment, equipmentSearch]);
  const totalEquipmentPages = Math.max(
    1,
    Math.ceil(filteredAdminEquipment.length / ADMIN_EQUIPMENT_PAGE_SIZE),
  );
  const currentEquipmentPage = Math.min(equipmentPage, totalEquipmentPages);
  const paginatedAdminEquipment = useMemo(() => {
    const startIndex = (currentEquipmentPage - 1) * ADMIN_EQUIPMENT_PAGE_SIZE;
    return filteredAdminEquipment.slice(
      startIndex,
      startIndex + ADMIN_EQUIPMENT_PAGE_SIZE,
    );
  }, [currentEquipmentPage, filteredAdminEquipment]);
  const equipmentPageStartIndex =
    filteredAdminEquipment.length === 0
      ? 0
      : (currentEquipmentPage - 1) * ADMIN_EQUIPMENT_PAGE_SIZE + 1;
  const equipmentPageEndIndex =
    filteredAdminEquipment.length === 0
      ? 0
      : Math.min(
          currentEquipmentPage * ADMIN_EQUIPMENT_PAGE_SIZE,
          filteredAdminEquipment.length,
        );
  const equipmentPageSummary =
    filteredAdminEquipment.length === 0
      ? 'แสดง 0 รายการ'
      : `แสดง ${equipmentPageStartIndex.toLocaleString()}-${equipmentPageEndIndex.toLocaleString()} จาก ${filteredAdminEquipment.length.toLocaleString()} รายการ`;
  const visibleEquipmentPages = useMemo(
    () => buildVisibleEquipmentPages(currentEquipmentPage, totalEquipmentPages),
    [currentEquipmentPage, totalEquipmentPages],
  );
  const equipmentPageOptions = useMemo(
    () => Array.from({ length: totalEquipmentPages }, (_, index) => index + 1),
    [totalEquipmentPages],
  );
  const totalEquipmentQuantity = useMemo(
    () =>
      adminEquipment.reduce(
        (totalQuantity, equipment) => totalQuantity + equipment.totalQuantity,
        0,
      ),
    [adminEquipment],
  );
  const totalAvailableEquipmentQuantity = useMemo(
    () =>
      adminEquipment.reduce(
        (availableQuantity, equipment) =>
          availableQuantity + equipment.availableQuantity,
        0,
      ),
    [adminEquipment],
  );
  const maxDailyBookingCount = Math.max(
    ...bookingStatsByWeekday.map((entry) => entry.count),
    0,
  );
  const chartScaleMax = Math.max(maxDailyBookingCount, 1);
  const chartTopLabel = maxDailyBookingCount;
  const chartMidLabel =
    maxDailyBookingCount > 1 ? Math.ceil(maxDailyBookingCount / 2) : 0;
  const selectedWeekdayIndex = adminDateFilter
    ? parseDateKey(adminDateFilter).getDay()
    : -1;
  const { currentDate, currentTime, timeZoneLabel } = useThaiDateTime();

  const pendingCount = bookingsForSelectedDate.filter(
    (booking) => booking.status === 'รออนุมัติ',
  ).length;
  const approvedCount = bookingsForSelectedDate.filter(
    (booking) => booking.status === 'อนุมัติแล้ว',
  ).length;
  const rejectedCount = bookingsForSelectedDate.filter(
    (booking) => booking.status === 'ไม่อนุมัติ',
  ).length;
  const totalCount = pendingCount + approvedCount + rejectedCount;
  const approvalRatio = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const unreadNotificationCount = adminNotifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const userTotalCount = hasLoadedUserProfiles
    ? directoryUsers.length
    : activeUsers;

  const loadUserProfiles = useCallback(async () => {
    const requestId = userProfilesRequestRef.current + 1;
    userProfilesRequestRef.current = requestId;
    setIsUserProfilesLoading(true);
    setUserProfilesError('');

    try {
      const profiles = await fetchAdminUserProfiles();

      if (
        !isDashboardMountedRef.current ||
        userProfilesRequestRef.current !== requestId
      ) {
        return;
      }

      setUserProfiles(profiles);
      setHasLoadedUserProfiles(true);
    } catch (error) {
      console.error('Failed to load user profiles.', error);

      if (
        !isDashboardMountedRef.current ||
        userProfilesRequestRef.current !== requestId
      ) {
        return;
      }

      setHasLoadedUserProfiles(true);
      setUserProfilesError(getUserProfilesErrorMessage(error));
    } finally {
      if (
        isDashboardMountedRef.current &&
        userProfilesRequestRef.current === requestId
      ) {
        setIsUserProfilesLoading(false);
      }
    }
  }, []);

  const loadAdminEquipment = useCallback(async () => {
    const requestId = equipmentRequestRef.current + 1;
    equipmentRequestRef.current = requestId;
    setIsEquipmentLoading(true);
    setEquipmentError('');

    try {
      const nextEquipment = await fetchAdminEquipmentList();

      if (
        !isDashboardMountedRef.current ||
        equipmentRequestRef.current !== requestId
      ) {
        return;
      }

      setAdminEquipment(nextEquipment);
    } catch (error) {
      console.error('Failed to load admin equipment list.', error);

      if (
        !isDashboardMountedRef.current ||
        equipmentRequestRef.current !== requestId
      ) {
        return;
      }

      setEquipmentError(
        getEquipmentErrorMessage(
          error,
          'ไม่สามารถโหลดรายการครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
      throw error;
    } finally {
      if (
        isDashboardMountedRef.current &&
        equipmentRequestRef.current === requestId
      ) {
        setIsEquipmentLoading(false);
      }
    }
  }, []);

  const syncEquipmentCatalog = useCallback(async () => {
    if (!SHOW_EQUIPMENT_DELETE_PANEL) {
      await Promise.resolve(onEquipmentCatalogChanged());
      return;
    }

    const [dashboardResult, appResult] = await Promise.allSettled([
      loadAdminEquipment(),
      Promise.resolve(onEquipmentCatalogChanged()),
    ]);

    if (dashboardResult.status === 'rejected') {
      throw dashboardResult.reason;
    }

    if (appResult.status === 'rejected') {
      console.error(
        'Failed to refresh app equipment catalog after admin mutation.',
        appResult.reason,
      );
    }
  }, [loadAdminEquipment, onEquipmentCatalogChanged]);

  const handleRefreshEquipmentCatalog = useCallback(async () => {
    setEquipmentActionMessage('');

    try {
      await syncEquipmentCatalog();
      setEquipmentActionMessage('อัปเดตรายการครุภัณฑ์ล่าสุดเรียบร้อยแล้ว');
    } catch (error) {
      setEquipmentError(
        getEquipmentErrorMessage(
          error,
          'ไม่สามารถรีเฟรชรายการครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
    }
  }, [syncEquipmentCatalog]);

  const handleCloseUserDirectory = () => {
    setUserDirectorySearch('');
    setIsUserDirectoryOpen(false);
  };

  const handleToggleUserDirectory = () => {
    if (isUserDirectoryOpen) {
      handleCloseUserDirectory();
      return;
    }

    setUserDirectorySearch('');
    setIsUserDirectoryOpen(true);
  };

  const handleToggleBookingStatusFilter = (status: AdminBookingStatus) => {
    setAdminBookingStatusFilter((currentFilter) =>
      currentFilter === status ? 'all' : status,
    );
  };

  const handleOpenEquipmentDelete = () => {
    setIsEquipmentDeleteOpen(true);
    setEquipmentPage(1);

    if (adminEquipment.length === 0 && !isEquipmentLoading) {
      void loadAdminEquipment().catch(() => undefined);
    }
  };

  const handleCloseEquipmentDelete = useCallback(() => {
    if (isDeletingEquipmentId !== null) {
      return;
    }

    setIsEquipmentDeleteOpen(false);
    setEquipmentSearch('');
    setEquipmentPage(1);
    setEquipmentError('');
    setEquipmentActionMessage('');
    setPendingDeleteEquipment(null);
  }, [isDeletingEquipmentId]);

  const handleRequestDeleteEquipment = (equipment: AdminEquipmentListItem) => {
    const bookingKey = getEquipmentBookingKey(equipment);
    const activeBookingCount = activeBookingCountByKey[bookingKey] ?? 0;

    if (activeBookingCount > 0 || isDeletingEquipmentId !== null) {
      return;
    }

    setPendingDeleteEquipment({
      ...equipment,
      bookingKey,
      activeBookingCount,
    });
  };

  const handleConfirmDeleteEquipment = useCallback(async () => {
    if (!pendingDeleteEquipment) {
      return;
    }

    setIsDeletingEquipmentId(pendingDeleteEquipment.id);
    setEquipmentActionMessage('');
    setEquipmentError('');

    try {
      await deleteEquipment(pendingDeleteEquipment.id);
      await syncEquipmentCatalog();
      setEquipmentActionMessage(
        `ลบ "${pendingDeleteEquipment.name}" ออกจากระบบเรียบร้อยแล้ว`,
      );
      setPendingDeleteEquipment(null);
    } catch (error) {
      console.error('Failed to delete equipment.', error);
      setEquipmentError(
        getEquipmentErrorMessage(
          error,
          'ไม่สามารถลบครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
    } finally {
      setIsDeletingEquipmentId(null);
    }
  }, [pendingDeleteEquipment, syncEquipmentCatalog]);

  useEffect(() => {
    isDashboardMountedRef.current = true;

    return () => {
      isDashboardMountedRef.current = false;
      userProfilesRequestRef.current += 1;
      equipmentRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const syncHiddenDirectoryUsers = () => {
      setHiddenDirectoryUserKeys(readHiddenDirectoryUserKeys());
      setDismissedBookingDirectoryUserKeys(
        readDismissedBookingDirectoryUserKeys(),
      );
    };

    window.addEventListener('storage', syncHiddenDirectoryUsers);
    return () =>
      window.removeEventListener('storage', syncHiddenDirectoryUsers);
  }, []);

  useEffect(() => {
    void loadUserProfiles();
  }, [loadUserProfiles]);

  useEffect(() => {
    if (!SHOW_EQUIPMENT_DELETE_PANEL) {
      setIsEquipmentDeleteOpen(false);
      setAdminEquipment([]);
      setEquipmentPage(1);
      setEquipmentError('');
      setEquipmentActionMessage('');
      setPendingDeleteEquipment(null);
      setIsEquipmentLoading(false);
      return;
    }

    void loadAdminEquipment().catch(() => undefined);
  }, [loadAdminEquipment]);

  useEffect(() => {
    if (!isUserDirectoryOpen) {
      return () => undefined;
    }

    void loadUserProfiles();

    const intervalId = window.setInterval(() => {
      void loadUserProfiles();
    }, USER_DIRECTORY_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isUserDirectoryOpen, loadUserProfiles]);

  useEffect(() => {
    const nextCounts = bookingStatsByWeekday.map((entry) => entry.count);
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedBookingCounts(nextCounts);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [bookingStatsByWeekday]);

  useEffect(() => {
    setEquipmentPage((currentPage) => Math.min(currentPage, totalEquipmentPages));
  }, [totalEquipmentPages]);

  useEffect(() => {
    if (!isEquipmentDeleteOpen) {
      return;
    }

    equipmentDeleteModalRef.current?.scrollTo({ top: 0 });
  }, [currentEquipmentPage, isEquipmentDeleteOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current) {
        return;
      }

      if (!notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleNotifications = () => {
    setIsNotificationOpen((current) => !current);
  };

  return (
    <div className="z-10 min-h-screen w-full max-w-[1400px] animate-fade-up p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-black uppercase tracking-wider text-white">
            SYSTEM<span className="text-[var(--systemhub-accent)]">HUB</span> ADMIN
          </h2>
          <p className="mt-1 text-[13px] font-bold uppercase tracking-widest text-[var(--systemhub-accent)]">ระบบจัดการตรวจสอบและจองครุภัณฑ์</p>
          <div aria-live="polite" className="mt-4 flex flex-wrap items-center gap-3">
            <div className="systemhub-admin-date-chip flex items-center gap-2 rounded-full px-3 py-1.5">
              <CalendarDays size={14} className="text-[var(--systemhub-accent)]" />
              <span className="text-[11px] font-black tracking-wide text-white">{currentDate}</span>
            </div>

            <div className="systemhub-admin-panel flex items-center gap-2 rounded-full px-4 py-2">
              <Clock3 size={15} className="text-[var(--systemhub-accent)]" />
              <span className="text-[16px] font-black tracking-[0.14em] tabular-nums text-white">{currentTime}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--systemhub-accent)]">{timeZoneLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap md:gap-4">
          {SHOW_EQUIPMENT_DELETE_PANEL && (
            <button
              type="button"
              onClick={handleOpenEquipmentDelete}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(239,68,68,0.28)] bg-[linear-gradient(135deg,rgba(127,29,29,0.95),rgba(239,68,68,0.88))] px-5 py-2.5 text-[12px] font-black tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(239,68,68,0.24)] transition-all hover:shadow-[0_14px_34px_rgba(239,68,68,0.3)]"
            >
              <Trash2 size={16} strokeWidth={2.4} />
              ลบครุภัณฑ์
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEquipmentCreateOpen(true)}
            className="systemhub-primary-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-black tracking-[0.16em] text-white transition-all"
          >
            <PackagePlus size={16} strokeWidth={2.4} />
            เพิ่มครุภัณฑ์
          </button>

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`systemhub-admin-notification relative rounded-full p-2.5 transition-colors ${unreadNotificationCount > 0 ? 'border-[rgba(239,68,68,0.45)] bg-[rgba(60,10,18,0.82)] text-[var(--systemhub-danger-strong)] shadow-[0_0_18px_rgba(239,68,68,0.18)] hover:text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--systemhub-base)] bg-[var(--systemhub-danger)] px-1 text-[10px] font-black text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[320px] overflow-hidden rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                <div className="border-b border-[var(--systemhub-border)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">
                        การแจ้งเตือน
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        แจ้งเตือนล่าสุดจากคำขอจองและข้อความจากผู้ใช้งาน
                      </p>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="rounded-full border border-[rgba(239,68,68,0.28)] bg-[rgba(60,10,18,0.72)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--systemhub-danger-strong)] transition-colors hover:bg-[rgba(90,16,28,0.9)] hover:text-white"
                      >
                        อ่านทั้งหมด
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[320px] overflow-y-auto px-3 py-3">
                  {adminNotifications.length > 0 ? (
                    <div className="space-y-2">
                      {adminNotifications.slice(0, 8).map((notification) => (
                        <div
                          key={notification.id}
                          className={`relative rounded-xl border px-3 py-3 ${notification.isRead ? 'border-[rgba(30,42,74,0.5)] bg-[rgba(8,12,22,0.68)]' : 'border-[rgba(239,68,68,0.42)] bg-[rgba(60,10,18,0.58)] shadow-[0_0_0_1px_rgba(239,68,68,0.1)]'}`}
                        >
                          {!notification.isRead && (
                            <span className="absolute left-0 top-3 h-[calc(100%-24px)] w-1 rounded-r-full bg-[var(--systemhub-danger)]"></span>
                          )}
                          <div className="flex items-start justify-between gap-3 pl-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {!notification.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-[var(--systemhub-danger)] shadow-[0_0_8px_rgba(239,68,68,0.85)]"></span>
                                )}
                                <p className={`text-[12px] font-bold ${notification.isRead ? 'text-white' : 'text-[var(--systemhub-danger-strong)]'}`}>
                                  {notification.title}
                                </p>
                              </div>
                              <p className={`mt-1 text-[11px] leading-5 ${notification.isRead ? 'text-gray-400' : 'text-red-100/85'}`}>
                                {notification.desc}
                              </p>
                            </div>
                            <span className={`whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.14em] ${notification.isRead ? 'text-gray-500' : 'text-[var(--systemhub-danger-strong)]'}`}>
                              {notification.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                      <Bell size={24} className="text-gray-500" />
                      <p className="text-[12px] font-bold text-gray-400">
                        ยังไม่มีการแจ้งเตือนใหม่
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={onLogout} className="systemhub-admin-logout flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold transition-all shadow-lg">
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <button
          type="button"
          onClick={handleToggleUserDirectory}
          className="systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--systemhub-accent)]"
          aria-label={isUserDirectoryOpen ? 'ซ่อนรายชื่อผู้ใช้งานทั้งหมด' : 'ดูรายชื่อผู้ใช้งานทั้งหมด'}
        >
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--primary mb-4">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">ผู้ใช้งานทั้งหมด</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{userTotalCount.toLocaleString()}</h3>
              <span className="text-[12px] font-medium text-gray-500">คน</span>
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
              {hiddenDirectoryUserCount > 0
                ? `มีผู้ใช้ที่ซ่อนอยู่ ${hiddenDirectoryUserCount.toLocaleString()}`
                : isUserDirectoryOpen
                  ? 'ซ่อนรายชื่อ'
                  : 'ดูรายชื่อ'}
            </p>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <Users className="h-full w-full text-white" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleToggleBookingStatusFilter('รออนุมัติ')}
          className={`systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--systemhub-accent)] ${
            adminBookingStatusFilter === 'รออนุมัติ'
              ? 'border-[rgba(245,158,11,0.34)] shadow-[0_0_0_1px_rgba(245,158,11,0.18)]'
              : ''
          }`}
          aria-label={
            adminBookingStatusFilter === 'รออนุมัติ'
              ? 'ซ่อนรายการรอตรวจสอบ'
              : 'ดูรายการรอตรวจสอบ'
          }
        >
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--warning mb-4">
              <Package size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">รายการรอตรวจสอบ</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{pendingCount}</h3>
              <span className="text-[12px] font-medium text-gray-500">รายการ</span>
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
              {adminBookingStatusFilter === 'รออนุมัติ' ? 'ซ่อนรายการ' : 'เช็กรายการ'}
            </p>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <Package className="h-full w-full text-white" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleToggleBookingStatusFilter('อนุมัติแล้ว')}
          className={`systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--systemhub-accent)] ${
            adminBookingStatusFilter === 'อนุมัติแล้ว'
              ? 'border-[rgba(34,197,94,0.34)] shadow-[0_0_0_1px_rgba(34,197,94,0.18)]'
              : ''
          }`}
          aria-label={
            adminBookingStatusFilter === 'อนุมัติแล้ว'
              ? 'ซ่อนรายการอนุมัติแล้ว'
              : 'ดูรายการอนุมัติแล้ว'
          }
        >
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--success mb-4">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">อนุมัติแล้ว</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{approvedCount}</h3>
              <span className="text-[12px] font-medium text-gray-500">รายการ</span>
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
              {adminBookingStatusFilter === 'อนุมัติแล้ว' ? 'ซ่อนรายการ' : 'เช็กรายการ'}
            </p>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <CheckCircle className="h-full w-full text-white" />
          </div>
        </button>
      </div>

      <AdminVerificationRequestsPanel onRequestHandled={loadUserProfiles} />

      {isUserDirectoryOpen && (
        <AdminUserDirectory
          users={directoryUsers}
          searchValue={userDirectorySearch}
          isLoading={isUserProfilesLoading}
          errorMessage={userProfilesError}
          onHiddenUsersChange={setHiddenDirectoryUserKeys}
          onDismissedBookingUsersChange={setDismissedBookingDirectoryUserKeys}
          onSearchChange={setUserDirectorySearch}
          onRefresh={loadUserProfiles}
          onClose={handleCloseUserDirectory}
        />
      )}

      <AdminEquipmentCreateModal
        isOpen={isEquipmentCreateOpen}
        onClose={() => setIsEquipmentCreateOpen(false)}
        onCreated={syncEquipmentCatalog}
      />

      {SHOW_EQUIPMENT_DELETE_PANEL && isEquipmentDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-equipment-delete-panel-title"
          className="fixed inset-0 z-[480] flex items-start justify-center overflow-y-auto bg-[#02050f]/88 px-4 py-5 backdrop-blur-md"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseEquipmentDelete();
            }
          }}
        >
          <div
            ref={equipmentDeleteModalRef}
            className="systemhub-auth-panel custom-scrollbar relative flex max-h-[calc(100vh-2.5rem)] w-full max-w-[1120px] flex-col overflow-x-hidden overflow-y-auto rounded-[2rem] shadow-[0_28px_90px_rgba(0,0,0,0.76)]"
          >
            <div className="border-b border-[rgba(27,41,71,0.72)] px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[rgba(239,68,68,0.28)] bg-[rgba(127,29,29,0.22)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#fda4af]">
                    <Trash2 size={13} />
                    Delete Equipment
                  </div>

                  <h3
                    id="admin-equipment-delete-panel-title"
                    className="mt-4 text-2xl font-black tracking-wide text-white sm:text-3xl"
                  >
                    ลบครุภัณฑ์ออกจากระบบ
                  </h3>

                  <p className="mt-3 max-w-[46rem] text-[13px] font-medium leading-6 text-gray-400">
                    กดปุ่มลบครุภัณฑ์เพื่อเปิดรายการจริงจาก backend แล้วเลือกข้อมูลที่ต้องการลบได้จากในหน้าต่างนี้ทันที
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEquipmentDelete}
                  disabled={isDeletingEquipmentId !== null}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.76)] text-gray-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="ปิดหน้าต่างลบครุภัณฑ์"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.56)] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      รายการทั้งหมด
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {adminEquipment.length.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.56)] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      พร้อมใช้งานรวม
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {totalAvailableEquipmentQuantity.toLocaleString()} / {totalEquipmentQuantity.toLocaleString()}
                    </p>
                  </div>

                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative min-w-0 md:w-72">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <div className="systemhub-admin-input-shell rounded-full">
                      <input
                        type="text"
                        value={equipmentSearch}
                        onChange={(event) => {
                          setEquipmentSearch(event.target.value);
                          setEquipmentPage(1);
                        }}
                        placeholder="ค้นหาครุภัณฑ์..."
                        className="systemhub-admin-search-input w-full rounded-full py-2.5 pl-10 pr-4 text-[13px]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRefreshEquipmentCatalog()}
                    disabled={isEquipmentLoading || isDeletingEquipmentId !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(59,130,246,0.3)] bg-[rgba(37,99,235,0.1)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--systemhub-accent)] transition-colors hover:bg-[rgba(37,99,235,0.18)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCcw
                      size={14}
                      className={isEquipmentLoading ? 'animate-spin' : ''}
                    />
                    รีเฟรชรายการ
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,165,250,0.22)] bg-[rgba(15,23,42,0.7)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
                  {equipmentPageSummary}
                </div>

                {filteredAdminEquipment.length > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.7)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                    หน้า {currentEquipmentPage.toLocaleString()} / {totalEquipmentPages.toLocaleString()}
                  </div>
                )}

                {filteredAdminEquipment.length > 0 && totalEquipmentPages > 1 && (
                  <label className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.7)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-300">
                    เลือกหน้า
                    <select
                      value={currentEquipmentPage}
                      onChange={(event) => {
                        setEquipmentPage(Number(event.target.value));
                      }}
                      aria-label="เลือกหน้ารายการครุภัณฑ์"
                      className="rounded-full border border-[rgba(59,130,246,0.24)] bg-[rgba(15,23,42,0.92)] px-3 py-1 text-[11px] font-black text-white outline-none transition-colors hover:border-[rgba(96,165,250,0.36)]"
                    >
                      {equipmentPageOptions.map((pageNumber) => (
                        <option key={pageNumber} value={pageNumber}>
                          {pageNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {filteredAdminEquipment.length !== adminEquipment.length && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.7)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">
                    จากทั้งหมด {adminEquipment.length.toLocaleString()} รายการ
                  </div>
                )}

                {equipmentSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setEquipmentSearch('');
                      setEquipmentPage(1);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.22)] bg-[rgba(15,23,42,0.7)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-300 transition-colors hover:text-white"
                  >
                    ล้างคำค้นหา
                  </button>
                )}

                {equipmentActionMessage && (
                  <div className="rounded-full border border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#86efac]">
                    {equipmentActionMessage}
                  </div>
                )}
              </div>

              {equipmentError && (
                <div className="mt-4 rounded-2xl border border-[rgba(239,68,68,0.34)] bg-[rgba(60,10,18,0.58)] px-4 py-3 text-[12px] font-bold leading-6 text-red-100">
                  {equipmentError}
                </div>
              )}
            </div>

            <div className="px-6 py-6 sm:px-8">
              {isEquipmentLoading && adminEquipment.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[rgba(10,15,28,0.68)] px-5 py-10 text-center">
                  <div>
                    <p className="text-[15px] font-black tracking-wide text-white">
                      กำลังโหลดรายการครุภัณฑ์...
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-gray-400">
                      ระบบกำลังดึงข้อมูลจริงจาก backend เพื่อให้สามารถลบรายเก่าได้อย่างถูกต้อง
                    </p>
                  </div>
                </div>
              ) : filteredAdminEquipment.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[rgba(10,15,28,0.68)] px-5 py-10 text-center">
                  <div>
                    <p className="text-[15px] font-black tracking-wide text-white">
                      {adminEquipment.length === 0
                        ? 'ยังไม่มีครุภัณฑ์ในระบบ'
                        : 'ไม่พบครุภัณฑ์ตามคำค้นหา'}
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-gray-400">
                      {adminEquipment.length === 0
                        ? 'เมื่อเพิ่มข้อมูลใหม่ รายการจะขึ้นในส่วนนี้เพื่อให้จัดการต่อได้'
                        : 'ลองค้นหาด้วยชื่อครุภัณฑ์ รหัสครุภัณฑ์ Serial Number หรือสถานที่จัดเก็บ'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col overflow-hidden rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[rgba(10,15,28,0.68)]">
                  <div className="grid grid-cols-1 gap-4 border-b border-[rgba(27,41,71,0.65)] px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 lg:grid-cols-[minmax(0,1.6fr)_minmax(240px,0.8fr)_auto]">
                    <span>รายละเอียดครุภัณฑ์</span>
                    <span>สต็อกและสถานะ</span>
                    <span className="text-right">การจัดการ</span>
                  </div>

                  <div className="touch-pan-y">
                    {paginatedAdminEquipment.map((equipment) => {
                      const bookingKey = getEquipmentBookingKey(equipment);
                      const activeBookingCount =
                        activeBookingCountByKey[bookingKey] ?? 0;
                      const isDeleteDisabled =
                        activeBookingCount > 0 || isDeletingEquipmentId !== null;
                      const conditionLabel =
                        EQUIPMENT_CONDITION_LABELS[equipment.conditionStatus];

                      return (
                        <div
                          key={equipment.id}
                          className="grid grid-cols-1 gap-4 border-b border-[rgba(27,41,71,0.55)] px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.6fr)_minmax(240px,0.8fr)_auto] lg:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="truncate text-[15px] font-black tracking-wide text-white">
                                  {equipment.name}
                                </h4>
                                <p className="mt-1 text-[11px] font-bold leading-5 text-gray-400">
                                  {equipment.category}
                                </p>
                              </div>

                              <span
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getConditionBadgeClass(equipment.conditionStatus)}`}
                              >
                                {conditionLabel}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-300">
                              <span className="rounded-full border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.74)] px-3 py-1.5">
                                รหัส: {equipment.assetCode || bookingKey}
                              </span>
                              <span className="rounded-full border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.74)] px-3 py-1.5">
                                Serial: {equipment.serialNumber || '-'}
                              </span>
                              <span className="rounded-full border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.74)] px-3 py-1.5">
                                จัดเก็บ: {equipment.location}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(15,23,42,0.7)] px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                พร้อมใช้งาน
                              </p>
                              <p className="mt-2 text-xl font-black text-white">
                                {equipment.availableQuantity}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(15,23,42,0.7)] px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                จำนวนทั้งหมด
                              </p>
                              <p className="mt-2 text-xl font-black text-white">
                                {equipment.totalQuantity}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-stretch gap-3 lg:min-w-[220px] lg:items-end">
                            <div
                              className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                                activeBookingCount > 0
                                  ? 'border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]'
                                  : 'border-[rgba(34,197,94,0.26)] bg-[rgba(34,197,94,0.12)] text-[#86efac]'
                              }`}
                            >
                              {activeBookingCount > 0
                                ? `มีการจองค้าง ${activeBookingCount} รายการ`
                                : 'พร้อมลบ'}
                            </div>

                            <button
                              type="button"
                              disabled={isDeleteDisabled}
                              onClick={() => handleRequestDeleteEquipment(equipment)}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${
                                isDeleteDisabled
                                  ? 'cursor-not-allowed border border-[rgba(71,85,105,0.45)] bg-[rgba(30,41,59,0.72)] text-gray-500'
                                  : 'border border-[rgba(239,68,68,0.34)] bg-[rgba(127,29,29,0.22)] text-[#fda4af] hover:bg-[rgba(127,29,29,0.35)] hover:text-white'
                              }`}
                              title={
                                activeBookingCount > 0
                                  ? 'ลบไม่ได้เพราะยังมีรายการจองที่ผูกกับครุภัณฑ์นี้'
                                  : 'ลบครุภัณฑ์ออกจากระบบ'
                              }
                            >
                              <Trash2 size={14} />
                              {isDeletingEquipmentId === equipment.id
                                ? 'กำลังลบ...'
                                : 'ลบรายการ'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredAdminEquipment.length > 0 && (
                    <div className="border-t border-[rgba(27,41,71,0.65)] px-5 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-[11px] font-bold leading-6 text-gray-400">
                          {equipmentPageSummary}
                        </p>

                        {totalEquipmentPages > 1 && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEquipmentPage((currentPage) =>
                                  Math.max(currentPage - 1, 1),
                                )
                              }
                              disabled={currentEquipmentPage === 1}
                              className={`inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
                                currentEquipmentPage === 1
                                  ? 'cursor-not-allowed border-[rgba(71,85,105,0.45)] bg-[rgba(30,41,59,0.72)] text-gray-500'
                                  : 'border-[rgba(96,165,250,0.26)] bg-[rgba(15,23,42,0.76)] text-[var(--systemhub-accent)] hover:bg-[rgba(37,99,235,0.18)] hover:text-white'
                              }`}
                            >
                              ก่อนหน้า
                            </button>

                            {visibleEquipmentPages.map((pageNumber) => {
                              const isActivePage = pageNumber === currentEquipmentPage;

                              return (
                                <button
                                  key={pageNumber}
                                  type="button"
                                  onClick={() => setEquipmentPage(pageNumber)}
                                  aria-current={isActivePage ? 'page' : undefined}
                                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-[11px] font-black transition-colors ${
                                    isActivePage
                                      ? 'border-[rgba(59,130,246,0.42)] bg-[rgba(37,99,235,0.24)] text-white shadow-[0_0_0_1px_rgba(59,130,246,0.16)]'
                                      : 'border-[rgba(148,163,184,0.2)] bg-[rgba(15,23,42,0.72)] text-gray-300 hover:border-[rgba(96,165,250,0.3)] hover:text-white'
                                  }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() =>
                                setEquipmentPage((currentPage) =>
                                  Math.min(currentPage + 1, totalEquipmentPages),
                                )
                              }
                              disabled={currentEquipmentPage === totalEquipmentPages}
                              className={`inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
                                currentEquipmentPage === totalEquipmentPages
                                  ? 'cursor-not-allowed border-[rgba(71,85,105,0.45)] bg-[rgba(30,41,59,0.72)] text-gray-500'
                                  : 'border-[rgba(96,165,250,0.26)] bg-[rgba(15,23,42,0.76)] text-[var(--systemhub-accent)] hover:bg-[rgba(37,99,235,0.18)] hover:text-white'
                              }`}
                            >
                              ถัดไป
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {pendingDeleteEquipment && (
              <div className="border-t border-[rgba(27,41,71,0.72)] px-6 py-5 sm:px-8">
                <div className="rounded-[1.5rem] border border-[rgba(239,68,68,0.18)] bg-[rgba(10,15,28,0.76)] p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(239,68,68,0.28)] bg-[rgba(127,29,29,0.22)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#fda4af]">
                        เตรียมลบรายการ
                      </div>
                      <p className="mt-3 text-[17px] font-black text-white">
                        {pendingDeleteEquipment.name}
                      </p>
                      <div className="mt-4 grid gap-3 text-[11px] font-bold text-gray-300 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          รหัสอ้างอิง: {pendingDeleteEquipment.assetCode || pendingDeleteEquipment.bookingKey}
                        </div>
                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          หมวดหมู่: {pendingDeleteEquipment.category}
                        </div>
                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          พร้อมใช้งาน: {pendingDeleteEquipment.availableQuantity} ชิ้น
                        </div>
                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          จำนวนทั้งหมด: {pendingDeleteEquipment.totalQuantity} ชิ้น
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.1)] px-4 py-3 text-[12px] font-bold leading-6 text-[#fcd34d]">
                        ระบบจะไม่เปิดให้ลบรายการที่ยังมีคำขอจองค้างอยู่ เพื่อกันข้อมูลการจองเสียหาย
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row xl:flex-col">
                      <button
                        type="button"
                        disabled={isDeletingEquipmentId !== null}
                        onClick={() => setPendingDeleteEquipment(null)}
                        className="rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.8)] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-gray-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingEquipmentId !== null}
                        onClick={() => void handleConfirmDeleteEquipment()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(239,68,68,0.34)] bg-[rgba(127,29,29,0.3)] px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-[#fda4af] transition-colors hover:bg-[rgba(127,29,29,0.42)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                        {isDeletingEquipmentId === pendingDeleteEquipment.id
                          ? 'กำลังลบรายการ...'
                          : 'ยืนยันลบรายการ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminBookingTable
            bookings={filteredBookings}
            selectedDate={adminDateFilter}
            selectedStatusFilter={adminBookingStatusFilter}
            onClearDate={() => onDateFilterChange('')}
            onClearStatusFilter={() => setAdminBookingStatusFilter('all')}
            onUpdateStatus={onUpdateStatus}
            onUpdateAvailableQuantity={onUpdateAvailableQuantity}
          />
        </div>

        <div className="space-y-6">
          <AdminCalendar
            currentMonth={adminCalendarView}
            selectedDate={adminDateFilter}
            bookingDateCounts={bookingDateCounts}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onSelectDate={onSelectDate}
          />

          <div className="systemhub-admin-panel flex flex-col justify-center p-6">
            <h3 className="mb-6 text-[13px] font-black uppercase tracking-widest text-white">สัดส่วนการอนุมัติการจอง</h3>
            <div className="flex items-center justify-center gap-6">
              <div className="relative h-24 w-24 flex-shrink-0">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <path className="text-[var(--systemhub-border)]" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[var(--systemhub-primary)]" strokeDasharray={`${approvalRatio}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-black leading-none text-white">{approvalRatio}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--systemhub-primary)] shadow-[0_0_8px_rgba(37,99,235,0.8)]"></span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white">อนุมัติแล้ว</span>
                    <span className="text-[10px] text-gray-500">{approvedCount} รายการ</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--systemhub-danger)] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white">ไม่อนุมัติ</span>
                    <span className="text-[10px] text-gray-500">{rejectedCount} รายการ</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--systemhub-border)]"></span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white">รอตรวจสอบ</span>
                    <span className="text-[10px] text-gray-500">{pendingCount} รายการ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="systemhub-admin-panel flex flex-col justify-between p-6">
            <div className="mb-6">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-white">แสดงสถิติการจองรายวัน</h3>
              <p className="mt-2 text-[11px] font-bold text-gray-500">
                อ้างอิงรายการจองในเดือน {getThaiMonthYearLabel(adminCalendarView)}
              </p>
            </div>
            <div className="relative flex h-32 items-end justify-between px-2">
              <div className="absolute top-0 w-full border-t border-dashed border-[rgba(30,42,74,0.5)]"></div>
              <div className="absolute top-1/2 w-full border-t border-dashed border-[rgba(30,42,74,0.5)]"></div>
              <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-1 text-[9px] font-bold text-gray-500">
                <span>{chartTopLabel}</span><span>{chartMidLabel}</span><span>0</span>
              </div>
              <div className="z-10 ml-6 flex w-full items-end justify-between gap-2">
                {bookingStatsByWeekday.map(({ label, count }, index) => {
                  const animatedCount = animatedBookingCounts[index] ?? 0;
                  const isHighlighted =
                    selectedWeekdayIndex === index ||
                    (!adminDateFilter && count > 0 && count === maxDailyBookingCount);
                  const barHeight =
                    animatedCount === 0
                      ? '0%'
                      : `${Math.max((animatedCount / chartScaleMax) * 100, 10)}%`;

                  return (
                    <div key={label} className="flex flex-1 flex-col items-center gap-3">
                      <div className="relative flex h-20 w-full max-w-[18px] items-end rounded-t-sm bg-[var(--systemhub-surface-inner)] group">
                        <div
                          className={`absolute bottom-0 w-full rounded-t-sm transition-[height,background-color,box-shadow] duration-700 ease-out group-hover:bg-[var(--systemhub-accent)] ${isHighlighted ? 'bg-[var(--systemhub-accent)] shadow-[0_0_10px_rgba(96,165,250,0.6)]' : count > 0 ? 'bg-[var(--systemhub-primary)]' : 'bg-transparent'}`}
                          style={{
                            height: barHeight,
                            transitionDelay: `${index * 45}ms`,
                          }}
                          title={`${label} ${count} รายการ`}
                        ></div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-black ${isHighlighted ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                        <span className={`text-[9px] font-bold tabular-nums transition-colors duration-500 ${count > 0 ? 'text-[var(--systemhub-accent)]' : 'text-gray-600'}`}>{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
