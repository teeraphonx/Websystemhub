import { initialAdminBookings } from '../data/adminBookings';
import { categoryItems as seedCategoryItems } from '../data/categoryItems';
import type {
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
    if (booking.status !== 'อนุมัติแล้ว') {
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

export const createSeedAppDataSnapshot = (): AppDataSnapshot => ({
  adminBookings: initialAdminBookings.map((booking) => ({ ...booking })),
  adminNotifications: [],
  categoryItems: createSeedCategoryItems(),
});

const createInMemoryAppDataStore = (): AppDataStore => {
  let currentSnapshot = createSeedAppDataSnapshot();

  return {
    requiresHydration: false,
    getBootstrapSnapshot: () => cloneSnapshot(currentSnapshot),
    loadSnapshot: async () => cloneSnapshot(currentSnapshot),
    saveSnapshot: async (snapshot) => {
      currentSnapshot = cloneSnapshot(snapshot);
    },
    resetSnapshot: async () => {
      currentSnapshot = createSeedAppDataSnapshot();
      return cloneSnapshot(currentSnapshot);
    },
  };
};

// Swap this store with a Firebase/Firestore-backed adapter later.
export const appDataStore = createInMemoryAppDataStore();