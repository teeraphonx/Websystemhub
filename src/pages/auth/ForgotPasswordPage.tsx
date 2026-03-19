import { Wand2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import AuthPanel from '../../components/common/AuthPanel';

interface ForgotPasswordPageProps {
  username: string;
  onUsernameChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onBack: () => void;
}

export default function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  return (
    <AuthPanel
      title="SYSTEMHUB"
      subtitle="กู้คืนรหัสผ่าน 🔒"
      submitLabel="ส่งคำขอกู้คืน"
      submitIcon={Wand2}
      usernameLabel="ชื่อผู้ใช้"
      usernamePlaceholder="กรอกชื่อผู้ใช้"
      username={props.username}
      onUsernameChange={props.onUsernameChange}
      password=""
      onPasswordChange={() => {}}
      showPassword={false}
      onTogglePassword={() => {}}
      confirmPassword=""
      onConfirmPasswordChange={() => {}}
      showConfirmPassword={false}
      onToggleConfirmPassword={() => {}}
      showPasswordField={false}
      onSubmit={props.onSubmit}
      backLabel="กลับไปหน้าเข้าสู่ระบบ"
      onBack={props.onBack}
    />
  );
}
