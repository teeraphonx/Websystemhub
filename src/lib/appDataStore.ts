import { initialAdminBookings } from '../data/adminBookings';
import { categoryItems as seedCategoryItems } from '../data/categoryItems';
import type {
  AdminBooking,
  AdminNotification,
  AppDataSnapshot,
  CategoryId,
  CategoryItemsMap,
} from '../types';

export interface AppDataStore {
  requiresHydration: boolean;
  getBootstrapSnapshot: () => AppDataSnapshot;
  loadSnapshot: () => Promise<AppDataSnapshot>;
  saveSnapshot: (snapshot: AppDataSnapshot) => Promise<void>;
  resetSnapshot: () => Promise<AppDataSnapshot>;
}

type PersistedAppDataSnapshot = {
  version: 1;
  adminBookings: AdminBooking[];
  adminNotifications: AdminNotification[];
  categoryStockByItemId: Record<string, number>;
};

export const APP_DATA_STORAGE_KEY = 'systemhub-app-data-v1';

const cloneCategoryItems = (categoryItems: CategoryItemsMap): CategoryItemsMap =>
  Object.fromEntries(
    (Object.entries(categoryItems) as [CategoryId, CategoryItemsMap[CategoryId]][]).map(
      ([categoryId, items]) => [
        categoryId,
        items.map((item) => ({ ...item })),
      ],
    ),
  ) as CategoryItemsMap;

const cloneSnapshot = (snapshot: AppDataSnapshot): AppDataSnapshot => ({
  adminBookings: snapshot.adminBookings.map((booking) => ({ ...booking })),
  adminNotifications: snapshot.adminNotifications.map((notification) => ({
    ...notification,
  })),
  categoryItems: cloneCategoryItems(snapshot.categoryItems),
});

const createSeedCategoryItems = (): CategoryItemsMap => {
  const clonedItems = cloneCategoryItems(seedCategoryItems);

  initialAdminBookings.forEach((booking) => {
    if (booking.status === 'ไม่อนุมัติ') {
      return;
    }

    for (const categoryId of Object.keys(clonedItems) as CategoryId[]) {
      const matchedItem = clonedItems[categoryId].find(
        (item) => item.equipId === booking.itemId,
      );

      if (!matchedItem) {
        continue;
      }

      matchedItem.stock = Math.max(
        matchedItem.stock - booking.availableQuantity,
        0,
      );
      break;
    }
  });

  return clonedItems;
};

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
  categoryStockByItemId: Record<string, number>,
): CategoryItemsMap => {
  const clonedItems = cloneCategoryItems(seedCategoryItems);

  for (const categoryId of Object.keys(clonedItems) as CategoryId[]) {
    clonedItems[categoryId] = clonedItems[categoryId].map((item) => ({
      ...item,
      stock: Math.max(categoryStockByItemId[item.equipId] ?? item.stock, 0),
    }));
  }

  return clonedItems;
};

export const createSeedAppDataSnapshot = (): AppDataSnapshot => ({
  adminBookings: initialAdminBookings.map((booking) => ({ ...booking })),
  adminNotifications: [],
  categoryItems: createSeedCategoryItems(),
});

const readPersistedSnapshot = (): AppDataSnapshot | null => {
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
      parsedValue.version !== 1 ||
      !Array.isArray(parsedValue.adminBookings) ||
      !Array.isArray(parsedValue.adminNotifications) ||
      typeof parsedValue.categoryStockByItemId !== 'object' ||
      parsedValue.categoryStockByItemId === null
    ) {
      return null;
    }

    return {
      adminBookings: parsedValue.adminBookings.map((booking) => ({ ...booking })),
      adminNotifications: parsedValue.adminNotifications.map((notification) => ({
        ...notification,
      })),
      categoryItems: createCategoryItemsFromPersistedStock(
        parsedValue.categoryStockByItemId as Record<string, number>,
      ),
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
    version: 1,
    adminBookings: snapshot.adminBookings.map((booking) => ({ ...booking })),
    adminNotifications: snapshot.adminNotifications.map((notification) => ({
      ...notification,
    })),
    categoryStockByItemId: createCategoryStockByItemId(snapshot.categoryItems),
  };

  window.localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(payload));
};

const createPersistentAppDataStore = (): AppDataStore => {
  let currentSnapshot = readPersistedSnapshot() ?? createSeedAppDataSnapshot();

  return {
    requiresHydration: false,
    getBootstrapSnapshot: () => {
      currentSnapshot = readPersistedSnapshot() ?? currentSnapshot;
      return cloneSnapshot(currentSnapshot);
    },
    loadSnapshot: async () => {
      currentSnapshot = readPersistedSnapshot() ?? currentSnapshot;
      return cloneSnapshot(currentSnapshot);
    },
    saveSnapshot: async (snapshot) => {
      currentSnapshot = cloneSnapshot(snapshot);
      persistSnapshot(currentSnapshot);
    },
    resetSnapshot: async () => {
      currentSnapshot = createSeedAppDataSnapshot();
      persistSnapshot(currentSnapshot);
      return cloneSnapshot(currentSnapshot);
    },
  };
};

// Swap this store with a Firebase/Firestore-backed adapter later.
export const appDataStore = createPersistentAppDataStore();
