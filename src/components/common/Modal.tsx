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
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[#02050f]/80 backdrop-blur-md">
      <div className="bg-[var(--systemhub-surface-modal)] border border-[var(--systemhub-border)] rounded-[2rem] p-12 max-w-[420px] w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-pop-in-modal relative overflow-hidden">
        {state.type === 'success' && (
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-[#4ade80]/10 rounded-full blur-xl animate-pulse"></div>
            <div className="relative z-10 w-24 h-24 rounded-full border-[3.5px] border-[#4ade80] flex items-center justify-center bg-[var(--systemhub-surface-modal)] shadow-[0_0_20px_rgba(74,222,128,0.2)]">
              <Check className="w-12 h-12 text-[#4ade80]" strokeWidth={4} />
            </div>
          </div>
        )}

        {state.type === 'warning' && (
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-yellow-400/10 rounded-full blur-xl animate-pulse"></div>
            <div className="relative z-10 w-24 h-24 rounded-full border-[3.5px] border-yellow-400 flex items-center justify-center bg-[var(--systemhub-surface-modal)] shadow-[0_0_20px_rgba(250,204,21,0.2)]">
              <span className="text-5xl font-black text-yellow-400">!</span>
            </div>
          </div>
        )}

        {state.type === 'error' && (
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center mb-10">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative z-10 w-24 h-24 rounded-full border-[4px] border-[#ff4d4d] flex items-center justify-center bg-[var(--systemhub-surface-modal)] shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              <X className="w-12 h-12 text-[#ff4d4d]" strokeWidth={3} />
            </div>
          </div>
        )}

        <h3 className={`text-3xl font-black text-white mb-3 tracking-wide ${state.type === 'error' ? 'mt-2' : ''}`}>
          {state.title}
        </h3>
        <p className={`text-[16px] font-medium text-gray-400 ${state.type === 'success' ? 'mb-2' : 'mb-10'}`}>
          {state.desc}
        </p>

        {(state.type === 'error' || state.type === 'warning') && (
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--systemhub-primary)] hover:bg-[var(--systemhub-primary-hover)] text-white px-10 py-4 rounded-2xl font-black tracking-widest transition-all shadow-[0_8px_25px_rgba(37,99,235,0.4)] w-full mt-2 relative z-10 active:scale-95"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
