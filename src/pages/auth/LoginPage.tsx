import { LogIn } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface LoginPageProps {
  username: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onToggleRememberMe: () => void;
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <AuthPanel
      title="SYSTEMHUB"
      subtitle="ยินดีต้อนรับกลับมา 👋"
      submitLabel="เข้าสู่ระบบ"
      submitIcon={LogIn}
      usernameLabel="ชื่อผู้ใช้"
      usernamePlaceholder="กรอกชื่อผู้ใช้ หรืออีเมล"
      username={props.username}
      onUsernameChange={props.onUsernameChange}
      password={props.password}
      passwordAutoComplete="current-password"
      onPasswordChange={props.onPasswordChange}
      showPassword={props.showPassword}
      onTogglePassword={props.onTogglePassword}
      confirmPassword=""
      onConfirmPasswordChange={() => {}}
      showConfirmPassword={false}
      onToggleConfirmPassword={() => {}}
      showRememberRow
      rememberMe={props.rememberMe}
      onToggleRememberMe={props.onToggleRememberMe}
      showForgotPasswordLink
      onForgotPassword={props.onForgotPassword}
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
            onClick={props.onSwitchToRegister}
            className="group text-[13px] font-bold text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            ยังไม่มีบัญชี?
            <span className="ml-1 text-[var(--systemhub-accent)] underline-offset-4 group-hover:underline">
              สมัครสมาชิก
            </span>
          </button>
        </>
      }
    />
  );
}
