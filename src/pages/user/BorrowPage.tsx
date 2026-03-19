import { Package } from 'lucide-react';
import CategoryCard from '../../components/borrow/CategoryCard';
import { CATEGORY_SUMMARIES } from '../../constants/views';
import type { CategoryId } from '../../types';

interface BorrowPageProps {
  onSelectCategory: (categoryId: CategoryId) => void;
}

export default function BorrowPage({ onSelectCategory }: BorrowPageProps) {
  return (
    <div className="animate-fade-up delay-100">
      <section className="systemhub-borrow-strip mb-6 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="systemhub-borrow-strip-icon flex h-[46px] w-[46px] items-center justify-center rounded-xl">
            <Package size={20} className="text-[var(--systemhub-accent)]" />
          </div>
          <h2 className="text-[17px] font-black tracking-wide text-white">หมวดหมู่ครุภัณฑ์ทั้งหมด</h2>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CATEGORY_SUMMARIES.map((summary) => (
          <CategoryCard key={summary.id} summary={summary} onSelect={onSelectCategory} />
        ))}
      </div>
    </div>
  );
}
