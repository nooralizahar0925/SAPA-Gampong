import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMosqueRequest,
  deleteMosqueRequest,
  getPrayerConfigRequest,
  listMosquesRequest,
  updatePrayerConfigRequest,
} from '../../api/client';
import { AppIcon } from '../AppIcon';
import { useMarkDirty, useRegisterSave } from './save-context';

export function MosqueTab() {
  const queryClient = useQueryClient();
  const markDirty = useMarkDirty();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [calcMethod, setCalcMethod] = useState('');
  const [timezone, setTimezone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

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
    setLat(data.lat === null ? '' : String(data.lat));
    setLng(data.lng === null ? '' : String(data.lng));
    setCalcMethod(data.calc_method ?? '');
    setTimezone(data.timezone);
  }, [prayerQuery.data]);

  // Only the prayer coordinates participate in the header's save action; the mosque
  // list is immediate CRUD, like the banner and perangkat tabs.
  useRegisterSave(
    () =>
      updatePrayerConfigRequest({
        lat: Number(lat),
        lng: Number(lng),
        calc_method: calcMethod,
        timezone,
      }),
    [lat, lng, calcMethod, timezone],
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['content', 'mosques'] });
  }

  const createMutation = useMutation({
    mutationFn: createMosqueRequest,
    onSuccess: () => {
      setName('');
      setAddress('');
      setLandmark('');
      invalidate();
    },
  });

  const deleteMutation = useMutation({ mutationFn: deleteMosqueRequest, onSuccess: invalidate });

  const mosques = mosquesQuery.data ?? [];

  function tracked(setter: (value: string) => void) {
    return (event: { target: { value: string } }) => {
      markDirty();
      setter(event.target.value);
    };
  }

  return (
    <div className="content-layout">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Koordinat &amp; Metode Perhitungan</h2>
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="prayer-lat">Latitude</label>
              <input id="prayer-lat" value={lat} onChange={tracked(setLat)} />
            </div>
            <div className="field">
              <label htmlFor="prayer-lng">Longitude</label>
              <input id="prayer-lng" value={lng} onChange={tracked(setLng)} />
            </div>
            <div className="field">
              <label htmlFor="prayer-method">Metode perhitungan</label>
              <input id="prayer-method" value={calcMethod} onChange={tracked(setCalcMethod)} />
            </div>
            <div className="field">
              <label htmlFor="prayer-timezone">Zona waktu</label>
              <input id="prayer-timezone" value={timezone} onChange={tracked(setTimezone)} />
            </div>
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Masjid &amp; Meunasah</h2>
          </div>

          <div className="content-list">
            {mosques.map((mosque) => (
              <div className="content-list-row" key={mosque.id}>
                <div>
                  <b>{mosque.name}</b>
                  <small>{mosque.address}</small>
                </div>
                <button
                  className="ghost-button danger"
                  type="button"
                  aria-label={`Hapus ${mosque.name}`}
                  onClick={() => deleteMutation.mutate(mosque.id)}
                >
                  <AppIcon name="x" />
                </button>
              </div>
            ))}
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="mosque-name">Nama masjid</label>
              <input id="mosque-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="mosque-address">Alamat masjid</label>
              <input
                id="mosque-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="mosque-landmark">Patokan (opsional)</label>
              <input
                id="mosque-landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>

          <div className="content-card-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!name.trim() || !address.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  address: address.trim(),
                  landmark: landmark.trim() || null,
                })
              }
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Tambah masjid'}
            </button>
          </div>
        </section>
      </div>

      <aside className="content-aside">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Cara Kerja Jadwal</h2>
          </div>
          <div className="content-aside-body">
            <p className="aside-copy">
              Aplikasi warga menghitung lima waktu shalat langsung di perangkat menggunakan
              koordinat ini, sehingga jadwal tetap tampil tanpa koneksi internet.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
