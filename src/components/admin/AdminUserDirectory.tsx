import {
  Activity,
  AlertTriangle,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCircle,
  UserX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  deleteUserDirectoryEntry,
  type UserProfileRecord,
} from '../../lib/firebase';
import {
  getDirectoryIdentityKeys,
  isBookingFallbackDirectoryUser,
  persistDismissedBookingDirectoryUserKeys,
  persistHiddenDirectoryUserKeys,
  readDismissedBookingDirectoryUserKeys,
  readHiddenDirectoryUserKeys,
} from '../../utils/adminUserDirectory';
import {
  pruneUserActivityIdentityRegistry,
  readUserActivityIdentityRegistry,
  type UserActivityIdentityRegistry,
} from '../../utils/userActivityPresence';

interface AdminUserDirectoryProps {
  users: UserProfileRecord[];
  searchValue: string;
  isLoading: boolean;
  errorMessage: string;
  onHiddenUsersChange: (hiddenKeys: Set<string>) => void;
  onDismissedBookingUsersChange: (dismissedKeys: Set<string>) => void;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void> | void;
  onClose: () => void;
}

type UserActivityFilter = 'all' | 'active' | 'inactive';

const USER_ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const USER_ACTIVITY_CLOCK_INTERVAL_MS = 30000;

const ORGANIZATION_STATUS_META = {
  verified: {
    label: 'ยืนยันแล้ว',
    className: 'systemhub-status-pill--success',
  },
  pending: {
    label: 'รอยืนยัน',
    className: 'systemhub-status-pill--pending',
  },
  rejected: {
    label: 'ไม่ผ่าน',
    className: 'systemhub-status-pill--danger',
  },
} satisfies Record<
  UserProfileRecord['organizationStatus'],
  { label: string; className: string }
>;

const getDisplayName = (user: UserProfileRecord) =>
  user.fullName || user.username || user.email || 'ผู้ใช้งานระบบ';

const getAvatarLabel = (user: UserProfileRecord) =>
  getDisplayName(user).trim().slice(0, 2).toUpperCase() || 'U';

const getProfileIdentityLabel = (user: UserProfileRecord) =>
  user.fullName?.trim() ||
  (user.organizationVerificationRequestStatus === 'pending' &&
  user.organizationVerificationRequestedAt
    ? 'ส่งรูปบัตรแล้ว รอตรวจสอบ'
    : user.username?.trim() || user.email?.trim() || 'ยังไม่ระบุชื่อจริง');

const getProfileMetaLabels = (user: UserProfileRecord) =>
  [
    user.organizationDivision.trim() || 'ยังไม่ระบุกองกำกับการ',
    user.organizationUnit.trim(),
    user.officerId.trim(),
  ].filter(Boolean);

const formatActivityTime = (timestamp: number | undefined, now: number) => {
  if (!timestamp) {
    return 'ยังไม่มีข้อมูลกิจกรรม';
  }

  if (now <= 0) {
    return 'กำลังอัปเดต';
  }

  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));

  if (diffMinutes < 1) {
    return 'เมื่อสักครู่';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} ชม.ที่แล้ว`;
  }

  return new Date(timestamp).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeActivityTimestamp = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const readRecentLocalActivityRegistry = (now: number) =>
  pruneUserActivityIdentityRegistry(
    readUserActivityIdentityRegistry(),
    USER_ACTIVE_WINDOW_MS,
    now,
  );

const getLatestLocalActivityAt = (
  user: UserProfileRecord,
  localActivityRegistry: UserActivityIdentityRegistry,
) =>
  getDirectoryIdentityKeys(user).reduce((latestSeenAt, key) => {
    const activityEntry = localActivityRegistry[key];
    return Math.max(latestSeenAt, activityEntry?.lastSeenAt ?? 0);
  }, 0);

const getLatestKnownActiveAt = (user: UserProfileRecord) =>
  Math.max(
    normalizeActivityTimestamp(user.lastActiveAt),
    normalizeActivityTimestamp(user.activityUpdatedAt),
  );

const getLatestKnownInactiveAt = (user: UserProfileRecord) =>
  normalizeActivityTimestamp(user.lastInactiveAt);

const isUserCurrentlyActive = (
  user: UserProfileRecord,
  now: number,
  localActivityRegistry: UserActivityIdentityRegistry,
) => {
  const latestActiveAt = getLatestKnownActiveAt(user);
  const latestInactiveAt = getLatestKnownInactiveAt(user);
  const latestLocalActivityAt = getLatestLocalActivityAt(
    user,
    localActivityRegistry,
  );

  if (now <= 0) {
    return false;
  }

  if (
    latestLocalActivityAt > 0 &&
    now - latestLocalActivityAt <= USER_ACTIVE_WINDOW_MS
  ) {
    return true;
  }

  if (latestActiveAt <= 0) {
    return false;
  }

  if (now - latestActiveAt > USER_ACTIVE_WINDOW_MS) {
    return false;
  }

  if (user.isActive === false && latestInactiveAt >= latestActiveAt) {
    return false;
  }

  return true;
};

const getActivityMeta = (
  user: UserProfileRecord,
  now: number,
  localActivityRegistry: UserActivityIdentityRegistry,
) => {
  const latestLocalActivityAt = getLatestLocalActivityAt(
    user,
    localActivityRegistry,
  );
  const isActive = isUserCurrentlyActive(user, now, localActivityRegistry);
  const latestActiveAt = getLatestKnownActiveAt(user);
  const latestInactiveAt = getLatestKnownInactiveAt(user);
  const lastActivityAt = isActive
    ? Math.max(latestActiveAt, latestLocalActivityAt)
    : Math.max(latestInactiveAt, latestActiveAt, latestLocalActivityAt);

  return {
    isActive,
    label: isActive ? 'ใช้งานอยู่' : 'ไม่ใช้งาน',
    detail: isActive
      ? `อัปเดต ${formatActivityTime(lastActivityAt, now)}`
      : `ล่าสุด ${formatActivityTime(lastActivityAt, now)}`,
    className: isActive
      ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.12)] text-[var(--systemhub-success-strong)]'
      : 'border-[rgba(107,114,128,0.35)] bg-[rgba(75,85,99,0.14)] text-gray-300',
    Icon: isActive ? UserCheck : UserX,
  };
};

const getStatusMeta = (user: UserProfileRecord) => {
  if (user.organizationVerificationRequestStatus === 'pending') {
    return {
      label: 'รอตรวจสอบ',
      className: 'systemhub-status-pill--pending',
    };
  }

  return ORGANIZATION_STATUS_META[user.organizationStatus];
};

export default function AdminUserDirectory({
  users,
  searchValue,
  isLoading,
  errorMessage,
  onHiddenUsersChange,
  onDismissedBookingUsersChange,
  onSearchChange,
  onRefresh,
  onClose,
}: AdminUserDirectoryProps) {
  const [activityFilter, setActivityFilter] =
    useState<UserActivityFilter>('all');
  const [activityNow, setActivityNow] = useState(0);
  const [hiddenUserKeys, setHiddenUserKeys] = useState<Set<string>>(
    readHiddenDirectoryUserKeys,
  );
  const [dismissedBookingUserKeys, setDismissedBookingUserKeys] = useState<
    Set<string>
  >(readDismissedBookingDirectoryUserKeys);
  const [localActivityRegistry, setLocalActivityRegistry] =
    useState<UserActivityIdentityRegistry>(() =>
      readRecentLocalActivityRegistry(Date.now()),
    );
  const [deletingUserIdentity, setDeletingUserIdentity] = useState('');
  const [directoryActionError, setDirectoryActionError] = useState('');
  const [directoryActionMessage, setDirectoryActionMessage] = useState('');
  const normalizedSearch = searchValue.trim().toLowerCase();

  useEffect(() => {
    const updateActivityNow = () => {
      const now = Date.now();
      setActivityNow(now);
      setLocalActivityRegistry(readRecentLocalActivityRegistry(now));
    };

    updateActivityNow();

    const intervalId = window.setInterval(
      updateActivityNow,
      USER_ACTIVITY_CLOCK_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncLocalActivityRegistry = () => {
      setLocalActivityRegistry(readRecentLocalActivityRegistry(Date.now()));
    };

    window.addEventListener('storage', syncLocalActivityRegistry);

    return () =>
      window.removeEventListener('storage', syncLocalActivityRegistry);
  }, []);

  useEffect(() => {
    onHiddenUsersChange(new Set(hiddenUserKeys));
  }, [hiddenUserKeys, onHiddenUsersChange]);

  useEffect(() => {
    onDismissedBookingUsersChange(new Set(dismissedBookingUserKeys));
  }, [dismissedBookingUserKeys, onDismissedBookingUsersChange]);

  const userRows = useMemo(
    () =>
      users
        .filter((user) => {
          if (!isBookingFallbackDirectoryUser(user)) {
            return true;
          }

          return !getDirectoryIdentityKeys(user).some((key) =>
            dismissedBookingUserKeys.has(key),
          );
        })
        .map((user) => ({
          user,
          organizationStatusMeta: getStatusMeta(user),
          activityMeta: getActivityMeta(user, activityNow, localActivityRegistry),
        })),
    [activityNow, dismissedBookingUserKeys, localActivityRegistry, users],
  );
  const visibleUserRows = useMemo(
    () =>
      userRows.filter(
        ({ user }) =>
          !getDirectoryIdentityKeys(user).some((key) => hiddenUserKeys.has(key)),
      ),
    [hiddenUserKeys, userRows],
  );
  const hiddenUserCount = userRows.length - visibleUserRows.length;
  const activeUserCount = visibleUserRows.filter(
    (row) => row.activityMeta.isActive,
  ).length;
  const inactiveUserCount = visibleUserRows.length - activeUserCount;
  const filteredUsers = visibleUserRows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        row.user.username,
        row.user.email,
        row.user.fullName,
        row.user.officerId,
        row.user.organizationUnit,
        row.user.organizationDivision,
        row.organizationStatusMeta.label,
        row.activityMeta.label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesActivityFilter =
      activityFilter === 'all' ||
      (activityFilter === 'active' && row.activityMeta.isActive) ||
      (activityFilter === 'inactive' && !row.activityMeta.isActive);

    return matchesSearch && matchesActivityFilter;
  });
  const activityFilterOptions = [
    {
      id: 'all' as const,
      label: 'ทั้งหมด',
      count: visibleUserRows.length,
    },
    {
      id: 'active' as const,
      label: 'ใช้งานอยู่',
      count: activeUserCount,
    },
    {
      id: 'inactive' as const,
      label: 'ไม่ใช้งาน',
      count: inactiveUserCount,
    },
  ];

  const handleDeleteUser = async (user: UserProfileRecord) => {
    const identityKeys = getDirectoryIdentityKeys(user);
    const primaryIdentity = identityKeys[0] ?? user.uid;

    if (!primaryIdentity || deletingUserIdentity) {
      return;
    }

    const displayName = getDisplayName(user);
    const shouldDelete = window.confirm(
      isBookingFallbackDirectoryUser(user)
        ? `ต้องการลบ "${displayName}" ใช่หรือไม่\n\nระบบจะนำรายการนี้ออกจากรายชื่อผู้ใช้ของแอดมินทันที โดยไม่กระทบข้อมูลการจองเดิม และจะไม่ย้ายไปอยู่ในรายการซ่อน`
        : `ต้องการลบ "${displayName}" ใช่หรือไม่\n\nระบบจะลบข้อมูลโปรไฟล์ผู้ใช้ออกจาก Firestore และนำออกจากรายชื่อหน้านี้`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingUserIdentity(primaryIdentity);
    setDirectoryActionError('');
    setDirectoryActionMessage('');

    try {
      setHiddenUserKeys((currentHiddenKeys) => {
        const nextHiddenKeys = new Set(currentHiddenKeys);
        let hasChanges = false;

        identityKeys.forEach((key) => {
          if (nextHiddenKeys.delete(key)) {
            hasChanges = true;
          }
        });

        if (hasChanges) {
          persistHiddenDirectoryUserKeys(nextHiddenKeys);
          return nextHiddenKeys;
        }

        return currentHiddenKeys;
      });
      setDismissedBookingUserKeys((currentDismissedKeys) => {
        const nextDismissedKeys = new Set(currentDismissedKeys);
        let hasChanges = false;

        identityKeys.forEach((key) => {
          if (!nextDismissedKeys.has(key)) {
            nextDismissedKeys.add(key);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          persistDismissedBookingDirectoryUserKeys(nextDismissedKeys);
          return nextDismissedKeys;
        }

        return currentDismissedKeys;
      });

      if (!isBookingFallbackDirectoryUser(user)) {
        await deleteUserDirectoryEntry(user);
      }

      setDirectoryActionMessage(
        isBookingFallbackDirectoryUser(user)
          ? `นำ "${displayName}" ออกจากรายชื่อผู้ใช้เรียบร้อยแล้ว`
          : `ลบ "${displayName}" ออกจากระบบเรียบร้อยแล้ว`,
      );

      if (!isBookingFallbackDirectoryUser(user)) {
        await Promise.resolve(onRefresh());
      }
    } catch (error) {
      setDirectoryActionError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'ไม่สามารถลบผู้ใช้ออกจากรายชื่อได้ กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setDeletingUserIdentity('');
    }
  };

  const handleRestoreHiddenUsers = () => {
    const nextHiddenKeys = new Set<string>();
    persistHiddenDirectoryUserKeys(nextHiddenKeys);
    setHiddenUserKeys(nextHiddenKeys);
    setDirectoryActionError('');
    setDirectoryActionMessage('นำผู้ใช้งานที่ซ่อนกลับมาแสดงทั้งหมดแล้ว');
  };

  return (
    <div className="systemhub-admin-panel mb-6 overflow-hidden">
      <div className="systemhub-admin-panel-header flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center md:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-[16px] font-black uppercase tracking-widest text-white">
            <UserCircle size={18} className="text-[var(--systemhub-accent)]" />
            รายชื่อผู้ใช้งาน
          </h3>
          <p className="mt-1 text-[11px] font-bold tracking-widest text-gray-500">
            ทั้งหมด {userRows.length.toLocaleString()} คน · แสดง{' '}
            {visibleUserRows.length.toLocaleString()} · ใช้งานอยู่{' '}
            {activeUserCount.toLocaleString()} · ไม่ใช้งาน{' '}
            {inactiveUserCount.toLocaleString()}
            {hiddenUserCount > 0
              ? ` · ซ่อนอยู่ ${hiddenUserCount.toLocaleString()}`
              : ''}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          {hiddenUserCount > 0 && (
            <button
              type="button"
              onClick={handleRestoreHiddenUsers}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[rgba(96,165,250,0.28)] bg-[rgba(37,99,235,0.12)] px-4 py-2 text-[11px] font-black tracking-[0.14em] text-[var(--systemhub-accent)] transition-colors hover:bg-[rgba(37,99,235,0.2)] hover:text-white"
            >
              <RefreshCw size={14} />
              แสดงผู้ใช้ที่ซ่อน
            </button>
          )}

          <div className="systemhub-admin-input-shell flex rounded-xl p-1">
            {activityFilterOptions.map((option) => {
              const isSelected = activityFilter === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActivityFilter(option.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black tracking-wider transition-colors ${
                    isSelected
                      ? 'bg-[var(--systemhub-primary)] text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {option.id === 'all' && <Activity size={12} />}
                  {option.id === 'active' && <UserCheck size={12} />}
                  {option.id === 'inactive' && <UserX size={12} />}
                  <span>{option.label}</span>
                  <span className="tabular-nums">{option.count}</span>
                </button>
              );
            })}
          </div>

          <div className="systemhub-admin-input-shell flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 md:w-72">
            <Search size={14} className="shrink-0 text-gray-500" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ค้นหาผู้ใช้..."
              className="systemhub-admin-search-input min-w-0 text-[12px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="systemhub-action-icon text-[var(--systemhub-accent)] hover:border-[rgba(96,165,250,0.45)] hover:bg-[rgba(37,99,235,0.18)] hover:text-white disabled:cursor-wait disabled:opacity-60"
              title="รีเฟรช"
              aria-label="รีเฟรชรายชื่อผู้ใช้"
            >
              <RefreshCw
                size={15}
                className={isLoading ? 'animate-spin' : ''}
              />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="systemhub-action-icon systemhub-action-icon--danger"
              title="ปิด"
              aria-label="ปิดรายชื่อผู้ใช้"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      {directoryActionError && (
        <div className="flex items-start gap-3 border-b border-[rgba(239,68,68,0.2)] bg-[rgba(60,10,18,0.35)] px-6 py-4 text-[12px] font-bold text-[var(--systemhub-danger-strong)]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{directoryActionError}</p>
        </div>
      )}

      {directoryActionMessage && (
        <div className="border-b border-[rgba(34,197,94,0.18)] bg-[rgba(6,27,17,0.45)] px-6 py-4 text-[12px] font-bold text-[#86efac]">
          {directoryActionMessage}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="systemhub-admin-table-head grid grid-cols-12 gap-4 px-6 py-4 text-[11px] font-black uppercase tracking-widest">
            <div className="col-span-2">ชื่อผู้ใช้</div>
            <div className="col-span-3">อีเมล</div>
            <div className="col-span-2">ชื่อ-นามสกุล / หน่วย</div>
            <div className="col-span-2 text-center">การใช้งาน</div>
            <div className="col-span-2 text-center">ยืนยันตัวตน</div>
            <div className="col-span-1 text-right">ลบ</div>
          </div>

          <div className="systemhub-admin-table-body divide-y">
            {isLoading && users.length === 0 ? (
              <div className="systemhub-admin-empty-state flex items-center justify-center gap-3 py-12 text-center text-[13px] font-bold tracking-widest">
                <RefreshCw size={20} className="animate-spin opacity-60" />
                กำลังโหลดรายชื่อผู้ใช้
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(({ user, organizationStatusMeta, activityMeta }) => {
                const ActivityIcon = activityMeta.Icon;
                const profileMetaLabels = getProfileMetaLabels(user);
                const isDeletingCurrentUser =
                  deletingUserIdentity ===
                  (getDirectoryIdentityKeys(user)[0] ?? user.uid);

                return (
                  <div
                    key={user.uid || user.email || user.username}
                    className="systemhub-admin-table-row grid grid-cols-12 items-center gap-4 px-6 py-4"
                  >
                    <div className="col-span-2 flex min-w-0 items-center gap-3">
                      <div className="systemhub-admin-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white">
                        {getAvatarLabel(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black text-white">
                          {user.username || 'ไม่ระบุชื่อผู้ใช้'}
                        </p>
                        <p className="truncate text-[10px] font-bold text-gray-500">
                          UID {user.uid || 'ไม่ระบุ'}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-3 flex min-w-0 items-center gap-2 text-[12px] font-bold text-gray-300">
                      <Mail
                        size={14}
                        className="shrink-0 text-[var(--systemhub-accent)]"
                      />
                      <span className="truncate">
                        {user.email || 'ยังไม่มีอีเมล'}
                      </span>
                    </div>

                    <div className="col-span-2 min-w-0">
                      <p className="truncate text-[13px] font-bold text-gray-200">
                        {getProfileIdentityLabel(user)}
                      </p>
                      {profileMetaLabels.length > 0 && (
                        <p className="mt-1 truncate text-[10px] font-bold text-gray-500">
                          {profileMetaLabels.join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`systemhub-status-pill px-3 py-1 text-[10px] tracking-widest ${activityMeta.className}`}
                        >
                          <ActivityIcon size={12} className="mr-1 inline-block" />
                          {activityMeta.label}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500">
                          {activityMeta.detail}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <span
                        className={`systemhub-status-pill px-3 py-1 text-[10px] tracking-widest ${organizationStatusMeta.className}`}
                      >
                        <ShieldCheck size={12} className="mr-1 inline-block" />
                        {organizationStatusMeta.label}
                      </span>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(user)}
                        disabled={Boolean(deletingUserIdentity)}
                        className={`inline-flex min-w-[72px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                          deletingUserIdentity
                            ? 'cursor-not-allowed border-[rgba(71,85,105,0.45)] bg-[rgba(30,41,59,0.72)] text-gray-500'
                            : 'border-[rgba(239,68,68,0.3)] bg-[rgba(127,29,29,0.2)] text-[#fda4af] hover:bg-[rgba(127,29,29,0.35)] hover:text-white'
                        }`}
                        title={
                          isBookingFallbackDirectoryUser(user)
                            ? `นำ ${getDisplayName(user)} ออกจากรายชื่อผู้ใช้`
                            : `ลบ ${getDisplayName(user)}`
                        }
                        aria-label={
                          isBookingFallbackDirectoryUser(user)
                            ? `นำ ${getDisplayName(user)} ออกจากรายชื่อผู้ใช้`
                            : `ลบ ${getDisplayName(user)}`
                        }
                      >
                        <Trash2 size={12} />
                        {isDeletingCurrentUser ? 'กำลังลบ' : 'ลบ'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="systemhub-admin-empty-state flex flex-col items-center gap-3 py-12 text-center text-[13px] font-bold tracking-widest">
                <UserCircle size={30} className="opacity-50" />
                <p>
                  {errorMessage
                    ? errorMessage
                    : 'ไม่พบผู้ใช้ที่ตรงกับตัวกรอง'}
                </p>
                {!errorMessage && hiddenUserCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreHiddenUsers}
                    className="inline-flex items-center gap-2 rounded-xl border border-[rgba(96,165,250,0.28)] bg-[rgba(37,99,235,0.12)] px-4 py-2 text-[11px] font-black tracking-[0.14em] text-[var(--systemhub-accent)] transition-colors hover:bg-[rgba(37,99,235,0.2)] hover:text-white"
                  >
                    <RefreshCw size={14} />
                    แสดงผู้ใช้ที่ซ่อนทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
