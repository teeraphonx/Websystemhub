import { useEffect, useState, type SetStateAction } from 'react';
import { APP_DATA_STORAGE_KEY, appDataStore } from '../lib/appDataStore';
import type { AppDataSnapshot, AppState } from '../types';

const REMOTE_SYNC_INTERVAL_MS = 30000;

const resolveSliceUpdate = <T,>(
  current: T,
  nextValue: SetStateAction<T>,
): T =>
  typeof nextValue === 'function'
    ? (nextValue as (value: T) => T)(current)
    : nextValue;

export const useAppState = (): AppState => {
  const [view, setView] = useState<AppState['view']>('login');
  const [activeUserTab, setActiveUserTab] =
    useState<AppState['activeUserTab']>('home');
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<AppState['selectedCategoryId']>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRememberMe, setAdminRememberMe] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    desc: '',
  } as AppState['modalState']);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [userReservations, setUserReservations] = useState(0);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [adminDateFilter, setAdminDateFilter] = useState('');
  const [adminCalendarView, setAdminCalendarView] = useState(new Date());
  const [appData, setAppData] = useState<AppDataSnapshot>(() =>
    appDataStore.getBootstrapSnapshot(),
  );
  const [isAppDataReady, setIsAppDataReady] = useState(
    !appDataStore.requiresHydration,
  );

  useEffect(() => {
    if (!appDataStore.requiresHydration) {
      return () => undefined;
    }

    let isMounted = true;

    void appDataStore
      .loadSnapshot()
      .then((snapshot) => {
        if (isMounted) {
          setAppData(snapshot);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAppDataReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAppDataReady) {
      return;
    }

    void appDataStore.saveSnapshot(appData);
  }, [appData, isAppDataReady]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== APP_DATA_STORAGE_KEY) {
        return;
      }

      void appDataStore.loadSnapshot().then((snapshot) => {
        setAppData(snapshot);
      });
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isAppDataReady) {
      return () => undefined;
    }

    let isMounted = true;

    const syncRemoteState = () => {
      void appDataStore.loadSnapshot().then((snapshot) => {
        if (isMounted) {
          setAppData(snapshot);
        }
      });
    };

    const intervalId = window.setInterval(syncRemoteState, REMOTE_SYNC_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAppDataReady]);

  const setAdminBookings: AppState['setAdminBookings'] = (nextValue) => {
    setAppData((current) => ({
      ...current,
      adminBookings: resolveSliceUpdate(current.adminBookings, nextValue),
    }));
  };

  const setAdminNotifications: AppState['setAdminNotifications'] = (
    nextValue,
  ) => {
    setAppData((current) => ({
      ...current,
      adminNotifications: resolveSliceUpdate(
        current.adminNotifications,
        nextValue,
      ),
    }));
  };

  const setCategoryItems: AppState['setCategoryItems'] = (nextValue) => {
    setAppData((current) => ({
      ...current,
      categoryItems: resolveSliceUpdate(current.categoryItems, nextValue),
    }));
  };

  return {
    view,
    setView,
    activeUserTab,
    setActiveUserTab,
    selectedCategoryId,
    setSelectedCategoryId,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    adminUsername,
    setAdminUsername,
    adminPassword,
    setAdminPassword,
    adminRememberMe,
    setAdminRememberMe,
    showAdminPassword,
    setShowAdminPassword,
    modalState,
    setModalState,
    activeUsers,
    setActiveUsers,
    totalReservations,
    setTotalReservations,
    userReservations,
    setUserReservations,
    historyDateFilter,
    setHistoryDateFilter,
    adminDateFilter,
    setAdminDateFilter,
    adminCalendarView,
    setAdminCalendarView,
    appData,
    setAppData,
    isAppDataReady,
    adminBookings: appData.adminBookings,
    setAdminBookings,
    adminNotifications: appData.adminNotifications,
    setAdminNotifications,
    categoryItems: appData.categoryItems,
    setCategoryItems,
  };
};
