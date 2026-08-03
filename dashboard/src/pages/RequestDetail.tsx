import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  type LetterFieldDefinition,
  type LetterTypeDefinition,
  type PatchRequestStatusInput,
  type RequestDetailResponse,
  type RequestStatus,
  getRequestDetailRequest,
  listLetterTypesRequest,
  updateRequestStatusRequest,
} from '../api/client';
import { AttachmentViewer } from '../components/AttachmentViewer';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge, getStatusLabel } from '../components/StatusBadge';

type RequestAction = PatchRequestStatusInput['action'];

const ALLOWED_REQUEST_ACTIONS: Record<RequestStatus, readonly RequestAction[]> = {
  SUBMITTED: ['in_review', 'reject'],
  IN_REVIEW: ['approve', 'needs_info', 'reject'],
  NEEDS_INFO: ['in_review', 'reject'],
  APPROVED: [],
  GENERATED: [],
  SENT: [],
  REJECTED: [],
  CANCELED: [],
};

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftSubjectData, setDraftSubjectData] = useState<Record<string, unknown>>({});
  const [draftNomorSurat, setDraftNomorSurat] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['request-detail', id],
    queryFn: () => getRequestDetailRequest(id),
    enabled: Boolean(id),
  });

  const letterTypesQuery = useQuery({
    queryKey: ['letter-types'],
    queryFn: listLetterTypesRequest,
  });

  const detail = detailQuery.data;
  const letterType = useMemo(
    () => letterTypesQuery.data?.find((item) => item.code === detail?.letter_type),
    [detail?.letter_type, letterTypesQuery.data],
  );

  useEffect(() => {
    if (!detail) return;
    setDraftSubjectData(detail.subject_data);
    setDraftNomorSurat(detail.nomor_surat ?? '');
    setDecisionReason(detail.decision_reason ?? '');
    setDecisionError(null);
    setIsEditing(false);
  }, [detail]);

  const decisionMutation = useMutation({
    mutationFn: (input: { action: RequestAction }) =>
      updateRequestStatusRequest(id, {
        action: input.action,
        subject_data: draftSubjectData,
        nomor_surat: draftNomorSurat.trim() || undefined,
        reason: decisionReason.trim() || undefined,
      }),
    onSuccess: async (updated) => {
      setDecisionError(null);
      setDraftSubjectData(updated.subject_data);
      setDraftNomorSurat(updated.nomor_surat ?? '');
      setDecisionReason(updated.decision_reason ?? '');
      setIsEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['requests'] }),
        queryClient.invalidateQueries({ queryKey: ['requests-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['request-detail', id] }),
      ]);
    },
    onError: (error) => {
      setDecisionError(error instanceof Error ? error.message : 'Aksi tidak dapat diproses.');
    },
  });

  if (detailQuery.isLoading) {
    return (
      <DashboardFrame
        header={
          <>
            <button className="dashboard-icon-button" type="button" onClick={() => navigate('/requests')}>
              <AppIcon name="left" />
            </button>
            <div className="dashboard-topbar-copy">
              <h1>Memuat Permohonan…</h1>
              <p>Menyiapkan data detail untuk ditinjau.</p>
            </div>
          </>
        }
      >
        <div className="loading-state">Memuat detail permohonan…</div>
      </DashboardFrame>
    );
  }

  if (!detail) {
    return (
      <DashboardFrame
        header={
          <>
            <button className="dashboard-icon-button" type="button" onClick={() => navigate('/requests')}>
              <AppIcon name="left" />
            </button>
            <div className="dashboard-topbar-copy">
              <h1>Permohonan Tidak Ditemukan</h1>
              <p>Data yang diminta tidak tersedia atau sudah berubah.</p>
            </div>
          </>
        }
      >
        <div className="error-box" role="alert">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Permohonan tidak dapat dimuat.'}
        </div>
      </DashboardFrame>
    );
  }

  const title = letterType?.name ?? detail.letter_type;
  const submittedAt = formatLongDateTime(detail.created_at);
  const statusHistory = buildTimeline(detail);
  const orderedSubjectFields = getOrderedSubjectFields(letterType, detail);
  const nomorSuratParts = splitNomorSurat(draftNomorSurat);
  const allowedActions = ALLOWED_REQUEST_ACTIONS[detail.status];
  const canMarkInReview = allowedActions.includes('in_review');
  const canApprove = allowedActions.includes('approve');
  const canAskCorrection = allowedActions.includes('needs_info');
  const canReject = allowedActions.includes('reject');
  const hasDecisionActions = allowedActions.length > 0;

  return (
    <DashboardFrame
      header={
        <>
          <button className="dashboard-icon-button" type="button" onClick={() => navigate('/requests')}>
            <AppIcon name="left" />
          </button>
          <div className="dashboard-topbar-copy">
            <h1>
              {detail.reference_code} · {title}
            </h1>
            <p>
              Diajukan {submittedAt} oleh {detail.applicant_name}
            </p>
          </div>
          <div className="dashboard-spacer" />
          <StatusBadge status={detail.status} />
        </>
      }
    >
      <div className="detail-grid">
        <div className="detail-main-column">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Data Pemohon &amp; Isi Surat</h2>
              <button className="table-action ghost" type="button" onClick={() => setIsEditing((value) => !value)}>
                <AppIcon name="edit" />
                {isEditing ? 'Selesai Koreksi' : 'Koreksi Data'}
              </button>
            </div>
            <div className="detail-card-body">
              <div className="detail-kv-grid">
                <div>Nama Pemohon</div>
                <div>{detail.applicant_name}</div>
                <div>Email Pemohon</div>
                <div className="mono-muted strong-text">{detail.applicant_email}</div>
                {detail.applicant_phone ? (
                  <>
                    <div>No. HP</div>
                    <div className="mono-muted strong-text">{detail.applicant_phone}</div>
                  </>
                ) : null}
                {detail.keperluan ? (
                  <>
                    <div>Keperluan</div>
                    <div>{detail.keperluan}</div>
                  </>
                ) : null}

                {orderedSubjectFields.map((field) => (
                  <DataFieldRow
                    key={field.key}
                    field={field}
                    value={draftSubjectData[field.key]}
                    editable={isEditing}
                    onChange={(value) =>
                      setDraftSubjectData((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Lampiran</h2>
              <span className="detail-card-meta">
                {detail.attachments.length} berkas · {formatAttachmentSummary(detail.attachments)}
              </span>
            </div>
            <div className="detail-card-body">
              <AttachmentViewer attachments={detail.attachments} />
              <div className="info-box detail-info-box" role="note">
                <strong>Berkas terenkripsi</strong>
                <p>
                  Lampiran hanya dapat dibuka oleh admin yang login dan disajikan lewat tautan
                  bertanda tangan yang kedaluwarsa.
                </p>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Keputusan</h2>
            </div>
            <div className="detail-card-body">
              {detail.status === 'APPROVED' || detail.status === 'GENERATED' || detail.status === 'SENT' ? (
                <div className="info-box detail-stage-box" role="status">
                  <strong>Tahap penerbitan surat siap dibuka</strong>
                  <p>
                    Lanjutkan ke halaman generate untuk membuat PDF resmi, meninjau QR verifikasi, dan mengirim surat ke email pemohon.
                  </p>
                  <button
                    className="table-action gold"
                    type="button"
                    onClick={() => navigate(`/requests/${id}/generate`)}
                  >
                    {detail.status === 'APPROVED'
                      ? 'Lanjut ke Generate PDF'
                      : detail.status === 'GENERATED'
                        ? 'Buka Pratinjau Surat'
                        : 'Lihat Surat Terkirim'}
                  </button>
                </div>
              ) : null}

              {canMarkInReview ? (
                <div className="detail-inline-actions">
                  <button
                    className="table-action ghost"
                    type="button"
                    onClick={() => decisionMutation.mutate({ action: 'in_review' })}
                    disabled={decisionMutation.isPending}
                  >
                    Tandai Sedang Ditinjau
                  </button>
                </div>
              ) : null}

              {hasDecisionActions ? (
                <>
                  <div className="field">
                    <label htmlFor="nomor-surat">Nomor Surat</label>
                    <div className="nomor-surat-grid">
                      <input
                        id="nomor-surat-prefix"
                        className="field-input muted"
                        value={nomorSuratParts.prefix}
                        onChange={(event) =>
                          setDraftNomorSurat(joinNomorSurat(event.target.value, nomorSuratParts.sequence, nomorSuratParts.year))
                        }
                        placeholder="400.10.4.4"
                      />
                      <input
                        id="nomor-surat-seq"
                        className="field-input focus-ring"
                        value={nomorSuratParts.sequence}
                        onChange={(event) =>
                          setDraftNomorSurat(joinNomorSurat(nomorSuratParts.prefix, event.target.value, nomorSuratParts.year))
                        }
                        placeholder="017"
                      />
                      <input
                        id="nomor-surat-year"
                        className="field-input muted"
                        value={nomorSuratParts.year}
                        onChange={(event) =>
                          setDraftNomorSurat(joinNomorSurat(nomorSuratParts.prefix, nomorSuratParts.sequence, event.target.value))
                        }
                        placeholder="2026"
                      />
                    </div>
                    <div className="field-hint">
                      Nomor urut dapat dikoreksi saat peninjauan sebelum masuk ke tahap pembuatan surat.
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="decision-reason">Catatan / Alasan Keputusan</label>
                    <textarea
                      id="decision-reason"
                      className="field-textarea"
                      value={decisionReason}
                      onChange={(event) => setDecisionReason(event.target.value)}
                      placeholder="Tambahkan alasan bila permohonan perlu perbaikan atau ditolak…"
                    />
                    <div className="field-hint">
                      Gunakan untuk alasan perbaikan atau penolakan. Persetujuan bisa dikirim tanpa isi catatan ini.
                    </div>
                  </div>
                </>
              ) : null}

              {decisionError ? (
                <div className="error-box" role="alert">
                  {decisionError}
                </div>
              ) : null}

              {hasDecisionActions ? (
                <div className="detail-inline-actions">
                  {canApprove ? (
                    <button
                      className="table-action primary strong"
                      type="button"
                      onClick={() => decisionMutation.mutate({ action: 'approve' })}
                      disabled={decisionMutation.isPending}
                    >
                      Setujui
                    </button>
                  ) : null}
                  {canAskCorrection ? (
                    <button
                      className="table-action ghost"
                      type="button"
                      onClick={() => {
                        if (!decisionReason.trim()) {
                          setDecisionError('Alasan wajib diisi sebelum meminta perbaikan.');
                          return;
                        }
                        decisionMutation.mutate({ action: 'needs_info' });
                      }}
                      disabled={decisionMutation.isPending}
                    >
                      Minta Perbaikan
                    </button>
                  ) : null}
                  {canReject ? (
                    <button
                      className="table-action danger"
                      type="button"
                      onClick={() => {
                        if (!decisionReason.trim()) {
                          setDecisionError('Alasan wajib diisi sebelum menolak permohonan.');
                          return;
                        }
                        decisionMutation.mutate({ action: 'reject' });
                      }}
                      disabled={decisionMutation.isPending}
                    >
                      Tolak Permohonan
                    </button>
                  ) : null}
                </div>
              ) : null}

              {canApprove ? (
                <div className="warning-box">
                  <AppIcon name="warning" />
                  <div>
                    <strong>Persetujuan manusia wajib</strong>
                    <p>
                      Permohonan hanya berpindah ke status disetujui setelah petugas menekan tombol
                      persetujuan. Pembuatan PDF dilakukan pada langkah berikutnya.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="detail-side-column">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Kontak Pemohon</h2>
            </div>
            <div className="detail-card-body stacked">
              <ContactRow label="Email tujuan surat" value={detail.applicant_email} icon="mail" badge="Valid" />
              {detail.applicant_phone ? <ContactRow label="No. HP" value={detail.applicant_phone} icon="phone" /> : null}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Riwayat &amp; Jejak Audit</h2>
            </div>
            <div className="detail-card-body">
              <div className="detail-timeline">
                {statusHistory.map((item, index) => (
                  <div
                    key={`${item.title}-${item.timestamp}-${index}`}
                    className={`timeline-step ${item.kind}`}
                  >
                    <b>{item.title}</b>
                    <span>{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Ringkasan Status</h2>
            </div>
            <div className="detail-card-body stacked">
              <div className="mini-summary-row">
                <span>Status aktif</span>
                <StatusBadge status={detail.status} />
              </div>
              <div className="mini-summary-row">
                <span>Terakhir diperbarui</span>
                <strong>{formatLongDateTime(detail.updated_at)}</strong>
              </div>
              {detail.nomor_surat ? (
                <div className="mini-summary-row">
                  <span>Nomor surat</span>
                  <strong className="mono-muted strong-text">{detail.nomor_surat}</strong>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </DashboardFrame>
  );
}

function ContactRow({
  label,
  value,
  icon,
  badge,
}: {
  label: string;
  value: string;
  icon: 'mail' | 'phone';
  badge?: string;
}) {
  return (
    <div className="contact-row">
      <AppIcon name={icon} />
      <div className="contact-row-body">
        <div className="contact-row-label">{label}</div>
        <div className="contact-row-value">{value}</div>
      </div>
      {badge ? <span className="request-badge approved">{badge}</span> : null}
    </div>
  );
}

function DataFieldRow({
  field,
  value,
  editable,
  onChange,
}: {
  field: LetterFieldDefinition;
  value: unknown;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <div>{field.label}</div>
      <div>
        {editable ? (
          <FieldEditor field={field} value={value} onChange={onChange} />
        ) : (
          <span className={field.type === 'nik' ? 'mono-muted strong-text' : 'strong-text'}>
            {formatSubjectValue(value)}
          </span>
        )}
      </div>
    </>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: LetterFieldDefinition;
  value: unknown;
  onChange: (value: string) => void;
}) {
  const currentValue = String(value ?? '');

  if (field.type === 'enum' && field.options?.length) {
    return (
      <select className="field-input" value={currentValue} onChange={(event) => onChange(event.target.value)}>
        <option value="">Pilih…</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className="field-textarea compact"
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      className="field-input"
      type={resolveInputType(field.type)}
      value={currentValue}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function resolveInputType(type: LetterFieldDefinition['type']) {
  switch (type) {
    case 'date':
      return 'date';
    case 'email':
      return 'email';
    case 'number':
    case 'year':
      return 'number';
    case 'phone':
      return 'tel';
    default:
      return 'text';
  }
}

function getOrderedSubjectFields(letterType: LetterTypeDefinition | undefined, detail: RequestDetailResponse) {
  if (letterType) {
    return letterType.fields;
  }

  return Object.keys(detail.subject_data).map((key) => ({
    key,
    label: key,
    type: 'text' as const,
    required: false,
  }));
}

function formatSubjectValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  return String(value);
}

function splitNomorSurat(value: string) {
  const [prefix = '', sequence = '', year = ''] = value.split('/');
  return { prefix, sequence, year };
}

function joinNomorSurat(prefix: string, sequence: string, year: string) {
  return [prefix.trim(), sequence.trim(), year.trim()].filter(Boolean).join('/');
}

function formatLongDateTime(value: string) {
  const date = new Date(value);
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace('.', ':');
  return `${dateLabel} · ${timeLabel} WIB`;
}

function formatAttachmentSummary(detailAttachments: RequestDetailResponse['attachments']) {
  const totalBytes = detailAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
  if (totalBytes >= 1024 * 1024) {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(totalBytes / 1024)} KB`;
}

function buildTimeline(detail: RequestDetailResponse) {
  if (detail.status_history.length === 0) {
    return [
      {
        title: 'Permohonan diajukan',
        timestamp: `${formatLongDateTime(detail.created_at)} · oleh pemohon`,
        kind: 'now' as const,
      },
    ];
  }

  return detail.status_history.map((item, index, collection) => ({
    title: actionTitle(item.action, item.status),
    timestamp: `${formatLongDateTime(item.at)}${item.by ? ` · ${item.by}` : ''}${item.reason ? ` · ${item.reason}` : ''}`,
    kind:
      index === collection.length - 1 && !['REJECTED', 'CANCELED', 'SENT', 'GENERATED', 'APPROVED'].includes(item.status)
        ? ('now' as const)
        : ('done' as const),
  }));
}

/**
 * The audit trail is a log of *actions*, not statuses. Falling back to the status label
 * made every PDF rebuild read "Surat Dibuat", so a row of regenerations looked like the
 * same event logged repeatedly. The backend already records `generate` vs `regenerate`
 * vs `send` — these cases surface that distinction.
 */
function actionTitle(action: string | undefined, status: RequestDetailResponse['status']) {
  switch (action) {
    case 'submit':
      return 'Permohonan diajukan';
    case 'in_review':
      return 'Dibuka & ditinjau';
    case 'approve':
      return 'Disetujui';
    case 'needs_info':
      return 'Diminta perbaikan';
    case 'reject':
      return 'Ditolak';
    case 'generate':
      return 'Surat dibuat';
    case 'regenerate':
      return 'Surat dibuat ulang';
    case 'send':
      return 'Surat dikirim ke pemohon';
    default:
      return getStatusLabel(status);
  }
}
