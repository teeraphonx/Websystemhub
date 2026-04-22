import {
  ChevronRight,
  History,
  IdCard,
  Key,
  LogOut,
  Package,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';

interface UserProfileCardProps {
  username: string;
  email: string;
  fullName: string;
  officerId: string;
  organizationUnit: string;
  organizationStatus: 'verified' | 'pending' | 'rejected';
  userReservations: number;
  onOpenChangePassword: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export default function UserProfileCard({
  username,
  email,
  fullName,
  officerId,
  organizationUnit,
  organizationStatus,
  userReservations,
  onOpenChangePassword,
  onOpenHistory,
  onLogout,
}: UserProfileCardProps) {
  const isVerified = organizationStatus === 'verified';

  return (
    <div className="relative w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
      <div className="systemhub-top-accent absolute left-0 top-0 h-1.5 w-full"></div>

      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          <div className="absolute -inset-2 animate-pulse rounded-full bg-[rgba(37,99,235,0.16)] blur-lg"></div>
          <div className="relative z-10 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border-2 border-[var(--systemhub-primary-hover)] bg-[var(--systemhub-surface-inner)] shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <UserCircle size={38} className="text-[var(--systemhub-accent)]" />
          </div>
        </div>
        <div>
          <h2 className="mb-1 text-2xl font-black tracking-wider text-white">
            {username || 'ผู้ใช้งานระบบ'}
          </h2>
          <p className="mb-2 text-[12px] font-medium tracking-wide text-gray-400">
            {email || 'ยังไม่มีอีเมลในระบบ'}
          </p>
          {fullName && (
            <p className="mb-2 text-[12px] font-bold tracking-wide text-gray-300">
              {fullName}
            </p>
          )}
          <div className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-bold uppercase tracking-widest shadow-inner ${isVerified ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.14)] text-[#86efac]' : 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.14)] text-[#fcd34d]'}`}>
            <ShieldCheck size={14} />
            {isVerified ? 'Verified' : 'Pending'}
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-5 shadow-inner">
        <div className="mb-3 flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
          <IdCard size={17} />
          ยืนยันตัวตน
        </div>
        <div className="grid gap-3 text-[13px]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-gray-500">หน่วย</span>
            <span className="text-right font-bold text-white">
              {organizationUnit || 'รอยืนยัน'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold text-gray-500">รหัสเจ้าหน้าที่</span>
            <span className="text-right font-bold text-white">
              {officerId || 'รอยืนยัน'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-start rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-6 shadow-inner">
        <div className="flex items-center gap-5">
          <div className="rounded-xl border border-[#3b82f6]/30 bg-[rgba(30,58,138,0.4)] p-4">
            <Package className="text-[var(--systemhub-accent)]" size={28} />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-bold tracking-widest text-gray-500">
              จองไปแล้ว
            </p>
            <p className="flex items-baseline gap-2 text-3xl font-black text-white">
              {userReservations}{' '}
              <span className="text-[14px] font-medium text-gray-400">ชิ้น</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 space-y-3">
        <button
          onClick={onOpenChangePassword}
          className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-[rgba(16,24,43,0.5)] p-4 transition-all duration-300 hover:border-[var(--systemhub-border)] hover:bg-[rgba(16,24,43,0.92)]"
        >
          <div className="flex items-center gap-4">
            <Key size={20} className="text-[var(--systemhub-accent)] transition-colors group-hover:text-white" />
            <span className="text-[14px] font-bold tracking-wide text-gray-300 transition-colors group-hover:text-white">
              เปลี่ยนรหัสผ่าน
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-[var(--systemhub-accent)]" />
        </button>

        <button
          onClick={onOpenHistory}
          className="group flex w-full items-center justify-between rounded-2xl border border-transparent bg-[rgba(16,24,43,0.5)] p-4 transition-all duration-300 hover:border-[var(--systemhub-border)] hover:bg-[rgba(16,24,43,0.92)]"
        >
          <div className="flex items-center gap-4">
            <History size={20} className="text-[var(--systemhub-accent)] transition-colors group-hover:text-white" />
            <span className="text-[14px] font-bold tracking-wide text-gray-300 transition-colors group-hover:text-white">
              ประวัติการทำรายการ
            </span>
          </div>
          <ChevronRight size={18} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-[var(--systemhub-accent)]" />
        </button>
      </div>

      <button
        onClick={onLogout}
        className="w-full rounded-[1.2rem] border border-[#5c1c26] bg-[#2a0e15] py-4 text-[14px] font-black tracking-widest text-[#fc8b9b] transition-all duration-300 hover:bg-[#3b1219] hover:text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] active:scale-95"
      >
        <span className="flex items-center justify-center gap-3">
          <LogOut size={18} strokeWidth={2.5} /> ออกจากระบบ
        </span>
      </button>
    </div>
  );
}
