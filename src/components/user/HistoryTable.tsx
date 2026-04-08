import { Check } from 'lucide-react';
import type { HistoryRecord } from '../../types';

interface HistoryTableProps {
  items: HistoryRecord[];
  emptyMessage?: string;
}

export default function HistoryTable({
  items,
  emptyMessage = 'ไม่พบรายการจองในวันที่เลือก',
}: HistoryTableProps) {
  if (items.length === 0) {
    return (
      <div className="bg-[var(--systemhub-surface-card)] border border-[var(--systemhub-border)] rounded-[1.5rem] p-10 text-center text-gray-500 font-bold text-[14px] tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-[var(--systemhub-surface-card)] border border-[var(--systemhub-border)] rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="hidden md:grid grid-cols-12 gap-4 p-5 bg-[var(--systemhub-surface-table)] border-b border-[var(--systemhub-border)] text-[12px] font-black text-gray-400 uppercase tracking-widest">
        <div className="col-span-3 pl-2">ชื่อรายการ</div>
        <div className="col-span-5">รายละเอียดการจอง</div>
        <div className="col-span-2 text-center">สถานะ</div>
        <div className="col-span-2 text-right pr-2">วันที่</div>
      </div>

      <div className="divide-y divide-[rgba(27,41,71,0.6)]">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 md:p-6 items-center hover:bg-[rgba(21,31,51,0.5)] transition-colors group">
            <div className="col-span-3 font-black text-white text-[14px] md:text-[15px] tracking-wide group-hover:text-[var(--systemhub-accent)] transition-colors">
              {item.itemName}
            </div>
            <div className="col-span-5">
              <div className="bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] p-4 rounded-xl text-[12px] text-gray-300 font-medium leading-relaxed shadow-inner">
                {item.details.map((line) => (
                  <div key={line} className="flex items-start gap-2 mb-1.5 last:mb-0">
                    <span className="flex-1">{line}</span>
                    <div className="bg-green-500 rounded-[4px] text-white p-0.5 mt-0.5 shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2 text-center flex justify-start md:justify-center">
              <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase ${item.status === 'จองสำเร็จ' || item.status === 'อนุมัติแล้ว' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-[var(--systemhub-accent)] border border-[rgba(59,130,246,0.2)]'}`}>
                {item.status}
              </span>
            </div>
            <div className="col-span-2 text-left md:text-right text-[12px] text-gray-500 font-bold tracking-wider">
              {item.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



