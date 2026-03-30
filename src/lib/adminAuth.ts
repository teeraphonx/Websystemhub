const ADMIN_SESSION_KEY = 'systemhub_admin_session';
const adminUsername = (import.meta.env.VITE_ADMIN_USERNAME ?? '').trim();
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

const normalizeAdminUsername = (value: string) => value.trim().toLowerCase();

const readAdminSession = (storage: Storage) =>
  storage.getItem(ADMIN_SESSION_KEY) === '1';

export const isAdminAuthConfigured = () =>
  adminUsername.length > 0 && adminPassword.length > 0;

export const matchesAdminCredentials = (
  username: string,
  password: string,
) => {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  return (
    normalizeAdminUsername(username) === normalizeAdminUsername(adminUsername) &&
    password === adminPassword
  );
};

export const persistAdminSession = (rememberMe: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  clearAdminSession();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(ADMIN_SESSION_KEY, '1');
};

export const clearAdminSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const isAdminSessionActive = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return readAdminSession(window.localStorage) || readAdminSession(window.sessionStorage);
};
