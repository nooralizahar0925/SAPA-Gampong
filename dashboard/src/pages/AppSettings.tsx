import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAppSettingsRequest,
  getLetterCountersRequest,
  updateAppSettingsRequest,
  updateLetterCounterRequest,
  type AppSettings,
  type LetterTypeCode,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';

type FeedbackState = { tone: 'success' | 'error'; body: string } | null;

type SettingsForm = Omit<AppSettings, 'updated_at'>;

const EMPTY_FORM: SettingsForm = {
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  letterhead_line1: '',
  letterhead_line2: '',
  letterhead_line3: '',
  keuchik_title: '',
  keuchik_name: '',
  secretary_title: '',
  secretary_name: '',
};

const FIELD_LABELS: Array<{ key: keyof SettingsForm; label: string; group: 'contact' | 'letterhead' | 'signatory' }> = [
  { key: 'contact_phone', label: 'Nomor telepon kantor', group: 'contact' },
  { key: 'contact_email', label: 'Email kantor', group: 'contact' },
  { key: 'contact_address', label: 'Alamat kantor', group: 'contact' },
  { key: 'letterhead_line1', label: 'Kop surat baris 1', group: 'letterhead' },
  { key: 'letterhead_line2', label: 'Kop surat baris 2', group: 'letterhead' },
  { key: 'letterhead_line3', label: 'Kop surat baris 3', group: 'letterhead' },
  { key: 'keuchik_title', label: 'Jabatan keuchik', group: 'signatory' },
  { key: 'keuchik_name', label: 'Nama keuchik', group: 'signatory' },
  { key: 'secretary_title', label: 'Jabatan sekretaris', group: 'signatory' },
  { key: 'secretary_name', label: 'Nama sekretaris', group: 'signatory' },
];

export function AppSettingsPage() {
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [counters, setCounters] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings', 'app'],
    queryFn: getAppSettingsRequest,
  });

  const countersQuery = useQuery({
    queryKey: ['settings', 'letter-counters', year],
    queryFn: () => getLetterCountersRequest(year),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const data = settingsQuery.data;
    setForm({
      contact_phone: data.contact_phone ?? '',
      contact_email: data.contact_email ?? '',
      contact_address: data.contact_address ?? '',
      letterhead_line1: data.letterhead_line1 ?? '',
      letterhead_line2: data.letterhead_line2 ?? '',
      letterhead_line3: data.letterhead_line3 ?? '',
      keuchik_title: data.keuchik_title ?? '',
      keuchik_name: data.keuchik_name ?? '',
      secretary_title: data.secretary_title ?? '',
      secretary_name: data.secretary_name ?? '',
    });
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!countersQuery.data) return;
    setCounters(
      Object.fromEntries(
        countersQuery.data.counters.map((c) => [c.letter_type, String(c.last_number)]),
      ),
    );
  }, [countersQuery.data]);

  function onError(fallback: string) {
    return (error: unknown) =>
      setFeedback({
        tone: 'error',
        body: error instanceof Error ? error.message : fallback,
      });
  }

  const settingsMutation = useMutation({
    mutationFn: updateAppSettingsRequest,
    onSuccess: () => {
      setFeedback({ tone: 'success', body: 'Pengaturan aplikasi berhasil disimpan.' });
      queryClient.invalidateQueries({ queryKey: ['settings', 'app'] });
    },
    onError: onError('Pengaturan aplikasi gagal disimpan.'),
  });

  const counterMutation = useMutation({
    mutationFn: updateLetterCounterRequest,
    onSuccess: () => {
      setFeedback({ tone: 'success', body: 'Nomor surat berhasil diperbarui.' });
      queryClient.invalidateQueries({ queryKey: ['settings', 'letter-counters', year] });
    },
    onError: onError('Nomor surat gagal diperbarui.'),
  });

  function renderGroup(group: 'contact' | 'letterhead' | 'signatory') {
    return FIELD_LABELS.filter((entry) => entry.group === group).map((entry) => (
      <div className="field" key={entry.key}>
        <label htmlFor={`setting-${entry.key}`}>{entry.label}</label>
        <input
          id={`setting-${entry.key}`}
          value={form[entry.key] ?? ''}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, [entry.key]: event.target.value }))
          }
        />
      </div>
    ));
  }

  return (
    <DashboardFrame
      header={
        <div className="dashboard-topbar-copy">
          <h1>Pengaturan Aplikasi</h1>
          <p>Kontak kantor, kop surat, penanda tangan, dan nomor surat terakhir per jenis.</p>
        </div>
      }
    >
      {settingsQuery.isLoading ? <div className="loading-state">Memuat pengaturan...</div> : null}

      {feedback ? (
        <div className={feedback.tone === 'success' ? 'success-box' : 'error-box'} role="status">
          <p>{feedback.body}</p>
        </div>
      ) : null}

      <section className="detail-card">
        <div className="detail-card-head">
          <h2>Kontak Kantor</h2>
        </div>
        <div className="content-form-grid">{renderGroup('contact')}</div>
      </section>

      <section className="detail-card">
        <div className="detail-card-head">
          <h2>Kop Surat</h2>
        </div>
        <div className="content-form-grid">{renderGroup('letterhead')}</div>
      </section>

      <section className="detail-card">
        <div className="detail-card-head">
          <h2>Penanda Tangan</h2>
        </div>
        <div className="content-form-grid">{renderGroup('signatory')}</div>

        <button
          className="primary-button"
          type="button"
          disabled={settingsMutation.isPending}
          onClick={() => settingsMutation.mutate(form)}
        >
          {settingsMutation.isPending ? 'Menyimpan...' : 'Simpan pengaturan'}
        </button>
      </section>

      <section className="detail-card">
        <div className="detail-card-head">
          <h2>Nomor Surat Terakhir ({year})</h2>
        </div>

        {countersQuery.isLoading ? <div className="loading-state">Memuat nomor surat...</div> : null}

        <div className="content-form-grid">
          {(countersQuery.data?.counters ?? []).map((counter) => (
            <div className="counter-row" key={counter.letter_type}>
              <div className="field">
                <label htmlFor={`counter-${counter.letter_type}`}>
                  Nomor terakhir {counter.letter_type}
                </label>
                <input
                  id={`counter-${counter.letter_type}`}
                  type="number"
                  value={counters[counter.letter_type] ?? ''}
                  onChange={(event) =>
                    setCounters((prev) => ({
                      ...prev,
                      [counter.letter_type]: event.target.value,
                    }))
                  }
                />
              </div>
              <button
                className="secondary-button"
                type="button"
                disabled={counterMutation.isPending}
                onClick={() =>
                  counterMutation.mutate({
                    letter_type: counter.letter_type as LetterTypeCode,
                    year,
                    last_number: Number(counters[counter.letter_type] ?? 0),
                  })
                }
              >
                Simpan nomor {counter.letter_type}
              </button>
            </div>
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}
