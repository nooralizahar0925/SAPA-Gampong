import { useMemo, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../api/client';
import { AuthShell } from '../components/AuthShell';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const mutation = useMutation({
    mutationFn: resetPasswordRequest,
    onSuccess: () => {
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setLocalError('Token reset tidak ditemukan pada tautan ini.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Kata sandi baru minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Konfirmasi kata sandi belum sama.');
      return;
    }

    setLocalError(null);
    mutation.mutate({ token, password });
  }

  return (
    <AuthShell
      title="Atur Ulang Kata Sandi"
      copy="Buat kata sandi baru untuk akun dashboard Anda."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="new-password">
            Kata Sandi Baru <span className="required">*</span>
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="confirm-password">
            Konfirmasi Kata Sandi <span className="required">*</span>
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {localError ? (
          <div className="error-box" role="alert">
            {localError}
          </div>
        ) : null}

        {mutation.isError ? (
          <div className="error-box" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Reset kata sandi gagal diproses.'}
          </div>
        ) : null}

        {mutation.isSuccess ? (
          <div className="success-box" role="status">
            <strong>{mutation.data.message}</strong>
            <p>Silakan gunakan kata sandi baru Anda untuk masuk kembali ke dashboard.</p>
          </div>
        ) : null}

        <button
          className="primary-button login-submit"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
        </button>

        <div className="auth-inline-links">
          <Link className="text-link" to="/login">
            Kembali ke login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
