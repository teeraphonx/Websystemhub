import { ShieldCheck } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface AdminLoginPageProps {
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
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function AdminLoginPage(props: AdminLoginPageProps) {
  return (
    <AuthPanel
      title="SYSTEMHUB"
      subtitle="เข้าสู่ระบบจัดการครุภัณฑ์ 🔐"
      submitLabel="เข้าสู่ระบบแอดมิน"
      submitIcon={ShieldCheck}
      accent="admin"
      usernameLabel="ชื่อผู้ใช้แอดมิน"
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
    />
  );
}
