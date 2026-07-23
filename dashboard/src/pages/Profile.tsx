import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { updateProfileRequest } from '../api/client';
import { getStoredSession, setStoredSession } from '../auth/session';
import { DashboardFrame } from '../components/DashboardFrame';
import { alertApiError, toastSuccess } from '../lib/alerts';

type ProfileForm = {
  name: string;
  current_password: string;
  password: string;
};

export function ProfilePage() {
  const session = getStoredSession();
  const [form, setForm] = useState<ProfileForm>({
    name: session?.user.name ?? '',
    current_password: '',
    password: '',
  });
  const [dirty, setDirty] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateProfileRequest({
        name: form.name.trim(),
        ...(form.password
          ? {
              current_password: form.current_password,
              password: form.password,
            }
          : {}),
      }),
    onSuccess: (user) => {
      if (session) setStoredSession({ token: session.token, user });
      setForm((current) => ({ ...current, current_password: '', password: '' }));
      setDirty(false);
      toastSuccess('Profil tersimpan');
    },
    onError: (error) => alertApiError(error, 'Profil gagal disimpan.'),
  });

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSave =
    Boolean(form.name.trim()) &&
    (!form.password || form.password.length >= 8) &&
    (!form.password || Boolean(form.current_password)) &&
    dirty &&
    !mutation.isPending;

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Profil Pengguna</h1>
            <p>Ubah nama tampilan dan kata sandi akun Anda.</p>
          </div>

          <div className="content-header-actions">
            <span className="content-saved-at">
              {dirty ? 'Ada perubahan belum disimpan' : 'Profil sudah terbaru'}
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!canSave}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <div className="content-layout single">
        <section className="detail-card profile-settings-card">
          <div className="detail-card-head">
            <h2>Detail Akun</h2>
            <span className={`status-pill ${session?.user.active ? 'ready' : 'muted'}`}>
              {session?.user.role === 'admin' ? 'Admin' : 'Operator'}
            </span>
          </div>

          <div className="content-form-grid profile-form-grid">
            <div className="field span-2">
              <label htmlFor="profile-name">Nama</label>
              <input
                id="profile-name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </div>

            <div className="field span-2">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" value={session?.user.email ?? ''} disabled />
            </div>

            <div className="field">
              <label htmlFor="profile-current-password">Kata Sandi Saat Ini</label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(event) => updateField('current_password', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="profile-new-password">Kata Sandi Baru</label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
              />
            </div>
          </div>
        </section>
      </div>
    </DashboardFrame>
  );
}
