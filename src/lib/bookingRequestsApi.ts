import type { AdminBooking, AdminBookingStatus, EquipmentItem } from '../types';
import { apiFetch } from './api';

interface BackendBookingRequest {
  id: string;
  requesterName: string;
  requesterEmail: string | null;
  equipmentId: number | null;
  equipmentPublicId: string;
  equipmentName: string;
  requestedQuantity: number;
  availableQuantity: number;
  requestedDate: string;
  requestedTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface BookingRequestsResponse {
  bookingRequests: BackendBookingRequest[];
}

interface BookingRequestResponse {
  bookingRequest: BackendBookingRequest;
}

interface SubmitBookingRequestInput {
  requesterName: string;
  requesterEmail?: string;
  item: EquipmentItem;
  requestedDate: string;
  requestedTime: string;
  returnDate?: string;
  returnTime?: string;
  requestedQuantity?: number;
  availableQuantity?: number;
}

interface UpdateBookingStatusInput {
  status: AdminBookingStatus;
  availableQuantity?: number;
}

const backendStatusToAdminStatus: Record<BackendBookingRequest['status'], AdminBookingStatus> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

const adminStatusToBackendStatus: Record<AdminBookingStatus, BackendBookingRequest['status']> = {
  รออนุมัติ: 'pending',
  อนุมัติแล้ว: 'approved',
  ไม่อนุมัติ: 'rejected',
};

const createUserAvatar = (label: string) => {
  const initials = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'US';
};

const normalizeDateKey = (value: string) => value.slice(0, 10);

function mapBookingRequestToAdminBooking(request: BackendBookingRequest): AdminBooking {
  const displayName = request.requesterName || request.requesterEmail || 'ผู้ใช้งานระบบ';

  return {
    id: request.id,
    user: displayName,
    userEmail: request.requesterEmail ?? undefined,
    userAvatar: createUserAvatar(displayName),
    itemId: request.equipmentPublicId,
    itemName: request.equipmentName,
    time: request.requestedTime,
    date: normalizeDateKey(request.requestedDate),
    returnDate: request.returnDate ? normalizeDateKey(request.returnDate) : undefined,
    returnTime: request.returnTime || undefined,
    requestedQuantity: request.requestedQuantity,
    availableQuantity: request.availableQuantity,
    status: backendStatusToAdminStatus[request.status],
  };
}

export async function fetchBookingRequests(): Promise<AdminBooking[]> {
  const response = await apiFetch<BookingRequestsResponse>('/api/booking-requests?limit=500');
  return response.bookingRequests.map(mapBookingRequestToAdminBooking);
}

export async function submitBookingRequest({
  requesterName,
  requesterEmail,
  item,
  requestedDate,
  requestedTime,
  returnDate,
  returnTime,
  requestedQuantity = 1,
  availableQuantity = requestedQuantity,
}: SubmitBookingRequestInput): Promise<AdminBooking> {
  const response = await apiFetch<BookingRequestResponse>('/api/booking-requests', {
    method: 'POST',
    body: JSON.stringify({
      requesterName,
      requesterEmail,
      equipmentId: item.id,
      equipmentPublicId: item.equipId,
      equipmentName: item.name,
      requestedQuantity,
      availableQuantity,
      requestedDate,
      requestedTime,
      returnDate,
      returnTime,
    }),
  });

  return mapBookingRequestToAdminBooking(response.bookingRequest);
}

export async function updateBookingRequestStatus(
  id: string,
  { status, availableQuantity }: UpdateBookingStatusInput,
) {
  return apiFetch<{ message: string }>(`/api/booking-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: adminStatusToBackendStatus[status],
      availableQuantity,
    }),
  });
}

export async function updateBookingRequestAvailableQuantity(
  id: string,
  availableQuantity: number,
) {
  return apiFetch<{ message: string }>(`/api/booking-requests/${id}/available-quantity`, {
    method: 'PATCH',
    body: JSON.stringify({ availableQuantity }),
  });
}
