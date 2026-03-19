import { useState, type FormEvent } from 'react';
import {
  CheckCircle,
  Key,
  Lock,
  Save,
} from 'lucide-react';

interface ChangePasswordFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      onError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (newPassword !== confirmPassword) {
      onError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onSuccess();
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2 text-left group">
        <label className="text-[11px] font-bold text-gray-500 ml-1 tracking-wider">รหัสผ่านปัจจุบัน</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[var(--systemhub-accent)] transition-colors"><Lock size={16} /></div>
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="กรอกรหัสผ่านเก่าของคุณ" className="w-full bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] focus:border-[var(--systemhub-primary-hover)] rounded-xl pl-12 pr-5 py-3.5 text-[13px] text-white outline-none transition-all shadow-inner focus:bg-[#18243b]" required />
        </div>
      </div>
      <div className="space-y-2 text-left group">
        <label className="text-[11px] font-bold text-gray-500 ml-1 tracking-wider">รหัสผ่านใหม่</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[var(--systemhub-accent)] transition-colors"><Key size={16} /></div>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="ตั้งรหัสผ่านใหม่ A-Z, 0-9" className="w-full bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] focus:border-[var(--systemhub-primary-hover)] rounded-xl pl-12 pr-5 py-3.5 text-[13px] text-white outline-none transition-all shadow-inner focus:bg-[#18243b]" required />
        </div>
      </div>
      <div className="space-y-2 text-left group">
        <label className="text-[11px] font-bold text-gray-500 ml-1 tracking-wider">ยืนยันรหัสผ่านใหม่</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[var(--systemhub-accent)] transition-colors"><CheckCircle size={16} /></div>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" className="w-full bg-[var(--systemhub-surface-inner)] border border-[var(--systemhub-border)] focus:border-[var(--systemhub-primary-hover)] rounded-xl pl-12 pr-5 py-3.5 text-[13px] text-white outline-none transition-all shadow-inner focus:bg-[#18243b]" required />
        </div>
      </div>
      <div className="pt-4">
        <button type="submit" className="w-full btn-shine flex items-center justify-center gap-2 bg-[var(--systemhub-primary)] hover:bg-[var(--systemhub-primary-hover)] text-white px-4 py-4 rounded-xl text-[14px] font-black tracking-widest shadow-[0_5px_15px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] active:scale-95 transition-all">
          <Save size={18} />
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>
    </form>
  );
}

