import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAppSettingsRequest,
  getLetterCountersRequest,
  listLetterTypesRequest,
  updateAppSettingsRequest,
  updateLetterCounterRequest,
  type AppSettings,
  type LetterTypeCode,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { SettingsTabs } from '../components/SettingsTabs';
import { alertApiError, toastSuccess } from '../lib/alerts';

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

type FieldSpec = {
  key: keyof SettingsForm;
  label: string;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
};

const CONTACT_FIELDS: FieldSpec[] = [
  { key: 'contact_phone', label: 'Nomor telepon kantor', placeholder: '+62 812 3456 789' },
  { key: 'contact_email', label: 'Email kantor', placeholder: 'gampongblang@acehjaya.go.id' },
  {
    key: 'contact_address',
    label: 'Alamat kantor',
    placeholder: 'Jl. Pesisir No. 1, Gampong Blang',
    wide: true,
  },
];

const LETTERHEAD_FIELDS: FieldSpec[] = [
  { key: 'letterhead_line1', label: 'Baris 1', placeholder: 'PEMERINTAH KABUPATEN ACEH JAYA' },
  { key: 'letterhead_line2', label: 'Baris 2', placeholder: 'KECAMATAN KRUENG SABEE' },
  { key: 'letterhead_line3', label: 'Baris 3', placeholder: 'GAMPONG BLANG' },
];

const SIGNATORY_FIELDS: FieldSpec[] = [
  { key: 'keuchik_title', label: 'Jabatan keuchik', placeholder: 'Keuchik Gampong Blang' },
  { key: 'keuchik_name', label: 'Nama keuchik', placeholder: 'SOFIAN' },
  {
    key: 'secretary_title',
    label: 'Jabatan sekretaris',
    placeholder: 'Sekretaris Gampong a.n. Keuchik',
  },
  { key: 'secretary_name', label: 'Nama sekretaris', placeholder: 'AFZALUL ZIKRI, S.P' },
];

/**
 * Counters are per year, so an admin needs to reach past years to correct a number and
 * the coming year to prepare it. Five back and one forward covers real use without a
 * free-text field that could hit the API's 2000-2200 bound.
 */
const YEAR_OPTIONS = (currentYear: number) =>
  Array.from({ length: 7 }, (_, index) => currentYear + 1 - index);

export function AppSettingsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [counters, setCounters] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [countersDirty, setCountersDirty] = useState<Set<string>>(new Set());

  const settingsQuery = useQuery({
    queryKey: ['settings', 'app'],
    queryFn: getAppSettingsRequest,
  });

  const countersQuery = useQuery({
    queryKey: ['settings', 'letter-counters', year],
    queryFn: () => getLetterCountersRequest(year),
  });

  // Letter names come from the catalog; a bare "L1" means nothing to an admin.
  const letterTypesQuery = useQuery({
    queryKey: ['letter-types'],
    queryFn: listLetterTypesRequest,
  });

  const letterNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of letterTypesQuery.data ?? []) map.set(type.code, type.name);
    return map;
  }, [letterTypesQuery.data]);

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
    setDirty(false);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!countersQuery.data) return;
    setCounters(
      Object.fromEntries(
        countersQuery.data.counters.map((c) => [c.letter_type, String(c.last_number)]),
      ),
    );
    setCountersDirty(new Set());
  }, [countersQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: updateAppSettingsRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'app'] });
      toastSuccess('Pengaturan tersimpan');
    },
    onError: (error) => alertApiError(error, 'Pengaturan gagal disimpan.'),
  });

  /**
   * Saves every counter the admin actually touched in one action, instead of asking
   * them to press ten near-identical buttons.
   */
  const countersMutation = useMutation({
    mutationFn: async (changed: string[]) => {
      for (const letterType of changed) {
        await updateLetterCounterRequest({
          letter_type: letterType as LetterTypeCode,
          year,
          last_number: Number(counters[letterType] ?? 0),
        });
      }
    },
    onSuccess: async (_data, changed) => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'letter-counters', year] });
      toastSuccess(
        changed.length === 1
          ? `Nomor ${changed[0]} diperbarui`
          : `${changed.length} nomor surat diperbarui`,
      );
    },
    onError: (error) => alertApiError(error, 'Nomor surat gagal diperbarui.'),
  });

  function setField(key: keyof SettingsForm, value: string) {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCounter(letterType: string, value: string) {
    setCounters((prev) => ({ ...prev, [letterType]: value }));
    setCountersDirty((prev) => new Set(prev).add(letterType));
  }

  function renderFields(fields: FieldSpec[]) {
    return fields.map((field) => (
      <div className={`field${field.wide ? ' span-2' : ''}`} key={field.key}>
        <label htmlFor={`setting-${field.key}`}>{field.label}</label>
        <input
          id={`setting-${field.key}`}
          value={form[field.key] ?? ''}
          placeholder={field.placeholder}
          onChange={(event) => setField(field.key, event.target.value)}
        />
        {field.hint ? <small className="field-hint">{field.hint}</small> : null}
      </div>
    ));
  }

  const letterheadLines = [form.letterhead_line1, form.letterhead_line2, form.letterhead_line3]
    .map((line) => line?.trim())
    .filter(Boolean) as string[];

  const changedCounters = [...countersDirty];

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Pengaturan</h1>
            <p>Identitas kantor, kop surat, penanda tangan, dan penomoran surat.</p>
          </div>

          <div className="content-header-actions">
            {dirty ? <span className="content-saved-at">Ada perubahan belum disimpan</span> : null}
            <button
              className="primary-button"
              type="button"
              disabled={!dirty || settingsMutation.isPending}
              onClick={() => settingsMutation.mutate(form)}
            >
              {settingsMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <SettingsTabs />

      {settingsQuery.isLoading ? <div className="loading-state">Memuat pengaturan...</div> : null}

      <div className="content-layout">
        <div className="content-main">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Kontak Kantor</h2>
              <small className="detail-card-note">
                Ditampilkan pada halaman kontak aplikasi warga.
              </small>
            </div>
            <div className="content-form-grid">{renderFields(CONTACT_FIELDS)}</div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Kop Surat</h2>
              <small className="detail-card-note">Tiga baris di atas badan surat.</small>
            </div>
            <div className="content-form-grid">{renderFields(LETTERHEAD_FIELDS)}</div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Penanda Tangan</h2>
              <small className="detail-card-note">
                Nama dan jabatan yang tercetak pada blok tanda tangan surat.
              </small>
            </div>
            <div className="content-form-grid">{renderFields(SIGNATORY_FIELDS)}</div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Penomoran Surat</h2>
              <small className="detail-card-note">
                Nomor terakhir yang sudah terpakai. Surat berikutnya melanjutkan dari angka ini.
              </small>

              <div className="card-head-controls">
                <label className="inline-field">
                  <span>Tahun</span>
                  <select
                    className="field-select compact"
                    value={year}
                    aria-label="Tahun penomoran surat"
                    onChange={(event) => setYear(Number(event.target.value))}
                  >
                    {YEAR_OPTIONS(currentYear).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="secondary-button"
                  type="button"
                  disabled={changedCounters.length === 0 || countersMutation.isPending}
                  onClick={() => countersMutation.mutate(changedCounters)}
                >
                  {countersMutation.isPending
                    ? 'Menyimpan...'
                    : `Simpan nomor${changedCounters.length ? ` (${changedCounters.length})` : ''}`}
                </button>
              </div>
            </div>

            {year !== currentYear ? (
              <p className="card-inline-note">
                Menampilkan tahun {year}. Penomoran berjalan memakai tahun {currentYear}.
              </p>
            ) : null}

            {countersQuery.isLoading ? (
              <div className="loading-state">Memuat nomor surat...</div>
            ) : null}

            {countersQuery.data ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col" className="col-code">
                        Kode
                      </th>
                      <th scope="col">Jenis Surat</th>
                      <th scope="col" className="col-count">
                        Nomor Terakhir
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {countersQuery.data.counters.map((counter) => (
                      <tr key={counter.letter_type}>
                        <td>
                          <span className="pill">{counter.letter_type}</span>
                        </td>
                        <td>{letterNames.get(counter.letter_type) ?? '—'}</td>
                        <td className="col-count">
                          <input
                            className="cell-input"
                            id={`counter-${counter.letter_type}`}
                            type="number"
                            min={0}
                            value={counters[counter.letter_type] ?? ''}
                            aria-label={`Nomor terakhir ${counter.letter_type}`}
                            onChange={(event) =>
                              setCounter(counter.letter_type, event.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="content-aside">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Pratinjau Kop Surat</h2>
            </div>
            <div className="content-aside-body">
              <div className="letterhead-preview">
                {letterheadLines.length > 0 ? (
                  letterheadLines.map((line, index) => (
                    <p key={index} className={index === letterheadLines.length - 1 ? 'strong' : ''}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="muted">Isi baris kop surat untuk melihat pratinjau.</p>
                )}
                <span className="letterhead-rule" />
                {form.contact_address ? <small>{form.contact_address}</small> : null}
                {form.contact_phone || form.contact_email ? (
                  <small>
                    {[form.contact_phone, form.contact_email].filter(Boolean).join(' · ')}
                  </small>
                ) : null}
              </div>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Blok Tanda Tangan</h2>
            </div>
            <div className="content-aside-body">
              <div className="signature-preview">
                <small>{form.keuchik_title || 'Jabatan keuchik belum diisi'}</small>
                <b>{form.keuchik_name || '—'}</b>
              </div>
              <div className="signature-preview">
                <small>{form.secretary_title || 'Jabatan sekretaris belum diisi'}</small>
                <b>{form.secretary_name || '—'}</b>
              </div>
              <small className="field-hint">
                Blok ini belum dipakai oleh generator PDF; surat masih memakai nama bawaan.
              </small>
            </div>
          </section>
        </aside>
      </div>
    </DashboardFrame>
  );
}
