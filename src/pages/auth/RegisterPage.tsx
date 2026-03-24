import { UserPlus } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface RegisterPageProps {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
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
      secondaryFieldLabel="อีเมล"
      secondaryFieldPlaceholder="name@example.com"
      secondaryFieldValue={props.email}
      secondaryFieldType="email"
      secondaryFieldAutoComplete="email"
      onSecondaryFieldChange={props.onEmailChange}
      password={props.password}
      passwordAutoComplete="new-password"
      onPasswordChange={props.onPasswordChange}
      showPassword={props.showPassword}
      onTogglePassword={props.onTogglePassword}
      confirmPassword={props.confirmPassword}
      confirmPasswordAutoComplete="new-password"
      onConfirmPasswordChange={props.onConfirmPasswordChange}
      showConfirmPassword={props.showConfirmPassword}
      onToggleConfirmPassword={props.onToggleConfirmPassword}
      showConfirmPasswordField
      onSubmit={props.onSubmit}
      isSubmitting={props.isSubmitting}
      footer={
        <>
          <div className="relative mb-6 flex items-center justify-center py-2">
            <div className="absolute w-full border-t border-[var(--systemhub-border)]"></div>
            <span className="relative z-10 bg-[var(--systemhub-surface-modal)] px-5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-600">
              หรือ
            </span>
          </div>
          <button
            type="button"
            disabled={props.isSubmitting}
            onClick={props.onSwitchToLogin}
            className="group text-[13px] font-bold text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            มีบัญชีอยู่แล้ว?
            <span className="ml-1 text-[var(--systemhub-accent)] underline-offset-4 group-hover:underline">
              เข้าสู่ระบบ
            </span>
          </button>
        </>
      }
    />
  );
}
