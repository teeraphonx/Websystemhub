import { useEffect, useState } from 'react';

const THAI_TIME_ZONE = 'Asia/Bangkok';

const thaiDateFormatter = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: THAI_TIME_ZONE,
});

const thaiTimeFormatter = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: THAI_TIME_ZONE,
});

export function useThaiDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return {
    currentDate: thaiDateFormatter.format(now),
    currentTime: thaiTimeFormatter.format(now),
    timeZoneLabel: 'ICT',
  };
}