import {
  Armchair,
  Briefcase,
  FileText,
  Headset,
  Home,
  LogIn,
  Megaphone,
  Monitor,
  Package,
  Printer,
  Shield,
  ShieldCheck,
  Truck,
  UserCircle,
  UserPlus,
} from 'lucide-react';
import type { AuthTab, CategorySummary, NavItem } from '../types';

export const AUTH_TABS: AuthTab[] = [
  { id: 'login', label: 'เข้าสู่ระบบ', icon: LogIn },
  { id: 'register', label: 'สมัครสมาชิก', icon: UserPlus },
  { id: 'admin', label: 'แอดมิน', icon: ShieldCheck },
];

export const USER_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'หน้าแรก', icon: Home },
  { id: 'borrow', label: 'จองครุภัณฑ์', icon: Package },
  { id: 'status', label: 'สถานะการจอง', icon: FileText },
  { id: 'contact', label: 'ติดต่อผู้ดูแล', icon: Headset },
  { id: 'user', label: 'ข้อมูลผู้ใช้', icon: UserCircle },
];

export const CATEGORY_SUMMARIES: CategorySummary[] = [
  {
    id: 'it',
    title: 'IT & PRINTER',
    sub: 'อุปกรณ์คอมพิวเตอร์และเครื่องปริ้น',
    icon: Monitor,
    bgIcon: Printer,
    buttonLabel: 'CLICK TO RESERVE!',
  },
  {
    id: 'av',
    title: 'VEHICLES & ARMORY',
    sub: 'ยุทธภัณฑ์และยานพาหนะ',
    icon: Truck,
    bgIcon: Shield,
    buttonLabel: 'CLICK TO RESERVE!',
  },
  {
    id: 'furniture',
    title: 'FURNITURE',
    sub: 'เฟอร์นิเจอร์และสำนักงาน',
    icon: Briefcase,
    bgIcon: Armchair,
    buttonLabel: 'CLICK TO RESERVE!',
  },
  {
    id: 'inspection',
    title: 'ADVERTISEMENT',
    sub: 'โฆษณาและเผยแพร่',
    icon: Megaphone,
    bgIcon: Megaphone,
    buttonLabel: 'CLICK TO PROCEED!',
  },
];