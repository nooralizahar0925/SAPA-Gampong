import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStrengthRequest,
  deleteStrengthRequest,
  listStrengthsRequest,
  updateStrengthRequest,
  type VillageStrength,
} from '../../api/client';
import { alertApiError, confirmDelete, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { Modal } from './Modal';

type DraftStrength = {
  id: string | null;
  title: string;
  body: string;
};

const BLANK: DraftStrength = { id: null, title: '', body: '' };

export function StrengthsTab() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftStrength | null>(null);

  const query = useQuery({
    queryKey: ['content', 'strengths'],
    queryFn: listStrengthsRequest,
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'strengths'] });
  }

  const saveMutation = useMutation({
    mutationFn: async (input: DraftStrength) => {
      const payload = { title: input.title.trim(), body: input.body.trim() };

      return input.id
        ? updateStrengthRequest(input.id, payload)
        : createStrengthRequest({ ...payload, order: query.data?.length ?? 0 });
    },
    onSuccess: async (_data, variables) => {
      await invalidate();
      setDraft(null);
      toastSuccess(variables.id ? 'Potensi diperbarui' : 'Potensi ditambahkan');
    },
    onError: (error) => alertApiError(error, 'Potensi gagal disimpan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStrengthRequest,
    onSuccess: async () => {
      await invalidate();
      toastSuccess('Potensi dihapus');
    },
    onError: (error) => alertApiError(error, 'Potensi gagal dihapus.'),
  });

  async function requestDelete(strength: VillageStrength) {
    const confirmed = await confirmDelete({
      title: `Hapus ${strength.title}?`,
      text: 'Potensi ini tidak akan tampil lagi pada aplikasi warga.',
    });

    if (confirmed) deleteMutation.mutate(strength.id);
  }

  const strengths = query.data ?? [];

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Potensi Desa</h2>
            <small className="detail-card-note">
              Ditampilkan sebagai kartu unggulan pada beranda aplikasi warga.
            </small>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDraft({ ...BLANK })}
            >
              Tambah potensi
            </button>
          </div>

          {query.isLoading ? <div className="loading-state">Memuat potensi...</div> : null}

          {strengths.length === 0 && !query.isLoading ? (
            <p className="empty-state">
              Belum ada potensi desa. Tambahkan potensi unggulan agar tampil di aplikasi warga.
            </p>
          ) : null}

          {strengths.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-order">
                      Urutan
                    </th>
                    <th scope="col">Judul</th>
                    <th scope="col">Deskripsi</th>
                    <th scope="col" className="col-actions">
                      <span className="visually-hidden">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {strengths.map((strength, index) => (
                    <tr key={strength.id}>
                      <td>
                        <span className="order-badge">{index + 1}</span>
                      </td>
                      <td>
                        <b>{strength.title}</b>
                      </td>
                      <td className="cell-wrap">{strength.body}</td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <button
                            className="ghost-button"
                            type="button"
                            aria-label={`Ubah ${strength.title}`}
                            onClick={() =>
                              setDraft({
                                id: strength.id,
                                title: strength.title,
                                body: strength.body,
                              })
                            }
                          >
                            <AppIcon name="edit" />
                          </button>
                          <button
                            className="ghost-button danger"
                            type="button"
                            aria-label={`Hapus ${strength.title}`}
                            onClick={() => void requestDelete(strength)}
                          >
                            <AppIcon name="x" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>

      {draft ? (
        <Modal
          title={draft.id ? 'Ubah Potensi' : 'Tambah Potensi'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="secondary-button" type="button" onClick={() => setDraft(null)}>
                Batal
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={!draft.title.trim() || !draft.body.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="modal-form-fields">
            <div className="field">
              <label htmlFor="strength-title">Judul potensi</label>
              <input
                id="strength-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="strength-body">Deskripsi potensi</label>
              <textarea
                id="strength-body"
                rows={4}
                value={draft.body}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, body: event.target.value } : prev))
                }
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
