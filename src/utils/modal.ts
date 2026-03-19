import type { ModalState, ModalType } from '../types';

export const createModal = (
  type: ModalType,
  title: string,
  desc: string,
): ModalState => ({
  isOpen: true,
  type,
  title,
  desc,
});

export const createSuccessModal = (title: string, desc: string): ModalState =>
  createModal('success', title, desc);

export const createWarningModal = (title: string, desc: string): ModalState =>
  createModal('warning', title, desc);

export const createErrorModal = (title: string, desc: string): ModalState =>
  createModal('error', title, desc);
