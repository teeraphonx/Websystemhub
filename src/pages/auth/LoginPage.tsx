import { LogIn } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface LoginPageProps {
  username: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
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
      usernamePlaceholder="กรอกชื่อผู้ใช้"
      username={props.username}
      onUsernameChange={props.onUsernameChange}
      password={props.password}
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
      footer={
        <>
          <div className="relative flex items-center justify-center py-2 mb-6">
            <div className="absolute border-t border-[var(--systemhub-border)] w-full"></div>
            <span className="bg-[var(--systemhub-surface-modal)] px-5 text-[11px] font-black text-gray-600 relative z-10 uppercase tracking-[0.2em]">หรือ</span>
          </div>
          <button onClick={props.onSwitchToRegister} className="text-[13px] text-gray-400 hover:text-white transition-colors font-bold group">
            ยังไม่มีบัญชี? <span className="text-[var(--systemhub-accent)] group-hover:underline underline-offset-4 ml-1">สมัครสมาชิก</span>
          </button>
        </>
      }
    />
  );
}
