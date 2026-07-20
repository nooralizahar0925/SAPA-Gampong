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
  const data = (block.data ?? {}) as Record<string, unknown>;

  const entries: Entry[] = Object.entries(data)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => ({ id: entrySeq++, label: humanize(key), value: String(value) }));

  const { data: _data, ...rest } = block;
  return { ...rest, entries };
}

/**
 * Rebuilds `data`. Fixed blocks keep their original keys so the citizen app keeps
 * finding `value` / `laki_laki` / `perempuan`; open blocks derive keys from labels.
 */
function toData(block: DraftBlock, original: DemographicBlock | undefined): Record<string, number> {
  if (FIXED_BLOCK_KEYS.has(block.key)) {
    const originalKeys = Object.keys((original?.data ?? {}) as Record<string, unknown>);
    const data: Record<string, number> = {};

    block.entries.forEach((entry, index) => {
      const key = originalKeys[index] ?? toKey(entry.label);
      data[key] = Number(entry.value) || 0;
    });

    return data;
  }

  const data: Record<string, number> = {};

  for (const entry of block.entries) {
    if (!entry.label.trim()) continue;

    let key = toKey(entry.label);
    let suffix = 2;
    while (key in data) key = `${toKey(entry.label)}_${suffix++}`;

    data[key] = Number(entry.value) || 0;
  }

  return data;
}

export function DemographicsTab() {
  const [blocks, setBlocks] = useState<DraftBlock[]>([]);
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
                      {block.entries.map((entry, index) => (
                        <tr key={entry.id}>
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
                          </td>
                        </tr>
                      ))}
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
