import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Image as ImageIcon,
  Info,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import EquipmentCard from '../../components/borrow/EquipmentCard';
import { CATEGORY_SUMMARIES } from '../../constants/views';
import type { BookingScheduleInput, CategoryId, EquipmentItem } from '../../types';
import { formatDateToYYYYMMDD, formatThaiShortDate } from '../../utils/date';

interface CategoryDetailPageProps {
  categoryId: CategoryId;
  items: EquipmentItem[];
  canReserve: boolean;
  onBack: () => void;
  onReserve: (item: EquipmentItem, schedule?: BookingScheduleInput) => void;
  onOpenVerification: () => void;
}

const getTodayDateKey = () => formatDateToYYYYMMDD(new Date());
const DEFAULT_BORROW_TIME = '09:00';
const DEFAULT_RETURN_TIME = '16:00';

const formatTimeLabel = (time: string) => (time ? `${time} น.` : 'ไม่ระบุเวลา');
const clampReservationQuantity = (quantity: number, maxQuantity: number) => {
  const normalizedQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;

  return Math.min(Math.max(normalizedQuantity, 1), Math.max(maxQuantity, 1));
};

export default function CategoryDetailPage({
  categoryId,
  items,
  canReserve,
  onBack,
  onReserve,
  onOpenVerification,
}: CategoryDetailPageProps) {
  const category = CATEGORY_SUMMARIES.find((item) => item.id === categoryId);
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<EquipmentItem | null>(null);
  const [pendingReservationItem, setPendingReservationItem] =
    useState<EquipmentItem | null>(null);
  const [borrowDate, setBorrowDate] = useState(getTodayDateKey);
  const [borrowTime, setBorrowTime] = useState(DEFAULT_BORROW_TIME);
  const [returnDate, setReturnDate] = useState(getTodayDateKey);
  const [returnTime, setReturnTime] = useState(DEFAULT_RETURN_TIME);
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const DetailIcon = selectedDetailItem?.icon;
  const PendingReservationIcon = pendingReservationItem?.icon;
  const todayDateKey = getTodayDateKey();
  const detailMaxQuantity = Math.max(selectedDetailItem?.stock ?? 1, 1);
  const pendingMaxQuantity = Math.max(pendingReservationItem?.stock ?? 1, 1);
  const isBorrowDateInvalid = !borrowDate || borrowDate < todayDateKey;
  const isReturnDateInvalid = !returnDate || (!!borrowDate && returnDate < borrowDate);
  const isSameDayTimeInvalid =
    !!borrowDate &&
    borrowDate === returnDate &&
    !!borrowTime &&
    !!returnTime &&
    returnTime < borrowTime;
  const isScheduleInvalid =
    isBorrowDateInvalid || isReturnDateInvalid || isSameDayTimeInvalid;

  if (!category) {
    return null;
  }

  const openReservationDateDialog = (item: EquipmentItem) => {
    if (!canReserve) {
      onReserve(item);
      return;
    }

    const nextMaxQuantity = Math.max(item.stock, 1);
    const nextQuantity =
      selectedDetailItem?.equipId === item.equipId ? reservationQuantity : 1;
    setSelectedDetailItem(null);
    const nextBorrowDate =
      borrowDate && borrowDate >= todayDateKey ? borrowDate : todayDateKey;
    setBorrowDate(nextBorrowDate);
    setReturnDate((currentDate) =>
      currentDate && currentDate >= nextBorrowDate ? currentDate : nextBorrowDate,
    );
    setBorrowTime((currentTime) => currentTime || DEFAULT_BORROW_TIME);
    setReturnTime((currentTime) => currentTime || DEFAULT_RETURN_TIME);
    setReservationQuantity(
      clampReservationQuantity(nextQuantity, nextMaxQuantity),
    );
    setPendingReservationItem(item);
  };

  const handleViewDetails = (item: EquipmentItem) => {
    setReservationQuantity(clampReservationQuantity(1, item.stock));
    setSelectedDetailItem(item);
  };

  const updateReservationQuantity = (quantity: number, maxQuantity: number) => {
    setReservationQuantity(clampReservationQuantity(quantity, maxQuantity));
  };

  const handleBorrowDateChange = (nextBorrowDate: string) => {
    setBorrowDate(nextBorrowDate);
    setReturnDate((currentDate) =>
      currentDate && currentDate >= nextBorrowDate ? currentDate : nextBorrowDate,
    );
  };

  const handleConfirmReservation = () => {
    if (!pendingReservationItem || isScheduleInvalid) {
      return;
    }

    onReserve(pendingReservationItem, {
      borrowDate,
      borrowTime,
      returnDate,
      returnTime,
      quantity: clampReservationQuantity(
        reservationQuantity,
        pendingReservationItem.stock,
      ),
    });
    setPendingReservationItem(null);
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-up space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="systemhub-accent-chip inline-flex items-center gap-2 rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Tag size={16} className="text-[var(--systemhub-accent)]" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">CATEGORY {category.title}</span>
            </div>
            <p className="text-[13px] text-[var(--systemhub-text-muted)]">รายการพร้อมจองทั้งหมด {items.length} รายการ</p>
          </div>

          <button
            onClick={onBack}
            className="systemhub-outline-chip flex items-center gap-2 self-start rounded-xl px-4 py-2 text-[13px] font-bold text-gray-400 transition-colors group hover:border-[var(--systemhub-primary-hover)] hover:text-white md:self-auto"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
          </button>
        </div>

        {!canReserve && (
          <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.1)] p-5 shadow-[0_16px_42px_rgba(0,0,0,0.28)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(245,158,11,0.36)] bg-[rgba(15,23,42,0.58)] text-[#fcd34d]">
                <ShieldCheck size={23} />
              </div>
              <div>
                <p className="text-[14px] font-black tracking-wide text-white">
                  ต้องยืนยันตัวตนก่อนจอง
                </p>
                <p className="mt-1 text-[12px] font-medium leading-6 text-[#fcd34d]">
                  คุณสามารถดูรายละเอียดครุภัณฑ์ได้ แต่ต้องส่งคำขอยืนยันตัวตนและรอแอดมินอนุมัติก่อนทำรายการจอง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenVerification}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(245,158,11,0.38)] bg-[rgba(245,158,11,0.14)] px-4 py-3 text-[12px] font-black tracking-widest text-[#fcd34d] transition-colors hover:bg-[rgba(245,158,11,0.22)] hover:text-white"
            >
              <ShieldCheck size={16} />
              ไปยืนยันตัวตน
            </button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                canReserve={canReserve}
                onReserve={openReservationDateDialog}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] p-10 text-center text-[14px] font-bold tracking-widest text-gray-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            ยังไม่พบครุภัณฑ์ในหมวดนี้จากฐานข้อมูล
          </div>
        )}
      </div>

      {selectedDetailItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-detail-title"
          className="fixed inset-0 z-[450] flex items-start justify-center overflow-y-auto bg-[#02050f]/90 px-4 py-5 backdrop-blur-md"
        >
          <div className="systemhub-auth-panel custom-scrollbar relative max-h-[calc(100vh-2.5rem)] w-full max-w-[1500px] overflow-hidden overflow-y-auto rounded-[2rem] p-0 shadow-[0_28px_90px_rgba(0,0,0,0.76)]">
            <div className="systemhub-top-accent h-1.5 w-full"></div>
            <button
              type="button"
              onClick={() => setSelectedDetailItem(null)}
              aria-label="ปิดรายละเอียดครุภัณฑ์"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.86)] text-gray-400 transition-colors hover:border-[var(--systemhub-primary-hover)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
            >
              <X size={18} />
            </button>

            <div className="border-b border-[rgba(30,42,74,0.72)] px-6 py-5 text-center sm:px-10">
              <p className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--systemhub-accent)]">
                <Info size={13} />
                SYSTEMHUB EQUIPMENT
              </p>
              <h3
                id="equipment-detail-title"
                className="mx-auto max-w-[58rem] break-words text-2xl font-black tracking-wide text-white sm:text-3xl"
              >
                {selectedDetailItem.name}
              </h3>
              <p className="mt-2 text-[13px] font-medium leading-6 text-gray-400">
                {selectedDetailItem.sub}
              </p>
            </div>

            <div className="grid gap-7 p-6 lg:grid-cols-[0.78fr_1.52fr] lg:p-8">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[rgba(10,15,28,0.82)] shadow-[0_18px_52px_rgba(0,0,0,0.34)]">
                  <div className="relative flex aspect-[16/13] min-h-[320px] items-center justify-center">
                    {selectedDetailItem.imageUrl ? (
                      <img
                        src={selectedDetailItem.imageUrl}
                        alt={selectedDetailItem.imageAlt || selectedDetailItem.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.18)_0%,rgba(10,15,28,0)_66%)] p-8 text-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-[rgba(96,165,250,0.34)] bg-[rgba(15,23,42,0.76)] text-[var(--systemhub-accent)] shadow-[0_0_28px_rgba(37,99,235,0.22)]">
                          <ImageIcon size={42} strokeWidth={1.6} />
                        </div>
                        <div>
                          <p className="text-[15px] font-black tracking-wide text-white">
                            รอเพิ่มรูปครุภัณฑ์
                          </p>
                          <p className="mt-2 text-[12px] font-bold leading-6 text-gray-500">
                            เมื่อเพิ่มรูปในข้อมูลรายการ ระบบจะแสดงภาพตรงนี้อัตโนมัติ
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(2,6,23,0.78)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)] backdrop-blur-md">
                      <ImageIcon size={13} />
                      Preview
                    </div>
                  </div>
                </div>

                {!canReserve && selectedDetailItem.stock > 0 && (
                  <div className="rounded-2xl border border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.1)] p-5 text-[#fcd34d]">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[13px] font-black tracking-wide text-white">
                          ต้องยืนยันตัวตนก่อนจอง
                        </p>
                        <p className="mt-2 text-[12px] font-bold leading-6">
                          ต้องส่งคำขอยืนยันตัวตนและรอแอดมินอนุมัติก่อน จึงจะสามารถจองครุภัณฑ์รายการนี้ได้
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex min-h-[480px] flex-col">
                <div className="mb-6 rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(10,15,28,0.72)] p-2 shadow-inner">
                  <div className="rounded-xl border border-[rgba(59,130,246,0.26)] bg-[rgba(37,99,235,0.14)] px-5 py-4 text-center text-[13px] font-black tracking-widest text-white">
                    <span className="inline-flex items-center gap-2">
                      <Info size={16} className="text-[var(--systemhub-accent)]" />
                      รายละเอียดครุภัณฑ์
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl border border-[rgba(30,42,74,0.74)] bg-[rgba(5,8,20,0.44)] p-5">
                    <div className="flex items-start gap-4">
                      <div className="systemhub-borrow-card-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--systemhub-accent)]">
                        {DetailIcon && <DetailIcon size={24} strokeWidth={1.5} />}
                      </div>
                      <div>
                        <p className="text-[15px] font-black leading-7 text-white">
                          {selectedDetailItem.name}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-[13px] font-medium leading-7 text-gray-400">
                          {selectedDetailItem.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="systemhub-field-shell rounded-2xl p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        รหัสครุภัณฑ์
                      </p>
                      <p className="break-words text-[13px] font-bold leading-6 text-white">
                        {selectedDetailItem.equipId}
                      </p>
                    </div>
                    <div className="systemhub-field-shell rounded-2xl p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        คงเหลือ
                      </p>
                      <p className="text-2xl font-black leading-none text-white">
                        {selectedDetailItem.stock}{' '}
                        <span className="text-[12px] font-bold text-gray-400">ชิ้น</span>
                      </p>
                    </div>
                    <div className="systemhub-field-shell rounded-2xl p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        หมวดหมู่
                      </p>
                      <p className="text-[13px] font-bold leading-6 text-white">
                        {category.title}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(10,15,28,0.92)] shadow-[0_18px_52px_rgba(0,0,0,0.3)]">
                  <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[11px] font-black tracking-widest ${selectedDetailItem.stock > 0 ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] text-[#86efac]' : 'border-[rgba(239,68,68,0.3)] bg-[rgba(127,29,29,0.18)] text-[#fca5a5]'}`}>
                        <span className={`h-2 w-2 rounded-full ${selectedDetailItem.stock > 0 ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.75)]' : 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.75)]'}`}></span>
                        {selectedDetailItem.stock > 0 ? 'พร้อมให้จอง' : 'สต็อกไม่พร้อม'}
                      </div>
                      <div className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[11px] font-black tracking-widest ${canReserve ? 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.1)] text-[#86efac]' : 'border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.1)] text-[#fcd34d]'}`}>
                        <ShieldCheck size={15} />
                        {canReserve ? 'ยืนยันแล้ว' : 'รอยืนยันตัวตน'}
                      </div>
                      <div className="flex h-10 items-center overflow-hidden rounded-xl border border-[var(--systemhub-border)] bg-[rgba(15,23,42,0.72)] text-[12px] font-black text-white">
                        <span className="px-4 text-gray-500">จำนวน</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateReservationQuantity(
                              reservationQuantity - 1,
                              detailMaxQuantity,
                            )
                          }
                          disabled={selectedDetailItem.stock <= 0 || reservationQuantity <= 1}
                          aria-label="ลดจำนวนจอง"
                          className="flex h-full w-10 items-center justify-center border-l border-[var(--systemhub-border)] text-gray-400 transition-colors hover:bg-[rgba(37,99,235,0.16)] hover:text-white disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="flex h-full min-w-12 items-center justify-center border-x border-[var(--systemhub-border)] px-4 text-[15px] text-white">
                          {clampReservationQuantity(
                            reservationQuantity,
                            detailMaxQuantity,
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateReservationQuantity(
                              reservationQuantity + 1,
                              detailMaxQuantity,
                            )
                          }
                          disabled={
                            selectedDetailItem.stock <= 0 ||
                            reservationQuantity >= detailMaxQuantity
                          }
                          aria-label="เพิ่มจำนวนจอง"
                          className="flex h-full w-10 items-center justify-center text-gray-400 transition-colors hover:bg-[rgba(37,99,235,0.16)] hover:text-white disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                        <span className="border-l border-[var(--systemhub-border)] px-4 text-gray-500">ชิ้น</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[300px]">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailItem(null)}
                        className="systemhub-secondary-button rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-gray-300 transition-all hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
                      >
                        ปิด
                      </button>
                      <button
                        type="button"
                        disabled={selectedDetailItem.stock <= 0}
                        onClick={() => openReservationDateDialog(selectedDetailItem)}
                        className={`btn-shine flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-black tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-[rgba(51,65,85,0.8)] disabled:text-gray-400 disabled:shadow-none ${canReserve ? 'systemhub-primary-button text-white' : 'border border-[rgba(245,158,11,0.36)] bg-[rgba(245,158,11,0.14)] text-[#fcd34d] hover:bg-[rgba(245,158,11,0.22)] hover:text-white'}`}
                      >
                        <Lock size={15} strokeWidth={2.5} />
                        {selectedDetailItem.stock <= 0
                          ? 'ของหมด'
                          : canReserve
                            ? 'เลือกวันยืม'
                            : 'ยืนยันก่อนจอง'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingReservationItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="borrow-schedule-title"
          className="fixed inset-0 z-[460] flex items-start justify-center overflow-y-auto bg-[#02050f]/88 px-4 py-5 backdrop-blur-md"
        >
          <div className="systemhub-auth-panel custom-scrollbar relative max-h-[calc(100vh-2.5rem)] w-full max-w-[640px] overflow-hidden overflow-y-auto rounded-[2rem] p-0 shadow-[0_28px_90px_rgba(0,0,0,0.76)]">
            <div className="systemhub-top-accent h-1.5 w-full"></div>
            <button
              type="button"
              onClick={() => setPendingReservationItem(null)}
              aria-label="ปิดเลือกวันยืมและคืนครุภัณฑ์"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.86)] text-gray-400 transition-colors hover:border-[var(--systemhub-primary-hover)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
            >
              <X size={18} />
            </button>

            <div className="p-6 sm:p-7">
              <div className="mb-6 flex items-start gap-4 pr-10">
                <div className="systemhub-borrow-card-icon flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[var(--systemhub-accent)]">
                  {PendingReservationIcon && (
                    <PendingReservationIcon size={30} strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--systemhub-accent)]">
                    <CalendarDays size={13} />
                    BORROW SCHEDULE
                  </p>
                  <h3
                    id="borrow-schedule-title"
                    className="break-words text-2xl font-black tracking-wide text-white"
                  >
                    เลือกวันยืมและวันคืน
                  </h3>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-gray-400">
                    {pendingReservationItem.name}
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(19,27,47,0.72)] p-5 shadow-inner">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] text-[var(--systemhub-accent)]">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-white">
                      กำหนดช่วงเวลาการยืม
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-gray-500">
                      เลือกวันเริ่มยืมและวันคืนให้เรียบร้อยก่อนส่งคำขอ
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.48)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                      จำนวนที่ต้องการจอง
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-gray-500">
                      คงเหลือสูงสุด {pendingReservationItem.stock} ชิ้น
                    </p>
                  </div>
                  <div className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-[var(--systemhub-border)] bg-[rgba(15,23,42,0.78)] text-[12px] font-black text-white sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        updateReservationQuantity(
                          reservationQuantity - 1,
                          pendingMaxQuantity,
                        )
                      }
                      disabled={reservationQuantity <= 1}
                      aria-label="ลดจำนวนจอง"
                      className="flex h-full w-12 items-center justify-center text-gray-400 transition-colors hover:bg-[rgba(37,99,235,0.16)] hover:text-white disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
                    >
                      <Minus size={15} strokeWidth={3} />
                    </button>
                    <span className="flex h-full min-w-16 flex-1 items-center justify-center border-x border-[var(--systemhub-border)] px-5 text-[16px] text-white sm:flex-none">
                      {clampReservationQuantity(
                        reservationQuantity,
                        pendingMaxQuantity,
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateReservationQuantity(
                          reservationQuantity + 1,
                          pendingMaxQuantity,
                        )
                      }
                      disabled={reservationQuantity >= pendingMaxQuantity}
                      aria-label="เพิ่มจำนวนจอง"
                      className="flex h-full w-12 items-center justify-center text-gray-400 transition-colors hover:bg-[rgba(37,99,235,0.16)] hover:text-white disabled:cursor-not-allowed disabled:text-gray-700 disabled:hover:bg-transparent"
                    >
                      <Plus size={15} strokeWidth={3} />
                    </button>
                    <span className="border-l border-[var(--systemhub-border)] px-4 text-gray-500">
                      ชิ้น
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                      <CalendarDays size={15} />
                      วันที่ยืม
                    </label>
                    <input
                      type="date"
                      value={borrowDate}
                      min={todayDateKey}
                      onChange={(event) => handleBorrowDateChange(event.target.value)}
                      className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                      <Clock size={15} />
                      เวลาเริ่มยืม
                    </label>
                    <input
                      type="time"
                      value={borrowTime}
                      onChange={(event) => setBorrowTime(event.target.value)}
                      className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                      <CalendarDays size={15} />
                      วันที่คืน
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      min={borrowDate || todayDateKey}
                      onChange={(event) => setReturnDate(event.target.value)}
                      className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                      <Clock size={15} />
                      เวลาคืน
                    </label>
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(event) => setReturnTime(event.target.value)}
                      className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[rgba(59,130,246,0.22)] bg-[rgba(10,15,29,0.58)] px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    ช่วงเวลาที่เลือก
                  </p>
                  <p className="mt-2 text-[12px] font-black leading-5 text-[var(--systemhub-accent)]">
                    จำนวน {clampReservationQuantity(reservationQuantity, pendingMaxQuantity)} ชิ้น
                  </p>
                  <p className="mt-2 text-[13px] font-black leading-6 text-white">
                    {borrowDate ? formatThaiShortDate(borrowDate) : 'ยังไม่ได้เลือกวันที่ยืม'}{' '}
                    <span className="text-[var(--systemhub-accent)]">
                      {formatTimeLabel(borrowTime)}
                    </span>
                    <span className="mx-2 text-gray-500">ถึง</span>
                    {returnDate ? formatThaiShortDate(returnDate) : 'ยังไม่ได้เลือกวันที่คืน'}{' '}
                    <span className="text-[var(--systemhub-accent)]">
                      {formatTimeLabel(returnTime)}
                    </span>
                  </p>
                </div>

                {isBorrowDateInvalid && (
                  <p className="mt-3 text-[12px] font-bold leading-6 text-[#fcd34d]">
                    กรุณาเลือกวันที่ยืมเป็นวันนี้หรือวันถัดไป
                  </p>
                )}
                {isReturnDateInvalid && (
                  <p className="mt-3 text-[12px] font-bold leading-6 text-[#fcd34d]">
                    วันที่คืนต้องเป็นวันเดียวกับวันที่ยืมหรือหลังจากวันที่ยืม
                  </p>
                )}
                {isSameDayTimeInvalid && (
                  <p className="mt-3 text-[12px] font-bold leading-6 text-[#fcd34d]">
                    ถ้ายืมและคืนในวันเดียวกัน เวลาคืนต้องไม่ก่อนเวลาเริ่มยืม
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-[rgba(30,42,74,0.8)] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingReservationItem(null)}
                  className="systemhub-secondary-button rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-gray-300 transition-all hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isScheduleInvalid}
                  onClick={handleConfirmReservation}
                  className="btn-shine systemhub-primary-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-[rgba(51,65,85,0.8)] disabled:text-gray-400 disabled:shadow-none"
                >
                  <Lock size={15} strokeWidth={2.5} />
                  ยืนยันการจอง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
