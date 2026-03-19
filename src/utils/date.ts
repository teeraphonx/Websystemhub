import type { CalendarDay } from '../types';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCalendarDays = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    const day = daysInPrevMonth - index;
    days.push({
      day,
      type: 'prev',
      dateString: formatDateToYYYYMMDD(new Date(year, month - 1, day)),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      day,
      type: 'curr',
      dateString: formatDateToYYYYMMDD(new Date(year, month, day)),
    });
  }

  const remainingCells = 42 - days.length;
  for (let day = 1; day <= remainingCells; day += 1) {
    days.push({
      day,
      type: 'next',
      dateString: formatDateToYYYYMMDD(new Date(year, month + 1, day)),
    });
  }

  return days;
};

export const getThaiMonthYearLabel = (date: Date): string => {
  const month = THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${month} ${year}`;
};

export const formatThaiShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
