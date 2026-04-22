import type { FormEventHandler } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  IdCard,
  ShieldCheck,
} from 'lucide-react';

interface VerifyOrganizationPageProps {
  email: string;
  officerId: string;
  isSubmitting: boolean;
  onOfficerIdChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onBackToLogin: () => void;
}

export default function VerifyOrganizationPage({
  email,
  officerId,
  isSubmitting,
  onOfficerIdChange,
  onSubmit,
  onBackToLogin,
}: VerifyOrganizationPageProps) {
  return (
    <div className="flex min-h-[calc(100vh-9rem)] w-full animate-fade-up items-center justify-center px-2 py-8">
      <div className="grid w-full max-w-[980px] gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="relative mx-auto h-[360px] w-[320px]">
            <div className="absolute inset-x-10 top-6 h-[300px] rounded-[2rem] border border-[rgba(59,130,246,0.34)] bg-[rgba(15,23,42,0.82)] shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl"></div>
            <div className="absolute left-1/2 top-20 flex h-32 w-32 -translate-x-1/2 items-center justify-center rounded-[2.2rem] border border-[rgba(96,165,250,0.5)] bg-[rgba(37,99,235,0.14)] shadow-[0_0_42px_rgba(37,99,235,0.32)]">
              <ShieldCheck size={66} className="text-[var(--systemhub-accent)]" strokeWidth={1.55} />
            </div>
            <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-[#86efac]">
              <CheckCircle size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                BKSOT 1
              </span>
            </div>
            <div className="absolute left-2 top-28 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.88)] text-gray-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <IdCard size={25} />
            </div>
            <div className="absolute bottom-16 right-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.88)] text-[var(--systemhub-accent)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <Building2 size={25} />
            </div>
          </div>
        </section>

        <section className="systemhub-auth-panel rounded-[2rem] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
          <div className="mb-7">
            <p className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
              <ShieldCheck size={14} />
              ORGANIZATION VERIFY
            </p>
            <h1 className="text-3xl font-black tracking-wide text-white">
              ยืนยันตัวตน บก.สอท.1
            </h1>
            <p className="mt-3 max-w-[34rem] text-[14px] leading-7 text-gray-400">
              บัญชีของคุณสมัครและยืนยันอีเมลแล้ว เหลือเพียงยืนยันรหัสเจ้าหน้าที่เพื่อเปิดใช้งานระบบจองครุภัณฑ์
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-4 shadow-inner">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-[rgba(59,130,246,0.2)] bg-[rgba(2,6,23,0.32)] px-4 py-3">
                <Building2 size={18} className="shrink-0 text-[var(--systemhub-accent)]" />
                <span className="min-w-0 break-all text-[14px] font-bold text-white">
                  {email || 'ไม่พบอีเมลในระบบ'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-left group">
              <label className="ml-1 flex items-center gap-3 text-[13px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-focus-within:text-[var(--systemhub-accent)]">
                <IdCard size={15} />
                <span>รหัสเจ้าหน้าที่</span>
              </label>
              <input
                type="text"
                value={officerId}
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(event) => onOfficerIdChange(event.target.value)}
                placeholder="กรอกรหัสหรือเลขประจำตัวเจ้าหน้าที่"
                className="systemhub-auth-input w-full rounded-xl px-5 py-3.5 text-[14px] text-white outline-none transition-all disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--systemhub-primary)] px-5 py-4 text-[13px] font-black tracking-widest text-white shadow-[0_8px_24px_rgba(37,99,235,0.36)] transition-all hover:bg-[var(--systemhub-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <ShieldCheck size={17} />
              {isSubmitting ? 'กำลังตรวจสอบ...' : 'ยืนยันตัวตน'}
            </button>
          </form>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBackToLogin}
            className="mx-auto mt-7 flex items-center justify-center gap-2 text-[13px] font-bold text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft size={16} />
            กลับไปเข้าสู่ระบบ
          </button>
        </section>
      </div>
    </div>
  );
}
