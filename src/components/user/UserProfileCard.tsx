import {
  ChevronRight,
  History,
  Key,
  LogOut,
  Package,
  UserCircle,
} from 'lucide-react';

interface UserProfileCardProps {
  username: string;
  userReservations: number;
  onOpenChangePassword: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export default function UserProfileCard({
  username,
  userReservations,
  onOpenChangePassword,
  onOpenHistory,
  onLogout,
}: UserProfileCardProps) {
  return (
    <div className="w-full max-w-[440px] bg-[var(--systemhub-surface-card)] border border-[var(--systemhub-border)] rounded-[2rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
      <div className="systemhub-top-accent absolute top-0 left-0 h-1.5 w-full"></div>

      <div className="flex items-center gap-6 mb-8">
        <div className="relative">
          <div className="absolute -inset-2 bg-[rgba(37,99,235,0.16)] blur-lg rounded-full animate-pulse"></div>
          <div className="w-[84px] h-[84px] rounded-full bg-[var(--systemhub-surface-inner)] border-2 border-[var(--systemhub-primary-hover)] flex items-center justify-center relative z-10 overflow-hidden shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <UserCircle size={38} className="text-[var(--systemhub-accent)]" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-wider mb-2">{username || 'Guest_User'}</h2>
          <div className="inline-flex items-center justify-center bg-[rgba(37,99,235,0.16)] border border-[rgba(59,130,246,0.3)] text-[var(--systemhub-accent)] text-[12px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-inner">
            Member
          </div>
        </div>
      </div>

      <div className="bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] rounded-2xl p-6 flex justify-start items-center mb-8 shadow-inner">
        <div className="flex items-center gap-5">
          <div className="bg-[rgba(30,58,138,0.4)] p-4 rounded-xl border border-[#3b82f6]/30">
            <Package className="text-[var(--systemhub-accent)]" size={28} />
          </div>
          <div>
            <p className="text-gray-500 text-[12px] font-bold tracking-widest mb-1.5">จองไปแล้ว</p>
            <p className="text-white font-black text-3xl flex items-baseline gap-2">
              {userReservations} <span className="text-gray-400 text-[14px] font-medium">ชิ้น</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <button onClick={onOpenChangePassword} className="w-full flex items-center justify-between p-4 bg-[rgba(16,24,43,0.5)] hover:bg-[rgba(16,24,43,0.92)] border border-transparent hover:border-[var(--systemhub-border)] rounded-2xl transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <Key size={20} className="text-[var(--systemhub-accent)] group-hover:text-white transition-colors" />
            <span className="text-[14px] font-bold text-gray-300 group-hover:text-white transition-colors tracking-wide">เปลี่ยนรหัสผ่าน</span>
          </div>
          <ChevronRight size={18} className="text-gray-600 group-hover:text-[var(--systemhub-accent)] transition-transform group-hover:translate-x-1" />
        </button>

        <button onClick={onOpenHistory} className="w-full flex items-center justify-between p-4 bg-[rgba(16,24,43,0.5)] hover:bg-[rgba(16,24,43,0.92)] border border-transparent hover:border-[var(--systemhub-border)] rounded-2xl transition-all duration-300 group">
          <div className="flex items-center gap-4">
            <History size={20} className="text-[var(--systemhub-accent)] group-hover:text-white transition-colors" />
            <span className="text-[14px] font-bold text-gray-300 group-hover:text-white transition-colors tracking-wide">ประวัติการทำรายการ</span>
          </div>
          <ChevronRight size={18} className="text-gray-600 group-hover:text-[var(--systemhub-accent)] transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-3 py-4 bg-[#2a0e15] hover:bg-[#3b1219] border border-[#5c1c26] rounded-[1.2rem] text-[#fc8b9b] hover:text-white font-black text-[14px] tracking-widest transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] active:scale-95"
      >
        <LogOut size={18} strokeWidth={2.5} /> ออกจากระบบ
      </button>
    </div>
  );
}


