import { Info, Lock } from 'lucide-react';
import type { EquipmentItem } from '../../types';

interface EquipmentCardProps {
  item: EquipmentItem;
  onReserve: (item: EquipmentItem) => void;
  onViewDetails: (item: EquipmentItem) => void;
}

export default function EquipmentCard({
  item,
  onReserve,
  onViewDetails,
}: EquipmentCardProps) {
  const Icon = item.icon;
  const isOutOfStock = item.stock <= 0;

  return (
    <div className="bg-[var(--systemhub-surface-table)] border border-[var(--systemhub-border)] rounded-[1.2rem] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2 hover:border-[rgba(59,130,246,0.6)] group animate-fade-up">
      <button
        type="button"
        onClick={() => onViewDetails(item)}
        aria-label={`ดูรายละเอียด ${item.name}`}
        className="relative mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-[rgba(27,41,71,0.5)] bg-[var(--systemhub-surface-card)] text-left outline-none transition-colors focus:border-[var(--systemhub-primary-hover)] focus:ring-2 focus:ring-[rgba(37,99,235,0.45)]"
      >
        <Icon size={64} className="text-[#1e3a8a] opacity-50 group-hover:scale-110 transition-transform duration-700 group-hover:text-[var(--systemhub-primary)]" strokeWidth={1} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2563eb]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(59,130,246,0.35)] bg-[#061126]/85 text-[var(--systemhub-accent)] shadow-[0_0_14px_rgba(37,99,235,0.25)] transition-colors group-hover:bg-[rgba(37,99,235,0.22)]">
          <Info size={15} />
        </div>
        {item.tag && (
          <div className="absolute top-3 left-3 bg-[#ef4444] text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.6)] tracking-wider z-10">
            {item.tag}
          </div>
        )}
      </button>
      <div className="px-1 pb-1">
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mb-0.5 block w-full truncate text-left text-[17px] font-black italic tracking-wide text-[var(--systemhub-accent)] transition-colors hover:text-white focus:outline-none focus:text-white"
        >
          {item.name}
        </button>
        <p className="text-[11px] text-gray-400 font-medium tracking-wide mb-1.5 truncate">{item.sub}</p>
        <p className="text-[10px] text-gray-500 font-bold tracking-widest mb-3 uppercase">รหัส: {item.equipId}</p>
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[rgba(59,130,246,0.25)] bg-[rgba(37,99,235,0.08)] px-3 py-1.5 text-[10px] font-black tracking-widest text-[var(--systemhub-accent)] transition-colors hover:border-[var(--systemhub-primary-hover)] hover:bg-[rgba(37,99,235,0.18)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.4)]"
        >
          <Info size={13} />
          ดูรายละเอียด
        </button>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-5 shadow-inner ${isOutOfStock ? 'bg-[#2a1010] border border-[#4b1c1c]' : 'bg-[#061b11] border border-[#0d3320]'}`}>
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)] ${isOutOfStock ? 'bg-[#ef4444] shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-[#22c55e] animate-pulse'}`}></div>
          <span className={`text-[10px] font-black tracking-wider ${isOutOfStock ? 'text-[#f87171]' : 'text-[#22c55e]'}`}>
            {isOutOfStock ? 'สต็อกไม่พร้อมจอง' : 'พร้อมให้จอง'}
          </span>
        </div>
        <div className="flex items-end justify-between border-t border-[rgba(27,41,71,0.7)] pt-4">
          <div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">คงเหลือ</p>
            <p className="text-xl font-black text-white leading-none">{item.stock} <span className="text-[11px] text-gray-400 font-bold">ชิ้น</span></p>
          </div>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onReserve(item)}
            className="btn-shine flex items-center gap-2 bg-[var(--systemhub-primary)] text-white px-5 py-2.5 rounded-xl text-[12px] font-black tracking-widest shadow-[0_5px_15px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] hover:bg-[var(--systemhub-primary-hover)] active:scale-95 transition-all disabled:cursor-not-allowed disabled:bg-[rgba(51,65,85,0.8)] disabled:text-gray-400 disabled:shadow-none disabled:hover:bg-[rgba(51,65,85,0.8)]"
          >
            <Lock size={14} strokeWidth={2.5} />
            {isOutOfStock ? 'ของหมด' : 'จองเลย'}
          </button>
        </div>
      </div>
    </div>
  );
}
