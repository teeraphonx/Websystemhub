import { UserPlus } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface RegisterPageProps {
  username: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onSwitchToLogin: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <AuthPanel
      title="SYSTEMHUB"
      subtitle="สร้างบัญชีใหม่ของคุณ ✨"
      submitLabel="สมัครสมาชิก"
      submitIcon={UserPlus}
      usernameLabel="ชื่อผู้ใช้"
      usernamePlaceholder="กรอกชื่อผู้ใช้"
      username={props.username}
      onUsernameChange={props.onUsernameChange}
      password={props.password}
      onPasswordChange={props.onPasswordChange}
      showPassword={props.showPassword}
      onTogglePassword={props.onTogglePassword}
      confirmPassword={props.confirmPassword}
      onConfirmPasswordChange={props.onConfirmPasswordChange}
      showConfirmPassword={props.showConfirmPassword}
      onToggleConfirmPassword={props.onToggleConfirmPassword}
      showConfirmPasswordField
      onSubmit={props.onSubmit}
      footer={
        <>
          <div className="relative flex items-center justify-center py-2 mb-6">
            <div className="absolute border-t border-[var(--systemhub-border)] w-full"></div>
            <span className="bg-[var(--systemhub-surface-modal)] px-5 text-[11px] font-black text-gray-600 relative z-10 uppercase tracking-[0.2em]">หรือ</span>
          </div>
          <button onClick={props.onSwitchToLogin} className="text-[13px] text-gray-400 hover:text-white transition-colors font-bold group">
            มีบัญชีอยู่แล้ว? <span className="text-[var(--systemhub-accent)] group-hover:underline underline-offset-4 ml-1">เข้าสู่ระบบ</span>
          </button>
        </>
      }
    />
  );
}
