import type { RequestStatus } from '../api/client';
import { AppIcon } from './AppIcon';

const STATUS_META: Record<
  RequestStatus,
  { label: string; className: string; icon: 'inbox' | 'clock' | 'warning' | 'check' | 'file' | 'send' | 'x' }
> = {
  SUBMITTED: { label: 'Diajukan', className: 'request-badge sub', icon: 'inbox' },
  IN_REVIEW: { label: 'Sedang Ditinjau', className: 'request-badge review', icon: 'clock' },
  NEEDS_INFO: { label: 'Perlu Perbaikan', className: 'request-badge need', icon: 'warning' },
  APPROVED: { label: 'Disetujui', className: 'request-badge approved', icon: 'check' },
  GENERATED: { label: 'Surat Dibuat', className: 'request-badge generated', icon: 'file' },
  SENT: { label: 'Terkirim', className: 'request-badge sent', icon: 'send' },
  REJECTED: { label: 'Ditolak', className: 'request-badge rejected', icon: 'x' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];

  return (
    <span className={meta.className}>
      <AppIcon name={meta.icon} />
      {meta.label}
    </span>
  );
}

export function getStatusLabel(status: RequestStatus) {
  return STATUS_META[status].label;
}
