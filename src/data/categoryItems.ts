import {
  Armchair,
  Briefcase,
  Camera,
  Laptop,
  Megaphone,
  Monitor,
  Printer,
  Server,
  Shield,
  Truck,
} from 'lucide-react';
import type { CategoryItemsMap } from '../types';

export const categoryItems: CategoryItemsMap = {
  it: [
    {
      id: 1,
      equipId: 'IT-MAC-001',
      name: 'MacBook Pro M3',
      sub: 'Laptop ประสิทธิภาพสูง',
      description:
        'โน้ตบุ๊กสำหรับงานเอกสาร งานวิเคราะห์ข้อมูล และการนำเสนอที่ต้องใช้ประสิทธิภาพสูง เหมาะสำหรับเจ้าหน้าที่ที่ต้องปฏิบัติงานนอกสถานที่หรือประชุมภาคสนาม',
      stock: 5,
      tag: 'NEW',
      icon: Laptop,
    },
    {
      id: 2,
      equipId: 'IT-MON-027',
      name: 'Dell UltraSharp 27"',
      sub: 'จอมอนิเตอร์ 4K IPS',
      description:
        'จอภาพความละเอียดสูงสำหรับตรวจเอกสารหลายหน้าต่าง งานประชุม และงานวิเคราะห์ข้อมูลภาพ แสดงสีคมชัด เหมาะกับโต๊ะปฏิบัติงานประจำ',
      stock: 12,
      tag: '-15%',
      icon: Monitor,
    },
    {
      id: 3,
      equipId: 'IT-PRT-008',
      name: 'HP LaserJet Pro',
      sub: 'เครื่องปริ้นเตอร์เลเซอร์',
      description:
        'เครื่องพิมพ์เลเซอร์สำหรับพิมพ์เอกสารราชการ รายงาน และแบบฟอร์มต่าง ๆ รองรับการใช้งานในสำนักงานที่ต้องการความเร็วและความคมชัด',
      stock: 3,
      tag: 'HOT',
      icon: Printer,
    },
    {
      id: 4,
      equipId: 'IT-SRV-003',
      name: 'Server Node V3',
      sub: 'อุปกรณ์ทดสอบระบบเครือข่าย',
      description:
        'เครื่องแม่ข่ายสำหรับทดสอบระบบภายใน เครือข่ายจำลอง และงานทดลองบริการดิจิทัลก่อนนำไปใช้งานจริงในสภาพแวดล้อมควบคุม',
      stock: 1,
      tag: 'RARE',
      icon: Server,
    },
  ],
  av: [
    {
      id: 5,
      equipId: 'AV-VH-012',
      name: 'Toyota Hilux Revo',
      sub: 'รถกระบะ 4 ประตู',
      description:
        'ยานพาหนะสำหรับเดินทางปฏิบัติราชการ ประชุมภายนอก และสนับสนุนภารกิจที่ต้องขนส่งอุปกรณ์หรือเจ้าหน้าที่หลายคน',
      stock: 2,
      tag: 'NEW',
      icon: Truck,
    },
    {
      id: 6,
      equipId: 'AV-AM-004',
      name: 'Tactical Vest Level III',
      sub: 'เสื้อเกราะกันกระสุน',
      description:
        'ยุทธภัณฑ์ป้องกันตัวสำหรับภารกิจที่ต้องการความปลอดภัยเพิ่มเติม ใช้ตามระเบียบและแนวทางการเบิกยืมของหน่วยงาน',
      stock: 8,
      tag: '',
      icon: Shield,
    },
    {
      id: 7,
      equipId: 'AV-VH-015',
      name: 'Off-road Motorcycle',
      sub: 'รถจักรยานยนต์วิบาก',
      description:
        'รถจักรยานยนต์สำหรับภารกิจในพื้นที่ที่รถยนต์เข้าถึงยาก เหมาะสำหรับการประสานงานภาคสนามและการเดินทางระยะสั้น',
      stock: 4,
      tag: 'HOT',
      icon: Truck,
    },
    {
      id: 8,
      equipId: 'AV-DR-002',
      name: 'Drone Recon V2',
      sub: 'โดรนลาดตระเวน',
      description:
        'โดรนสำหรับสำรวจพื้นที่และเก็บภาพมุมสูง ใช้ประกอบการตรวจสอบสถานการณ์หรือสนับสนุนภารกิจที่ต้องการมุมมองจากอากาศ',
      stock: 2,
      tag: '-5%',
      icon: Camera,
    },
  ],
  furniture: [
    {
      id: 9,
      equipId: 'FN-CH-005',
      name: 'Ergonomic Chair',
      sub: 'เก้าอี้เพื่อสุขภาพ',
      description:
        'เก้าอี้สำนักงานที่รองรับสรีระ เหมาะสำหรับการใช้งานประจำวัน ลดความเมื่อยล้าจากการนั่งทำงานเป็นเวลานาน',
      stock: 20,
      tag: 'HOT',
      icon: Armchair,
    },
    {
      id: 10,
      equipId: 'FN-TB-011',
      name: 'Standing Desk',
      sub: 'โต๊ะปรับระดับไฟฟ้า',
      description:
        'โต๊ะทำงานปรับระดับได้สำหรับพื้นที่ปฏิบัติงานที่ต้องการความยืดหยุ่น รองรับทั้งการนั่งและยืนทำงาน',
      stock: 5,
      tag: 'NEW',
      icon: Briefcase,
    },
  ],
  inspection: [
    {
      id: 11,
      equipId: 'IS-BB-001',
      name: 'LED Billboard 55"',
      sub: 'ป้ายโฆษณาดิจิทัล',
      description:
        'จอประชาสัมพันธ์ดิจิทัลสำหรับแสดงประกาศ ข่าวสาร และสื่อประชาสัมพันธ์ภายในหน่วยงานหรือในพื้นที่จัดกิจกรรม',
      stock: 15,
      tag: '',
      icon: Monitor,
    },
    {
      id: 12,
      equipId: 'IS-MP-007',
      name: 'Megaphone Pro',
      sub: 'โทรโข่งกระจายเสียง',
      description:
        'อุปกรณ์กระจายเสียงแบบพกพาสำหรับการประกาศภาคสนาม การจัดระเบียบกิจกรรม และการสื่อสารกับกลุ่มคนในพื้นที่เปิด',
      stock: 10,
      tag: '',
      icon: Megaphone,
    },
  ],
};
