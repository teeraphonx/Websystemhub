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
      usernameLabel="ID แอดมิน"
      usernamePlaceholder="ADMIN-01"
      usernameType="email"
      usernameAutoComplete="email"
      username={props.username}
      onUsernameChange={props.onUsernameChange}
      passwordLabel="รหัสผ่านแอดมิน"
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
      onSubmit={props.onSubmit}
      isSubmitting={props.isSubmitting}
    />
  );
}