import { initialAdminBookings } from '../data/adminBookings';
import { categoryItems as seedCategoryItems } from '../data/categoryItems';
import type {
  AdminBooking,
  AdminNotification,
  AppDataSnapshot,
  CategoryId,
  CategoryItemsMap,
} from '../types';
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
  version: 2;
  adminBookings: AdminBooking[];
  adminNotifications: AdminNotification[];
  categoryStockByItemId: Record<string, number>;
};

export const APP_DATA_STORAGE_KEY = 'systemhub-app-data-v2';

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

const createBootstrapSnapshot = (): AppDataSnapshot => ({
  adminBookings: initialAdminBookings.map((booking) => ({ ...booking })),
  adminNotifications: [],
  categoryItems: cloneCategoryItems(seedCategoryItems),
});

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
      parsedValue.version !== 2 ||
      !Array.isArray(parsedValue.adminBookings) ||
      !Array.isArray(parsedValue.adminNotifications) ||
      typeof parsedValue.categoryStockByItemId !== 'object' ||
      parsedValue.categoryStockByItemId === null
    ) {
      return null;
    }

    return {
      version: 2,
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

  const payload: PersistedAppDataSnapshot = {
    version: 2,
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
  const [categoryItemsResult, contactNotificationsResult] = await Promise.allSettled([
    fetchCategoryItemsFromApi(),
    fetchContactNotifications(),
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

  const remoteCategoryItems =
    categoryItemsResult.status === 'fulfilled'
      ? categoryItemsResult.value
      : cloneCategoryItems(seedCategoryItems);
  const remoteContactNotifications =
    contactNotificationsResult.status === 'fulfilled'
      ? contactNotificationsResult.value
      : [];

  if (!persistedSnapshot) {
    return {
      adminBookings: initialAdminBookings.map((booking) => ({ ...booking })),
      adminNotifications: remoteContactNotifications,
      categoryItems: remoteCategoryItems,
    };
  }

  return {
    adminBookings: persistedSnapshot.adminBookings.map((booking) => ({ ...booking })),
    adminNotifications: mergeAdminNotifications(
      remoteContactNotifications,
      persistedSnapshot.adminNotifications,
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
