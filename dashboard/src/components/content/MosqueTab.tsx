import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMosqueRequest,
  deleteMosqueRequest,
  getPrayerConfigRequest,
  listMosquesRequest,
  updateMosqueRequest,
  updatePrayerConfigRequest,
  type Mosque,
} from '../../api/client';
import { alertApiError, confirmDelete, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { Modal } from './Modal';
import { useMarkDirty, useRegisterSave } from './save-context';

type PrayerForm = {
  lat: string;
  lng: string;
  calc_method: string;
  timezone: string;
  fajr_angle: string;
  isha_angle: string;
  school: string;
  fallback_subuh: string;
  fallback_dhuhur: string;
  fallback_ashar: string;
  fallback_maghrib: string;
  fallback_isya: string;
};

const EMPTY_PRAYER: PrayerForm = {
  lat: '',
  lng: '',
  calc_method: '',
  timezone: 'Asia/Jakarta',
  fajr_angle: '20',
  isha_angle: '18',
  school: '0',
  fallback_subuh: '',
  fallback_dhuhur: '',
  fallback_ashar: '',
  fallback_maghrib: '',
  fallback_isya: '',
};

type DraftMosque = {
  id: string | null;
  name: string;
  address: string;
  landmark: string;
};

const BLANK_MOSQUE: DraftMosque = { id: null, name: '', address: '', landmark: '' };

const FALLBACK_FIELDS: Array<{ key: keyof PrayerForm; label: string }> = [
  { key: 'fallback_subuh', label: 'Subuh' },
  { key: 'fallback_dhuhur', label: 'Dzuhur' },
  { key: 'fallback_ashar', label: 'Ashar' },
  { key: 'fallback_maghrib', label: 'Maghrib' },
  { key: 'fallback_isya', label: 'Isya' },
];

export function MosqueTab() {
  const queryClient = useQueryClient();
  const markDirty = useMarkDirty();
  const [prayer, setPrayer] = useState<PrayerForm>(EMPTY_PRAYER);
  const [draft, setDraft] = useState<DraftMosque | null>(null);

  const prayerQuery = useQuery({
    queryKey: ['content', 'prayer-config'],
    queryFn: getPrayerConfigRequest,
  });

  const mosquesQuery = useQuery({
    queryKey: ['content', 'mosques'],
    queryFn: listMosquesRequest,
  });

  useEffect(() => {
    if (!prayerQuery.data) return;
    const data = prayerQuery.data;
    setPrayer({
      lat: data.lat === null ? '' : String(data.lat),
      lng: data.lng === null ? '' : String(data.lng),
      calc_method: data.calc_method ?? '',
      timezone: data.timezone,
      fajr_angle: String(data.fajr_angle),
      isha_angle: String(data.isha_angle),
      school: String(data.school),
      fallback_subuh: data.fallback_times.subuh ?? '',
      fallback_dhuhur: data.fallback_times.dhuhur ?? '',
      fallback_ashar: data.fallback_times.ashar ?? '',
      fallback_maghrib: data.fallback_times.maghrib ?? '',
      fallback_isya: data.fallback_times.isya ?? '',
    });
  }, [prayerQuery.data]);

  // Only the prayer settings ride the header save; the mosque table is immediate CRUD.
  useRegisterSave(
    () =>
      updatePrayerConfigRequest({
        ...(prayer.lat.trim() ? { lat: Number(prayer.lat) } : {}),
        ...(prayer.lng.trim() ? { lng: Number(prayer.lng) } : {}),
        ...(prayer.calc_method.trim() ? { calc_method: prayer.calc_method.trim() } : {}),
        ...(prayer.timezone.trim() ? { timezone: prayer.timezone.trim() } : {}),
        fajr_angle: Number(prayer.fajr_angle),
        isha_angle: Number(prayer.isha_angle),
        school: Number(prayer.school),
        fallback_subuh: prayer.fallback_subuh || null,
        fallback_dhuhur: prayer.fallback_dhuhur || null,
        fallback_ashar: prayer.fallback_ashar || null,
        fallback_maghrib: prayer.fallback_maghrib || null,
        fallback_isya: prayer.fallback_isya || null,
      }),
    [prayer],
  );

  function invalidateMosques() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'mosques'] });
  }

  const saveMosque = useMutation({
    mutationFn: async (input: DraftMosque) => {
      const payload = {
        name: input.name.trim(),
        address: input.address.trim(),
        landmark: input.landmark.trim() || null,
      };

      return input.id ? updateMosqueRequest(input.id, payload) : createMosqueRequest(payload);
    },
    onSuccess: async (_data, variables) => {
      await invalidateMosques();
      setDraft(null);
      toastSuccess(variables.id ? 'Masjid diperbarui' : 'Masjid ditambahkan');
    },
    onError: (error) => alertApiError(error, 'Masjid gagal disimpan.'),
  });

  const deleteMosque = useMutation({
    mutationFn: deleteMosqueRequest,
    onSuccess: async () => {
      await invalidateMosques();
      toastSuccess('Masjid dihapus');
    },
    onError: (error) => alertApiError(error, 'Masjid gagal dihapus.'),
  });

  async function requestDelete(mosque: Mosque) {
    const confirmed = await confirmDelete({
      title: `Hapus ${mosque.name}?`,
      text: 'Data masjid ini akan hilang dari aplikasi warga.',
    });

    if (confirmed) deleteMosque.mutate(mosque.id);
  }

  function prayerField(key: keyof PrayerForm) {
    return {
      value: prayer[key],
      onChange: (event: { target: { value: string } }) => {
        markDirty();
        setPrayer((prev) => ({ ...prev, [key]: event.target.value }));
      },
    };
  }

  const mosques = mosquesQuery.data ?? [];

  return (
    <div className="content-layout">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Koordinat &amp; Metode Perhitungan</h2>
            <small className="detail-card-note">Dipakai saat aplikasi warga daring.</small>
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="prayer-lat">Latitude gampong</label>
              <input id="prayer-lat" {...prayerField('lat')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-lng">Longitude gampong</label>
              <input id="prayer-lng" {...prayerField('lng')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-method">Nama metode</label>
              <input id="prayer-method" {...prayerField('calc_method')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-timezone">Zona waktu</label>
              <input id="prayer-timezone" {...prayerField('timezone')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-fajr">Sudut Subuh (°)</label>
              <input id="prayer-fajr" type="number" step="0.5" {...prayerField('fajr_angle')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-isha">Sudut Isya (°)</label>
              <input id="prayer-isha" type="number" step="0.5" {...prayerField('isha_angle')} />
            </div>
            <div className="field">
              <label htmlFor="prayer-school">Mazhab Ashar</label>
              <select id="prayer-school" className="field-select" {...prayerField('school')}>
                <option value="0">Syafi'i (standar)</option>
                <option value="1">Hanafi</option>
              </select>
            </div>
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Jadwal Cadangan (Luring)</h2>
            <small className="detail-card-note">
              Dipakai saat perangkat warga tidak punya koneksi.
            </small>
          </div>

          <div className="content-form-grid">
            {FALLBACK_FIELDS.map((entry) => (
              <div className="field" key={entry.key}>
                <label htmlFor={`prayer-${entry.key}`}>{entry.label}</label>
                <input
                  id={`prayer-${entry.key}`}
                  type="time"
                  {...prayerField(entry.key)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Masjid &amp; Meunasah</h2>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setDraft({ ...BLANK_MOSQUE })}
            >
              Tambah masjid
            </button>
          </div>

          {mosquesQuery.isLoading ? <div className="loading-state">Memuat masjid...</div> : null}

          {mosques.length === 0 && !mosquesQuery.isLoading ? (
            <p className="empty-state">Belum ada masjid atau meunasah yang terdaftar.</p>
          ) : null}

          {mosques.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Nama</th>
                    <th scope="col">Alamat</th>
                    <th scope="col">Patokan</th>
                    <th scope="col" className="col-actions">
                      <span className="visually-hidden">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mosques.map((mosque) => (
                    <tr key={mosque.id}>
                      <td>
                        <b>{mosque.name}</b>
                      </td>
                      <td>{mosque.address}</td>
                      <td>{mosque.landmark ?? <span className="text-muted">—</span>}</td>
                      <td className="col-actions">
                        <div className="row-actions">
                          <button
                            className="ghost-button"
                            type="button"
                            aria-label={`Ubah ${mosque.name}`}
                            onClick={() =>
                              setDraft({
                                id: mosque.id,
                                name: mosque.name,
                                address: mosque.address,
                                landmark: mosque.landmark ?? '',
                              })
                            }
                          >
                            <AppIcon name="edit" />
                          </button>
                          <button
                            className="ghost-button danger"
                            type="button"
                            aria-label={`Hapus ${mosque.name}`}
                            onClick={() => void requestDelete(mosque)}
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

      <aside className="content-aside">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Cara Kerja Jadwal</h2>
          </div>
          <div className="content-aside-body">
            <p className="aside-copy">
              <b>Daring:</b> aplikasi warga memakai GPS perangkat dan mengambil jadwal dari
              Aladhan memakai sudut dan mazhab di sebelah kiri.
            </p>
            <p className="aside-copy">
              <b>Luring:</b> saat tidak ada koneksi, aplikasi menampilkan Jadwal Cadangan di atas
              beserta koordinat gampong — bukan angka bawaan aplikasi.
            </p>
          </div>
        </section>
      </aside>

      {draft ? (
        <Modal
          title={draft.id ? 'Ubah Masjid' : 'Tambah Masjid'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className="secondary-button" type="button" onClick={() => setDraft(null)}>
                Batal
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={!draft.name.trim() || !draft.address.trim() || saveMosque.isPending}
                onClick={() => saveMosque.mutate(draft)}
              >
                {saveMosque.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="modal-form-fields">
            <div className="field">
              <label htmlFor="mosque-name">Nama masjid</label>
              <input
                id="mosque-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="mosque-address">Alamat masjid</label>
              <input
                id="mosque-address"
                value={draft.address}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, address: event.target.value } : prev))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="mosque-landmark">Patokan (opsional)</label>
              <input
                id="mosque-landmark"
                value={draft.landmark}
                onChange={(event) =>
                  setDraft((prev) => (prev ? { ...prev, landmark: event.target.value } : prev))
                }
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
