import { Bell, CalendarDays, CheckCircle, Clock3, LogOut, Package, Search, Users } from 'lucide-react';
import AdminBookingTable from '../../components/admin/AdminBookingTable';
import AdminCalendar from '../../components/admin/AdminCalendar';
import { useThaiDateTime } from '../../hooks/useThaiDateTime';
import type { AdminBooking, AdminBookingStatus, CalendarDayType } from '../../types';

interface DashboardPageProps {
  activeUsers: number;
  adminBookings: AdminBooking[];
  adminDateFilter: string;
  adminCalendarView: Date;
  onDateFilterChange: (value: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateString: string, type: CalendarDayType) => void;
  onUpdateStatus: (id: string, status: AdminBookingStatus) => void;
  onLogout: () => void;
}

export default function DashboardPage({
  activeUsers,
  adminBookings,
  adminDateFilter,
  adminCalendarView,
  onDateFilterChange,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onUpdateStatus,
  onLogout,
}: DashboardPageProps) {
  const filteredBookings = adminDateFilter
    ? adminBookings.filter((booking) => booking.date === adminDateFilter)
    : adminBookings;
  const { currentDate, currentTime, timeZoneLabel } = useThaiDateTime();

  const pendingCount = filteredBookings.filter((booking) => booking.status === 'รออนุมัติ').length;
  const approvedCount = filteredBookings.filter((booking) => booking.status === 'อนุมัติแล้ว').length;
  const rejectedCount = filteredBookings.filter((booking) => booking.status === 'ไม่อนุมัติ').length;
  const totalCount = pendingCount + approvedCount + rejectedCount;
  const approvalRatio = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

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

          <button type="button" className="systemhub-admin-notification relative rounded-full p-2.5 text-gray-400 transition-colors hover:text-white">
            <Bell size={18} />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--systemhub-base)] bg-[var(--systemhub-danger)]"></span>
          </button>

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
        />

        <div className="space-y-6">
          <AdminCalendar
            currentMonth={adminCalendarView}
            selectedDate={adminDateFilter}
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
            <h3 className="mb-6 text-[13px] font-black uppercase tracking-widest text-white">แสดงสถิติการยืมรายวัน</h3>
            <div className="relative flex h-28 items-end justify-between px-2">
              <div className="absolute top-0 w-full border-t border-dashed border-[rgba(30,42,74,0.5)]"></div>
              <div className="absolute top-1/2 w-full border-t border-dashed border-[rgba(30,42,74,0.5)]"></div>
              <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-1 text-[9px] font-bold text-gray-500">
                <span>80</span><span>40</span><span>0</span>
              </div>
              <div className="z-10 ml-6 flex w-full items-end justify-between">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => (
                  <div key={day} className="flex flex-col items-center gap-3">
                    <div className="relative h-20 w-2.5 rounded-t-sm bg-[var(--systemhub-surface-inner)] group">
                      <div
                        className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 group-hover:bg-[var(--systemhub-accent)] ${index === 5 ? 'bg-[var(--systemhub-accent)] shadow-[0_0_10px_rgba(96,165,250,0.6)]' : 'bg-[var(--systemhub-primary)]'}`}
                        style={{ height: `${[40, 50, 70, 45, 90, 65, 30][index]}%` }}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-black ${index === 5 ? 'text-white' : 'text-gray-500'}`}>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}