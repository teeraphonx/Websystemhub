import { Calendar as CalendarIcon, ChevronLeft, X } from 'lucide-react';
import HistoryTable from '../../components/user/HistoryTable';
import { mockHistoryData } from '../../data/mockHistoryData';

interface HistoryPageProps {
  filter: string;
  onFilterChange: (value: string) => void;
  onClearFilter: () => void;
  onBack: () => void;
}

export default function HistoryPage({ filter, onFilterChange, onClearFilter, onBack }: HistoryPageProps) {
  const filteredHistoryData = filter
    ? mockHistoryData.filter((item) => item.date.startsWith(filter))
    : mockHistoryData;

  return (
    <div className="animate-fade-up w-full max-w-[1000px] mx-auto pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 relative gap-4">
        <button onClick={onBack} className="sm:absolute left-0 top-1/2 sm:-translate-y-1/2 flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-white transition-colors group bg-[var(--systemhub-surface-card)] px-4 py-2.5 rounded-xl border border-[var(--systemhub-border)] hover:border-[var(--systemhub-primary-hover)]">
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> กลับ
        </button>
        <div className="text-center mx-auto">
          <h2 className="text-[24px] sm:text-[28px] font-black text-white tracking-wider mb-1">ประวัติการจองครุภัณฑ์</h2>
          <p className="text-gray-400 text-[13px] font-medium tracking-widest">ทั้งหมด {filteredHistoryData.length} รายการ</p>
        </div>

        <div className="sm:absolute right-0 top-1/2 sm:-translate-y-1/2 flex items-center gap-2 bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] px-3 py-2 rounded-xl focus-within:border-[var(--systemhub-primary-hover)] transition-colors shadow-inner">
          <CalendarIcon size={14} className="text-[var(--systemhub-accent)]" />
          <input type="date" value={filter} onChange={(event) => onFilterChange(event.target.value)} style={{ colorScheme: 'dark' }} className="bg-transparent border-none text-[12px] text-gray-300 font-bold outline-none cursor-pointer" />
          {filter && (
            <button type="button" onClick={onClearFilter} className="text-gray-500 hover:text-red-400 ml-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <HistoryTable items={filteredHistoryData} />
    </div>
  );
}

