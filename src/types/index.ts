import type { Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';

export type AuthView = 'login' | 'register' | 'forgot-password' | 'admin';
export type AppView = AuthView | 'user-home' | 'dashboard';
export type UserTab =
  | 'home'
  | 'borrow'
  | 'category_detail'
  | 'status'
  | 'contact'
  | 'user'
  | 'history'
  | 'change_password';
export type ModalType = 'success' | 'warning' | 'error';
export type CategoryId = 'it' | 'av' | 'furniture' | 'inspection';
export type CalendarDayType = 'prev' | 'curr' | 'next';
export type AdminBookingStatus = 'รออนุมัติ' | 'อนุมัติแล้ว' | 'ไม่อนุมัติ';

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  desc: string;
}

export interface NavItem {
  id: 'home' | 'borrow' | 'status' | 'contact' | 'user';
  label: string;
  icon: LucideIcon;
}

export interface AuthTab {
  id: Exclude<AuthView, 'forgot-password'>;
  label: string;
  icon: LucideIcon;
}

export interface CategorySummary {
  id: CategoryId;
  title: string;
  sub: string;
  icon: LucideIcon;
  bgIcon: LucideIcon;
  buttonLabel: string;
}

export interface EquipmentItem {
  id: number;
  equipId: string;
  name: string;
  sub: string;
  stock: number;
  tag: string;
  icon: LucideIcon;
}

export type CategoryItemsMap = Record<CategoryId, EquipmentItem[]>;

export interface HistoryRecord {
  id: string;
  itemName: string;
  details: string[];
  status: string;
  date: string;
}

export interface ActiveStatusRecord {
  id: string;
  itemName: string;
  date: string;
  status: string;
  location: string;
  icon: LucideIcon;
}

export interface AdminBooking {
  id: string;
  user: string;
  userAvatar: string;
  itemId: string;
  itemName: string;
  time: string;
  date: string;
  status: AdminBookingStatus;
}

export interface CalendarDay {
  day: number;
  type: CalendarDayType;
  dateString: string;
}

export interface AppState {
  view: AppView;
  setView: Dispatch<SetStateAction<AppView>>;
  activeUserTab: UserTab;
  setActiveUserTab: Dispatch<SetStateAction<UserTab>>;
  selectedCategoryId: CategoryId | null;
  setSelectedCategoryId: Dispatch<SetStateAction<CategoryId | null>>;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  rememberMe: boolean;
  setRememberMe: Dispatch<SetStateAction<boolean>>;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: Dispatch<SetStateAction<boolean>>;
  modalState: ModalState;
  setModalState: Dispatch<SetStateAction<ModalState>>;
  activeUsers: number;
  setActiveUsers: Dispatch<SetStateAction<number>>;
  totalReservations: number;
  setTotalReservations: Dispatch<SetStateAction<number>>;
  userReservations: number;
  setUserReservations: Dispatch<SetStateAction<number>>;
  historyDateFilter: string;
  setHistoryDateFilter: Dispatch<SetStateAction<string>>;
  adminDateFilter: string;
  setAdminDateFilter: Dispatch<SetStateAction<string>>;
  adminCalendarView: Date;
  setAdminCalendarView: Dispatch<SetStateAction<Date>>;
  adminBookings: AdminBooking[];
  setAdminBookings: Dispatch<SetStateAction<AdminBooking[]>>;
}
