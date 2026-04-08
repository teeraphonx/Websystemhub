const normalizeBaseUrl = (value: string | undefined) => {
  if (!value) {
    return 'http://localhost:3000';
  }

  return value.replace(/\/$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${input.startsWith('/') ? input : `/${input}`}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message?: string }).message ?? 'Request failed')
        : 'Request failed';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}