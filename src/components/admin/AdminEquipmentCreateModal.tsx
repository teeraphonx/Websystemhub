import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Boxes,
  FileImage,
  PackagePlus,
  RotateCcw,
  Save,
  Upload,
  Warehouse,
  X,
} from 'lucide-react';
import { ApiError } from '../../lib/api';
import {
  ADMIN_EQUIPMENT_CATEGORY_OPTIONS,
  ADMIN_EQUIPMENT_CONDITION_OPTIONS,
  ADMIN_EQUIPMENT_IMAGE_ACCEPT,
  ADMIN_EQUIPMENT_IMAGE_MAX_SIZE_BYTES,
  createEquipment,
  uploadEquipmentImage,
  validateEquipmentImageFile,
  type CreateEquipmentInput,
} from '../../lib/equipmentApi';

interface AdminEquipmentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

const DEFAULT_CATEGORY = ADMIN_EQUIPMENT_CATEGORY_OPTIONS[0]?.value ?? '';

const createInitialFormState = (): CreateEquipmentInput => ({
  name: '',
  category: DEFAULT_CATEGORY,
  location: '',
  assetCode: '',
  serialNumber: '',
  conditionStatus: 'normal',
  totalQuantity: 1,
  availableQuantity: 1,
});

const groupedCategoryOptions = ADMIN_EQUIPMENT_CATEGORY_OPTIONS.reduce<
  Record<string, typeof ADMIN_EQUIPMENT_CATEGORY_OPTIONS>
>((groups, option) => {
  const existingGroup = groups[option.group] ?? [];

  return {
    ...groups,
    [option.group]: [...existingGroup, option],
  };
}, {});

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'สิทธิ์แอดมินหมดอายุหรือ backend ยังตรวจสอบ Firebase admin token ไม่ผ่าน กรุณาเข้าสู่ระบบแอดมินใหม่อีกครั้ง หากยังไม่ผ่านให้ตั้ง custom claim admin=true หรือ role=admin ให้บัญชีนี้ใน Firebase/backend';
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'ไม่สามารถเพิ่มครุภัณฑ์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
};

const normalizePositiveInteger = (value: string, fallbackValue: number) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return Math.max(Math.trunc(parsedValue), 0);
};

const formatFileSize = (size: number) => `${(size / (1024 * 1024)).toFixed(2)} MB`;

export default function AdminEquipmentCreateModal({
  isOpen,
  onClose,
  onCreated,
}: AdminEquipmentCreateModalProps) {
  const [formState, setFormState] = useState<CreateEquipmentInput>(
    createInitialFormState,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isQuantityInvalid =
    formState.totalQuantity < 1 ||
    formState.availableQuantity < 0 ||
    formState.availableQuantity > formState.totalQuantity;
  const isSubmitDisabled =
    isSubmitting ||
    !formState.name.trim() ||
    !formState.category.trim() ||
    isQuantityInvalid;
  const categoryGroupEntries = Object.entries(groupedCategoryOptions);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setFormState(createInitialFormState());
    setImageFile(null);
    setErrorMessage('');
    setSuccessMessage('');
  }, [isOpen]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

  if (!isOpen) {
    return null;
  }

  const clearFormFields = () => {
    setFormState(createInitialFormState());
    setImageFile(null);
  };

  const resetForm = () => {
    clearFormFields();
    setErrorMessage('');
    setSuccessMessage('');
  };

  const refreshCreatedEquipmentCatalog = async () => {
    if (!onCreated) {
      return '';
    }

    try {
      await Promise.resolve(onCreated());
      return '';
    } catch (error) {
      console.error('Failed to refresh equipment catalog after create.', error);
      return ' แต่รีเฟรชรายการล่าสุดไม่สำเร็จ กรุณากดรีเฟรชรายการหรือโหลดหน้าใหม่อีกครั้ง';
    }
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose();
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextImageFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!nextImageFile) {
      return;
    }

    try {
      validateEquipmentImageFile(nextImageFile);
      setImageFile(nextImageFile);
      setErrorMessage('');
      setSuccessMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const createdEquipment = await createEquipment(formState);
      const createdEquipmentName = createdEquipment?.name ?? formState.name.trim();

      if (imageFile) {
        const createdEquipmentId = createdEquipment?.id;

        if (!createdEquipmentId) {
          const refreshWarning = await refreshCreatedEquipmentCatalog();
          clearFormFields();
          setErrorMessage(
            `เพิ่ม "${createdEquipmentName}" เรียบร้อยแล้ว แต่ยังอัปโหลดรูปไม่สำเร็จ เพราะ backend ไม่ส่งรหัสรายการกลับมา${refreshWarning}`,
          );
          return;
        }

        try {
          await uploadEquipmentImage(createdEquipmentId, imageFile);
        } catch (error) {
          const refreshWarning = await refreshCreatedEquipmentCatalog();
          clearFormFields();
          setErrorMessage(
            `เพิ่ม "${createdEquipmentName}" เรียบร้อยแล้ว แต่การอัปโหลดรูปไม่สำเร็จ: ${getErrorMessage(error)}${refreshWarning}`,
          );
          return;
        }
      }

      const refreshWarning = await refreshCreatedEquipmentCatalog();

      setSuccessMessage(
        refreshWarning
          ? `เพิ่ม "${createdEquipmentName}" เรียบร้อยแล้ว${refreshWarning}`
          : `เพิ่ม "${createdEquipmentName}" เรียบร้อยแล้ว และอัปเดตรายการในหน้าแอดมินแล้ว`,
      );
      clearFormFields();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-equipment-create-title"
      className="fixed inset-0 z-[470] flex items-start justify-center overflow-y-auto bg-[#02050f]/88 px-4 py-5 backdrop-blur-md"
    >
      <div className="systemhub-auth-panel relative w-full max-w-[960px] overflow-hidden rounded-[2rem] shadow-[0_28px_90px_rgba(0,0,0,0.76)]">
        <div className="systemhub-top-accent h-1.5 w-full"></div>

        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          aria-label="ปิดฟอร์มเพิ่มครุภัณฑ์"
          className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.86)] text-gray-400 transition-colors hover:border-[var(--systemhub-primary-hover)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <div className="mb-7 flex flex-col gap-4 border-b border-[rgba(30,42,74,0.78)] pb-6 pr-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="systemhub-admin-stat-orb systemhub-admin-stat-orb--primary mt-1 h-14 w-14 rounded-2xl">
                <PackagePlus size={26} strokeWidth={2.2} />
              </div>
              <div>
                <p className="inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--systemhub-accent)]">
                  <Warehouse size={13} />
                  ADMIN INVENTORY
                </p>
                <h3
                  id="admin-equipment-create-title"
                  className="mt-3 text-2xl font-black tracking-wide text-white sm:text-3xl"
                >
                  เพิ่มครุภัณฑ์เข้าระบบ
                </h3>
                <p className="mt-2 max-w-[42rem] text-[13px] font-medium leading-6 text-gray-400">
                  กรอกแบบฟอร์มเพื่อเพิ่มครุภัณฑ์
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.56)] px-4 py-3 text-[11px] font-bold leading-6 text-gray-400 lg:max-w-[19rem]">
              ช่องที่มีเครื่องหมาย <span className="text-[var(--systemhub-danger-strong)]">*</span>{' '}
              เป็นข้อมูลจำเป็นอย่างน้อยสำหรับสร้างรายการใหม่ในหน้า admin
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    ชื่อครุภัณฑ์ <span className="text-[var(--systemhub-danger-strong)]">*</span>
                  </span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }));
                      setErrorMessage('');
                    }}
                    placeholder="เช่น เครื่องพิมพ์เลเซอร์ ห้องธุรการ"
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    หมวดหมู่ในระบบกลาง <span className="text-[var(--systemhub-danger-strong)]">*</span>
                  </span>
                  <select
                    value={formState.category}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        category: event.target.value,
                      }));
                      setErrorMessage('');
                    }}
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  >
                    {categoryGroupEntries.map(([groupLabel, options]) => (
                      <optgroup key={groupLabel} label={groupLabel}>
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    รหัสครุภัณฑ์
                  </span>
                  <input
                    type="text"
                    value={formState.assetCode}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        assetCode: event.target.value,
                      }));
                    }}
                    placeholder="เช่น 7430-0121-0006-1-2564"
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  />
                </label>

                <label>
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    Serial Number
                  </span>
                  <input
                    type="text"
                    value={formState.serialNumber}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        serialNumber: event.target.value,
                      }));
                    }}
                    placeholder="เช่น E80732D1H972611"
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  />
                </label>

                <label>
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    จำนวนทั้งหมด <span className="text-[var(--systemhub-danger-strong)]">*</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={formState.totalQuantity}
                    onChange={(event) => {
                      const totalQuantity = Math.max(
                        normalizePositiveInteger(event.target.value, 1),
                        1,
                      );
                      setFormState((current) => ({
                        ...current,
                        totalQuantity,
                        availableQuantity: Math.min(
                          current.availableQuantity,
                          totalQuantity,
                        ),
                      }));
                      setErrorMessage('');
                    }}
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  />
                </label>

                <label>
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    จำนวนพร้อมใช้งาน <span className="text-[var(--systemhub-danger-strong)]">*</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={formState.totalQuantity}
                    value={formState.availableQuantity}
                    onChange={(event) => {
                      const availableQuantity = normalizePositiveInteger(
                        event.target.value,
                        0,
                      );
                      setFormState((current) => ({
                        ...current,
                        availableQuantity: Math.min(
                          availableQuantity,
                          current.totalQuantity,
                        ),
                      }));
                      setErrorMessage('');
                    }}
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  />
                </label>
              </div>

              <label>
                <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                  สถานที่จัดเก็บ
                </span>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      location: event.target.value,
                    }));
                  }}
                  placeholder="เช่น ฝอ.บก.สอท.1"
                  className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                />
              </label>

              <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.46)] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] text-[var(--systemhub-accent)]">
                    <FileImage size={20} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-white">
                      รูปครุภัณฑ์
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-gray-500">
                      แนบรูปเพื่อให้หน้าแสดงรายละเอียดและหน้าจองดึงภาพไปใช้ได้ทันที
                    </p>
                  </div>
                </div>

                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[rgba(96,165,250,0.42)] bg-[rgba(37,99,235,0.08)] p-4 transition-all hover:border-[var(--systemhub-accent)] hover:bg-[rgba(37,99,235,0.14)] ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="file"
                    accept={ADMIN_EQUIPMENT_IMAGE_ACCEPT}
                    disabled={isSubmitting}
                    onChange={handleImageFileChange}
                    className="sr-only"
                  />

                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="ตัวอย่างรูปครุภัณฑ์"
                      className="h-20 w-20 shrink-0 rounded-2xl border border-[rgba(148,163,184,0.18)] object-cover shadow-[0_16px_34px_rgba(0,0,0,0.3)]"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[rgba(96,165,250,0.34)] bg-[rgba(15,23,42,0.72)] text-[var(--systemhub-accent)]">
                      <Upload size={28} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-black text-white">
                      {imageFile ? imageFile.name : 'เลือกรูปครุภัณฑ์'}
                    </p>
                    <p className="mt-1 text-[12px] font-bold text-gray-500">
                      {imageFile
                        ? formatFileSize(imageFile.size)
                        : `JPG, PNG, WebP, HEIC ไม่เกิน ${formatFileSize(ADMIN_EQUIPMENT_IMAGE_MAX_SIZE_BYTES)}`}
                    </p>
                  </div>
                </label>

                {imageFile && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgba(239,68,68,0.24)] bg-[rgba(127,29,29,0.14)] px-3 py-2 text-[11px] font-black tracking-widest text-[#fca5a5] transition-colors hover:border-[rgba(248,113,113,0.38)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X size={14} />
                      ล้างรูป
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--systemhub-border)] bg-[rgba(10,15,28,0.72)] p-5 shadow-inner">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] text-[var(--systemhub-accent)]">
                    <Boxes size={20} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-widest text-white">
                      สถานะและสรุปสต็อก
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-gray-500">
                      ตรวจความถูกต้องของข้อมูลก่อนส่งไปยัง backend
                    </p>
                  </div>
                </div>

                <label>
                  <span className="mb-3 block text-[11px] font-black uppercase tracking-widest text-[var(--systemhub-accent)]">
                    สภาพครุภัณฑ์
                  </span>
                  <select
                    value={formState.conditionStatus}
                    onChange={(event) => {
                      setFormState((current) => ({
                        ...current,
                        conditionStatus: event.target
                          .value as CreateEquipmentInput['conditionStatus'],
                      }));
                    }}
                    className="systemhub-field w-full rounded-xl px-4 py-3.5 text-[14px] font-bold text-white outline-none transition-all"
                  >
                    {ADMIN_EQUIPMENT_CONDITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="systemhub-field-shell rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      จำนวนรวม
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {formState.totalQuantity}
                    </p>
                  </div>
                  <div className="systemhub-field-shell rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      พร้อมใช้งาน
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {formState.availableQuantity}
                    </p>
                  </div>
                </div>

                {isQuantityInvalid && (
                  <div className="mt-5 rounded-2xl border border-[rgba(245,158,11,0.34)] bg-[rgba(245,158,11,0.1)] p-4 text-[12px] font-bold leading-6 text-[#fcd34d]">
                    จำนวนพร้อมใช้งานต้องอยู่ระหว่าง 0 ถึงจำนวนทั้งหมด และจำนวนทั้งหมดต้องมากกว่า 0
                  </div>
                )}
              </div>

              {successMessage && (
                <div className="rounded-2xl border border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.1)] p-4 text-[12px] font-bold leading-6 text-[#86efac]">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-[rgba(239,68,68,0.32)] bg-[rgba(127,29,29,0.16)] p-4 text-[12px] font-bold leading-6 text-[#fca5a5]">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-[rgba(30,42,74,0.8)] pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="systemhub-secondary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-gray-300 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={15} />
              ล้างฟอร์ม
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="systemhub-secondary-button rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-gray-300 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              ปิด
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-shine systemhub-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-black tracking-widest text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-[rgba(51,65,85,0.8)] disabled:text-gray-400 disabled:shadow-none"
            >
              <Save size={15} strokeWidth={2.5} />
              {isSubmitting
                ? imageFile
                  ? 'กำลังอัปโหลดและบันทึก...'
                  : 'กำลังบันทึก...'
                : 'บันทึกครุภัณฑ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
