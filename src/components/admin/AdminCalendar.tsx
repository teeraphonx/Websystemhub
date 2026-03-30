import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarDayType } from '../../types';
import { getCalendarDays, getThaiMonthYearLabel } from '../../utils/date';

interface AdminCalendarProps {
  currentMonth: Date;
  selectedDate: string;
  bookingDateCounts: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateString: string, type: CalendarDayType) => void;
}

export default function AdminCalendar({
  currentMonth,
  selectedDate,
  bookingDateCounts,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: AdminCalendarProps) {
  const days = getCalendarDays(currentMonth);

  return (
    <div className="systemhub-admin-panel select-none p-6">
      <div className="mb-6 flex items-center justify-between">
        <ChevronLeft size={16} className="cursor-pointer text-gray-500 transition-colors hover:text-white" onClick={onPrevMonth} />
        <span className="text-[14px] font-black tracking-widest text-white">{getThaiMonthYearLabel(currentMonth)}</span>
        <ChevronRight size={16} className="cursor-pointer text-gray-500 transition-colors hover:text-white" onClick={onNextMonth} />
      </div>

      <div className="mb-3 grid grid-cols-7 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
        <span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span>
      </div>

      <div className="grid grid-cols-7 gap-y-3 text-center text-[12px] font-bold">
        {days.map((day) => {
          const isSelected = day.dateString === selectedDate;
          const isCurrentMonth = day.type === 'curr';
          const bookingCount = bookingDateCounts[day.dateString] ?? 0;
          const hasBookings = bookingCount > 0;

          const textClass = isSelected
            ? 'text-white'
            : hasBookings
              ? isCurrentMonth
                ? 'text-white hover:text-white'
                : 'text-[var(--systemhub-accent)] hover:text-white'
              : isCurrentMonth
                ? 'text-gray-300 hover:text-white'
                : '';

          const emphasisClass = isSelected
            ? ''
            : hasBookings
              ? 'border border-[rgba(96,165,250,0.38)] bg-[rgba(37,99,235,0.14)] shadow-[0_0_18px_rgba(37,99,235,0.14)]'
              : '';

          const style = !isSelected && !isCurrentMonth && !hasBookings
            ? { color: 'var(--systemhub-border)' }
            : undefined;

          return (
            <div key={`${day.dateString}-${day.day}`} className="flex h-10 items-center justify-center">
              <button
                type="button"
                onClick={() => onSelectDate(day.dateString, day.type)}
                title={hasBookings ? `มีรายการจอง ${bookingCount} รายการ` : day.dateString}
                className={`systemhub-admin-calendar-button relative ${isSelected ? 'is-selected' : ''} ${textClass} ${emphasisClass}`}
                style={style}
              >
                <span>{day.day}</span>
                {hasBookings && !isSelected && (
                  <span className="absolute -bottom-1.5 left-1/2 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full border border-[rgba(96,165,250,0.3)] bg-[rgba(10,15,29,0.96)] px-1 text-[9px] font-black text-[var(--systemhub-accent)] shadow-[0_0_10px_rgba(37,99,235,0.2)]">
                    {bookingCount > 9 ? '9+' : bookingCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}