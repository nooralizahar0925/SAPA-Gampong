import { useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type FeedbackInboxItem,
  type FeedbackStatus,
  getFeedbackDetailRequest,
  listFeedbackRequest,
  replyToFeedbackRequest,
  updateFeedbackRequest,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import { alertApiError, toastSuccess } from '../lib/alerts';

const STATUS_FILTERS: Array<{ key: FeedbackStatus; label: string }> = [
  { key: 'new', label: 'Baru' },
  { key: 'read', label: 'Dibaca' },
  { key: 'responded', label: 'Ditanggapi' },
];

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'BARU',
  read: 'Dibaca',
  responded: 'Ditanggapi',
};

export function FeedbackPage() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<FeedbackStatus>('new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const inboxQuery = useQuery({
    queryKey: ['feedback', activeStatus, deferredSearch],
    queryFn: () => listFeedbackRequest({ status: activeStatus, q: deferredSearch }),
  });

  const items = inboxQuery.data?.items ?? [];
  const newCount = inboxQuery.data?.new_count ?? 0;
  const total = inboxQuery.data?.total ?? 0;

  /*
   * Which report the detail pane shows. An explicit choice wins even after the report
   * leaves the current filter: replying moves it into "Ditanggapi", and falling back to
   * items[0] would make it vanish the moment it was answered, with no confirmation the
   * reply landed. Without a choice, open the first report so the pane is never empty.
   */
  const selected = items.find((item) => item.id === selectedId) ?? (selectedId ? null : items[0]) ?? null;
  const openId = selectedId ?? selected?.id ?? null;

  return (
    <DashboardFrame
      feedbackCount={newCount}
      header={
        <>
          <div className="dashboard-topbar-copy">
            <h1>Kotak Pelaporan</h1>
            <p>
              {newCount} laporan baru · {total} total pada filter ini
            </p>
          </div>

          <div className="dashboard-spacer" />

          <label className="dashboard-search" aria-label="Cari laporan">
            <AppIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau isi laporan…"
            />
          </label>
        </>
      }
    >
      {inboxQuery.isError ? (
        <div className="error-box" role="alert">
          {inboxQuery.error instanceof Error
            ? inboxQuery.error.message
            : 'Data laporan tidak dapat dimuat.'}
        </div>
      ) : null}

      <div className="feedback-layout">
        <section className="feedback-list-panel" aria-label="Daftar laporan">
          <div className="feedback-filter-pills" role="tablist" aria-label="Filter status laporan">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                className={`feedback-pill${activeStatus === filter.key ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={activeStatus === filter.key}
                onClick={() => {
                  setActiveStatus(filter.key);
                  setSelectedId(null);
                }}
              >
                <span>{filter.label}</span>
                {filter.key === 'new' ? (
                  <span className="feedback-pill-count" data-testid="feedback-new-count">
                    {newCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {inboxQuery.isLoading ? <div className="loading-state">Memuat laporan…</div> : null}

          {!inboxQuery.isLoading && items.length === 0 ? (
            <div className="empty-state">Belum ada laporan pada filter ini.</div>
          ) : null}

          <ul className="feedback-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`feedback-list-item${selected?.id === item.id ? ' active' : ''}`}
                  aria-label={`Buka laporan dari ${item.name}`}
                  aria-current={selected?.id === item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="feedback-list-item-head">
                    <b>{item.name}</b>
                    <span className={`feedback-status ${item.status}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="feedback-list-excerpt">{item.body}</p>
                  <div className="feedback-list-meta">
                    <span className="mono">{item.reference_code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatListDate(item.created_at)}</span>
                    {item.attachment_count > 0 ? (
                      <span className="feedback-list-clip">
                        <AppIcon name="image" />
                        {item.attachment_count}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="feedback-detail-panel" aria-label="Detail laporan">
          {openId ? (
            <FeedbackDetail id={openId} fallback={selected} />
          ) : (
            <div className="empty-state">Pilih satu laporan untuk melihat detailnya.</div>
          )}
        </section>
      </div>
    </DashboardFrame>
  );
}

function FeedbackDetail({
  id,
  fallback,
}: {
  id: string;
  /** List row for this report, absent once a status change moves it out of the filter. */
  fallback: FeedbackInboxItem | null;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['feedback-detail', id],
    queryFn: () => getFeedbackDetailRequest(id),
  });

  const detail = detailQuery.data;

  // Reset the editors when a different report is opened, and seed them once from the
  // server so typing is not clobbered by a refetch.
  useEffect(() => {
    if (detail && loadedId !== id) {
      setNote(detail.note ?? '');
      setReply(detail.reply ?? '');
      setLoadedId(id);
    }
  }, [detail, id, loadedId]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['feedback'] });
    queryClient.invalidateQueries({ queryKey: ['feedback-detail', id] });
  }

  const markReadMutation = useMutation({
    mutationFn: () => updateFeedbackRequest(id, { status: 'read' }),
    onSuccess: invalidate,
  });

  const noteMutation = useMutation({
    mutationFn: () => updateFeedbackRequest(id, { note }),
    onSuccess: invalidate,
  });

  const replyMutation = useMutation({
    mutationFn: () => replyToFeedbackRequest(id, { reply, note: note || undefined }),
    onSuccess: invalidate,
  });

  const status = detail?.status ?? fallback?.status ?? 'new';

  async function markRead() {
    try {
      await markReadMutation.mutateAsync();
      toastSuccess('Laporan ditandai sudah dibaca');
    } catch (err) {
      alertApiError(err, 'Status laporan gagal disimpan.');
    }
  }

  async function saveNote() {
    try {
      await noteMutation.mutateAsync();
      toastSuccess('Catatan internal tersimpan');
    } catch (err) {
      alertApiError(err, 'Catatan gagal disimpan.');
    }
  }

  async function sendReply() {
    try {
      await replyMutation.mutateAsync();
      toastSuccess('Balasan terkirim ke pelapor');
    } catch (err) {
      alertApiError(err, 'Balasan gagal dikirim.');
    }
  }

  const busy = replyMutation.isPending || noteMutation.isPending || markReadMutation.isPending;
  const alreadyReplied = Boolean(detail?.replied_at);

  if (detailQuery.isLoading && !detail) {
    return <div className="loading-state">Memuat laporan…</div>;
  }

  if (!detail) return null;

  return (
    <article className="feedback-detail">
      {/*
        The mock shows a subject line here, but reports have no subject field — the
        warga only writes a body. Echoing the body as a pseudo-title would just repeat
        the text shown below it, so the reporter's name heads the pane instead.
      */}
      <header className="feedback-detail-head">
        <div>
          <h2>{detail.name}</h2>
          <div className="feedback-detail-sub">
            <span className="mono">{detail.reference_code}</span>
            <span aria-hidden="true">·</span>
            <span>{formatFullDateTime(detail.created_at)}</span>
          </div>
        </div>
        <span className={`feedback-status ${status}`}>{STATUS_LABELS[status]}</span>
      </header>

      <dl className="feedback-detail-meta">
        <div>
          <dt>Email</dt>
          <dd className="mono">{detail.email}</dd>
        </div>
        <div>
          <dt>No. HP</dt>
          <dd className="mono">{detail.phone ?? '—'}</dd>
        </div>
      </dl>

      <section className="feedback-detail-section">
        <h3>Isi Laporan</h3>
        <div className="feedback-body-card">{detail.body}</div>
      </section>

      {detail.attachments.length > 0 ? (
        <section className="feedback-detail-section">
          <h3>Lampiran</h3>
          <ul className="feedback-attachment-grid">
            {detail.attachments.map((attachment, index) => (
              <li key={attachment.file_id}>
                <a
                  className="feedback-attachment-card"
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Lampiran ${index + 1}`}
                >
                  <span className="feedback-attachment-thumb">
                    <AppIcon name="image" />
                  </span>
                  <span className="feedback-attachment-meta">
                    <b>{attachment.original_name ?? `Lampiran ${index + 1}`}</b>
                    <small>{formatSize(attachment.size)}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <label className="feedback-field">
        <span>Catatan Internal</span>
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Catatan untuk perangkat gampong — tidak dikirim ke pelapor…"
        />
      </label>

      <label className="feedback-field">
        <span>Balasan ke Pelapor</span>
        <textarea
          rows={4}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Balasan ini dikirim ke email pelapor…"
        />
        {alreadyReplied ? (
          <small className="feedback-field-note">
            Sudah dibalas {formatFullDateTime(detail.replied_at!)}. Mengirim lagi akan
            memperbarui balasan dan mengirim email susulan ke pelapor.
          </small>
        ) : null}
      </label>

      <footer className="feedback-detail-actions">
        {/*
          Once a report is answered the button must stop promising to mark it
          responded — it already is. Replying stays possible, because warga do send
          follow-ups and the backend overwrites the reply and emails again.
        */}
        <button
          className="primary-button"
          type="button"
          onClick={sendReply}
          disabled={busy || reply.trim().length === 0 || reply.trim() === (detail.reply ?? '')}
        >
          <AppIcon name="send" />
          {alreadyReplied ? 'Kirim Balasan Susulan' : 'Kirim Balasan & Tandai Ditanggapi'}
        </button>

        <button
          className="feedback-secondary-button"
          type="button"
          onClick={saveNote}
          disabled={busy}
        >
          Simpan Catatan
        </button>

        <button
          className="feedback-secondary-button"
          type="button"
          onClick={markRead}
          disabled={busy || status !== 'new'}
        >
          <AppIcon name="check" />
          Tandai Dibaca
        </button>
      </footer>

    </article>
  );
}

function formatListDate(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':');

  return `${day} ${time}`;
}

function formatFullDateTime(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace('.', ':');

  return `${day} · ${time} WIB`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
