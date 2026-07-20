import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOfficialRequest,
  deleteOfficialRequest,
  listOfficialsRequest,
} from '../../api/client';
import { AppIcon } from '../AppIcon';

export function OfficialsTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const query = useQuery({
    queryKey: ['content', 'officials'],
    queryFn: listOfficialsRequest,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['content', 'officials'] });
  }

  const createMutation = useMutation({
    mutationFn: createOfficialRequest,
    onSuccess: () => {
      setName('');
      setRole('');
      invalidate();
    },
  });

  const deleteMutation = useMutation({ mutationFn: deleteOfficialRequest, onSuccess: invalidate });

  const officials = query.data ?? [];

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Susunan Perangkat</h2>
          </div>

          {query.isLoading ? <div className="loading-state">Memuat perangkat...</div> : null}

          <div className="content-list">
            {officials.map((official) => (
              <div className="content-list-row" key={official.id}>
                <div>
                  <b>{official.name}</b>
                  <small>{official.role}</small>
                </div>
                <button
                  className="ghost-button danger"
                  type="button"
                  aria-label={`Hapus ${official.name}`}
                  onClick={() => deleteMutation.mutate(official.id)}
                >
                  <AppIcon name="x" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Tambah Perangkat</h2>
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="official-name">Nama perangkat</label>
              <input
                id="official-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="official-role">Jabatan</label>
              <input
                id="official-role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </div>
          </div>

          <div className="content-card-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!name.trim() || !role.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  role: role.trim(),
                  order: officials.length,
                })
              }
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Tambah perangkat'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
