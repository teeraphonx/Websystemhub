export const USER_ACTIVITY_IDENTITIES_STORAGE_KEY =
  'systemhub-user-activity-identities-v1';

export interface UserActivityIdentitySnapshot {
  uid: string;
  lastSeenAt: number;
}

export type UserActivityIdentityRegistry = Record<
  string,
  UserActivityIdentitySnapshot
>;

const normalizeUserActivityIdentity = (value: string) =>
  value.trim().toLowerCase();

export const buildUserActivityIdentityKeys = ({
  uid = '',
  email = '',
  normalizedUsername = '',
}: {
  uid?: string;
  email?: string;
  normalizedUsername?: string;
}) =>
  [...new Set([uid, email, normalizedUsername].map(normalizeUserActivityIdentity))]
    .filter(Boolean);

export const readUserActivityIdentityRegistry = (): UserActivityIdentityRegistry => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(
      USER_ACTIVITY_IDENTITIES_STORAGE_KEY,
    );

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (typeof parsedValue !== 'object' || parsedValue === null) {
      return {};
    }

    const nextRegistry: UserActivityIdentityRegistry = {};

    Object.entries(parsedValue as Record<string, unknown>).forEach(
      ([identityKey, value]) => {
        const normalizedIdentityKey =
          normalizeUserActivityIdentity(identityKey);

        if (
          !normalizedIdentityKey ||
          typeof value !== 'object' ||
          value === null
        ) {
          return;
        }

        const snapshot = value as {
          uid?: unknown;
          lastSeenAt?: unknown;
        };
        const uid =
          typeof snapshot.uid === 'string'
            ? normalizeUserActivityIdentity(snapshot.uid)
            : '';
        const lastSeenAt =
          typeof snapshot.lastSeenAt === 'number' &&
          Number.isFinite(snapshot.lastSeenAt)
            ? snapshot.lastSeenAt
            : 0;

        if (!uid || lastSeenAt <= 0) {
          return;
        }

        nextRegistry[normalizedIdentityKey] = {
          uid,
          lastSeenAt,
        };
      },
    );

    return nextRegistry;
  } catch {
    return {};
  }
};

export const persistUserActivityIdentityRegistry = (
  registry: UserActivityIdentityRegistry,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    USER_ACTIVITY_IDENTITIES_STORAGE_KEY,
    JSON.stringify(registry),
  );
};

export const pruneUserActivityIdentityRegistry = (
  registry: UserActivityIdentityRegistry,
  staleAfterMs: number,
  now: number,
) => {
  const nextRegistry: UserActivityIdentityRegistry = {};

  Object.entries(registry).forEach(([identityKey, snapshot]) => {
    if (
      !identityKey.trim() ||
      !snapshot.uid.trim() ||
      !Number.isFinite(snapshot.lastSeenAt) ||
      now - snapshot.lastSeenAt > staleAfterMs
    ) {
      return;
    }

    nextRegistry[identityKey] = snapshot;
  });

  return nextRegistry;
};
