import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listDemographicsRequest,
  updateDemographicsRequest,
  type DemographicBlock,
} from '../../api/client';
import { useMarkDirty, useRegisterSave } from './save-context';

type DraftBlock = DemographicBlock & { draft: Record<string, number> };

function toDraft(block: DemographicBlock): DraftBlock {
  const data = (block.data ?? {}) as Record<string, unknown>;
  const draft: Record<string, number> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number') draft[key] = value;
  }

  return { ...block, draft };
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
          data: block.draft,
          order: block.order,
          visible: block.visible,
        })),
      ),
    [blocks],
  );

  function setField(blockKey: string, fieldKey: string, value: string) {
    markDirty();
    setBlocks((prev) =>
      prev.map((block) =>
        block.key === blockKey
          ? { ...block, draft: { ...block.draft, [fieldKey]: Number(value) } }
          : block,
      ),
    );
  }

  function toggleVisible(blockKey: string) {
    markDirty();
    setBlocks((prev) =>
      prev.map((block) =>
        block.key === blockKey ? { ...block, visible: !block.visible } : block,
      ),
    );
  }

  return (
    <div className="content-layout single">
      <div className="content-main">
        {query.isLoading ? <div className="loading-state">Memuat data demografi...</div> : null}

        {blocks.map((block) => (
          <section className="detail-card" key={block.key}>
            <div className="detail-card-head">
              <h2>{block.label}</h2>
              <button
                className={`stat-toggle-button${block.visible ? ' on' : ''}`}
                type="button"
                onClick={() => toggleVisible(block.key)}
                aria-pressed={block.visible}
                aria-label={`Tampilkan ${block.label} di aplikasi warga`}
              >
                <span className="stat-toggle-track" />
              </button>
            </div>

            <div className="content-form-grid">
              {Object.entries(block.draft).length === 0 ? (
                <p className="empty-state">Blok ini belum memiliki data angka.</p>
              ) : (
                Object.entries(block.draft).map(([fieldKey, value]) => (
                  <div className="field" key={fieldKey}>
                    <label htmlFor={`block-${block.key}-${fieldKey}`}>
                      {fieldKey === 'value' ? block.label : `${block.label} · ${fieldKey}`}
                    </label>
                    <input
                      id={`block-${block.key}-${fieldKey}`}
                      type="number"
                      value={value}
                      onChange={(event) => setField(block.key, fieldKey, event.target.value)}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
