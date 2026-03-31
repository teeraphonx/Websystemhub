import type { FormEvent } from 'react';
import { ChevronLeft, Mail, MessageCircle, MessageSquare, Phone, Send } from 'lucide-react';

interface ContactAdminPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ContactAdminPage({ onBack, onSuccess }: ContactAdminPageProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    onSuccess();
  };

  return (
    <div className="animate-fade-up w-full max-w-[1000px] mx-auto pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 relative gap-4">
        <button onClick={onBack} className="sm:absolute left-0 top-1/2 sm:-translate-y-1/2 flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-white transition-colors group bg-[var(--systemhub-surface-card)] px-4 py-2.5 rounded-xl border border-[var(--systemhub-border)] hover:border-[var(--systemhub-primary-hover)]">
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> กลับ
        </button>
        <div className="text-center mx-auto">
          <h2 className="text-[24px] sm:text-[28px] font-black text-white tracking-wider mb-1">ติดต่อผู้ดูแลระบบ</h2>
          <p className="text-gray-400 text-[13px] font-medium tracking-widest">พบปัญหาหรือต้องการความช่วยเหลือ ติดต่อเราได้ทันที</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-10">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-[var(--systemhub-surface-table)] border border-[var(--systemhub-border)] rounded-[1.5rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center gap-5 hover:border-[rgba(59,130,246,0.5)] transition-all duration-300 group cursor-default">
            <div className="w-14 h-14 bg-[var(--systemhub-surface-inner)] rounded-2xl flex items-center justify-center border border-[var(--systemhub-border-strong)] group-hover:bg-[rgba(37,99,235,0.2)] transition-colors shadow-inner">
              <Phone size={24} className="text-[var(--systemhub-accent)]" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">เบอร์โทรศัพท์ (24 ชม.)</p>
              <p className="text-white text-[16px] font-black tracking-wider">1441</p>
            </div>
          </div>

          <div className="bg-[var(--systemhub-surface-table)] border border-[var(--systemhub-border)] rounded-[1.5rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center gap-5 hover:border-[#22c55e]/50 transition-all duration-300 group cursor-default">
            <div className="w-14 h-14 bg-[var(--systemhub-surface-inner)] rounded-2xl flex items-center justify-center border border-[var(--systemhub-border-strong)] group-hover:bg-[#22c55e]/20 transition-colors shadow-inner">
              <MessageCircle size={24} className="text-[#22c55e]" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">LINE Official</p>
              <p className="text-white text-[16px] font-black tracking-wider">@SystemHub</p>
            </div>
          </div>

          <div className="bg-[var(--systemhub-surface-table)] border border-[var(--systemhub-border)] rounded-[1.5rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center gap-5 hover:border-[#a855f7]/50 transition-all duration-300 group cursor-default">
            <div className="w-14 h-14 bg-[var(--systemhub-surface-inner)] rounded-2xl flex items-center justify-center border border-[var(--systemhub-border-strong)] group-hover:bg-[#a855f7]/20 transition-colors shadow-inner">
              <Mail size={24} className="text-[#a855f7]" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">อีเมลติดต่อ</p>
              <p className="text-white text-[14px] font-bold tracking-wide">contact@ccid.go.th</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-[var(--systemhub-surface-card)] border border-[var(--systemhub-border)] rounded-[2rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="systemhub-top-accent absolute top-0 left-0 h-1.5 w-full"></div>

          <h3 className="text-[18px] font-black text-white mb-8 tracking-wide flex items-center gap-3">
            <MessageSquare className="text-[var(--systemhub-accent)]" size={22} /> ส่งข้อความถึงผู้ดูแล
          </h3>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2 text-left group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 tracking-wider uppercase">หัวข้อเรื่อง</label>
              <div className="relative">
                <input type="text" placeholder="ระบุหัวข้อที่ต้องการติดต่อ" className="w-full bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] focus:border-[var(--systemhub-primary-hover)] rounded-xl px-5 py-3.5 text-[13px] text-white outline-none transition-all shadow-inner focus:bg-[#18243b]" required />
              </div>
            </div>

            <div className="space-y-2 text-left group">
              <label className="text-[11px] font-bold text-gray-500 ml-1 tracking-wider uppercase">รายละเอียด</label>
              <div className="relative">
                <textarea rows={5} placeholder="พิมพ์รายละเอียดปัญหาหรือข้อเสนอแนะของคุณ..." className="w-full bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] focus:border-[var(--systemhub-primary-hover)] rounded-xl px-5 py-4 text-[13px] text-white outline-none transition-all shadow-inner focus:bg-[#18243b] resize-none custom-scrollbar" required></textarea>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" className="w-full btn-shine flex items-center justify-center gap-2.5 bg-[var(--systemhub-primary)] hover:bg-[var(--systemhub-primary-hover)] text-white px-4 py-4 rounded-xl text-[14px] font-black tracking-widest shadow-[0_5px_15px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] active:scale-95 transition-all">
                <Send size={18} /> ส่งข้อความ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



