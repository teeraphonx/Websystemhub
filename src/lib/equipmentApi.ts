import {
  Armchair,
  Briefcase,
  Camera,
  Home,
  Laptop,
  Megaphone,
  Monitor,
  Package,
  Printer,
  ScanLine,
  Shield,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId, CategoryItemsMap, EquipmentItem } from '../types';
import { apiFetch } from './api';

interface EquipmentSummaryResponse {
  equipment: BackendEquipment[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    returned: number;
  };
}

interface BackendEquipment {
  id: number;
  name: string;
  category: string | null;
  location: string | null;
  assetCode: string | null;
  serialNumber: string | null;
  conditionStatus: string | null;
  totalQuantity: number;
  availableQuantity: number;
}

const EQUIPMENT_PAGE_SIZE = 200;

const IT_CATEGORY_NAMES = new Set([
  'บัญชีคุมครุภัณฑ์คอมพิวเตอร์',
  'บัญชีคุมครุภัณฑ์คอมพิวเตอร์ (เครื่องปริ้น)',
  'บัญชีครุภัณฑ์เครื่องมือพิเศษ',
]);

const AV_CATEGORY_NAMES = new Set([
  'บัญชีครุภัณฑ์ยุทธภัณฑ์',
  'บัญชีครุภัณฑ์ยานพาหนะ',
]);

const FURNITURE_CATEGORY_NAMES = new Set([
  'บัญชีคุมครุภัณฑ์สำนักงาน',
  'บัญชีครุภัณฑ์งานบ้านงานครัว',
]);

const INSPECTION_CATEGORY_NAMES = new Set([
  'บัญชีครุภัณฑ์โฆษณาและเผยแพร่',
]);

const KEYWORD_ICON_MAPPERS: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /printer|ปริ้น|เครื่องพิมพ์/i, icon: Printer },
  { test: /notebook|laptop|macbook|คอมพิวเตอร์/i, icon: Laptop },
  { test: /monitor|จอ/i, icon: Monitor },
  { test: /scanner|สแกน/i, icon: ScanLine },
  { test: /camera|กล้อง/i, icon: Camera },
  { test: /รถ|vehicle|กระบะ|ตู้โดยสาร|aion/i, icon: Truck },
  { test: /เกราะ|อาวุธ|gun|armory/i, icon: Shield },
  { test: /เก้าอี้|โต๊ะ|ตู้|โซฟา|locker|podium/i, icon: Armchair },
  { test: /โทรทัศน์|ลำโพง|เสียง|ไมค์|video|display|โฆษณา/i, icon: Megaphone },
  { test: /น้ำ|กรองน้ำ/i, icon: Home },
];

function createEmptyCategoryItems(): CategoryItemsMap {
  return {
    it: [],
    av: [],
    furniture: [],
    inspection: [],
  };
}

function resolveCategoryId(categoryName: string | null): CategoryId {
  if (categoryName && IT_CATEGORY_NAMES.has(categoryName)) {
    return 'it';
  }

  if (categoryName && AV_CATEGORY_NAMES.has(categoryName)) {
    return 'av';
  }

  if (categoryName && FURNITURE_CATEGORY_NAMES.has(categoryName)) {
    return 'furniture';
  }

  if (categoryName && INSPECTION_CATEGORY_NAMES.has(categoryName)) {
    return 'inspection';
  }

  return 'it';
}

function resolveIcon(equipment: BackendEquipment, categoryId: CategoryId): LucideIcon {
  const haystack = [equipment.name, equipment.category, equipment.location]
    .filter(Boolean)
    .join(' ');

  const matchedIcon = KEYWORD_ICON_MAPPERS.find(({ test }) => test.test(haystack));

  if (matchedIcon) {
    return matchedIcon.icon;
  }

  switch (categoryId) {
    case 'av':
      return Truck;
    case 'furniture':
      return Briefcase;
    case 'inspection':
      return Megaphone;
    default:
      return Package;
  }
}

function resolveTag(equipment: BackendEquipment) {
  if ((equipment.availableQuantity ?? 0) <= 0) {
    return 'OUT';
  }

  const availableRatio = equipment.totalQuantity > 0
    ? equipment.availableQuantity / equipment.totalQuantity
    : 0;

  if (equipment.conditionStatus === 'damaged') {
    return 'DAMAGED';
  }

  if (availableRatio <= 0.25) {
    return 'LOW';
  }

  if (equipment.availableQuantity >= 10) {
    return 'READY';
  }

  return '';
}

function resolveSubtitle(equipment: BackendEquipment) {
  const parts = [equipment.location, equipment.category].filter(Boolean);
  return parts.join(' • ') || 'พร้อมให้ตรวจสอบในระบบ';
}

function mapEquipmentItem(equipment: BackendEquipment): EquipmentItem {
  const categoryId = resolveCategoryId(equipment.category);

  return {
    id: equipment.id,
    equipId: equipment.assetCode || equipment.serialNumber || `EQ-${equipment.id}`,
    name: equipment.name,
    sub: resolveSubtitle(equipment),
    stock: Number.isFinite(equipment.availableQuantity)
      ? equipment.availableQuantity
      : equipment.totalQuantity,
    tag: resolveTag(equipment),
    icon: resolveIcon(equipment, categoryId),
  };
}

function normalizeGroupKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function createGroupedEquipmentItems(items: EquipmentItem[]): EquipmentItem[] {
  const groupedItems = new Map<
    string,
    EquipmentItem & { baseSub: string; groupedCount: number }
  >();

  for (const item of items) {
    const groupKey = normalizeGroupKey(item.name);
    const existingItem = groupedItems.get(groupKey);

    if (!existingItem) {
      groupedItems.set(groupKey, { ...item, baseSub: item.sub, groupedCount: 1 });
      continue;
    }

    const nextGroupedCount = existingItem.groupedCount + 1;
    const nextStock = existingItem.stock + item.stock;
    groupedItems.set(groupKey, {
      ...existingItem,
      stock: nextStock,
      tag: nextStock > 0 ? existingItem.tag.replace('OUT', '') : 'OUT',
      sub: `รวม ${nextGroupedCount} รายการ • ${existingItem.baseSub}`,
      equipId:
        nextGroupedCount === 2
          ? `${existingItem.equipId} +1 รหัส`
          : existingItem.equipId.replace(/\+\d+ รหัส$/, `+${nextGroupedCount - 1} รหัส`),
      groupedCount: nextGroupedCount,
    });
  }

  return [...groupedItems.values()].map(({
    baseSub: _baseSub,
    groupedCount: _groupedCount,
    ...item
  }) => item);
}

async function fetchEquipmentPage(offset: number) {
  return apiFetch<EquipmentSummaryResponse>(
    `/api/equipment?view=summary&limit=${EQUIPMENT_PAGE_SIZE}&offset=${offset}`,
  );
}

export async function fetchCategoryItemsFromApi(): Promise<CategoryItemsMap> {
  const firstPage = await fetchEquipmentPage(0);
  const allEquipment = [...firstPage.equipment];
  const total = firstPage.pagination.total;

  for (
    let offset = firstPage.pagination.returned;
    offset < total;
    offset += EQUIPMENT_PAGE_SIZE
  ) {
    const page = await fetchEquipmentPage(offset);
    allEquipment.push(...page.equipment);
  }

  const mappedCategoryItems = allEquipment.reduce<CategoryItemsMap>((accumulator, equipment) => {
    const categoryId = resolveCategoryId(equipment.category);
    accumulator[categoryId].push(mapEquipmentItem(equipment));
    return accumulator;
  }, createEmptyCategoryItems());

  const sortByName = (items: EquipmentItem[]) =>
    createGroupedEquipmentItems(items).sort((left, right) =>
      left.name.localeCompare(right.name, 'th'),
    );

  return {
    it: sortByName(mappedCategoryItems.it),
    av: sortByName(mappedCategoryItems.av),
    furniture: sortByName(mappedCategoryItems.furniture),
    inspection: sortByName(mappedCategoryItems.inspection),
  };
}
