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
import { getAdminAuthToken } from './adminFirebase';
import { ApiError, apiFetch } from './api';

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
  imageUrl?: string | null;
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  totalQuantity: number;
  availableQuantity: number;
}

interface CreateEquipmentResponse {
  equipment?: BackendEquipment;
  item?: BackendEquipment;
  data?: BackendEquipment;
  message?: string;
}

export interface AdminEquipmentListItem {
  id: number;
  name: string;
  category: string;
  location: string;
  assetCode: string;
  serialNumber: string;
  conditionStatus: EquipmentConditionStatus;
  totalQuantity: number;
  availableQuantity: number;
  imageUrl?: string;
}

export type EquipmentConditionStatus =
  | 'normal'
  | 'damaged'
  | 'lost'
  | 'deteriorated'
  | 'unknown';

export const ADMIN_EQUIPMENT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ADMIN_EQUIPMENT_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif';

const ALLOWED_ADMIN_EQUIPMENT_IMAGE_TYPES = new Set(
  ADMIN_EQUIPMENT_IMAGE_ACCEPT.split(','),
);

export interface CreateEquipmentInput {
  name: string;
  category: string;
  location?: string;
  assetCode?: string;
  serialNumber?: string;
  conditionStatus?: EquipmentConditionStatus;
  totalQuantity: number;
  availableQuantity: number;
}

export interface AdminEquipmentCategoryOption {
  label: string;
  value: string;
  group: string;
}

const EQUIPMENT_PAGE_SIZE = 200;

const IT_CATEGORY_NAMES = [
  'บัญชีคุมครุภัณฑ์คอมพิวเตอร์',
  'บัญชีคุมครุภัณฑ์คอมพิวเตอร์ (เครื่องปริ้น)',
  'บัญชีครุภัณฑ์เครื่องมือพิเศษ',
];

const AV_CATEGORY_NAMES = [
  'บัญชีครุภัณฑ์ยุทธภัณฑ์',
  'บัญชีครุภัณฑ์ยานพาหนะ',
];

const FURNITURE_CATEGORY_NAMES = [
  'บัญชีคุมครุภัณฑ์สำนักงาน',
  'บัญชีครุภัณฑ์งานบ้านงานครัว',
];

const INSPECTION_CATEGORY_NAMES = [
  'บัญชีครุภัณฑ์โฆษณาและเผยแพร่',
];

const IT_CATEGORY_NAME_SET = new Set(IT_CATEGORY_NAMES);
const AV_CATEGORY_NAME_SET = new Set(AV_CATEGORY_NAMES);
const FURNITURE_CATEGORY_NAME_SET = new Set(FURNITURE_CATEGORY_NAMES);
const INSPECTION_CATEGORY_NAME_SET = new Set(INSPECTION_CATEGORY_NAMES);

export const ADMIN_EQUIPMENT_CATEGORY_OPTIONS: AdminEquipmentCategoryOption[] = [
  ...IT_CATEGORY_NAMES.map((value) => ({
    value,
    label: value,
    group: 'เทคโนโลยีและอุปกรณ์สำนักงาน',
  })),
  ...AV_CATEGORY_NAMES.map((value) => ({
    value,
    label: value,
    group: 'ยานพาหนะและยุทธภัณฑ์',
  })),
  ...FURNITURE_CATEGORY_NAMES.map((value) => ({
    value,
    label: value,
    group: 'เฟอร์นิเจอร์และงานอาคาร',
  })),
  ...INSPECTION_CATEGORY_NAMES.map((value) => ({
    value,
    label: value,
    group: 'สื่อและงานเผยแพร่',
  })),
];

export const ADMIN_EQUIPMENT_CONDITION_OPTIONS: Array<{
  label: string;
  value: EquipmentConditionStatus;
}> = [
  { label: 'ปกติ', value: 'normal' },
  { label: 'ชำรุด', value: 'damaged' },
  { label: 'สูญหาย', value: 'lost' },
  { label: 'เสื่อมสภาพ', value: 'deteriorated' },
  { label: 'ไม่ระบุ', value: 'unknown' },
];

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
  if (categoryName && IT_CATEGORY_NAME_SET.has(categoryName)) {
    return 'it';
  }

  if (categoryName && AV_CATEGORY_NAME_SET.has(categoryName)) {
    return 'av';
  }

  if (categoryName && FURNITURE_CATEGORY_NAME_SET.has(categoryName)) {
    return 'furniture';
  }

  if (categoryName && INSPECTION_CATEGORY_NAME_SET.has(categoryName)) {
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

function resolveDescription(equipment: BackendEquipment) {
  const detailParts = [
    equipment.category ? `หมวดหมู่ ${equipment.category}` : null,
    equipment.location ? `สถานที่จัดเก็บ ${equipment.location}` : null,
    equipment.assetCode ? `รหัสครุภัณฑ์ ${equipment.assetCode}` : null,
    equipment.serialNumber ? `เลขเครื่อง ${equipment.serialNumber}` : null,
    equipment.conditionStatus ? `สถานะ ${equipment.conditionStatus}` : null,
  ].filter(Boolean);

  const quantitySummary = `จำนวนทั้งหมด ${equipment.totalQuantity} ชิ้น พร้อมจอง ${equipment.availableQuantity} ชิ้น`;
  const detailSummary =
    detailParts.length > 0
      ? detailParts.join(' • ')
      : 'ไม่มีรายละเอียดเพิ่มเติมจากระบบกลาง';

  return `${equipment.name} - ${detailSummary} • ${quantitySummary}`;
}

function resolveImageUrl(equipment: BackendEquipment) {
  return (
    equipment.imageUrl?.trim() ||
    equipment.photoUrl?.trim() ||
    equipment.thumbnailUrl?.trim() ||
    undefined
  );
}

function normalizeConditionStatus(
  value: string | null | undefined,
): EquipmentConditionStatus {
  switch (value) {
    case 'normal':
    case 'damaged':
    case 'lost':
    case 'deteriorated':
    case 'unknown':
      return value;
    default:
      return 'unknown';
  }
}

function mapEquipmentItem(equipment: BackendEquipment): EquipmentItem {
  const categoryId = resolveCategoryId(equipment.category);

  return {
    id: equipment.id,
    equipId: equipment.assetCode || equipment.serialNumber || `EQ-${equipment.id}`,
    name: equipment.name,
    sub: resolveSubtitle(equipment),
    description: resolveDescription(equipment),
    imageUrl: resolveImageUrl(equipment),
    imageAlt: `รูปครุภัณฑ์ ${equipment.name}`,
    stock: Number.isFinite(equipment.availableQuantity)
      ? equipment.availableQuantity
      : equipment.totalQuantity,
    tag: resolveTag(equipment),
    icon: resolveIcon(equipment, categoryId),
  };
}

function mapAdminEquipmentListItem(
  equipment: BackendEquipment,
): AdminEquipmentListItem {
  return {
    id: equipment.id,
    name: equipment.name.trim(),
    category: equipment.category?.trim() || 'ไม่ระบุหมวดหมู่',
    location: equipment.location?.trim() || 'ไม่ระบุสถานที่จัดเก็บ',
    assetCode: equipment.assetCode?.trim() || '',
    serialNumber: equipment.serialNumber?.trim() || '',
    conditionStatus: normalizeConditionStatus(equipment.conditionStatus),
    totalQuantity: normalizeQuantity(equipment.totalQuantity, 0),
    availableQuantity: normalizeQuantity(
      equipment.availableQuantity,
      normalizeQuantity(equipment.totalQuantity, 0),
    ),
    imageUrl: resolveImageUrl(equipment),
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
      description: `รายการนี้รวมครุภัณฑ์ชื่อเดียวกัน ${nextGroupedCount} รายการในระบบกลาง จำนวนพร้อมจองรวม ${nextStock} ชิ้น รายละเอียดหลัก: ${existingItem.description}`,
      equipId:
        nextGroupedCount === 2
          ? `${existingItem.equipId} +1 รหัส`
          : existingItem.equipId.replace(/\+\d+ รหัส$/, `+${nextGroupedCount - 1} รหัส`),
      groupedCount: nextGroupedCount,
    });
  }

  return [...groupedItems.values()].map((item) => ({
    id: item.id,
    equipId: item.equipId,
    name: item.name,
    sub: item.sub,
    description: item.description,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    stock: item.stock,
    tag: item.tag,
    icon: item.icon,
  }));
}

async function fetchEquipmentPage(offset: number) {
  return apiFetch<EquipmentSummaryResponse>(
    `/api/equipment?view=summary&limit=${EQUIPMENT_PAGE_SIZE}&offset=${offset}`,
  );
}

async function fetchAllEquipmentSummary() {
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

  return allEquipment;
}

const normalizeOptionalText = (value: string | undefined) => {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
};

const normalizeQuantity = (value: number, fallbackValue: number) => {
  if (!Number.isFinite(value)) {
    return fallbackValue;
  }

  return Math.max(Math.trunc(value), 0);
};

const resolveCreatedEquipment = (response: CreateEquipmentResponse) =>
  response.equipment ?? response.item ?? response.data ?? null;

const getRequiredAdminAuthToken = async () => {
  const adminAuthToken = await getAdminAuthToken(true);

  if (!adminAuthToken) {
    throw new ApiError(
      'ไม่พบ token แอดมิน กรุณาเข้าสู่ระบบแอดมินใหม่อีกครั้ง',
      401,
      null,
    );
  }

  return adminAuthToken;
};

export const validateEquipmentImageFile = (file: File | null) => {
  if (!file) {
    return;
  }

  if (!ALLOWED_ADMIN_EQUIPMENT_IMAGE_TYPES.has(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์รูป JPG, PNG, WebP, HEIC หรือ HEIF');
  }

  if (file.size > ADMIN_EQUIPMENT_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์รูปครุภัณฑ์ต้องไม่เกิน 5MB');
  }
};

export async function createEquipment(
  input: CreateEquipmentInput,
): Promise<EquipmentItem | null> {
  const totalQuantity = Math.max(normalizeQuantity(input.totalQuantity, 1), 1);
  const availableQuantity = Math.min(
    normalizeQuantity(input.availableQuantity, totalQuantity),
    totalQuantity,
  );
  const adminAuthToken = await getRequiredAdminAuthToken();
  const response = await apiFetch<CreateEquipmentResponse>('/api/equipment', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminAuthToken}`,
    },
    body: JSON.stringify({
      name: input.name.trim(),
      category: input.category.trim(),
      location: normalizeOptionalText(input.location),
      assetCode: normalizeOptionalText(input.assetCode),
      serialNumber: normalizeOptionalText(input.serialNumber),
      conditionStatus: input.conditionStatus ?? 'normal',
      totalQuantity,
      availableQuantity,
    }),
  });
  const createdEquipment = resolveCreatedEquipment(response);

  return createdEquipment ? mapEquipmentItem(createdEquipment) : null;
}

export async function uploadEquipmentImage(
  equipmentId: number,
  imageFile: File,
): Promise<void> {
  validateEquipmentImageFile(imageFile);

  const adminAuthToken = await getRequiredAdminAuthToken();
  const formData = new FormData();
  formData.append('image', imageFile, imageFile.name);

  await apiFetch<unknown>(`/api/equipment/${equipmentId}/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminAuthToken}`,
    },
    body: formData,
  });
}

export async function fetchAdminEquipmentList(): Promise<AdminEquipmentListItem[]> {
  const allEquipment = await fetchAllEquipmentSummary();

  return allEquipment
    .map(mapAdminEquipmentListItem)
    .sort((left, right) => {
      const comparedByName = left.name.localeCompare(right.name, 'th');

      if (comparedByName !== 0) {
        return comparedByName;
      }

      return right.id - left.id;
    });
}

export async function deleteEquipment(equipmentId: number): Promise<void> {
  const adminAuthToken = await getRequiredAdminAuthToken();

  await apiFetch<unknown>(`/api/equipment/${equipmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminAuthToken}`,
    },
  });
}

export async function fetchCategoryItemsFromApi(): Promise<CategoryItemsMap> {
  const allEquipment = await fetchAllEquipmentSummary();

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
