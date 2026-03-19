import type { AppView, AuthView, ModalState } from '../types';
import { createErrorModal, createWarningModal } from './modal';

export const DEMO_PASSWORD = '123456';

export type AuthValidationIssue =
  | 'missing-username'
  | 'missing-fields'
  | 'invalid-credentials'
  | 'password-mismatch';

export interface AuthValidationResult {
  issue?: AuthValidationIssue;
  modal?: ModalState;
}

export interface AuthValidationInput {
  view: AuthView;
  username: string;
  password: string;
  confirmPassword: string;
}

export const isAuthView = (view: AppView): view is AuthView =>
  view === 'login' ||
  view === 'register' ||
  view === 'forgot-password' ||
  view === 'admin';

export const getAuthValidationResult = ({
  view,
  username,
  password,
  confirmPassword,
}: AuthValidationInput): AuthValidationResult => {
  if (view === 'forgot-password' && !username.trim()) {
    return {
      issue: 'missing-username',
      modal: createWarningModal(
        'แจ้งเตือน',
        'กรุณากรอกชื่อผู้ใช้เพื่อกู้คืนรหัสผ่าน',
      ),
    };
  }

  if (!username.trim() || !password || (view === 'register' && !confirmPassword)) {
    return {
      issue: 'missing-fields',
      modal: createWarningModal('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน'),
    };
  }

  if ((view === 'login' || view === 'admin') && password !== DEMO_PASSWORD) {
    return {
      issue: 'invalid-credentials',
      modal: createErrorModal(
        'ผิดพลาด',
        'ไม่พบผู้ใช้นี้ / รหัสผ่านไม่ถูกต้อง',
      ),
    };
  }

  if (view === 'register' && password !== confirmPassword) {
    return {
      issue: 'password-mismatch',
      modal: createWarningModal(
        'แจ้งเตือน',
        'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน',
      ),
    };
  }

  return {};
};

export const getAuthSuccessMessage = (
  view: AuthView,
): Pick<ModalState, 'title' | 'desc'> => {
  switch (view) {
    case 'admin':
      return { title: 'สำเร็จ', desc: 'เข้าสู่ระบบแอดมินสำเร็จ' };
    case 'register':
      return { title: 'สำเร็จ', desc: 'สมัครสมาชิกสำเร็จ' };
    case 'forgot-password':
      return {
        title: 'ส่งข้อมูลสำเร็จ',
        desc: 'ระบบได้ส่งคำขอกู้คืนรหัสผ่านแล้ว',
      };
    default:
      return { title: 'สำเร็จ', desc: 'เข้าสู่ระบบสำเร็จ' };
  }
};
