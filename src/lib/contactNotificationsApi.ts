import { apiFetch } from './api';
import type { AdminNotification, ContactAdminSubmission } from '../types';

interface ContactMessageDto {
  id: number;
  subject: string;
  message: string;
  senderName: string | null;
  senderEmail: string | null;
  isRead: boolean;
  createdAt: string;
}

const thaiTimeFormatter = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Bangkok',
});

const compactMessage = (value: string) =>
  value.length > 120 ? `${value.slice(0, 117)}...` : value;

const resolveSenderLabel = (message: ContactMessageDto) =>
  message.senderName?.trim() || message.senderEmail?.trim() || 'ผู้ใช้งานระบบ';

const toAdminNotification = (message: ContactMessageDto): AdminNotification => ({
  id: `contact-${message.id}`,
  bookingId: `contact-${message.id}`,
  title: `ข้อความใหม่: ${message.subject}`,
  desc: `${resolveSenderLabel(message)} ส่งข้อความถึงผู้ดูแล: ${compactMessage(message.message)}`,
  time: thaiTimeFormatter.format(new Date(message.createdAt)),
  isRead: message.isRead,
});

export async function fetchContactNotifications(limit = 50): Promise<AdminNotification[]> {
  const payload = await apiFetch<{ messages: ContactMessageDto[] }>(
    `/api/contact-messages?limit=${limit}`,
  );

  return payload.messages.map(toAdminNotification);
}

export async function submitContactNotification(
  payload: ContactAdminSubmission & {
    senderName?: string;
    senderEmail?: string;
  },
): Promise<AdminNotification> {
  const response = await apiFetch<{ contactMessage: ContactMessageDto }>(
    '/api/contact-messages',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return toAdminNotification(response.contactMessage);
}

export async function markAllContactNotificationsRead(): Promise<void> {
  await apiFetch('/api/contact-messages/read-all', {
    method: 'PATCH',
  });
}
