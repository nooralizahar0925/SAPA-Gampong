import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listDemographicsRequest,
  updateDemographicsRequest,
  type DemographicBlock,
} from '../../api/client';
import { AppIcon } from '../AppIcon';
import { useMarkDirty, useRegisterSave } from './save-context';

/**
 * Two blocks have a fixed shape the citizen app relies on — a single headcount and the
 * male/female split — so they render as plain inputs and their labels are not editable.
 * Every other block is open-ended (brief section 9) and is edited as a table of
 * label/value rows that can be added, renamed, or removed.
 */
const FIXED_BLOCK_KEYS = new Set(['jumlah_penduduk', 'jenis_kelamin', 'total_penduduk']);

type Entry = { id: number; label: string; value: string };

type DraftBlock = Omit<DemographicBlock, 'data'> & { entries: Entry[] };
type DraggedEntry = { blockKey: string; entryId: number };

let entrySeq = 0;

/** "laki_laki" -> "Laki Laki" for display; the stored key keeps its original form. */
function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** "SD/Sederajat" -> "sd_sederajat", so the stored JSON keeps snake_case keys. */
function toKey(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tanpa_nama'
  );
}

function toDraft(block: DemographicBlock): DraftBlock {
  const data = block.data ?? {};
  let entries: Entry[];

  if (Array.isArray(data)) {
    // New ordered-array format: [{label: "SD", value: 412}, ...]
    entries = (data as Array<{ label: string; value: number }>).map((item) => ({
      id: entrySeq++,
      label: String(item.label ?? ''),
      value: String(item.value ?? 0),
    }));
  } else {
    // Legacy map format: {sd: 412, smp: 336, ...} — fixed blocks or old data
    entries = Object.entries(data as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => ({ id: entrySeq++, label: humanize(key), value: String(value) }));
  }

  const { data: _data, ...rest } = block;
  return { ...rest, entries };
}

/**
 * Rebuilds `data`.
 * Fixed blocks keep their original map format so the mobile app can read {value},
 * {laki_laki, perempuan} by key. Non-fixed blocks use an ordered array so the mobile
 * preserves both the admin-entered label text and display order.
 */
function toData(block: DraftBlock, original: DemographicBlock | undefined): unknown {
  if (FIXED_BLOCK_KEYS.has(block.key)) {
    const originalKeys = Object.keys((original?.data ?? {}) as Record<string, unknown>);
    const data: Record<string, number> = {};

    block.entries.forEach((entry, index) => {
      const key = originalKeys[index] ?? toKey(entry.label);
      data[key] = Number(entry.value) || 0;
    });

    return data;
  }

  // Non-fixed: ordered array — label and insertion order both preserved.
  return block.entries
    .filter((e) => e.label.trim())
    .map((e) => ({ label: e.label.trim(), value: Number(e.value) || 0 }));
}

export function DemographicsTab() {
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
  const [draggingEntry, setDraggingEntry] = useState<DraggedEntry | null>(null);
  const [overEntry, setOverEntry] = useState<DraggedEntry | null>(null);
  const markDirty = useMarkDirty();

  const query = useQuery({
    queryKey: ['content', 'demographics'],
    queryFn: listDemographicsRequest,
  });

  useEffect(() => {
    if (query.data) setBlocks(query.data.map(toDraft));
  }, [query.data]);

  useRegisterSave(
    () =>
      updateDemographicsRequest(
        blocks.map((block) => ({
          key: block.key,
          label: block.label,
          type: block.type,
          data: toData(
            block,
            query.data?.find((b) => b.key === block.key),
          ),
          order: block.order,
          // Visibility is owned by the Profil & Visi Misi tab; preserve it here.
          visible: block.visible,
        })),
      ),
    [blocks, query.data],
  );

  function updateBlock(blockKey: string, patch: (block: DraftBlock) => DraftBlock) {
    markDirty();
    setBlocks((prev) => prev.map((block) => (block.key === blockKey ? patch(block) : block)));
  }

  function setEntry(blockKey: string, id: number, field: 'label' | 'value', next: string) {
    updateBlock(blockKey, (block) => ({
      ...block,
      entries: block.entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: next } : entry,
      ),
    }));
  }

  function moveEntry(blockKey: string, index: number, direction: -1 | 1) {
    updateBlock(blockKey, (block) => {
      const target = index + direction;
      if (target < 0 || target >= block.entries.length) return block;

      const entries = [...block.entries];
      const [moved] = entries.splice(index, 1);
      entries.splice(target, 0, moved);

      return { ...block, entries };
    });
  }

  function moveEntryTo(blockKey: string, entryId: number, targetEntryId: number) {
    const currentBlock = blocks.find((block) => block.key === blockKey);
    const from = currentBlock?.entries.findIndex((entry) => entry.id === entryId) ?? -1;
    const to = currentBlock?.entries.findIndex((entry) => entry.id === targetEntryId) ?? -1;

    if (from < 0 || to < 0 || from === to) return;

    markDirty();
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.key !== blockKey) return block;

        const entries = [...block.entries];
        const currentFrom = entries.findIndex((entry) => entry.id === entryId);
        const currentTo = entries.findIndex((entry) => entry.id === targetEntryId);

        if (currentFrom < 0 || currentTo < 0 || currentFrom === currentTo) return block;

        const [moved] = entries.splice(currentFrom, 1);
        entries.splice(currentTo, 0, moved);

        return { ...block, entries };
      }),
    );
  }

  return (
    <div className="content-layout single">
      <div className="content-main">
        {query.isLoading ? <div className="loading-state">Memuat data demografi...</div> : null}

        {blocks.map((block) =>
          FIXED_BLOCK_KEYS.has(block.key) ? (
            <section className="detail-card" key={block.key}>
              <div className="detail-card-head">
                <h2>{block.label}</h2>
              </div>

              <div className="content-form-grid">
                {block.entries.map((entry) => (
                  <div className="field" key={entry.id}>
                    <label htmlFor={`entry-value-${block.key}-${entry.id}`}>
                      {entry.label === 'Value' ? block.label : entry.label}
                    </label>
                    <input
                      id={`entry-value-${block.key}-${entry.id}`}
                      type="number"
                      value={entry.value}
                      onChange={(event) =>
                        setEntry(block.key, entry.id, 'value', event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="detail-card" key={block.key}>
              <div className="detail-card-head">
                <h2>{block.label}</h2>
                <button
                  className="secondary-button"
                  type="button"
                  aria-label={`Tambah baris pada ${block.label}`}
                  onClick={() =>
                    updateBlock(block.key, (b) => ({
                      ...b,
                      entries: [...b.entries, { id: entrySeq++, label: '', value: '0' }],
                    }))
                  }
                >
                  Tambah baris
                </button>
              </div>

              {block.entries.length === 0 ? (
                <p className="empty-state">
                  Blok ini belum memiliki rincian. Tambahkan baris pertama di atas.
                </p>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col" className="col-drag">
                          <span className="visually-hidden">Urutan</span>
                        </th>
                        <th scope="col">Label</th>
                        <th scope="col" className="col-count">
                          Jumlah
                        </th>
                        <th scope="col" className="col-actions">
                          <span className="visually-hidden">Aksi</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {block.entries.map((entry, index) => {
                        const isDragging =
                          draggingEntry?.blockKey === block.key &&
                          draggingEntry.entryId === entry.id;
                        const isDropTarget =
                          overEntry?.blockKey === block.key &&
                          overEntry.entryId === entry.id &&
                          !isDragging;

                        return (
                          <tr
                            key={entry.id}
                            className={[
                              'demographic-row',
                              isDragging ? 'dragging' : '',
                              isDropTarget ? 'drop-target' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onDragOver={(event) => {
                              if (draggingEntry?.blockKey !== block.key) return;
                              event.preventDefault();
                              event.dataTransfer.dropEffect = 'move';
                              setOverEntry({ blockKey: block.key, entryId: entry.id });
                            }}
                            onDrop={(event) => {
                              event.preventDefault();

                              if (draggingEntry?.blockKey === block.key) {
                                moveEntryTo(block.key, draggingEntry.entryId, entry.id);
                              }

                              setDraggingEntry(null);
                              setOverEntry(null);
                            }}
                          >
                            <td className="col-drag">
                              <span
                                className="demographic-drag-handle"
                                draggable
                                title={`Seret ${entry.label || `baris ${index + 1}`}`}
                                aria-hidden="true"
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData('text/plain', String(entry.id));
                                  setDraggingEntry({ blockKey: block.key, entryId: entry.id });
                                }}
                                onDragEnd={() => {
                                  setDraggingEntry(null);
                                  setOverEntry(null);
                                }}
                              >
                                <AppIcon name="filter" />
                              </span>
                            </td>
                            <td>
                              <input
                                className="cell-input"
                                value={entry.label}
                                placeholder="Misalnya SD/Sederajat"
                                aria-label={`${block.label} · Label ${index + 1}`}
                                onChange={(event) =>
                                  setEntry(block.key, entry.id, 'label', event.target.value)
                                }
                              />
                            </td>
                            <td className="col-count">
                              <input
                                className="cell-input"
                                type="number"
                                value={entry.value}
                                aria-label={`${block.label} · Jumlah ${index + 1}`}
                                onChange={(event) =>
                                  setEntry(block.key, entry.id, 'value', event.target.value)
                                }
                              />
                            </td>
                            <td className="col-actions">
                              <div className="demographic-row-actions">
                                <button
                                  className="ghost-button"
                                  type="button"
                                  aria-label={`Naikkan ${entry.label || `baris ${index + 1}`}`}
                                  disabled={index === 0}
                                  onClick={() => moveEntry(block.key, index, -1)}
                                >
                                  <AppIcon name="chevronUp" />
                                </button>
                                <button
                                  className="ghost-button"
                                  type="button"
                                  aria-label={`Turunkan ${entry.label || `baris ${index + 1}`}`}
                                  disabled={index === block.entries.length - 1}
                                  onClick={() => moveEntry(block.key, index, 1)}
                                >
                                  <AppIcon name="chevronDown" />
                                </button>
                                <button
                                  className="ghost-button danger"
                                  type="button"
                                  aria-label={`Hapus ${entry.label || `baris ${index + 1}`}`}
                                  onClick={() =>
                                    updateBlock(block.key, (b) => ({
                                      ...b,
                                      entries: b.entries.filter((e) => e.id !== entry.id),
                                    }))
                                  }
                                >
                                  <AppIcon name="x" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ),
        )}
      </div>
    </div>
  );
}
