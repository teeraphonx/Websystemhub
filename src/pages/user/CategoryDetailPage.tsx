import { useState } from 'react';
import { ChevronLeft, Info, Lock, Tag, X } from 'lucide-react';
import EquipmentCard from '../../components/borrow/EquipmentCard';
import { CATEGORY_SUMMARIES } from '../../constants/views';
import type { CategoryId, EquipmentItem } from '../../types';

interface CategoryDetailPageProps {
  categoryId: CategoryId;
  items: EquipmentItem[];
  onBack: () => void;
  onReserve: (item: EquipmentItem) => void;
}

export default function CategoryDetailPage({
  categoryId,
  items,
  onBack,
  onReserve,
}: CategoryDetailPageProps) {
  const category = CATEGORY_SUMMARIES.find((item) => item.id === categoryId);
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<EquipmentItem | null>(null);
  const DetailIcon = selectedDetailItem?.icon;

  if (!category) {
    return null;
  }

  const handleReserveFromDetails = (item: EquipmentItem) => {
    setSelectedDetailItem(null);
    onReserve(item);
  };

  return (
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

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              onReserve={onReserve}
              onViewDetails={setSelectedDetailItem}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] p-10 text-center text-[14px] font-bold tracking-widest text-gray-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          ยังไม่พบครุภัณฑ์ในหมวดนี้จากฐานข้อมูล
        </div>
      )}

      {selectedDetailItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-detail-title"
          className="fixed inset-0 z-[450] flex items-center justify-center bg-[#02050f]/85 p-4 backdrop-blur-md"
        >
          <div className="relative w-full max-w-[560px] overflow-hidden rounded-[1.5rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-modal)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
            <button
              type="button"
              onClick={() => setSelectedDetailItem(null)}
              aria-label="ปิดรายละเอียดครุภัณฑ์"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.75)] text-gray-400 transition-colors hover:border-[var(--systemhub-primary-hover)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
            >
              <X size={18} />
            </button>

            <div className="mb-6 flex items-start gap-4 pr-12">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] text-[var(--systemhub-accent)] shadow-[0_0_24px_rgba(37,99,235,0.2)]">
                {DetailIcon && <DetailIcon size={30} strokeWidth={1.6} />}
              </div>
              <div className="min-w-0">
                <p className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[rgba(59,130,246,0.25)] bg-[rgba(37,99,235,0.1)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--systemhub-accent)]">
                  <Info size={13} />
                  รายละเอียด
                </p>
                <h3
                  id="equipment-detail-title"
                  className="text-2xl font-black tracking-wide text-white"
                >
                  {selectedDetailItem.name}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-gray-400">
                  {selectedDetailItem.sub}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-5 shadow-inner">
              <p className="whitespace-pre-line text-[14px] leading-7 text-gray-300">
                {selectedDetailItem.description}
              </p>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[rgba(27,41,71,0.8)] bg-[rgba(15,23,42,0.65)] p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  รหัสครุภัณฑ์
                </p>
                <p className="break-words text-[13px] font-bold text-white">
                  {selectedDetailItem.equipId}
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(27,41,71,0.8)] bg-[rgba(15,23,42,0.65)] p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  คงเหลือ
                </p>
                <p className="text-[13px] font-bold text-white">
                  {selectedDetailItem.stock} ชิ้น
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(27,41,71,0.8)] bg-[rgba(15,23,42,0.65)] p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  สถานะ
                </p>
                <p className={selectedDetailItem.stock > 0 ? 'text-[13px] font-bold text-[#22c55e]' : 'text-[13px] font-bold text-[#f87171]'}>
                  {selectedDetailItem.stock > 0 ? 'พร้อมให้จอง' : 'สต็อกไม่พร้อมจอง'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="rounded-xl border border-[rgba(148,163,184,0.24)] px-5 py-3 text-[12px] font-black tracking-widest text-gray-300 transition-colors hover:border-[var(--systemhub-primary-hover)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={selectedDetailItem.stock <= 0}
                onClick={() => handleReserveFromDetails(selectedDetailItem)}
                className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-[var(--systemhub-primary)] px-5 py-3 text-[12px] font-black tracking-widest text-white shadow-[0_5px_15px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--systemhub-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-[rgba(51,65,85,0.8)] disabled:text-gray-400 disabled:shadow-none"
              >
                <Lock size={15} strokeWidth={2.5} />
                {selectedDetailItem.stock > 0 ? 'จองรายการนี้' : 'ของหมด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
