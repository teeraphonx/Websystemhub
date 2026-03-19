import { Check, Monitor, Briefcase, Truck, Megaphone, X } from 'lucide-react';
import { CATEGORY_SUMMARIES } from '../../constants/views';

interface PromoPopupProps {
  isOpen: boolean;
  dontShowForHour: boolean;
  onToggleDontShow: () => void;
  onClose: () => void;
}

const PROMO_GRADIENTS = [
  'from-[#3b82f6] to-[#1d4ed8]',
  'from-[#60a5fa] to-[#2563eb]',
  'from-[#1e3a8a] to-[#172554]',
  'from-[#2563eb] to-[#1e40af]',
] as const;

const PROMO_ICONS = [Monitor, Truck, Briefcase, Megaphone] as const;

export default function PromoPopup({
  isOpen,
  dontShowForHour,
  onToggleDontShow,
  onClose,
}: PromoPopupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#02050f]/90 p-4 backdrop-blur-md animate-in fade-in duration-500 sm:p-6">
      <div className="relative flex w-full max-w-[900px] flex-col overflow-hidden rounded-[2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-base)] shadow-[0_0_100px_rgba(37,99,235,0.25)] animate-pop-in-modal">
        <button
          type="button"
          onClick={onClose}
          className="group absolute right-5 top-5 z-50 rounded-xl border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-inner)] p-2.5 text-gray-400 transition-all hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-400"
          aria-label="ปิดป๊อปอัป"
        >
          <X size={20} className="transition-transform duration-300 group-hover:rotate-90" />
        </button>

        <div className="flex h-[500px] w-full flex-col md:flex-row">
          <div className="relative hidden w-[45%] items-center justify-center overflow-hidden border-r border-[var(--systemhub-border)] bg-[#090d18] md:flex">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2563eb]/20 to-transparent blur-[60px]"></div>

            <div className="relative mt-10 flex h-[480px] w-[240px] scale-105 -rotate-[10deg] flex-col overflow-hidden rounded-[2.5rem] border-[8px] border-[#131b2f] bg-[#050812] shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
              <div className="absolute left-1/2 top-0 z-20 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-[var(--systemhub-surface-inner)]"></div>

              <div className="relative z-10 flex flex-1 flex-col p-4 pt-12">
                <div className="mb-3 pl-1 text-[11px] font-black uppercase tracking-wider text-white opacity-60">
                  หมวดหมู่แนะนำ
                </div>
                <div className="flex flex-col">
                  {CATEGORY_SUMMARIES.map((summary, index) => {
                    const Icon = PROMO_ICONS[index] ?? summary.icon;

                    return (
                      <div
                        key={summary.id}
                        className={`relative flex h-[76px] w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r ${PROMO_GRADIENTS[index] ?? PROMO_GRADIENTS[0]} p-3 shadow-xl transition-transform hover:-translate-y-2 ${index === 0 ? 'z-[14]' : index === 1 ? 'z-[13] -mt-4' : index === 2 ? 'z-[12] -mt-4' : 'z-[11] -mt-4'}`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/20 shadow-inner backdrop-blur-md">
                          <Icon size={18} className="text-white" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="truncate text-[13px] font-black uppercase italic leading-tight tracking-wider text-white drop-shadow-md">
                            {summary.title}
                          </h4>
                          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/80">
                            READY TO RESERVE
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex w-full flex-col justify-center bg-[var(--systemhub-base)] p-8 md:w-[55%] md:p-12">
            <div className="mb-10 mt-2 text-center md:mt-0">
              <h2 className="mb-2 text-[40px] font-black uppercase leading-none tracking-tighter text-white drop-shadow-xl md:text-[46px]">
                SYSTEM<span className="text-[var(--systemhub-accent)]">HUB</span>
              </h2>
              <div className="inline-block rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] px-6 py-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <span className="text-[15px] font-black italic tracking-wider text-white">ครบจบทุกการจอง!</span>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[340px] flex-col justify-center space-y-3.5">
              {CATEGORY_SUMMARIES.map((summary) => (
                <button
                  key={summary.id}
                  type="button"
                  onClick={onClose}
                  className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[1rem] border border-[var(--systemhub-border)] border-x-[4px] border-x-[#2563eb]/70 bg-[rgba(9,16,29,0.82)] py-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-[#60a5fa] hover:border-x-[#60a5fa] hover:bg-[var(--systemhub-surface-inner)]"
                >
                  <h4 className="text-[16px] font-black uppercase tracking-[0.15em] text-white transition-colors group-hover:text-[var(--systemhub-accent)]">
                    {summary.title}
                  </h4>
                  <p className="mt-1 text-[11px] font-bold tracking-wider text-gray-500 group-hover:text-gray-400">
                    {summary.sub}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-[70px] w-full items-center justify-center border-t border-[var(--systemhub-border)] bg-[#05070d]">
          <button type="button" onClick={onToggleDontShow} className="group rounded-full bg-transparent px-4 py-2 focus:outline-none">
            <span className="flex items-center gap-3">
              <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border-[2px] transition-all ${dontShowForHour ? 'border-white bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-gray-500 bg-transparent group-hover:border-gray-300'}`}>
                {dontShowForHour && <Check size={14} className="text-black" strokeWidth={5} />}
              </span>
              <span className="text-[14px] font-bold tracking-wide text-white">ไม่ต้องแจ้งเตือนอีก 1 ชั่วโมง</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


