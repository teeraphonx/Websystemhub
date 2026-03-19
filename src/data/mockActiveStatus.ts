import { Laptop, Truck } from 'lucide-react';
import type { ActiveStatusRecord } from '../types';

export const mockActiveStatus: ActiveStatusRecord[] = [
  {
    id: 'RSV-20260313-08',
    itemName: 'MacBook Pro M3',
    date: '13 มี.ค. 2569 | 14:00 น.',
    status: 'รอตรวจสอบ',
    location: 'ฝ่ายอำนวยการ',
    icon: Laptop,
  },
  {
    id: 'RSV-20260312-05',
    itemName: 'Toyota Hilux Revo',
    date: '12 มี.ค. 2569 | 09:30 น.',
    status: 'อนุมัติแล้ว',
    location: 'ฝ่ายอำนวยการ',
    icon: Truck,
  },
];
