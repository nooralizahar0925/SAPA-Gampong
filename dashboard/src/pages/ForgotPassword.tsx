import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../api/client';
import { AuthShell } from '../components/AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('admin@gampongblang.id');

  const mutation = useMutation({
    mutationFn: forgotPasswordRequest,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ email: email.trim() });
  }

  return (
    <AuthShell
      title="Lupa Kata Sandi"
      copy="Masukkan email admin untuk menerima tautan reset kata sandi."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="forgot-email">
            Alamat Email <span className="required">*</span>
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {mutation.isSuccess ? (
          <div className="success-box" role="status">
            <strong>{mutation.data.message}</strong>
            {mutation.data.reset_url ? (
              <p>
                Mode pengembangan aktif. Buka tautan ini untuk lanjut reset:
                <br />
                <a href={mutation.data.reset_url}>{mutation.data.reset_url}</a>
              </p>
            ) : (
              <p>Periksa inbox email admin Anda, lalu buka tautan yang dikirim oleh sistem.</p>
            )}
          </div>
        ) : null}

        {mutation.isError ? (
          <div className="error-box" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Permintaan reset kata sandi gagal diproses.'}
          </div>
        ) : null}

        <button
          className="primary-button login-submit"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Mengirim...' : 'Kirim Tautan Reset'}
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
