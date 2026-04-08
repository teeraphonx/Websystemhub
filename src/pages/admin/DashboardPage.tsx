import {
  Bell,
  CalendarDays,
  CheckCircle,
  Clock3,
  LogOut,
  Package,
  Search,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminBookingTable from '../../components/admin/AdminBookingTable';
import AdminCalendar from '../../components/admin/AdminCalendar';
import { useThaiDateTime } from '../../hooks/useThaiDateTime';
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
  onLogout: () => void;
}

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

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
  onLogout,
}: DashboardPageProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [animatedBookingCounts, setAnimatedBookingCounts] = useState<number[]>(() =>
    WEEKDAY_LABELS.map(() => 0),
  );
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const filteredBookings = adminDateFilter
    ? adminBookings.filter((booking) => booking.date === adminDateFilter)
    : adminBookings;
  const bookingDateCounts = adminBookings.reduce<Record<string, number>>(
    (counts, booking) => ({
      ...counts,
      [booking.date]: (counts[booking.date] ?? 0) + 1,
    }),
    {},
  );
  const monthlyBookings = adminBookings.filter((booking) =>
    isDateInCalendarMonth(booking.date, adminCalendarView),
  );
  const bookingStatsByWeekday = WEEKDAY_LABELS.map((label, index) => ({
    label,
    count: monthlyBookings.filter(
      (booking) => parseDateKey(booking.date).getDay() === index,
    ).length,
  }));
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
  const bookingChartSignature = bookingStatsByWeekday
    .map((entry) => entry.count)
    .join(',');
  const { currentDate, currentTime, timeZoneLabel } = useThaiDateTime();

  const pendingCount = filteredBookings.filter((booking) => booking.status === 'รออนุมัติ').length;
  const approvedCount = filteredBookings.filter((booking) => booking.status === 'อนุมัติแล้ว').length;
  const rejectedCount = filteredBookings.filter((booking) => booking.status === 'ไม่อนุมัติ').length;
  const totalCount = pendingCount + approvedCount + rejectedCount;
  const approvalRatio = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const unreadNotificationCount = adminNotifications.filter(
    (notification) => !notification.isRead,
  ).length;

  useEffect(() => {
    const nextCounts = bookingStatsByWeekday.map((entry) => entry.count);
    const frameId = window.requestAnimationFrame(() => {
      setAnimatedBookingCounts(nextCounts);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [bookingChartSignature]);

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

        <div className="flex w-full items-center gap-4 md:w-auto">
          <div className="relative hidden flex-1 md:block md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <div className="systemhub-admin-input-shell rounded-full">
              <input type="text" placeholder="ค้นหาข้อมูล..." className="systemhub-admin-search-input rounded-full py-2.5 pl-10 pr-4 text-[13px]" />
            </div>
          </div>

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
        <div className="systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6">
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--primary mb-4">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">ผู้ใช้งานทั้งหมด</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{activeUsers.toLocaleString()}</h3>
              <span className="text-[12px] font-medium text-gray-500">คน</span>
            </div>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <Users className="h-full w-full text-white" />
          </div>
        </div>

        <div className="systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6">
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--warning mb-4">
              <Package size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">รายการรอตรวจสอบ</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{pendingCount}</h3>
              <span className="text-[12px] font-medium text-gray-500">รายการ</span>
            </div>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <Package className="h-full w-full text-white" />
          </div>
        </div>

        <div className="systemhub-admin-panel systemhub-admin-panel-hover group flex items-center justify-between p-6">
          <div>
            <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--success mb-4">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
            <p className="mb-1 text-[11px] font-bold tracking-widest text-gray-400">อนุมัติแล้ว</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{approvedCount}</h3>
              <span className="text-[12px] font-medium text-gray-500">รายการ</span>
            </div>
          </div>
          <div className="h-16 w-16 opacity-10 transition-opacity group-hover:opacity-20">
            <CheckCircle className="h-full w-full text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdminBookingTable
          bookings={filteredBookings}
          selectedDate={adminDateFilter}
          onClearDate={() => onDateFilterChange('')}
          onUpdateStatus={onUpdateStatus}
          onUpdateAvailableQuantity={onUpdateAvailableQuantity}
        />

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
