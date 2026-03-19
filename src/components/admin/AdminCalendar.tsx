import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarDayType } from '../../types';
import { getCalendarDays, getThaiMonthYearLabel } from '../../utils/date';

interface AdminCalendarProps {
  currentMonth: Date;
  selectedDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateString: string, type: CalendarDayType) => void;
}

export default function AdminCalendar({
  currentMonth,
  selectedDate,
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

          const textClass = isSelected
            ? 'text-white'
            : isCurrentMonth
              ? 'text-gray-300 hover:text-white'
              : '';

          const style = !isSelected && !isCurrentMonth ? { color: 'var(--systemhub-border)' } : undefined;

          return (
            <div key={`${day.dateString}-${day.day}`} className="flex h-8 items-center justify-center">
              <button
                type="button"
                onClick={() => onSelectDate(day.dateString, day.type)}
                className={`systemhub-admin-calendar-button ${isSelected ? 'is-selected' : ''} ${textClass}`}
                style={style}
              >
                {day.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
