import { FirebaseError } from 'firebase/app';
import type { AppView, AuthView, ModalState } from '../types';
import { createErrorModal, createWarningModal } from './modal';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^(?=.{3,20}$)[a-zA-Z0-9._-]+$/;
const FALLBACK_ERROR_MESSAGE = 'ไม่สามารถทำรายการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';

type AuthFlow = AuthView | 'change-password';

export type AuthValidationIssue =
  | 'missing-identifier'
  | 'missing-fields'
  | 'invalid-username-format'
  | 'missing-email'
  | 'invalid-email-format'
  | 'password-mismatch'
  | 'weak-password';

export interface AuthValidationResult {
  issue?: AuthValidationIssue;
  modal?: ModalState;
}

export interface AuthValidationInput {
  view: AuthView;
  username: string;
  email: string;
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
  email,
  password,
  confirmPassword,
}: AuthValidationInput): AuthValidationResult => {
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();

  if (!trimmedUsername) {
    return {
      issue: 'missing-identifier',
      modal: createWarningModal(
        'แจ้งเตือน',
        view === 'register'
          ? 'กรุณากรอกชื่อผู้ใช้'
          : 'กรุณากรอกชื่อผู้ใช้หรืออีเมล',
      ),
    };
  }

  if (view === 'register' && !USERNAME_PATTERN.test(trimmedUsername)) {
    return {
      issue: 'invalid-username-format',
      modal: createWarningModal(
        'ชื่อผู้ใช้ไม่ถูกต้อง',
        'ชื่อผู้ใช้ต้องยาว 3-20 ตัว และใช้ได้เฉพาะ A-Z, a-z, 0-9, จุด, ขีดกลาง, ขีดล่าง',
      ),
    };
  }

  if (
    !password && view !== 'forgot-password' ||
    (view === 'register' && (!trimmedEmail || !confirmPassword))
  ) {
    return {
      issue: view === 'register' && !trimmedEmail ? 'missing-email' : 'missing-fields',
      modal: createWarningModal('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน'),
    };
  }

  if (view === 'register' && !EMAIL_PATTERN.test(trimmedEmail)) {
    return {
      issue: 'invalid-email-format',
      modal: createWarningModal(
        'อีเมลไม่ถูกต้อง',
        'กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง',
      ),
    };
  }

  if (
    view !== 'register' &&
    trimmedUsername.includes('@') &&
    !EMAIL_PATTERN.test(trimmedUsername)
  ) {
    return {
      issue: 'invalid-email-format',
      modal: createWarningModal(
        'อีเมลไม่ถูกต้อง',
        'กรุณากรอกอีเมลให้ถูกต้อง หรือใช้ชื่อผู้ใช้แทน',
      ),
    };
  }

  if (view === 'register' && password.length < 6) {
    return {
      issue: 'weak-password',
      modal: createWarningModal(
        'รหัสผ่านสั้นเกินไป',
        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
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

const getAuthErrorTitle = (flow: AuthFlow) => {
  switch (flow) {
    case 'register':
      return 'สมัครสมาชิกไม่สำเร็จ';
    case 'forgot-password':
      return 'ส่งคำขอกู้คืนไม่สำเร็จ';
    case 'admin':
      return 'เข้าสู่ระบบแอดมินไม่สำเร็จ';
    case 'change-password':
      return 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
    default:
      return 'เข้าสู่ระบบไม่สำเร็จ';
  }
};

export const createAdminAccessDeniedModal = () =>
  createErrorModal('สิทธิ์ไม่เพียงพอ', 'บัญชีนี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ');

export const getFirebaseAuthErrorModal = (
  error: unknown,
  flow: AuthFlow,
): ModalState => {
  if (error instanceof Error && !(error instanceof FirebaseError)) {
    return createErrorModal(
      getAuthErrorTitle(flow),
      error.message || FALLBACK_ERROR_MESSAGE,
    );
  }

  if (!(error instanceof FirebaseError)) {
    return createErrorModal(getAuthErrorTitle(flow), FALLBACK_ERROR_MESSAGE);
  }

  switch (error.code) {
    case 'permission-denied':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'Cloud Firestore ยังไม่อนุญาตให้บันทึกข้อมูลผู้ใช้ กรุณาตรวจสอบ Rules',
      );
    case 'failed-precondition':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'กรุณาเปิดใช้งาน Cloud Firestore ใน Firebase Console ก่อนใช้งานชื่อผู้ใช้',
      );
    case 'unavailable':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'ไม่สามารถเชื่อมต่อฐานข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง',
      );
    case 'auth/invalid-email':
      return createWarningModal('อีเมลไม่ถูกต้อง', 'กรุณากรอกอีเมลให้ถูกต้อง');
    case 'auth/missing-email':
      return createWarningModal('กรอกอีเมล', 'กรุณากรอกอีเมลก่อนดำเนินการ');
    case 'auth/missing-password':
      return createWarningModal(
        'กรอกรหัสผ่าน',
        'กรุณากรอกรหัสผ่านก่อนดำเนินการ',
      );
    case 'auth/email-already-in-use':
      return createWarningModal(
        'อีเมลถูกใช้งานแล้ว',
        'อีเมลนี้มีบัญชีอยู่ในระบบแล้ว',
      );
    case 'auth/weak-password':
      return createWarningModal(
        'รหัสผ่านสั้นเกินไป',
        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      );
    case 'auth/user-not-found':
      return createErrorModal(
        flow === 'forgot-password' ? 'ไม่พบบัญชี' : getAuthErrorTitle(flow),
        flow === 'forgot-password'
          ? 'ไม่พบบัญชีที่ใช้อีเมลนี้ในระบบ'
          : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      );
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      );
    case 'auth/too-many-requests':
      return createWarningModal(
        'ลองใหม่ภายหลัง',
        'มีการพยายามทำรายการหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
      );
    case 'auth/network-request-failed':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'ไม่สามารถเชื่อมต่อ Firebase ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
      );
    case 'auth/user-disabled':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'บัญชีนี้ถูกปิดการใช้งาน',
      );
    case 'auth/requires-recent-login':
      return createWarningModal(
        'ต้องยืนยันตัวตนใหม่',
        'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่าน',
      );
    default:
      return createErrorModal(getAuthErrorTitle(flow), FALLBACK_ERROR_MESSAGE);
  }
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
        desc: 'ระบบได้ส่งอีเมลสำหรับรีเซ็ตรหัสผ่านแล้ว',
      };
    default:
      return { title: 'สำเร็จ', desc: 'เข้าสู่ระบบสำเร็จ' };
  }
};
