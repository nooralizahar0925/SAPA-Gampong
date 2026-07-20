import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOfficialRequest,
  deleteOfficialRequest,
  listOfficialsRequest,
  updateOfficialRequest,
  type Official,
} from '../../api/client';
import { alertApiError, confirmDelete, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { ImagePicker } from './ImagePicker';
import { Modal } from './Modal';

type DraftOfficial = {
  id: string | null;
  name: string;
  role: string;
  photo_file_id: string | null;
  photo_url: string | null;
  is_leadership_highlight: boolean;
};

const BLANK: DraftOfficial = {
  id: null,
  name: '',
  role: '',
  photo_file_id: null,
  photo_url: null,
  is_leadership_highlight: false,
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function OfficialsTab() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftOfficial | null>(null);

  const query = useQuery({
    queryKey: ['content', 'officials'],
    queryFn: listOfficialsRequest,
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'officials'] });
  }

  const saveMutation = useMutation({
    mutationFn: async (input: DraftOfficial) => {
      const payload = {
        name: input.name.trim(),
        role: input.role.trim(),
        photo_file_id: input.photo_file_id,
        is_leadership_highlight: input.is_leadership_highlight,
      };

      return input.id
        ? updateOfficialRequest(input.id, payload)
        : createOfficialRequest({ ...payload, order: (query.data?.length ?? 0) });
    },
    onSuccess: async (_data, variables) => {
      await invalidate();
      setDraft(null);
      toastSuccess(variables.id ? 'Perangkat diperbarui' : 'Perangkat ditambahkan');
    },
    onError: (error) => alertApiError(error, 'Perangkat gagal disimpan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOfficialRequest,
    onSuccess: async () => {
      await invalidate();
      toastSuccess('Perangkat dihapus');
    },
    onError: (error) => alertApiError(error, 'Perangkat gagal dihapus.'),
  });

  async function requestDelete(official: Official) {
    const confirmed = await confirmDelete({
      title: `Hapus ${official.name}?`,
      text: `${official.role} akan dihapus dari susunan perangkat gampong.`,
    });

    if (confirmed) deleteMutation.mutate(official.id);
  }

  const officials = query.data ?? [];

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Susunan Perangkat</h2>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDraft({ ...BLANK })}
            >
              Tambah perangkat
            </button>
          </div>

          {query.isLoading ? <div className="loading-state">Memuat perangkat...</div> : null}

          {officials.length === 0 && !query.isLoading ? (
            <p className="empty-state">
              Belum ada perangkat gampong. Tambahkan Keuchik dan jajarannya agar tampil di
              aplikasi warga.
            </p>
          ) : null}

          {officials.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-photo">
                      Foto
                    </th>
                    <th scope="col">Nama</th>
                    <th scope="col">Jabatan</th>
                    <th scope="col">Sorotan</th>
                    <th scope="col" className="col-actions">
                      <span className="visually-hidden">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {officials.map((official) => (
                    <tr key={official.id}>
                      <td>
                        {official.photo_url ? (
                          <img className="avatar" src={official.photo_url} alt="" />
                        ) : (
                          <span className="avatar avatar-fallback" aria-hidden="true">
                            {initials(official.name) || <AppIcon name="users" />}
                          </span>
                        )}
                      </td>
                      <td>
                        <b>{official.name}</b>
                      </td>
                      <td>{official.role}</td>
                      <td>
                        {official.is_leadership_highlight ? (
                          <span className="pill">Pimpinan</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <button
                            className="ghost-button"
                            type="button"
                            aria-label={`Ubah ${official.name}`}
                            onClick={() =>
                              setDraft({
                                id: official.id,
                                name: official.name,
                                role: official.role,
                                photo_file_id: official.photo_file_id,
                                photo_url: official.photo_url,
                                is_leadership_highlight: official.is_leadership_highlight,
                              })
                            }
                          >
                            <AppIcon name="edit" />
                          </button>
                          <button
                            className="ghost-button danger"
                            type="button"
                            aria-label={`Hapus ${official.name}`}
                            onClick={() => void requestDelete(official)}
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
          title={draft.id ? 'Ubah Perangkat' : 'Tambah Perangkat'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="secondary-button" type="button" onClick={() => setDraft(null)}>
                Batal
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={!draft.name.trim() || !draft.role.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(draft)}
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="modal-form">
            <div className="modal-form-photo">
              <ImagePicker
                imageUrl={draft.photo_url}
                aspect="1 / 1"
                inputId="official-photo"
                buttonLabel={draft.photo_url ? 'Ganti foto' : 'Unggah foto'}
                onUploaded={(fileId, url) =>
                  setDraft((prev) =>
                    prev ? { ...prev, photo_file_id: fileId, photo_url: url } : prev,
                  )
                }
              />
            </div>

            <div className="modal-form-fields">
              <div className="field">
                <label htmlFor="official-name">Nama perangkat</label>
                <input
                  id="official-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="official-role">Jabatan</label>
                <input
                  id="official-role"
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((prev) => (prev ? { ...prev, role: event.target.value } : prev))
                  }
                />
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={draft.is_leadership_highlight}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, is_leadership_highlight: event.target.checked } : prev,
                    )
                  }
                />
                <span>Tampilkan sebagai pimpinan gampong</span>
              </label>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
