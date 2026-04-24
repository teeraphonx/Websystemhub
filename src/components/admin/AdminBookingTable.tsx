import { Calendar as CalendarIcon, Check, Search, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { AdminBooking, AdminBookingStatus } from '../../types';

interface AdminBookingTableProps {
  bookings: AdminBooking[];
  selectedDate: string;
  selectedStatusFilter: AdminBookingStatus | 'all';
  onClearDate: () => void;
  onClearStatusFilter: () => void;
  onUpdateStatus: (id: string, status: AdminBookingStatus) => void;
  onUpdateAvailableQuantity: (id: string, quantity: number) => void;
}

const formatScheduleDate = (dateKey: string) => {
  const parsedDate = new Date(`${dateKey}T00:00:00+07:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
};

export default function AdminBookingTable({
  bookings,
  selectedDate,
  selectedStatusFilter,
  onClearDate,
  onClearStatusFilter,
  onUpdateStatus,
  onUpdateAvailableQuantity,
}: AdminBookingTableProps) {
  const selectedStatusLabel =
    selectedStatusFilter === 'รออนุมัติ' ? 'รอตรวจสอบ' : selectedStatusFilter;
  const selectedStatusChipClass =
    selectedStatusFilter === 'รออนุมัติ'
      ? 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]'
      : selectedStatusFilter === 'อนุมัติแล้ว'
        ? 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.12)] text-[#86efac]'
        : 'border-[rgba(239,68,68,0.28)] bg-[rgba(127,29,29,0.22)] text-[#fca5a5]';
  const emptyStateMessage =
    selectedStatusFilter !== 'all'
      ? selectedDate
        ? `ไม่มีรายการ${selectedStatusLabel}ในวันที่เลือก`
        : `ไม่มีรายการ${selectedStatusLabel}`
      : selectedDate
        ? 'ไม่มีรายการจองในวันที่เลือก'
        : 'ยังไม่มีรายการจอง';

  const handleAvailableQuantityChange = (
    booking: AdminBooking,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const nextValue = Number.parseInt(event.target.value, 10);
    const normalizedValue = Number.isNaN(nextValue)
      ? 0
      : Math.min(Math.max(nextValue, 0), booking.requestedQuantity);

    onUpdateAvailableQuantity(booking.id, normalizedValue);
  };

  return (
    <div className="systemhub-admin-panel flex flex-col overflow-hidden">
      <div className="systemhub-admin-panel-header flex flex-col items-start justify-between gap-3 p-5 md:flex-row md:items-center md:p-6">
        <h3 className="flex items-center gap-2 text-[16px] font-black uppercase tracking-widest text-white">
          รายการจองครุภัณฑ์
        </h3>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {selectedDate && (
            <div className="systemhub-admin-date-chip flex items-center gap-2 rounded-xl px-3 py-1.5">
              <CalendarIcon size={14} className="text-[var(--systemhub-accent)]" />
              <span className="text-[12px] font-bold tracking-wide text-white">
                {new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button type="button" onClick={onClearDate} className="ml-1 text-gray-400 transition-colors hover:text-[var(--systemhub-danger-strong)]">
                <X size={14} />
              </button>
            </div>
          )}

          {selectedStatusFilter !== 'all' && (
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-bold tracking-wide ${selectedStatusChipClass}`}
            >
              <span>{selectedStatusLabel}</span>
              <button
                type="button"
                onClick={onClearStatusFilter}
                className="text-current/70 transition-colors hover:text-white"
                aria-label="ล้างตัวกรองสถานะรายการจอง"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="systemhub-admin-input-shell flex items-center gap-2 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-gray-500" />
            <input type="text" placeholder="ค้นหา..." className="systemhub-admin-search-input w-24 text-[12px]" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-hidden">
        <div className="w-full">
          <div className="systemhub-admin-table-head grid grid-cols-12 gap-4 px-6 py-4 text-[11px] font-black uppercase tracking-widest">
            <div className="col-span-3">โปรไฟล์ / ผู้จอง</div>
            <div className="col-span-3">รหัส / อุปกรณ์</div>
            <div className="col-span-2">จำนวน / ช่วงยืม</div>
            <div className="col-span-2 text-center">สถานะ / จัดการ</div>
            <div className="col-span-2 text-center">เบิกได้</div>
          </div>

          <div className="systemhub-admin-table-body divide-y">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="systemhub-admin-table-row grid grid-cols-12 items-center gap-4 px-6 py-4 group"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="systemhub-admin-avatar flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white">
                      {booking.userAvatar}
                    </div>
                    <span className="text-[13px] font-bold text-gray-200 transition-colors group-hover:text-white">
                      {booking.user}
                    </span>
                  </div>

                  <div className="col-span-3 flex flex-col">
                    <span className="mb-0.5 text-[13px] font-black tracking-wide text-[var(--systemhub-accent)]">
                      {booking.itemName}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {booking.itemId}
                    </span>
                  </div>

                  <div className="col-span-2 text-[13px] font-bold text-white">
                    <p>
                      {booking.requestedQuantity}{' '}
                      <span className="text-[11px] font-bold text-gray-500">ชิ้น</span>
                    </p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-gray-500">
                      ยืม {formatScheduleDate(booking.date)} {booking.time}
                    </p>
                    {booking.returnDate && (
                      <p className="text-[10px] font-bold leading-4 text-gray-500">
                        คืน {formatScheduleDate(booking.returnDate)}{' '}
                        {booking.returnTime || 'ไม่ระบุเวลา'}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-center gap-2">
                    {booking.status === 'รออนุมัติ' ? (
                      <>
                        <span className="systemhub-status-pill systemhub-status-pill--pending px-3 py-1 text-[10px] tracking-widest">
                          รอตรวจสอบ
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking.id, 'อนุมัติแล้ว')}
                          className="systemhub-action-icon systemhub-action-icon--success"
                          title="อนุมัติ"
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(booking.id, 'ไม่อนุมัติ')}
                          className="systemhub-action-icon systemhub-action-icon--danger"
                          title="ไม่อนุมัติ"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </>
                    ) : (
                      <span
                        className={`systemhub-status-pill px-4 py-1.5 text-[11px] tracking-widest ${booking.status === 'อนุมัติแล้ว' ? 'systemhub-status-pill--success' : 'systemhub-status-pill--danger'}`}
                      >
                        {booking.status}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <div className="systemhub-admin-input-shell flex w-[84px] items-center justify-center rounded-xl px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={booking.availableQuantity}
                        onChange={(event) => handleAvailableQuantityChange(booking, event)}
                        className="w-full border-none bg-transparent px-0 py-0 text-center text-[16px] font-black text-white outline-none [appearance:textfield]"
                        aria-label={`เบิกได้ ${booking.itemName}`}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="systemhub-admin-empty-state flex flex-col items-center gap-3 py-12 text-center text-[13px] font-bold tracking-widest">
                <CalendarIcon size={32} className="opacity-50" />
                {emptyStateMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
