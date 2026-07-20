import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStrengthRequest,
  deleteStrengthRequest,
  listStrengthsRequest,
} from '../../api/client';
import { AppIcon } from '../AppIcon';

export function StrengthsTab() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const query = useQuery({
    queryKey: ['content', 'strengths'],
    queryFn: listStrengthsRequest,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['content', 'strengths'] });
  }

  const createMutation = useMutation({
    mutationFn: createStrengthRequest,
    onSuccess: () => {
      setTitle('');
      setBody('');
      invalidate();
    },
  });

  const deleteMutation = useMutation({ mutationFn: deleteStrengthRequest, onSuccess: invalidate });

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
          </div>

          {query.isLoading ? <div className="loading-state">Memuat potensi...</div> : null}

          <div className="content-list">
            {strengths.map((strength) => (
              <div className="content-list-row" key={strength.id}>
                <div>
                  <b>{strength.title}</b>
                  <small>{strength.body}</small>
                </div>
                <button
                  className="ghost-button danger"
                  type="button"
                  aria-label={`Hapus ${strength.title}`}
                  onClick={() => deleteMutation.mutate(strength.id)}
                >
                  <AppIcon name="x" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Tambah Potensi</h2>
          </div>

          <div className="field content-field-wide">
            <label htmlFor="strength-title">Judul potensi</label>
            <input
              id="strength-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="field content-field-wide">
            <label htmlFor="strength-body">Deskripsi potensi</label>
            <textarea
              id="strength-body"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <div className="content-card-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!title.trim() || !body.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  title: title.trim(),
                  body: body.trim(),
                  order: strengths.length,
                })
              }
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Tambah potensi'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
