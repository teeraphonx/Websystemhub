import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Clock3,
  ExternalLink,
  IdCard,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  fetchPendingOrganizationVerificationRequests,
  rejectOrganizationVerificationRequest,
  verifyUserOrganizationProfile,
  type OrganizationVerificationRequestRecord,
} from '../../lib/firebase';

interface AdminVerificationRequestsPanelProps {
  onRequestHandled?: () => Promise<void> | void;
}

const formatDateTime = (timestamp: number) => {
  if (!timestamp) {
    return 'ไม่ทราบเวลา';
  }

  return new Date(timestamp).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return 'ไม่ระบุขนาดไฟล์';
  }

  if (size < 1024 * 1024) {
    return `${Math.max(size / 1024, 0.1).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as { code?: unknown; message?: unknown };
    const errorCode =
      typeof errorRecord.code === 'string' ? errorRecord.code.trim() : '';
    const errorMessage =
      typeof errorRecord.message === 'string' ? errorRecord.message.trim() : '';

    if (
      errorCode === 'permission-denied' ||
      errorCode === 'firestore/permission-denied' ||
      errorMessage.includes('Missing or insufficient permissions')
    ) {
      return 'บัญชีแอดมินนี้ยังไม่มีสิทธิ์เข้าถึงข้อมูลคำขอยืนยันตัวตนใน Firestore';
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const getDisplayName = (request: OrganizationVerificationRequestRecord) =>
  request.username.trim() || request.email.trim() || request.uid;

export default function AdminVerificationRequestsPanel({
  onRequestHandled,
}: AdminVerificationRequestsPanelProps) {
  const [requests, setRequests] = useState<OrganizationVerificationRequestRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [pendingActionKey, setPendingActionKey] = useState('');

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextRequests = await fetchPendingOrganizationVerificationRequests();
      setRequests(nextRequests);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'ไม่สามารถโหลดคำขอยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const runAfterAction = useCallback(async () => {
    await loadRequests();

    if (!onRequestHandled) {
      return;
    }

    try {
      await Promise.resolve(onRequestHandled());
    } catch (error) {
      console.error(
        'Failed to refresh dependent admin data after verification action.',
        error,
      );
    }
  }, [loadRequests, onRequestHandled]);

  const handleApproveRequest = async (
    request: OrganizationVerificationRequestRecord,
  ) => {
    if (pendingActionKey) {
      return;
    }

    const displayName = getDisplayName(request);
    const shouldApprove = window.confirm(
      `ต้องการอนุมัติคำขอยืนยันตัวตนของ "${displayName}" ใช่หรือไม่\n\nระบบจะตรวจสอบอีเมลนี้กับรายชื่อ บก.สอท.1 และเปิดสิทธิ์จองครุภัณฑ์ให้ทันที`,
    );

    if (!shouldApprove) {
      return;
    }

    setPendingActionKey(`approve:${request.uid}`);
    setErrorMessage('');
    setActionMessage('');

    try {
      await verifyUserOrganizationProfile({
        uid: request.uid,
        email: request.email,
      });
      await runAfterAction();
      setActionMessage(`อนุมัติ "${displayName}" เรียบร้อยแล้ว`);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'ไม่สามารถอนุมัติคำขอยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
    } finally {
      setPendingActionKey('');
    }
  };

  const handleRejectRequest = async (
    request: OrganizationVerificationRequestRecord,
  ) => {
    if (pendingActionKey) {
      return;
    }

    const displayName = getDisplayName(request);
    const shouldReject = window.confirm(
      `ต้องการปฏิเสธคำขอยืนยันตัวตนของ "${displayName}" ใช่หรือไม่\n\nผู้ใช้จะยังไม่สามารถจองครุภัณฑ์ได้จนกว่าจะส่งคำขอใหม่`,
    );

    if (!shouldReject) {
      return;
    }

    setPendingActionKey(`reject:${request.uid}`);
    setErrorMessage('');
    setActionMessage('');

    try {
      await rejectOrganizationVerificationRequest({
        uid: request.uid,
        email: request.email,
      });
      await runAfterAction();
      setActionMessage(`ปฏิเสธคำขอของ "${displayName}" แล้ว`);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'ไม่สามารถปฏิเสธคำขอยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง',
        ),
      );
    } finally {
      setPendingActionKey('');
    }
  };

  return (
    <section className="systemhub-admin-panel mb-6 overflow-hidden">
      <div className="systemhub-admin-panel-header flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-xl border border-[rgba(59,130,246,0.28)] bg-[rgba(37,99,235,0.12)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--systemhub-accent)]">
            <ShieldCheck size={13} />
            Verify Requests
          </p>
          <h3 className="mt-3 text-[18px] font-black tracking-wide text-white">
            คำขอยืนยันตัวตน
          </h3>
          <p className="mt-2 max-w-[42rem] text-[12px] font-medium leading-6 text-gray-400">
            แอดมินสามารถเปิดดูรูปบัตร ตรวจสอบอีเมลกับรายชื่อ บก.สอท.1
            แล้วกดอนุมัติหรือปฏิเสธได้จากส่วนนี้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(10,15,29,0.56)] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              รอตรวจสอบ
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {requests.length.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={isLoading || Boolean(pendingActionKey)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(59,130,246,0.3)] bg-[rgba(37,99,235,0.1)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--systemhub-accent)] transition-colors hover:bg-[rgba(37,99,235,0.18)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 border-y border-[rgba(239,68,68,0.2)] bg-[rgba(60,10,18,0.35)] px-6 py-4 text-[12px] font-bold text-[var(--systemhub-danger-strong)]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {actionMessage && (
        <div className="border-y border-[rgba(34,197,94,0.18)] bg-[rgba(6,27,17,0.45)] px-6 py-4 text-[12px] font-bold text-[#86efac]">
          {actionMessage}
        </div>
      )}

      <div className="p-5 md:p-6">
        {isLoading && requests.length === 0 ? (
          <div className="flex items-center justify-center gap-3 rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[rgba(10,15,28,0.68)] px-5 py-12 text-center text-[13px] font-bold tracking-widest text-gray-300">
            <RefreshCw size={18} className="animate-spin opacity-60" />
            กำลังโหลดคำขอยืนยันตัวตน
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-5">
            {requests.map((request) => {
              const displayName = getDisplayName(request);
              const isApprovePending =
                pendingActionKey === `approve:${request.uid}`;
              const isRejectPending = pendingActionKey === `reject:${request.uid}`;
              const isActionPending = Boolean(pendingActionKey);

              return (
                <article
                  key={request.uid}
                  className="overflow-hidden rounded-[1.6rem] border border-[rgba(27,41,71,0.68)] bg-[rgba(10,15,28,0.72)]"
                >
                  <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.8fr)] lg:p-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.1)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#fcd34d]">
                            <Clock3 size={12} />
                            Pending Review
                          </div>
                          <h4 className="mt-3 truncate text-[17px] font-black text-white">
                            {displayName}
                          </h4>
                          <p className="mt-1 text-[12px] font-bold text-gray-400">
                            UID {request.uid}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(15,23,42,0.7)] px-4 py-3 text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            ส่งคำขอเมื่อ
                          </p>
                          <p className="mt-2 text-[13px] font-black text-white">
                            {formatDateTime(request.submittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <Mail size={12} />
                            Email
                          </p>
                          <p className="mt-2 break-all text-[12px] font-bold text-white">
                            {request.email || 'ไม่ระบุ'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <UserRound size={12} />
                            Username
                          </p>
                          <p className="mt-2 text-[12px] font-bold text-white">
                            {request.username || 'ไม่ระบุ'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <Building2 size={12} />
                            Division
                          </p>
                          <p className="mt-2 text-[12px] font-bold text-white">
                            {request.organizationDivision || 'ไม่ระบุ'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <IdCard size={12} />
                            เลขบัตรท้าย
                          </p>
                          <p className="mt-2 text-[12px] font-bold text-white">
                            {request.cardNumberLast4
                              ? `•••• ${request.cardNumberLast4}`
                              : 'ไม่ระบุ'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            ไฟล์รูปบัตร
                          </p>
                          <p className="mt-2 truncate text-[12px] font-bold text-white">
                            {request.cardImageName || 'ไม่ระบุชื่อไฟล์'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[rgba(148,163,184,0.16)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            ขนาดไฟล์
                          </p>
                          <p className="mt-2 text-[12px] font-bold text-white">
                            {formatFileSize(request.cardImageSize)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {request.cardImageUrl ? (
                        <div className="overflow-hidden rounded-[1.4rem] border border-[rgba(59,130,246,0.18)] bg-[rgba(2,6,23,0.42)]">
                          <img
                            src={request.cardImageUrl}
                            alt={`รูปบัตรของ ${displayName}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-52 w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-52 items-center justify-center rounded-[1.4rem] border border-dashed border-[rgba(148,163,184,0.2)] bg-[rgba(15,23,42,0.6)] px-5 text-center text-[12px] font-bold text-gray-400">
                          ไม่พบรูปบัตรในคำขอนี้
                        </div>
                      )}

                      <div className="grid gap-3">
                        <a
                          href={request.cardImageUrl || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-disabled={!request.cardImageUrl}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${
                            request.cardImageUrl
                              ? 'border-[rgba(59,130,246,0.3)] bg-[rgba(37,99,235,0.12)] text-[var(--systemhub-accent)] hover:bg-[rgba(37,99,235,0.2)] hover:text-white'
                              : 'pointer-events-none border-[rgba(71,85,105,0.45)] bg-[rgba(30,41,59,0.72)] text-gray-500'
                          }`}
                        >
                          <ExternalLink size={14} />
                          เปิดรูปบัตรเต็ม
                        </a>

                        <button
                          type="button"
                          onClick={() => void handleApproveRequest(request)}
                          disabled={isActionPending}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(34,197,94,0.28)] bg-[rgba(21,128,61,0.2)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#86efac] transition-colors hover:bg-[rgba(21,128,61,0.32)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <BadgeCheck size={14} />
                          {isApprovePending ? 'กำลังอนุมัติ...' : 'อนุมัติคำขอ'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleRejectRequest(request)}
                          disabled={isActionPending}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(239,68,68,0.32)] bg-[rgba(127,29,29,0.22)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#fda4af] transition-colors hover:bg-[rgba(127,29,29,0.35)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle size={14} />
                          {isRejectPending ? 'กำลังปฏิเสธ...' : 'ปฏิเสธคำขอ'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-[rgba(27,41,71,0.6)] bg-[rgba(10,15,28,0.68)] px-5 py-12 text-center">
            <ShieldCheck size={28} className="text-[var(--systemhub-accent)]" />
            <p className="text-[15px] font-black text-white">
              ไม่มีคำขอยืนยันตัวตนที่รอตรวจสอบ
            </p>
            <p className="max-w-[32rem] text-[12px] font-medium leading-6 text-gray-400">
              เมื่อผู้ใช้ส่งรูปบัตรและข้อมูลเข้ามา รายการจะปรากฏในส่วนนี้เพื่อให้แอดมินตรวจสอบต่อได้ทันที
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
