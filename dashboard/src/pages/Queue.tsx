import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  type LetterTypeCode,
  type RequestPeriod,
  type RequestQueueItem,
  type RequestSortColumn,
  type RequestStatus,
  type SortDirection,
  getRequestCountsRequest,
  listLetterTypesRequest,
  listRequestsRequest,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import { StatusBadge } from '../components/StatusBadge';

/** Matches the backend page size in modules/requests/service.ts. */
const PAGE_SIZE = 20;

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function periodValue(period: RequestPeriod) {
  return `${period.year}-${period.month}`;
}

function periodLabel(period: RequestPeriod) {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`;
}

const STATUS_FILTERS: Array<{ key: 'ALL' | RequestStatus; label: string }> = [
  { key: 'ALL', label: 'Semua' },
  { key: 'SUBMITTED', label: 'Diajukan' },
  { key: 'IN_REVIEW', label: 'Ditinjau' },
  { key: 'NEEDS_INFO', label: 'Perlu Perbaikan' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'SENT', label: 'Terkirim' },
  { key: 'REJECTED', label: 'Ditolak' },
  { key: 'CANCELED', label: 'Dibatalkan' },
];

const ACTION_LABELS: Record<RequestStatus, string> = {
  SUBMITTED: 'Tinjau',
  IN_REVIEW: 'Tinjau',
  NEEDS_INFO: 'Lihat',
  APPROVED: 'Lanjut',
  GENERATED: 'Pratinjau',
  SENT: 'Detail',
  REJECTED: 'Alasan',
  CANCELED: 'Detail',
};

const ACTION_TONES: Record<RequestStatus, string> = {
  SUBMITTED: 'ghost',
  IN_REVIEW: 'primary',
  NEEDS_INFO: 'ghost',
  APPROVED: 'gold',
  GENERATED: 'primary',
  SENT: 'tertiary',
  REJECTED: 'tertiary',
  CANCELED: 'tertiary',
};

export function QueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<'ALL' | RequestStatus>('ALL');
  const [selectedType, setSelectedType] = useState<LetterTypeCode | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<RequestSortColumn>('created_at');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [period, setPeriod] = useState<string>('ALL');
  const deferredSearch = useDeferredValue(search);

  // A narrower filter can leave the current page beyond the last one, which would show
  // an empty table with no way back except paging down manually.
  useEffect(() => {
    setPage(1);
  }, [activeStatus, selectedType, deferredSearch, sort, direction, period]);

  const [periodYear, periodMonth] =
    period === 'ALL' ? [undefined, undefined] : period.split('-').map(Number);

  /** Clicking the active column flips direction; a new column starts at its natural order. */
  function toggleSort(column: RequestSortColumn) {
    if (sort === column) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSort(column);
    // Dates read newest-first; names and codes read A-Z.
    setDirection(column === 'created_at' ? 'desc' : 'asc');
  }

  const letterTypesQuery = useQuery({
    queryKey: ['letter-types'],
    queryFn: listLetterTypesRequest,
  });

  // Counted server-side: the queue only fetches 20 rows, so counting them client-side
  // caps every figure at 20 once the office has more than a page of requests.
  const countsQuery = useQuery({
    queryKey: ['request-counts'],
    queryFn: getRequestCountsRequest,
  });

  const queueQuery = useQuery({
    queryKey: [
      'requests',
      activeStatus,
      selectedType,
      deferredSearch,
      page,
      sort,
      direction,
      period,
    ],
    queryFn: () =>
      listRequestsRequest({
        page,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        letter_type: selectedType === 'ALL' ? undefined : selectedType,
        q: deferredSearch,
        sort,
        direction,
        year: periodYear,
        month: periodMonth,
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

  const counts = countsQuery.data;
  const items = queueQuery.data?.items ?? [];
  const total = queueQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const typeOptions =
    letterTypesQuery.data?.map((item) => ({
      value: item.code,
      label: item.name,
    })) ?? [];

  const isRefreshing = queueQuery.isFetching || countsQuery.isFetching;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['request-counts'] });
  }

  // Today's date, not a build-time constant — the header claims to show "hari ini".
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <DashboardFrame
      requestCount={counts?.pending}
      header={
        <>
          <div className="dashboard-topbar-copy">
            <h1>Permohonan Surat</h1>
            <p>
              {formattedDate} · {counts?.pending ?? 0} permohonan menunggu tindakan
            </p>
          </div>

          <div className="dashboard-spacer" />

          <button
            className="dashboard-icon-button desktop-only"
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            aria-label="Muat ulang"
            title="Muat ulang"
          >
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
          <strong>{counts?.by_status.SUBMITTED ?? 0}</strong>
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
          <strong>{counts?.by_status.IN_REVIEW ?? 0}</strong>
          <div className="dashboard-stat-note">Prioritas pemeriksaan kantor</div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-icon success">
            <AppIcon name="send" />
          </div>
          <small>Terkirim</small>
          <strong>{counts?.by_status.SENT ?? 0}</strong>
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
          <strong>{counts?.by_status.REJECTED ?? 0}</strong>
          <div className="dashboard-stat-note">Perlu dokumentasi alasan</div>
        </article>
      </section>

      <section className="queue-tabs-card">
        <div className="queue-filter-pills" role="tablist" aria-label="Filter status permohonan">
          {STATUS_FILTERS.map((filter) => {
            const count = filter.key === 'ALL' ? counts?.total : counts?.by_status[filter.key];

            return (
              <button
                key={filter.key}
                className={`queue-pill${activeStatus === filter.key ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={activeStatus === filter.key}
                onClick={() => setActiveStatus(filter.key)}
              >
                <span>{filter.label}</span>
                <span className="queue-pill-count">{count ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="queue-panel">
        <div className="queue-toolbar">
          <label className="queue-search" aria-label="Cari permohonan">
            <AppIcon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari kode atau nama pemohon…"
            />
          </label>

          <div className="queue-toolbar-filters">
            <label className="queue-select">
              <AppIcon name="filter" />
              <span className="sr-only">Jenis surat</span>
              <select
                value={selectedType}
                aria-label="Filter jenis surat"
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

            <label className="queue-select">
              <AppIcon name="calendar" />
              <span className="sr-only">Periode pengajuan</span>
              <select
                value={period}
                aria-label="Filter periode pengajuan"
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="ALL">Semua periode</option>
                {(counts?.periods ?? []).map((entry) => (
                  <option key={periodValue(entry)} value={periodValue(entry)}>
                    {periodLabel(entry)} ({entry.count})
                  </option>
                ))}
              </select>
            </label>
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
                    <SortableHeader
                      label="Kode"
                      column="reference_code"
                      width="150px"
                      sort={sort}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Pemohon"
                      column="applicant_name"
                      width="190px"
                      sort={sort}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Jenis Surat"
                      column="letter_type"
                      width="250px"
                      sort={sort}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Diajukan"
                      column="created_at"
                      width="158px"
                      sort={sort}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <SortableHeader
                      label="Status"
                      column="status"
                      width="158px"
                      sort={sort}
                      direction={direction}
                      onSort={toggleSort}
                    />
                    <th style={{ width: '190px' }}>Email Tujuan</th>
                    <th style={{ width: '108px' }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
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
              {items.map((item) => (
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

            {items.length === 0 ? (
              <div className="empty-state">Tidak ada permohonan yang cocok dengan filter saat ini.</div>
            ) : null}

            <div className="queue-panel-foot">
              <span>
                {total === 0
                  ? 'Menampilkan 0 permohonan'
                  : `Menampilkan ${rangeStart}–${rangeEnd} dari ${total} permohonan`}
              </span>

              {pageCount > 1 ? (
                <div className="queue-pagination">
                  <button
                    className="table-action ghost"
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    Sebelumnya
                  </button>

                  {buildPageList(page, pageCount).map((entry, index) =>
                    entry === 'gap' ? (
                      <span key={`gap-${index}`} className="page-gap">
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        className={`page-chip${entry === page ? ' active' : ''}`}
                        type="button"
                        aria-current={entry === page ? 'page' : undefined}
                        aria-label={`Halaman ${entry}`}
                        onClick={() => setPage(entry)}
                      >
                        {entry}
                      </button>
                    ),
                  )}

                  <button
                    className="table-action ghost"
                    type="button"
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    disabled={page === pageCount}
                  >
                    Berikutnya
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </DashboardFrame>
  );
}

function SortableHeader({
  label,
  column,
  width,
  sort,
  direction,
  onSort,
}: {
  label: string;
  column: RequestSortColumn;
  width: string;
  sort: RequestSortColumn;
  direction: SortDirection;
  onSort: (column: RequestSortColumn) => void;
}) {
  const active = sort === column;

  return (
    <th
      style={{ width }}
      // Announces the current sort to screen readers, and lets tests assert on it.
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`queue-sort${active ? ' active' : ''}`}
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        <AppIcon name={active && direction === 'asc' ? 'chevronUp' : 'chevronDown'} />
      </button>
    </th>
  );
}

/** Windows the page numbers so a long queue does not render dozens of chips. */
function buildPageList(current: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const result: Array<number | 'gap'> = [];
  let previous = 0;

  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('gap');
    result.push(page);
    previous = page;
  }

  return result;
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
