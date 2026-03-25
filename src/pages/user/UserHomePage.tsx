import { ChevronRight, Briefcase, CheckCircle, Headset, Monitor, Package, ShoppingBag, Truck, Users, Zap } from 'lucide-react';
import divisionLogo from '../../assets/CCID_1.png';
import { categoryItems } from '../../data/categoryItems';

interface UserHomePageProps {
  activeUsers: number;
  totalReservations: number;
  onStartBorrow: () => void;
  onContact: () => void;
}

export default function UserHomePage({ activeUsers, totalReservations, onStartBorrow, onContact }: UserHomePageProps) {
  const totalItemsCount = Object.values(categoryItems).flat().length;
  const totalStockCount = Object.values(categoryItems).flat().reduce((acc, curr) => acc + curr.stock, 0);

  return (
    <div className="mt-4 flex animate-fade-up flex-col items-center justify-between gap-12 lg:mt-16 lg:flex-row">
      <div className="z-10 w-full flex-1 space-y-7 text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[rgba(30,58,138,0.2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--systemhub-accent)] shadow-[0_0_15px_rgba(37,99,235,0.15)]">
          <Zap size={14} className="text-yellow-400" /> ระบบจองครุภัณฑ์และตรวจสอบ 24/7
        </div>
        <h1 className="text-[44px] font-black uppercase leading-[1.1] tracking-tighter text-white md:text-[60px]">
          SYSTEMHUB<br />
          <span className="text-[var(--systemhub-accent)]">ครบวงจร</span><br />
          ทุกการจอง
        </h1>
        <p className="max-w-[500px] text-[14px] font-medium leading-relaxed text-gray-400 md:text-[15px]">
          จองง่าย ได้ไว ตรวจสอบได้ทันที - ระบบการจัดการครุภัณฑ์คุณภาพ ทั้งคอมพิวเตอร์ ยานพาหนะ เฟอร์นิเจอร์ และบริการยืมคืนอื่นๆ อีกเพียบ
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button onClick={onStartBorrow} className="btn-shine flex items-center gap-2 rounded-2xl bg-[var(--systemhub-primary)] px-8 py-3.5 font-black tracking-widest text-white shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--systemhub-primary-hover)] active:scale-95">
            เริ่มต้นใช้งาน <ChevronRight size={18} strokeWidth={3} />
          </button>
          <button onClick={onContact} className="flex items-center gap-3 rounded-2xl border border-[var(--systemhub-border-strong)] bg-[var(--systemhub-surface-inner)] px-8 py-3.5 font-black tracking-widest text-white transition-all hover:bg-[rgba(17,28,48,0.96)] active:scale-95">
            <Headset size={18} /> ติดต่อผู้ดูแล
          </button>
        </div>

        <div className="mt-2 grid w-full grid-cols-2 gap-4 pt-6 xl:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(9,16,29,0.82)] p-5 backdrop-blur-sm transition-colors hover:border-[#2563eb]/50">
            <Users size={80} className="absolute -bottom-4 -right-4 text-[#1e2a4a] opacity-40 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
            <div className="relative z-10">
              <Users size={20} className="mb-3 text-[var(--systemhub-primary)]" />
              <p className="mb-1 text-[12px] font-bold tracking-wide text-white">ผู้ใช้งาน</p>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-[28px] font-black leading-none tracking-tight text-[var(--systemhub-accent)]">{activeUsers.toLocaleString()}</h4>
                <span className="text-[11px] font-bold text-gray-500">คน</span>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(9,16,29,0.82)] p-5 backdrop-blur-sm transition-colors hover:border-[#2563eb]/50">
            <ShoppingBag size={80} className="absolute -bottom-4 -right-4 text-[#1e2a4a] opacity-40 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
            <div className="relative z-10">
              <ShoppingBag size={20} className="mb-3 text-[var(--systemhub-primary)]" />
              <p className="mb-1 text-[12px] font-bold tracking-wide text-white">ครุภัณฑ์</p>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-[28px] font-black leading-none tracking-tight text-[var(--systemhub-accent)]">{totalItemsCount.toLocaleString()}</h4>
                <span className="text-[11px] font-bold text-gray-500">รายการ</span>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(9,16,29,0.82)] p-5 backdrop-blur-sm transition-colors hover:border-[#2563eb]/50">
            <Package size={80} className="absolute -bottom-4 -right-4 text-[#1e2a4a] opacity-40 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
            <div className="relative z-10">
              <Package size={20} className="mb-3 text-[var(--systemhub-primary)]" />
              <p className="mb-1 text-[12px] font-bold tracking-wide text-white">คลังครุภัณฑ์</p>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-[28px] font-black leading-none tracking-tight text-[var(--systemhub-accent)]">{totalStockCount.toLocaleString()}</h4>
                <span className="text-[11px] font-bold text-gray-500">ชิ้น</span>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(9,16,29,0.82)] p-5 backdrop-blur-sm transition-colors hover:border-[#2563eb]/50">
            <CheckCircle size={80} className="absolute -bottom-4 -right-4 text-[#1e2a4a] opacity-40 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.5} />
            <div className="relative z-10">
              <CheckCircle size={20} className="mb-3 text-[var(--systemhub-primary)]" />
              <p className="mb-1 text-[12px] font-bold tracking-wide text-white">จองแล้ว</p>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-[28px] font-black leading-none tracking-tight text-[var(--systemhub-accent)]">{totalReservations.toLocaleString()}</h4>
                <span className="text-[11px] font-bold text-gray-500">รายการ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 mt-10 flex min-h-[400px] w-full flex-1 items-center justify-center lg:mt-0 lg:min-h-[500px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2563eb]/15 to-transparent blur-[80px]"></div>
        <div className="absolute h-[280px] w-[280px] rounded-full border border-[var(--systemhub-border-strong)] opacity-40"></div>
        <div className="absolute h-[420px] w-[420px] rounded-full border border-[var(--systemhub-border)] opacity-30"></div>
        <div className="absolute right-[30%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-[#60a5fa] shadow-[0_0_10px_rgba(96,165,250,1)]"></div>
        <div className="absolute bottom-[25%] left-[25%] h-1.5 w-1.5 animate-pulse rounded-full bg-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,1)] delay-300"></div>

        <div className="relative z-10 flex h-[142px] w-[142px] items-center justify-center rounded-[2.2rem] border-2 border-[var(--systemhub-border-strong)] bg-[#0a0e1c] shadow-[0_0_60px_rgba(37,99,235,0.42)] animate-float">
          <div className="flex h-[102px] w-[102px] items-center justify-center rounded-[1.5rem] border border-[#60a5fa]/35 bg-gradient-to-br from-[#93c5fd] via-[#3b82f6] to-[#1d4ed8] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_32px_rgba(29,78,216,0.28)]">
            <img
              src={divisionLogo}
              alt="Cyber Crime Investigation Bureau badge"
              className="h-full w-full scale-[1.23] object-contain drop-shadow-md"
            />
          </div>
        </div>

        <div className="absolute right-[-5%] top-[10%] flex cursor-default items-center gap-3 rounded-[1.2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] px-4 py-2.5 shadow-2xl transition-colors hover:border-[var(--systemhub-primary-hover)] animate-float-delayed lg:right-[5%]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--systemhub-border-strong)] bg-[var(--systemhub-surface-inner)]"><Monitor size={14} className="text-[var(--systemhub-accent)]" /></div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white">IT & PRINTER</p>
            <p className="text-[8px] font-bold text-gray-500">คอมพิวเตอร์และเครื่องปริ้น</p>
          </div>
        </div>

        <div className="absolute bottom-[25%] left-[-10%] flex cursor-default items-center gap-3 rounded-[1.2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] px-4 py-2.5 shadow-2xl transition-colors hover:border-[var(--systemhub-primary-hover)] animate-float lg:left-[0%]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--systemhub-border-strong)] bg-[var(--systemhub-surface-inner)]"><Truck size={14} className="text-[var(--systemhub-accent)]" /></div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white">VEHICLES & ARMORY</p>
            <p className="text-[8px] font-bold text-gray-500">ยุทธภัณฑ์และยานพาหนะ</p>
          </div>
        </div>

        <div className="absolute bottom-[10%] right-[10%] flex cursor-default items-center gap-3 rounded-[1.2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-card)] px-4 py-2.5 shadow-2xl transition-colors hover:border-[var(--systemhub-primary-hover)] animate-float-delayed lg:right-[15%]" style={{ animationDelay: '1s' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--systemhub-border-strong)] bg-[var(--systemhub-surface-inner)]"><Briefcase size={14} className="text-[var(--systemhub-accent)]" /></div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-white">FURNITURE</p>
            <p className="text-[8px] font-bold text-gray-500">เฟอร์นิเจอร์และสำนักงาน</p>
          </div>
        </div>

        <div className="absolute left-[30%] top-[30%] rounded-lg border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-2 animate-float"><Package size={14} className="text-gray-400" /></div>
        <div className="absolute bottom-[35%] right-[25%] rounded-lg border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-2 animate-float-delayed"><CheckCircle size={14} className="text-gray-400" /></div>
      </div>
    </div>
  );
}





