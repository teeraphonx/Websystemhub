import {
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  Package2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { AdminBooking, CategoryItemsMap } from '../../types';

interface ReservationStatusPageProps {
  onBack: () => void;
  bookings: AdminBooking[];
  categoryItems: CategoryItemsMap;
  currentUsername: string;
  currentEmail: string;
}

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Bangkok',
});

const DEFAULT_PICKUP_LOCATION = 'ฝ่ายอำนวยการ';

const findBookingIcon = (
  itemId: string,
  categoryItems: CategoryItemsMap,
): LucideIcon => {
  for (const items of Object.values(categoryItems)) {
    const matchedItem = items.find((item) => item.equipId === itemId);

    if (matchedItem) {
      return matchedItem.icon;
    }
  }

  return Package2;
};

const formatBookingDate = (dateKey: string) => {
  const bookingDate = new Date(`${dateKey}T00:00:00+07:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    return dateKey;
  }

  return THAI_DATE_FORMATTER.format(bookingDate);
};

const getStatusLabel = (status: AdminBooking['status']) =>
  status === 'รออนุมัติ' ? 'รอตรวจสอบ' : status;

const normalizeIdentity = (value: string) => value.trim().toLowerCase();

export default function ReservationStatusPage({
  onBack,
  bookings,
  categoryItems,
  currentUsername,
  currentEmail,
}: ReservationStatusPageProps) {
  const viewerIdentities = [currentUsername, currentEmail]
    .map(normalizeIdentity)
    .filter(Boolean);
  const visibleBookings =
    viewerIdentities.length > 0
      ? bookings.filter((booking) =>
          viewerIdentities.includes(normalizeIdentity(booking.user)),
        )
      : bookings;
  const sortedBookings = [...visibleBookings].sort((left, right) => {
    if (left.date === right.date) {
      return right.id.localeCompare(left.id);
    }

    return right.date.localeCompare(left.date);
  });

  return (
    <div className="animate-fade-up w-full max-w-[800px] mx-auto pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 relative gap-4">
        <button
          onClick={onBack}
          className="sm:absolute left-0 top-1/2 sm:-translate-y-1/2 flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-white transition-colors group bg-[var(--systemhub-surface-card)] px-4 py-2.5 rounded-xl border border-[var(--systemhub-border)] hover:border-[var(--systemhub-primary-hover)]"
        >
          <ChevronLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />{' '}
          กลับ
        </button>
        <div className="text-center mx-auto">
          <h2 className="text-[24px] sm:text-[28px] font-black text-white tracking-wider mb-1">
            ติดตามสถานะการจอง
          </h2>
          <p className="text-gray-400 text-[13px] font-medium tracking-widest">
            ตรวจสอบสถานะครุภัณฑ์ที่คุณทำรายการ
          </p>
        </div>
      </div>

      {sortedBookings.length === 0 ? (
        <div className="rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[var(--systemhub-surface-status)] p-10 text-center shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
          <p className="text-[18px] font-black tracking-wide text-white">
            ยังไม่มีรายการให้ติดตาม
          </p>
          <p className="mt-3 text-[13px] font-medium tracking-wide text-gray-400">
            เมื่อคุณส่งคำขอจองครุภัณฑ์ รายการจะขึ้นที่หน้านี้และเปลี่ยนจากรอตรวจสอบเป็นอนุมัติแล้วหลังแอดมินอนุมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedBookings.map((item) => {
            const Icon = findBookingIcon(item.itemId, categoryItems);
            const isApproved = item.status === 'อนุมัติแล้ว';
            const isRejected = item.status === 'ไม่อนุมัติ';
            const statusLabel = getStatusLabel(item.status);
            const progressClass = isApproved
              ? 'w-full bg-[var(--systemhub-primary)]'
              : isRejected
                ? 'w-1/2 bg-gradient-to-r from-[#2563eb] to-[#ef4444]'
                : 'w-1/2 bg-gradient-to-r from-[#2563eb] to-yellow-500';
            const statusPillClass = isApproved
              ? 'bg-[#061b11]/50 text-[#22c55e] border-[#0d3320]'
              : isRejected
                ? 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/10'
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-yellow-500/10';
            const reviewNodeClass = isApproved
              ? 'bg-[var(--systemhub-primary)] shadow-[0_0_20px_rgba(37,99,235,0.8)]'
              : isRejected
                ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]';
            const reviewLabelClass = isApproved
              ? 'text-white'
              : isRejected
                ? 'text-red-400'
                : 'text-yellow-400';
            const finalNodeClass = isApproved
              ? 'bg-[var(--systemhub-primary)] text-white shadow-[0_0_20px_rgba(37,99,235,0.8)]'
              : isRejected
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : 'bg-[var(--systemhub-surface-inner)] border-[var(--systemhub-border)] text-gray-600';
            const finalLabelClass = isApproved
              ? 'text-white'
              : isRejected
                ? 'text-red-400'
                : 'text-gray-500';
            const finalLabel = isRejected ? 'ไม่อนุมัติ' : 'รับอุปกรณ์';

            return (
              <div
                key={item.id}
                className="bg-[var(--systemhub-surface-status)] border border-[rgba(27,41,71,0.6)] rounded-[1.5rem] p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:border-[rgba(59,130,246,0.4)] transition-all duration-300 group"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-[rgba(27,41,71,0.4)] pb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border-strong)] rounded-xl flex items-center justify-center group-hover:bg-[rgba(30,58,138,0.3)] transition-colors shadow-inner">
                      <Icon size={22} className="text-[var(--systemhub-accent)]" />
                    </div>
                    <div>
                      <h3 className="text-[18px] sm:text-[20px] font-black text-white tracking-wide mb-0.5">
                        {item.itemName}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-bold tracking-widest uppercase">
                        ID: {item.id}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase border ${statusPillClass}`}
                  >
                    {statusLabel}
                  </div>
                </div>

                <div className="relative flex justify-between items-center mb-12 px-4 sm:px-12 mt-4">
                  <div className="absolute top-1/2 left-[15%] right-[15%] h-1 bg-[var(--systemhub-surface-inner)] -translate-y-1/2 z-0 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${progressClass}`}
                    ></div>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--systemhub-primary)] flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.8)] border-[3px] border-[#080b14]">
                      <Check size={16} strokeWidth={4} />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-widest absolute -bottom-8 whitespace-nowrap">
                      ส่งคำขอ
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-500 border-[3px] border-[#080b14] ${reviewNodeClass}`}
                    >
                      {isApproved ? (
                        <Check size={16} strokeWidth={4} />
                      ) : isRejected ? (
                        <X size={16} strokeWidth={4} />
                      ) : (
                        <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold tracking-widest absolute -bottom-8 whitespace-nowrap ${reviewLabelClass}`}
                    >
                      ตรวจสอบ
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-[3px] border-[#080b14] ${finalNodeClass}`}
                    >
                      {isApproved ? (
                        <Check size={16} strokeWidth={4} />
                      ) : isRejected ? (
                        <X size={16} strokeWidth={4} />
                      ) : (
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold tracking-widest absolute -bottom-8 whitespace-nowrap ${finalLabelClass}`}
                    >
                      {finalLabel}
                    </span>
                  </div>
                </div>

                <div className="bg-[rgba(10,15,29,0.8)] border border-[rgba(27,41,71,0.5)] rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-[var(--systemhub-surface-inner)] w-10 h-10 rounded-xl border border-[var(--systemhub-border)] flex items-center justify-center">
                      <Clock size={16} className="text-[var(--systemhub-accent)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                        วันที่ทำรายการ
                      </span>
                      <span className="text-[13px] text-gray-200 font-black tracking-wide">
                        {`${formatBookingDate(item.date)} | ${item.time}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col text-right sm:text-left order-2 sm:order-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                        สถานที่รับครุภัณฑ์
                      </span>
                      <span className="text-[13px] text-gray-200 font-black tracking-wide">
                        {DEFAULT_PICKUP_LOCATION}
                      </span>
                    </div>
                    <div className="bg-[var(--systemhub-surface-inner)] w-10 h-10 rounded-xl border border-[var(--systemhub-border)] flex items-center justify-center order-1 sm:order-2">
                      <MapPin size={16} className="text-[var(--systemhub-accent)]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
