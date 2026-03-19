import { MoreHorizontal, MousePointerClick } from 'lucide-react';
import type { CategorySummary } from '../../types';

interface CategoryCardProps {
  summary: CategorySummary;
  onSelect: (categoryId: CategorySummary['id']) => void;
}

export default function CategoryCard({ summary, onSelect }: CategoryCardProps) {
  const Icon = summary.icon;
  const BgIcon = summary.bgIcon;

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.id)}
      className="systemhub-category-card systemhub-borrow-category-card group relative flex h-[240px] w-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--systemhub-border)] p-8 text-left shadow-2xl transition-all duration-500 hover:-translate-y-1 hover:border-[var(--systemhub-primary-hover)] animate-fade-up"
    >
      <BgIcon
        className="systemhub-borrow-watermark pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 transition-all duration-700 group-hover:scale-105"
        strokeWidth={1.5}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="systemhub-borrow-card-icon flex h-[52px] w-[52px] items-center justify-center rounded-xl shadow-inner transition-colors duration-300 group-hover:bg-[rgba(30,58,138,0.5)]">
          <Icon size={24} className="text-[var(--systemhub-accent)]" strokeWidth={1.5} />
        </div>
        <MoreHorizontal className="text-[rgba(59,130,246,0.5)] transition-colors group-hover:text-[var(--systemhub-accent)]" size={26} />
      </div>

      <div className="relative z-10 mt-auto flex flex-col items-end text-right">
        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-md md:text-[34px]">{summary.title}</h3>
        <p className="mb-5 mt-1 text-[13px] font-bold tracking-widest text-[var(--systemhub-accent)]">{summary.sub}</p>
        <span className="systemhub-borrow-card-cta inline-flex items-center gap-2.5 rounded-full px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all duration-500 group-hover:border-[var(--systemhub-primary)] group-hover:bg-[var(--systemhub-primary)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
          {summary.buttonLabel}
          <MousePointerClick size={14} className="opacity-90 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
        </span>
      </div>
    </button>
  );
}
