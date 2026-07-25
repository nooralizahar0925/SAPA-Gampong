import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError, loginRequest } from '../api/client';
import { isAuthenticated, setStoredSession } from '../auth/session';
import { AuthShell } from '../components/AuthShell';

type FormState = {
  email: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<FormState>({
    email: 'admin@gampongblang.id',
    password: 'admin123',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const authReason = (location.state as { reason?: string } | null)?.reason;

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      setFieldErrors({});
      setStoredSession(result);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/requests', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        const nextErrors: FieldErrors = {};
        if (error.fields?.email) nextErrors.email = error.fields.email;
        if (error.fields?.password) nextErrors.password = error.fields.password;
        setFieldErrors(nextErrors);
        return;
      }

      setFieldErrors({});
    },
  });

  if (isAuthenticated()) {
    return <Navigate to="/requests" replace />;
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      email: form.email.trim(),
      password: form.password,
    });
  }

  return (
    <AuthShell
      title="Masuk ke Dashboard"
      copy="Gunakan akun yang diberikan kantor keuchik."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">
            Alamat Email <span className="required">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
          {fieldErrors.email ? <div className="field-error">{fieldErrors.email}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="password">
            Kata Sandi <span className="required">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
          />
          {fieldErrors.password ? <div className="field-error">{fieldErrors.password}</div> : null}
        </div>

        <div className="login-form-row">
          <label className="remember-toggle">
            <input type="checkbox" checked readOnly />
            <span className="remember-box checked" aria-hidden="true" />
            Ingat saya
          </label>
          <Link className="text-link" to="/forgot-password">
            Lupa kata sandi?
          </Link>
        </div>

        {mutation.isError ? (
          <div className="error-box" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Tidak dapat memproses login saat ini.'}
          </div>
        ) : null}

        {!mutation.isError && authReason === 'auth-required' ? (
          <div className="info-box" role="status">
            Sesi login berakhir. Silakan masuk kembali.
          </div>
        ) : null}

        <button
          className="primary-button login-submit"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Masuk...' : 'Masuk'}
        </button>

        <div className="info-box" role="note">
          <strong>Akses terbatas</strong>
          <p>
            Hanya perangkat gampong yang terdaftar. Seluruh tindakan persetujuan tercatat dalam
            jejak audit.
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
