import { Check, X } from 'lucide-react';
import type { ModalState } from '../../types';

interface ModalProps {
  state: ModalState;
  onClose: () => void;
}

export default function Modal({ state, onClose }: ModalProps) {
  if (!state.isOpen) {
    return null;
  }

  return (
    <div className="animate-modal-overlay fixed inset-0 z-[500] flex items-center justify-center bg-[#02050f]/80 p-6 backdrop-blur-md">
      <div className="animate-pop-in-modal relative w-full max-w-[420px] transform-gpu overflow-hidden rounded-[2rem] border border-[var(--systemhub-border)] bg-[var(--systemhub-surface-modal)] p-12 text-center shadow-[0_22px_70px_rgba(0,0,0,0.62)]">
        {state.type === 'success' && (
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#4ade80]/10 blur-lg"></div>
            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-[3.5px] border-[#4ade80] bg-[var(--systemhub-surface-modal)] shadow-[0_0_16px_rgba(74,222,128,0.18)]">
              <Check className="h-12 w-12 text-[#4ade80]" strokeWidth={4} />
            </div>
          </div>
        )}

        {state.type === 'warning' && (
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-lg"></div>
            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-[3.5px] border-yellow-400 bg-[var(--systemhub-surface-modal)] shadow-[0_0_16px_rgba(250,204,21,0.18)]">
              <span className="text-5xl font-black text-yellow-400">!</span>
            </div>
          </div>
        )}

        {state.type === 'error' && (
          <div className="relative mx-auto mb-10 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#ff4d4d]/10 blur-xl"></div>
            <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-[4px] border-[#ff4d4d] bg-[var(--systemhub-surface-modal)] shadow-[0_0_22px_rgba(255,77,77,0.16)]">
              <X className="h-12 w-12 text-[#ff4d4d]" strokeWidth={3} />
            </div>
          </div>
        )}

        <h3 className={`mb-3 text-3xl font-black tracking-wide text-white ${state.type === 'error' ? 'mt-2' : ''}`}>
          {state.title}
        </h3>
        <p className={`text-[16px] font-medium text-gray-400 ${state.type === 'success' ? 'mb-2' : 'mb-10'}`}>
          {state.desc}
        </p>

        {(state.type === 'error' || state.type === 'warning') && (
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 mt-2 w-full rounded-2xl bg-[var(--systemhub-primary)] px-10 py-4 font-black tracking-widest text-white shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all hover:bg-[var(--systemhub-primary-hover)] active:scale-95"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}

