import { useState, type FormEvent } from 'react';
import {
  CheckCircle,
  Key,
  Lock,
  Save,
} from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase';
import {
  getFirebaseAuthErrorModal,
  isStrongPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../../utils/validation';

interface ChangePasswordFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function ChangePasswordForm({ onSuccess, onError }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      onError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      onError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    if (newPassword !== confirmPassword) {
      onError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setIsSubmitting(true);
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        throw new Error('ไม่พบบัญชีผู้ใช้ที่กำลังเข้าสู่ระบบ');
      }

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error) {
      onError(getFirebaseAuthErrorModal(error, 'change-password').desc);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2 text-left group">
        <label className="ml-1 text-[11px] font-bold tracking-wider text-gray-500">
          รหัสผ่านปัจจุบัน
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
            <Lock size={16} />
          </div>
          <input
            type="password"
            value={currentPassword}
            disabled={isSubmitting}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="กรอกรหัสผ่านเก่าของคุณ"
            className="w-full rounded-xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] py-3.5 pl-12 pr-5 text-[13px] text-white outline-none transition-all shadow-inner focus:border-[var(--systemhub-primary-hover)] focus:bg-[#18243b] disabled:cursor-not-allowed disabled:opacity-70"
            required
          />
        </div>
      </div>
      <div className="space-y-2 text-left group">
        <label className="ml-1 text-[11px] font-bold tracking-wider text-gray-500">
          รหัสผ่านใหม่
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
            <Key size={16} />
          </div>
          <input
            type="password"
            value={newPassword}
            disabled={isSubmitting}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="A-Z, 0-9, อักขระพิเศษ"
            className="w-full rounded-xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] py-3.5 pl-12 pr-5 text-[13px] text-white outline-none transition-all shadow-inner focus:border-[var(--systemhub-primary-hover)] focus:bg-[#18243b] disabled:cursor-not-allowed disabled:opacity-70"
            required
          />
        </div>
      </div>
      <div className="space-y-2 text-left group">
        <label className="ml-1 text-[11px] font-bold tracking-wider text-gray-500">
          ยืนยันรหัสผ่านใหม่
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
            <CheckCircle size={16} />
          </div>
          <input
            type="password"
            value={confirmPassword}
            disabled={isSubmitting}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
            className="w-full rounded-xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] py-3.5 pl-12 pr-5 text-[13px] text-white outline-none transition-all shadow-inner focus:border-[var(--systemhub-primary-hover)] focus:bg-[#18243b] disabled:cursor-not-allowed disabled:opacity-70"
            required
          />
        </div>
      </div>
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--systemhub-primary)] px-4 py-4 text-[14px] font-black tracking-widest text-white shadow-[0_5px_15px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--systemhub-primary-hover)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.6)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save size={18} />
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
      </div>
    </form>
  );
}
