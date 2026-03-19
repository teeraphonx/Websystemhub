import { Lock } from 'lucide-react';
import type { EquipmentItem } from '../../types';

interface EquipmentCardProps {
  item: EquipmentItem;
  onReserve: (item: EquipmentItem) => void;
}

export default function EquipmentCard({ item, onReserve }: EquipmentCardProps) {
  const Icon = item.icon;

  return (
    <div className="bg-[var(--systemhub-surface-table)] border border-[var(--systemhub-border)] rounded-[1.2rem] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2 hover:border-[rgba(59,130,246,0.6)] group animate-fade-up">
      <div className="relative h-40 bg-[var(--systemhub-surface-card)] rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-[rgba(27,41,71,0.5)]">
        <Icon size={64} className="text-[#1e3a8a] opacity-50 group-hover:scale-110 transition-transform duration-700 group-hover:text-[var(--systemhub-primary)]" strokeWidth={1} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2563eb]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        {item.tag && (
          <div className="absolute top-3 left-3 bg-[#ef4444] text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.6)] tracking-wider z-10">
            {item.tag}
          </div>
        )}
      </div>
      <div className="px-1 pb-1">
        <h3 className="text-[17px] font-black text-[var(--systemhub-accent)] italic tracking-wide truncate mb-0.5 transition-colors">{item.name}</h3>
        <p className="text-[11px] text-gray-400 font-medium tracking-wide mb-1.5 truncate">{item.sub}</p>
        <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 uppercase">รหัส: {item.equipId}</p>
        <div className="inline-flex items-center gap-2 bg-[#061b11] border border-[#0d3320] px-3 py-1.5 rounded-lg mb-5 shadow-inner">
          <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
          <span className="text-[10px] font-black text-[#22c55e] tracking-wider">พร้อมให้จอง</span>
        </div>
        <div className="flex items-end justify-between border-t border-[rgba(27,41,71,0.7)] pt-4">
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">คงเหลือ</p>
            <p className="text-xl font-black text-white leading-none">{item.stock} <span className="text-[11px] text-gray-400 font-bold">ชิ้น</span></p>
          </div>
          <button
            type="button"
            onClick={() => onReserve(item)}
            className="btn-shine flex items-center gap-2 bg-[var(--systemhub-primary)] text-white px-5 py-2.5 rounded-xl text-[12px] font-black tracking-widest shadow-[0_5px_15px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] hover:bg-[var(--systemhub-primary-hover)] active:scale-95 transition-all"
          >
            <Lock size={14} strokeWidth={2.5} />
            จองเลย
          </button>
        </div>
      </div>
    </div>
  );
}

