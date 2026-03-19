import { ChevronLeft, Tag } from 'lucide-react';
import EquipmentCard from '../../components/borrow/EquipmentCard';
import { CATEGORY_SUMMARIES } from '../../constants/views';
import { categoryItems } from '../../data/categoryItems';
import type { CategoryId, EquipmentItem } from '../../types';

interface CategoryDetailPageProps {
  categoryId: CategoryId;
  onBack: () => void;
  onReserve: (item: EquipmentItem) => void;
}

export default function CategoryDetailPage({ categoryId, onBack, onReserve }: CategoryDetailPageProps) {
  const category = CATEGORY_SUMMARIES.find((item) => item.id === categoryId);

  if (!category) {
    return null;
  }

  return (
    <div className="animate-fade-up space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="systemhub-accent-chip inline-flex items-center gap-2 rounded-xl px-4 py-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            <Tag size={16} className="text-[var(--systemhub-accent)]" />
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">CATEGORY {category.title}</span>
          </div>
          <p className="text-[13px] text-[var(--systemhub-text-muted)]">รายการพร้อมจองทั้งหมด {categoryItems[categoryId].length} รายการ</p>
        </div>

        <button
          onClick={onBack}
          className="systemhub-outline-chip flex items-center gap-2 self-start rounded-xl px-4 py-2 text-[13px] font-bold text-gray-400 transition-colors group hover:border-[var(--systemhub-primary-hover)] hover:text-white md:self-auto"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categoryItems[categoryId].map((item) => (
          <EquipmentCard key={item.id} item={item} onReserve={onReserve} />
        ))}
      </div>
    </div>
  );
}

