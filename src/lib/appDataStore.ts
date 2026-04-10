import { initialAdminBookings } from '../data/adminBookings';
import { categoryItems as seedCategoryItems } from '../data/categoryItems';
import type {
  AdminBooking,
  AdminNotification,
  AppDataSnapshot,
  CategoryId,
  CategoryItemsMap,
} from '../types';
import { fetchBookingRequests } from './bookingRequestsApi';
import { fetchContactNotifications } from './contactNotificationsApi';
import { fetchCategoryItemsFromApi } from './equipmentApi';

export interface AppDataStore {
  requiresHydration: boolean;
  getBootstrapSnapshot: () => AppDataSnapshot;
  loadSnapshot: () => Promise<AppDataSnapshot>;
  saveSnapshot: (snapshot: AppDataSnapshot) => Promise<void>;
  resetSnapshot: () => Promise<AppDataSnapshot>;
}

type PersistedAppDataSnapshot = {
  version: 3;
  adminBookings: AdminBooking[];
  adminNotifications: AdminNotification[];
  categoryStockByItemId: Record<string, number>;
};

export const APP_DATA_STORAGE_KEY = 'systemhub-app-data-v3';
const LEGACY_APP_DATA_STORAGE_KEYS = ['systemhub-app-data-v2'];

const cloneCategoryItems = (categoryItems: CategoryItemsMap): CategoryItemsMap =>
  Object.fromEntries(
    (Object.entries(categoryItems) as [CategoryId, CategoryItemsMap[CategoryId]][]).map(
      ([categoryId, items]) => [
        categoryId,
        items.map((item) => ({ ...item })),
      ],
    ),
  ) as CategoryItemsMap;

const mergeAdminNotifications = (
  ...groups: AdminNotification[][]
): AdminNotification[] => {
  const mergedNotifications: AdminNotification[] = [];
  const seenIds = new Set<string>();

  for (const group of groups) {
    for (const notification of group) {
      if (seenIds.has(notification.id)) {
        continue;
      }

      seenIds.add(notification.id);
      mergedNotifications.push({ ...notification });
    }
  }

  return mergedNotifications;
};

const cloneSnapshot = (snapshot: AppDataSnapshot): AppDataSnapshot => ({
  adminBookings: snapshot.adminBookings.map((booking) => ({ ...booking })),
  adminNotifications: snapshot.adminNotifications.map((notification) => ({
    ...notification,
  })),
  categoryItems: cloneCategoryItems(snapshot.categoryItems),
});

const createCategoryStockByItemId = (
  categoryItems: CategoryItemsMap,
): Record<string, number> =>
  Object.values(categoryItems).flat().reduce<Record<string, number>>(
    (stocks, item) => ({
      ...stocks,
      [item.equipId]: item.stock,
    }),
    {},
  );

const createCategoryItemsFromPersistedStock = (
  baseCategoryItems: CategoryItemsMap,
  categoryStockByItemId: Record<string, number>,
): CategoryItemsMap => {
  const clonedItems = cloneCategoryItems(baseCategoryItems);

  for (const categoryId of Object.keys(clonedItems) as CategoryId[]) {
    clonedItems[categoryId] = clonedItems[categoryId].map((item) => ({
      ...item,
      stock: Math.max(categoryStockByItemId[item.equipId] ?? item.stock, 0),
    }));
  }

  return clonedItems;
};

const createBookingNotifications = (
  bookings: AdminBooking[],
  persistedNotifications: AdminNotification[] = [],
): AdminNotification[] => {
  const persistedReadState = new Map(
    persistedNotifications.map((notification) => [notification.id, notification.isRead]),
  );

  return bookings
    .filter((booking) => booking.status === 'รออนุมัติ')
    .map((booking) => {
      const id = `booking-${booking.id}`;

      return {
        id,
        bookingId: booking.id,
        title: 'มีคำขอจองใหม่',
        desc: `${booking.user} จอง ${booking.itemName}`,
        time: booking.time.replace(' น.', ''),
        isRead: persistedReadState.get(id) ?? false,
      };
    });
};

const createBootstrapSnapshot = (): AppDataSnapshot => ({
  adminBookings: initialAdminBookings.map((booking) => ({ ...booking })),
  adminNotifications: [],
  categoryItems: cloneCategoryItems(seedCategoryItems),
});

const clearLegacySnapshots = () => {
  if (typeof window === 'undefined') {
    return;
  }

  for (const key of LEGACY_APP_DATA_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
};

const readPersistedSnapshot = (): PersistedAppDataSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(APP_DATA_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedAppDataSnapshot>;

    if (
      parsedValue.version !== 3 ||
      !Array.isArray(parsedValue.adminBookings) ||
      !Array.isArray(parsedValue.adminNotifications) ||
      typeof parsedValue.categoryStockByItemId !== 'object' ||
      parsedValue.categoryStockByItemId === null
    ) {
      return null;
    }

    return {
      version: 3,
      adminBookings: parsedValue.adminBookings.map((booking) => ({ ...booking })),
      adminNotifications: parsedValue.adminNotifications.map((notification) => ({
        ...notification,
      })),
      categoryStockByItemId: {
        ...(parsedValue.categoryStockByItemId as Record<string, number>),
      },
    };
  } catch {
    return null;
  }
};

const persistSnapshot = (snapshot: AppDataSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  clearLegacySnapshots();

  const payload: PersistedAppDataSnapshot = {
    version: 3,
    adminBookings: snapshot.adminBookings.map((booking) => ({ ...booking })),
    adminNotifications: snapshot.adminNotifications.map((notification) => ({
      ...notification,
    })),
    categoryStockByItemId: createCategoryStockByItemId(snapshot.categoryItems),
  };

  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(payload));
};

const buildRemoteBackedSnapshot = async (): Promise<AppDataSnapshot> => {
  const persistedSnapshot = readPersistedSnapshot();
  const [categoryItemsResult, contactNotificationsResult, bookingRequestsResult] =
    await Promise.allSettled([
      fetchCategoryItemsFromApi(),
      fetchContactNotifications(),
      fetchBookingRequests(),
    ]);

  if (categoryItemsResult.status === 'rejected') {
    console.error(
      'Failed to load category items from API. Falling back to local seed data.',
      categoryItemsResult.reason,
    );
  }

  if (contactNotificationsResult.status === 'rejected') {
    console.error(
      'Failed to load contact notifications from API. Falling back to persisted notifications.',
      contactNotificationsResult.reason,
    );
  }

  if (bookingRequestsResult.status === 'rejected') {
    console.error(
      'Failed to load booking requests from API. Falling back to persisted bookings.',
      bookingRequestsResult.reason,
    );
  }

  const remoteCategoryItems =
    categoryItemsResult.status === 'fulfilled'
      ? categoryItemsResult.value
      : cloneCategoryItems(seedCategoryItems);
  const remoteContactNotifications =
    contactNotificationsResult.status === 'fulfilled'
      ? contactNotificationsResult.value
      : [];
  const remoteAdminBookings =
    bookingRequestsResult.status === 'fulfilled'
      ? bookingRequestsResult.value
      : persistedSnapshot?.adminBookings ?? initialAdminBookings.map((booking) => ({ ...booking }));
  const persistedNotifications = persistedSnapshot?.adminNotifications ?? [];
  const bookingNotifications = createBookingNotifications(
    remoteAdminBookings,
    persistedNotifications,
  );

  if (!persistedSnapshot) {
    return {
      adminBookings: remoteAdminBookings,
      adminNotifications: mergeAdminNotifications(
        remoteContactNotifications,
        bookingNotifications,
      ),
      categoryItems: remoteCategoryItems,
    };
  }

  return {
    adminBookings: remoteAdminBookings,
    adminNotifications: mergeAdminNotifications(
      remoteContactNotifications,
      bookingNotifications,
      persistedNotifications,
    ),
    categoryItems: createCategoryItemsFromPersistedStock(
      remoteCategoryItems,
      persistedSnapshot.categoryStockByItemId,
    ),
  };
};

const createPersistentAppDataStore = (): AppDataStore => {
  let currentSnapshot = createBootstrapSnapshot();

  return {
    requiresHydration: true,
    getBootstrapSnapshot: () => cloneSnapshot(currentSnapshot),
    loadSnapshot: async () => {
      try {
        currentSnapshot = await buildRemoteBackedSnapshot();
      } catch (error) {
        console.error('Failed to hydrate app data from API.', error);

        const persistedSnapshot = readPersistedSnapshot();
        if (persistedSnapshot) {
          currentSnapshot = {
            adminBookings: persistedSnapshot.adminBookings.map((booking) => ({ ...booking })),
            adminNotifications: persistedSnapshot.adminNotifications.map((notification) => ({
              ...notification,
            })),
            categoryItems: createCategoryItemsFromPersistedStock(
              cloneCategoryItems(seedCategoryItems),
              persistedSnapshot.categoryStockByItemId,
            ),
          };
        }
      }

      return cloneSnapshot(currentSnapshot);
    },
    saveSnapshot: async (snapshot) => {
      currentSnapshot = cloneSnapshot(snapshot);
      persistSnapshot(currentSnapshot);
    },
    resetSnapshot: async () => {
      currentSnapshot = await buildRemoteBackedSnapshot().catch(() => createBootstrapSnapshot());
      persistSnapshot(currentSnapshot);
      return cloneSnapshot(currentSnapshot);
    },
  };
};

export const appDataStore = createPersistentAppDataStore();
