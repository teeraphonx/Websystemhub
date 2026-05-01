import { FirebaseError } from 'firebase/app';
import type { AppView, AuthView, ModalState } from '../types';
import { createErrorModal, createWarningModal } from './modal';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^(?=.{3,20}$)[a-zA-Z0-9._-]+$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
const PASSWORD_NUMBER_PATTERN = /\d/;
const PASSWORD_SPECIAL_CHARACTER_PATTERN =
  /[!@#$%^&*(),.?":{}|<>_\-+=`~;'[\]\\/]/;
const FALLBACK_ERROR_MESSAGE = 'ไม่สามารถทำรายการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';

export const PASSWORD_REQUIREMENTS_MESSAGE =
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร และต้องมีตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษอย่างน้อยอย่างละ 1 ตัว';

export const isStrongPassword = (password: string) =>
  password.length >= PASSWORD_MIN_LENGTH &&
  PASSWORD_UPPERCASE_PATTERN.test(password) &&
  PASSWORD_NUMBER_PATTERN.test(password) &&
  PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password);

type AuthFlow = AuthView | 'change-password';

type FirebaseLikeError = {
  code?: string;
  message?: string;
};

export type AuthValidationIssue =
  | 'missing-identifier'
  | 'missing-fields'
  | 'invalid-username-format'
  | 'missing-email'
  | 'missing-officer-id'
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
  officerId?: string;
  password: string;
  confirmPassword: string;
}

export const isAuthView = (view: AppView): view is AuthView =>
  view === 'login' ||
  view === 'register' ||
  view === 'forgot-password' ||
  view === 'verify-email' ||
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
          : view === 'admin'
            ? 'กรุณากรอกอีเมลแอดมิน'
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
    (!password && view !== 'forgot-password') ||
    (view === 'register' && (!trimmedEmail || !confirmPassword))
  ) {
    return {
      issue:
        view === 'register' && !trimmedEmail
          ? 'missing-email'
          : 'missing-fields',
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

  if (view === 'register' && !isStrongPassword(password)) {
    return {
      issue: 'weak-password',
      modal: createWarningModal(
        'รหัสผ่านไม่ปลอดภัยพอ',
        PASSWORD_REQUIREMENTS_MESSAGE,
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
    case 'verify-email':
      return 'ยืนยันอีเมลไม่สำเร็จ';
    case 'admin':
      return 'เข้าสู่ระบบแอดมินไม่สำเร็จ';
    case 'change-password':
      return 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
    default:
      return 'เข้าสู่ระบบไม่สำเร็จ';
  }
};

const getErrorDetails = (error: unknown): FirebaseLikeError => {
  if (error instanceof FirebaseError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: unknown };

    return {
      code: typeof errorWithCode.code === 'string' ? errorWithCode.code : undefined,
      message: error.message,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as Record<string, unknown>;

    return {
      code: typeof errorRecord.code === 'string' ? errorRecord.code : undefined,
      message:
        typeof errorRecord.message === 'string' ? errorRecord.message : undefined,
    };
  }

  return {};
};

const getUnknownAuthErrorMessage = ({
  code,
  message,
}: FirebaseLikeError) => {
  const trimmedMessage = message?.trim();

  if (trimmedMessage && code && !trimmedMessage.includes(code)) {
    return `${trimmedMessage} (${code})`;
  }

  if (trimmedMessage) {
    return trimmedMessage;
  }

  if (code) {
    return `${FALLBACK_ERROR_MESSAGE} (${code})`;
  }

  return FALLBACK_ERROR_MESSAGE;
};

export const createAdminFirebaseNotConfiguredModal = () =>
  createErrorModal(
    'ยังไม่ได้ตั้งค่า Firebase แอดมิน',
    'กรุณาตรวจสอบการตั้งค่า Firebase ของระบบก่อนใช้งานหน้าแอดมิน',
  );

export const getFirebaseAuthErrorModal = (
  error: unknown,
  flow: AuthFlow,
): ModalState => {
  const errorDetails = getErrorDetails(error);

  switch (errorDetails.code) {
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
    case 'auth/invalid-api-key':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'Firebase API key ไม่ถูกต้อง กรุณาตรวจสอบค่าในไฟล์ .env แล้วรีสตาร์ต dev server',
      );
    case 'auth/app-not-authorized':
    case 'auth/unauthorized-domain':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'โปรเจกต์ Firebase นี้ยังไม่อนุญาตให้แอปนี้ใช้งาน Authentication กรุณาตรวจสอบ Web app และ Authorized domains',
      );
    case 'auth/operation-not-allowed':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบแบบ Email/Password ใน Firebase Authentication',
      );
    case 'auth/configuration-not-found':
      return createErrorModal(
        getAuthErrorTitle(flow),
        'ไม่พบการตั้งค่า Sign-in method ของ Firebase Authentication กรุณาตรวจสอบหน้า Sign-in method',
      );
    case 'auth/email-already-in-use':
      return createWarningModal(
        'อีเมลถูกใช้งานแล้ว',
        'อีเมลนี้มีบัญชีอยู่ในระบบแล้ว',
      );
    case 'auth/weak-password':
      return createWarningModal(
        'รหัสผ่านไม่ปลอดภัยพอ',
        PASSWORD_REQUIREMENTS_MESSAGE,
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
    case 'auth/invalid-login-credentials':
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
      return createErrorModal(
        getAuthErrorTitle(flow),
        getUnknownAuthErrorMessage(errorDetails),
      );
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
    case 'verify-email':
      return {
        title: 'ยืนยันอีเมล',
        desc: 'กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีของคุณ',
      };
    default:
      return { title: 'สำเร็จ', desc: 'เข้าสู่ระบบสำเร็จ' };
  }
};
