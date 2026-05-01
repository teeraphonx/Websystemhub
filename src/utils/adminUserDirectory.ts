import type { UserProfileRecord } from '../lib/firebase';

export const HIDDEN_DIRECTORY_USERS_STORAGE_KEY =
  'systemhub-hidden-directory-users-v1';
export const DISMISSED_BOOKING_DIRECTORY_USERS_STORAGE_KEY =
  'systemhub-dismissed-booking-directory-users-v1';

export const normalizeDirectoryIdentityKey = (value: string) =>
  value.trim().toLowerCase();

export const getDirectoryIdentityKeys = (user: UserProfileRecord) =>
  [
    user.uid,
    user.email,
    user.normalizedUsername,
    user.username,
  ]
    .map(normalizeDirectoryIdentityKey)
    .filter(Boolean);

export const isBookingFallbackDirectoryUser = (user: UserProfileRecord) =>
  user.uid.startsWith('booking-email:') || user.uid.startsWith('booking-user:');

export const readHiddenDirectoryUserKeys = () => {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const rawValue = window.localStorage.getItem(
      HIDDEN_DIRECTORY_USERS_STORAGE_KEY,
    );

    if (!rawValue) {
      return new Set<string>();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeDirectoryIdentityKey)
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
};

export const persistHiddenDirectoryUserKeys = (hiddenKeys: Set<string>) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    HIDDEN_DIRECTORY_USERS_STORAGE_KEY,
    JSON.stringify([...hiddenKeys]),
  );
};

export const readDismissedBookingDirectoryUserKeys = () => {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const rawValue = window.localStorage.getItem(
      DISMISSED_BOOKING_DIRECTORY_USERS_STORAGE_KEY,
    );

    if (!rawValue) {
      return new Set<string>();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return new Set<string>();
    }

    return new Set(
      parsedValue
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeDirectoryIdentityKey)
        .filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
};

export const persistDismissedBookingDirectoryUserKeys = (
  dismissedKeys: Set<string>,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    DISMISSED_BOOKING_DIRECTORY_USERS_STORAGE_KEY,
    JSON.stringify([...dismissedKeys]),
  );
};
