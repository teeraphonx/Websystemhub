import { ChevronLeft, ShieldCheck } from 'lucide-react';
import ChangePasswordForm from '../../components/user/ChangePasswordForm';

interface ChangePasswordPageProps {
  onBack: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function ChangePasswordPage({ onBack, onSuccess, onError }: ChangePasswordPageProps) {
  return (
    <div className="animate-fade-up w-full max-w-[480px] mx-auto pt-8">
      <div className="mb-6 relative h-10">
        <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[13px] font-bold text-gray-400 hover:text-white transition-colors group bg-[var(--systemhub-surface-card)] px-4 py-2.5 rounded-xl border border-[var(--systemhub-border)] hover:border-[var(--systemhub-primary-hover)]">
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" /> กลับ
        </button>
      </div>

      <div className="bg-[var(--systemhub-surface-card)] border border-[var(--systemhub-border)] rounded-[2rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="systemhub-top-accent absolute top-0 left-0 h-1.5 w-full"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wider mb-2">เปลี่ยนรหัสผ่าน</h2>
          <p className="text-gray-400 text-[12px] font-medium tracking-wide">เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านที่คาดเดายาก</p>
        </div>

        <ChangePasswordForm onSuccess={onSuccess} onError={onError} />
      </div>
    </div>
  );
}

