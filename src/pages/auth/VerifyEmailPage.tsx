import {
  ArrowLeft,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface VerifyEmailPageProps {
  email: string;
  isVerified: boolean;
  isSubmitting: boolean;
  onResendVerification: () => void;
  onCheckVerification: () => void;
  onBackToLogin: () => void;
}

const createSteps = (isVerified: boolean) => [
  {
    label: 'Email',
    title: 'ยืนยันอีเมล',
    icon: Mail,
    state: isVerified ? 'done' : 'active',
  },
] as const;

export default function VerifyEmailPage({
  email,
  isVerified,
  isSubmitting,
  onResendVerification,
  onCheckVerification,
  onBackToLogin,
}: VerifyEmailPageProps) {
  const steps = createSteps(isVerified);

  return (
    <div className="relative z-10 flex min-h-[calc(100vh-9rem)] w-full animate-fade-up items-center justify-center px-2">
      <div className="grid w-full max-w-[980px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="hidden min-h-[480px] items-center justify-center lg:flex">
          <div className="relative h-[390px] w-[340px]">
            <div className="absolute left-1/2 top-1/2 h-[330px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-[rgba(59,130,246,0.35)] bg-[rgba(15,23,42,0.82)] shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="absolute inset-4 rounded-[1.25rem] border border-[rgba(59,130,246,0.18)] bg-[rgba(37,99,235,0.08)]"></div>
              <div className="absolute left-1/2 top-[4.4rem] flex h-28 w-28 -translate-x-1/2 items-center justify-center rounded-[2rem] border border-[rgba(96,165,250,0.55)] bg-[rgba(37,99,235,0.14)] shadow-[0_0_40px_rgba(37,99,235,0.35)]">
                <ShieldCheck size={58} className="text-[var(--systemhub-accent)]" strokeWidth={1.6} />
              </div>
              <div className="absolute bottom-[5.6rem] left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-[var(--systemhub-primary)] shadow-[0_0_18px_rgba(37,99,235,0.65)]"></div>
              <div className="absolute bottom-[3.6rem] left-1/2 h-1.5 w-28 -translate-x-1/2 rounded-full bg-[rgba(96,165,250,0.28)]"></div>
              <div className="absolute bottom-[2.6rem] left-1/2 h-1.5 w-36 -translate-x-1/2 rounded-full bg-[rgba(96,165,250,0.2)]"></div>
            </div>

            <div className="absolute left-0 top-[6.5rem] flex h-14 w-16 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.9)] text-gray-300 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <Mail size={24} />
            </div>
            <div className="absolute bottom-[6.5rem] left-7 flex h-12 w-24 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.9)] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
              <span className="h-2 w-2 rounded-full bg-gray-500"></span>
              <span className="mx-2 h-2 w-2 rounded-full bg-gray-500"></span>
              <span className="h-2 w-2 rounded-full bg-[var(--systemhub-accent)]"></span>
            </div>
          </div>
        </section>

        <section className="systemhub-auth-panel rounded-[2rem] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 flex items-start justify-center gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.state === 'active';
              const isDone = step.state === 'done';

              return (
                <div key={step.label} className="flex max-w-[220px] flex-1 items-start">
                  <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                    <div
                      className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
                        isDone
                          ? 'border-[rgba(34,197,94,0.45)] bg-[rgba(34,197,94,0.14)] text-[#86efac]'
                          : isActive
                            ? 'border-[var(--systemhub-primary)] bg-[var(--systemhub-primary)] text-white shadow-[0_0_24px_rgba(37,99,235,0.42)]'
                            : 'border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] text-gray-500'
                      }`}
                    >
                      <Icon size={19} strokeWidth={2.3} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white">
                      {step.label}
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-gray-500">
                      {step.title}
                    </p>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="mt-6 h-px min-w-8 flex-1 bg-[rgba(148,163,184,0.18)] sm:min-w-14"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mb-8">
            <p className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
              <Lock size={14} />
              SYSTEMHUB SECURITY
            </p>
            <h1 className="text-3xl font-black tracking-wide text-white">
              ยืนยันอีเมลของคุณ
            </h1>
            <p className="mt-3 max-w-[34rem] text-[14px] leading-7 text-gray-400">
              ระบบได้สร้างบัญชีแล้ว กรุณายืนยันอีเมลนี้ก่อนเข้าใช้งานระบบจองครุภัณฑ์
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-4 shadow-inner">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-500">
              Email
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-[rgba(59,130,246,0.2)] bg-[rgba(2,6,23,0.32)] px-4 py-3">
              <Mail size={18} className="shrink-0 text-[var(--systemhub-accent)]" />
              <span className="min-w-0 break-all text-[14px] font-bold text-white">
                {email || 'ไม่พบอีเมลในระบบ'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isSubmitting || !email}
              onClick={onResendVerification}
              className="btn-shine flex items-center justify-center gap-2 rounded-xl bg-[var(--systemhub-primary)] px-5 py-4 text-[13px] font-black tracking-widest text-white shadow-[0_8px_24px_rgba(37,99,235,0.36)] transition-all hover:bg-[var(--systemhub-primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <Mail size={17} />
              ส่งอีเมลยืนยัน
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCheckVerification}
              className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(59,130,246,0.35)] bg-[rgba(37,99,235,0.08)] px-5 py-4 text-[13px] font-black tracking-widest text-[var(--systemhub-accent)] transition-all hover:border-[var(--systemhub-primary-hover)] hover:bg-[rgba(37,99,235,0.18)] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <RefreshCw size={17} className={isSubmitting ? 'animate-spin' : ''} />
              ตรวจสอบสถานะ
            </button>
          </div>

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
