import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  type LetterTypeCode,
  type RequestQueueItem,
  type RequestStatus,
  listLetterTypesRequest,
  listRequestsRequest,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge } from '../components/StatusBadge';

const STATUS_FILTERS: Array<{ key: 'ALL' | RequestStatus; label: string }> = [
  { key: 'ALL', label: 'Semua' },
  { key: 'SUBMITTED', label: 'Diajukan' },
  { key: 'IN_REVIEW', label: 'Ditinjau' },
  { key: 'NEEDS_INFO', label: 'Perlu Perbaikan' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'SENT', label: 'Terkirim' },
  { key: 'REJECTED', label: 'Ditolak' },
];

const ACTION_LABELS: Record<RequestStatus, string> = {
  SUBMITTED: 'Tinjau',
  IN_REVIEW: 'Tinjau',
  NEEDS_INFO: 'Lihat',
  APPROVED: 'Lanjut',
  GENERATED: 'Pratinjau',
  SENT: 'Detail',
  REJECTED: 'Alasan',
};

const ACTION_TONES: Record<RequestStatus, string> = {
  SUBMITTED: 'ghost',
  IN_REVIEW: 'primary',
  NEEDS_INFO: 'ghost',
  APPROVED: 'gold',
  GENERATED: 'primary',
  SENT: 'tertiary',
  REJECTED: 'tertiary',
};

export function QueuePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<'ALL' | RequestStatus>('ALL');
  const [selectedType, setSelectedType] = useState<LetterTypeCode | 'ALL'>('ALL');
  const deferredSearch = useDeferredValue(search);

  const letterTypesQuery = useQuery({
    queryKey: ['letter-types'],
    queryFn: listLetterTypesRequest,
  });

  const overviewQuery = useQuery({
    queryKey: ['requests-overview'],
    queryFn: () => listRequestsRequest({ page: 1 }),
  });

  const queueQuery = useQuery({
    queryKey: ['requests', activeStatus, selectedType, deferredSearch],
    queryFn: () =>
      listRequestsRequest({
        page: 1,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        letter_type: selectedType === 'ALL' ? undefined : selectedType,
        q: deferredSearch,
      }),
  });

  const letterTypeMap = useMemo(
    () =>
      new Map(
        (letterTypesQuery.data ?? []).map((letterType) => [
          letterType.code,
          { name: letterType.name, description: letterType.description },
        ]),
      ),
    [letterTypesQuery.data],
  );

  const allItems = overviewQuery.data?.items ?? [];
  const filteredItems = queueQuery.data?.items ?? [];
  const totalPending = allItems.filter(
    (item) => item.status === 'SUBMITTED' || item.status === 'IN_REVIEW' || item.status === 'NEEDS_INFO',
  ).length;
  const submittedCount = allItems.filter((item) => item.status === 'SUBMITTED').length;
  const inReviewCount = allItems.filter((item) => item.status === 'IN_REVIEW').length;
  const sentCount = allItems.filter((item) => item.status === 'SENT').length;
  const rejectedCount = allItems.filter((item) => item.status === 'REJECTED').length;

  const typeOptions =
    letterTypesQuery.data?.map((item) => ({
      value: item.code,
      label: item.name,
    })) ?? [];

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date('2026-07-20T08:00:00+07:00'));

  return (
    <DashboardFrame
      header={
        <>
          <div className="dashboard-topbar-copy">
            <h1>Permohonan Surat</h1>
            <p>
              {formattedDate} · {totalPending} permohonan menunggu tindakan
            </p>
          </div>

          <div className="dashboard-spacer" />

          <label className="dashboard-search" aria-label="Cari permohonan">
            <AppIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, atau kode…"
            />
          </label>

          <button className="dashboard-icon-button" type="button" aria-label="Notifikasi">
            <AppIcon name="bell" />
            <span className="dashboard-icon-badge">{totalPending}</span>
          </button>

          <button className="dashboard-icon-button desktop-only" type="button" aria-label="Muat ulang">
            <AppIcon name="refresh" />
          </button>
        </>
      }
    >
      {queueQuery.isError ? (
        <div className="error-box" role="alert">
          {queueQuery.error instanceof Error
            ? queueQuery.error.message
            : 'Data permohonan tidak dapat dimuat.'}
        </div>
      ) : null}

      <section className="dashboard-stats-grid" aria-label="Ringkasan status surat">
        <article className="dashboard-stat-card highlight">
          <div className="dashboard-stat-icon">
            <AppIcon name="inbox" />
          </div>
          <small>Baru diajukan</small>
          <strong>{submittedCount}</strong>
          <div className="dashboard-stat-note warm">
            <AppIcon name="warning" />
            Perlu ditinjau hari ini
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon warning">
            <AppIcon name="clock" />
          </div>
          <small>Sedang ditinjau</small>
          <strong>{inReviewCount}</strong>
          <div className="dashboard-stat-note">Prioritas pemeriksaan kantor</div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon success">
            <AppIcon name="send" />
          </div>
          <small>Terkirim</small>
          <strong>{sentCount}</strong>
          <div className="dashboard-stat-note success">
            <AppIcon name="check" />
            Siap diverifikasi warga
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon danger">
            <AppIcon name="x" />
          </div>
          <small>Ditolak</small>
          <strong>{rejectedCount}</strong>
          <div className="dashboard-stat-note">Perlu dokumentasi alasan</div>
        </article>
      </section>

      <section className="queue-panel">
        <div className="queue-panel-head">
          <div className="queue-filter-pills" role="tablist" aria-label="Filter status permohonan">
            {STATUS_FILTERS.map((filter) => {
              const count =
                filter.key === 'ALL'
                  ? allItems.length
                  : allItems.filter((item) => item.status === filter.key).length;

              return (
                <button
                  key={filter.key}
                  className={`queue-pill${activeStatus === filter.key ? ' active' : ''}`}
                  type="button"
                  onClick={() => setActiveStatus(filter.key)}
                >
                  <span>{filter.label}</span>
                  <span className="queue-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="queue-panel-tools">
            <label className="queue-select">
              <AppIcon name="filter" />
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value as LetterTypeCode | 'ALL')}
              >
                <option value="ALL">Semua jenis surat</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="queue-select read-only">
              <AppIcon name="calendar" />
              <span>Juli 2026</span>
            </div>
          </div>
        </div>

        {queueQuery.isLoading ? (
          <div className="loading-state">Memuat antrian permohonan…</div>
        ) : null}

        {!queueQuery.isLoading ? (
          <>
            <div className="queue-table-wrap desktop-table">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th style={{ width: '118px' }}>Kode</th>
                    <th style={{ width: '190px' }}>Pemohon</th>
                    <th style={{ width: '250px' }}>Jenis Surat</th>
                    <th style={{ width: '158px' }}>Diajukan</th>
                    <th style={{ width: '158px' }}>Status</th>
                    <th style={{ width: '190px' }}>Email Tujuan</th>
                    <th style={{ width: '108px' }} />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className={item.status === 'SUBMITTED' ? 'is-new' : undefined}>
                      <td className="mono-cell">
                        <b>{item.reference_code}</b>
                        {item.status === 'SUBMITTED' ? <span className="request-badge new">BARU</span> : null}
                      </td>
                      <td>
                        <b>{item.applicant_name}</b>
                        <span className="table-sub mono">{letterTypeMap.get(item.letter_type)?.description ?? item.letter_type}</span>
                      </td>
                      <td>
                        {letterTypeMap.get(item.letter_type)?.name ?? item.letter_type}
                        <span className="table-sub">{formatDateTime(item.created_at).date}</span>
                      </td>
                      <td>
                        {formatDateTime(item.created_at).date}
                        <span className="table-sub">{formatDateTime(item.created_at).time}</span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="mono-muted">{item.email}</td>
                      <td>
                        <button
                          className={`table-action ${ACTION_TONES[item.status]}`}
                          type="button"
                          onClick={() => navigate(getRequestDestination(item))}
                        >
                          {ACTION_LABELS[item.status]}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="queue-mobile-list mobile-table">
              {filteredItems.map((item) => (
                <article key={item.id} className="queue-mobile-card">
                  <div className="queue-mobile-card-head">
                    <div>
                      <div className="queue-mobile-code">
                        {item.reference_code}
                        {item.status === 'SUBMITTED' ? <span className="request-badge new">BARU</span> : null}
                      </div>
                      <h2>{item.applicant_name}</h2>
                      <p>{letterTypeMap.get(item.letter_type)?.description ?? item.letter_type}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="queue-mobile-body">
                    <div>
                      <span>Jenis surat</span>
                      <strong>{letterTypeMap.get(item.letter_type)?.name ?? item.letter_type}</strong>
                    </div>
                    <div>
                      <span>Diajukan</span>
                      <strong>
                        {formatDateTime(item.created_at).date} · {formatDateTime(item.created_at).time}
                      </strong>
                    </div>
                    <div>
                      <span>Email tujuan</span>
                      <strong>{item.email}</strong>
                    </div>
                  </div>

                  <button
                    className={`table-action mobile ${ACTION_TONES[item.status]}`}
                    type="button"
                    onClick={() => navigate(getRequestDestination(item))}
                  >
                    {ACTION_LABELS[item.status]}
                  </button>
                </article>
              ))}
            </div>

            {filteredItems.length === 0 ? <div className="empty-state">Tidak ada permohonan yang cocok dengan filter saat ini.</div> : null}

            <div className="queue-panel-foot">
              <span>
                Menampilkan {filteredItems.length} dari {queueQuery.data?.total ?? 0} permohonan
              </span>
              <div className="queue-pagination">
                <button className="table-action ghost" type="button">
                  Sebelumnya
                </button>
                <button className="page-chip active" type="button">
                  1
                </button>
                <button className="table-action ghost" type="button">
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </DashboardFrame>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return {
    date: new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date).replace('.', ':') + ' WIB',
  };
}

function getRequestDestination(item: RequestQueueItem) {
  if (item.status === 'APPROVED' || item.status === 'GENERATED' || item.status === 'SENT') {
    return `/requests/${item.id}/generate`;
  }

  return `/requests/${item.id}`;
}
