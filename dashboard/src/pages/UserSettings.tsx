import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserRequest,
  listUsersRequest,
  updateUserRequest,
  type ManagedUser,
  type UserRole,
} from '../api/client';
import { getStoredSession, setStoredSession } from '../auth/session';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import { SettingsTabs } from '../components/SettingsTabs';
import { alertApiError, toastSuccess } from '../lib/alerts';

type UserForm = {
  name: string;
  email: string;
  password: string;
  active: boolean;
  role: UserRole;
};

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  password: '',
  active: true,
  role: 'operator',
};

export function UserSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: listUsersRequest,
  });

  const users = query.data ?? [];
  const selected = selectedId === 'new' ? null : users.find((user) => user.id === selectedId) ?? null;
  const isNew = selectedId === 'new';

  useEffect(() => {
    if (selectedId === 'new') {
      setForm(EMPTY_FORM);
      setDirty(false);
      return;
    }

    const next = users.find((user) => user.id === selectedId);
    if (!next) return;

    setForm({
      name: next.name,
      email: next.email,
      password: '',
      active: next.active,
      role: next.role,
    });
    setDirty(false);
  }, [selectedId, users]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isNew) {
        return createUserRequest({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          active: form.active,
          role: form.role,
        });
      }

      return updateUserRequest(selectedId, {
        name: form.name.trim(),
        email: form.email.trim(),
        ...(form.password ? { password: form.password } : {}),
        active: form.active,
        role: form.role,
      });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      syncStoredUser(saved);
      setSelectedId(saved.id);
      setDirty(false);
      toastSuccess('Akun pengguna tersimpan');
    },
    onError: (error) => alertApiError(error, 'Akun pengguna gagal disimpan.'),
  });

  function updateField<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSave =
    Boolean(form.name.trim()) &&
    Boolean(form.email.trim()) &&
    (isNew ? form.password.length >= 8 : true) &&
    dirty &&
    !saveMutation.isPending;

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Akun Pengguna</h1>
            <p>Kelola akses dashboard untuk Admin dan Operator.</p>
          </div>

          <div className="content-header-actions">
            <span className="content-saved-at">
              {dirty ? 'Ada perubahan belum disimpan' : 'Pilih akun untuk mengubah akses'}
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!canSave}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <SettingsTabs />

      {query.isLoading ? <div className="loading-state">Memuat akun pengguna...</div> : null}

      <div className="content-layout">
        <div className="content-main">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Daftar Akun</h2>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => setSelectedId('new')}
              >
                <AppIcon name="users" />
                Tambah akun
              </button>
            </div>

            <div className="user-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`user-list-item${selectedId === user.id ? ' active' : ''}`}
                  type="button"
                  onClick={() => setSelectedId(user.id)}
                >
                  <span className="dashboard-user-avatar">{initials(user.name)}</span>
                  <span>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </span>
                  <span className={`status-pill ${user.active ? 'ready' : 'muted'}`}>
                    {user.active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="content-aside wide">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>{isNew ? 'Tambah Akun' : `Edit ${selected?.name ?? 'Akun'}`}</h2>
            </div>

            <div className="content-form-grid user-form-grid">
              <div className="field span-2">
                <label htmlFor="user-name">Nama</label>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>

              <div className="field span-2">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </div>

              <div className="field span-2">
                <label htmlFor="user-password">
                  Kata Sandi {isNew ? '' : <span className="muted-label">(kosongkan jika tidak diubah)</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
              </div>

              <label className="template-toggle span-2 user-status-toggle">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Status akun"
                  checked={form.active}
                  onChange={(event) => updateField('active', event.target.checked)}
                />
                <span className="template-toggle-control" aria-hidden="true" />
                <span className="template-toggle-copy">
                  <b>Status akun: {form.active ? 'Aktif' : 'Tidak Aktif'}</b>
                  <small>
                    {form.active
                      ? 'Pengguna dapat masuk dan menggunakan dashboard.'
                      : 'Pengguna tidak dapat masuk sampai akun diaktifkan kembali.'}
                  </small>
                </span>
              </label>

              <fieldset className="role-picker span-2">
                <legend>Role</legend>
                <div className="role-options" role="radiogroup" aria-label="Role pengguna">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.role === 'admin'}
                    className={`role-option${form.role === 'admin' ? ' selected' : ''}`}
                    onClick={() => updateField('role', 'admin')}
                  >
                    <span className="role-option-icon">
                      <AppIcon name="lock" />
                    </span>
                    <span>
                      <b>Admin</b>
                      <small>Akses penuh termasuk Sistem dan Akun Pengguna.</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.role === 'operator'}
                    className={`role-option${form.role === 'operator' ? ' selected' : ''}`}
                    onClick={() => updateField('role', 'operator')}
                  >
                    <span className="role-option-icon">
                      <AppIcon name="users" />
                    </span>
                    <span>
                      <b>Operator</b>
                      <small>Akses operasional dan konten, tanpa bagian Sistem.</small>
                    </span>
                  </button>
                </div>
              </fieldset>
            </div>
          </section>
        </aside>
      </div>
    </DashboardFrame>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function syncStoredUser(user: ManagedUser) {
  const session = getStoredSession();
  if (!session || session.user.id !== user.id) return;
  setStoredSession({
    token: session.token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    },
  });
}
