import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVillageProfileRequest,
  getVisionMissionRequest,
  listDemographicsRequest,
  updateDemographicsRequest,
  updateVillageProfileRequest,
  updateVisionMissionRequest,
  type DemographicBlock,
} from '../../api/client';
import { alertApiError, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { ImagePicker } from './ImagePicker';
import { ReorderableList } from './ReorderableList';
import { useMarkDirty, useRegisterSave } from './save-context';

type ProfileForm = {
  name: string;
  kemukiman: string;
  kecamatan: string;
  kabupaten: string;
  area_size: string;
  elevation: string;
  contact_phone: string;
  email: string;
  description: string;
  map_lat: string;
  map_lng: string;
  vision: string;
  missions: string[];
};

const EMPTY: ProfileForm = {
  name: '',
  kemukiman: '',
  kecamatan: '',
  kabupaten: '',
  area_size: '',
  elevation: '',
  contact_phone: '',
  email: '',
  description: '',
  map_lat: '',
  map_lng: '',
  vision: '',
  missions: [],
};

const DESCRIPTION_LIMIT = 600;

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProfileTab() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const markDirty = useMarkDirty();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['content', 'profile'],
    queryFn: getVillageProfileRequest,
  });

  const visionQuery = useQuery({
    queryKey: ['content', 'vision-mission'],
    queryFn: getVisionMissionRequest,
  });

  const demographicsQuery = useQuery({
    queryKey: ['content', 'demographics'],
    queryFn: listDemographicsRequest,
  });

  /**
   * A switch is an immediate action, not pending form state, so it persists on click
   * rather than waiting for the header's save button.
   */
  const toggleVisibility = useMutation({
    mutationFn: (block: DemographicBlock) =>
      updateDemographicsRequest([
        {
          key: block.key,
          label: block.label,
          type: block.type,
          data: block.data,
          order: block.order,
          visible: !block.visible,
        },
      ]),
    onSuccess: async (_data, block) => {
      await queryClient.invalidateQueries({ queryKey: ['content', 'demographics'] });
      toastSuccess(
        block.visible ? `${block.label} disembunyikan` : `${block.label} ditampilkan`,
      );
    },
    onError: (error) => alertApiError(error, 'Status blok gagal diubah.'),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const data = profileQuery.data;
    setForm((prev) => ({
      ...prev,
      name: data.name ?? '',
      kemukiman: data.kemukiman ?? '',
      kecamatan: data.kecamatan ?? '',
      kabupaten: data.kabupaten ?? '',
      area_size: data.area_size ?? '',
      elevation: data.elevation ?? '',
      contact_phone: data.contact_phone ?? '',
      email: data.email ?? '',
      description: data.description ?? '',
      map_lat: data.map_lat === null ? '' : String(data.map_lat),
      map_lng: data.map_lng === null ? '' : String(data.map_lng),
    }));
  }, [profileQuery.data]);

  useEffect(() => {
    if (!visionQuery.data) return;
    setForm((prev) => ({
      ...prev,
      vision: visionQuery.data.vision ?? '',
      missions: visionQuery.data.missions,
    }));
  }, [visionQuery.data]);

  useRegisterSave(async () => {
    // Required columns are omitted rather than sent blank: the API rejects empty
    // strings for name/kecamatan/kabupaten, and an untouched field should not be
    // part of the PATCH at all.
    const required = {
      ...(form.name.trim() ? { name: form.name.trim() } : {}),
      ...(form.kecamatan.trim() ? { kecamatan: form.kecamatan.trim() } : {}),
      ...(form.kabupaten.trim() ? { kabupaten: form.kabupaten.trim() } : {}),
    };

    await updateVillageProfileRequest({
      ...required,
      kemukiman: form.kemukiman || null,
      area_size: form.area_size || null,
      elevation: form.elevation || null,
      contact_phone: form.contact_phone || null,
      email: form.email || null,
      description: form.description || null,
      map_lat: optionalNumber(form.map_lat),
      map_lng: optionalNumber(form.map_lng),
    });

    const missions = form.missions.filter((line) => line.trim().length > 0);

    await updateVisionMissionRequest({
      ...(form.vision.trim() ? { vision: form.vision.trim() } : {}),
      missions,
    });
  }, [form]);

  function field(key: keyof ProfileForm) {
    return {
      value: form[key],
      onChange: (event: { target: { value: string } }) => {
        markDirty();
        setForm((prev) => ({ ...prev, [key]: event.target.value }));
      },
    };
  }

  const blocks = demographicsQuery.data ?? [];
  const hiddenBlocks = blocks.filter((block) => !block.visible);

  return (
    <div className="content-layout">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Identitas Gampong</h2>
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="profile-name">
                Nama Desa <span className="required">*</span>
              </label>
              <input id="profile-name" {...field('name')} />
            </div>
            <div className="field">
              <label htmlFor="profile-kemukiman">Kemukiman</label>
              <input id="profile-kemukiman" {...field('kemukiman')} />
            </div>
            <div className="field">
              <label htmlFor="profile-kecamatan">
                Kecamatan <span className="required">*</span>
              </label>
              <input id="profile-kecamatan" {...field('kecamatan')} />
            </div>
            <div className="field">
              <label htmlFor="profile-kabupaten">
                Kabupaten <span className="required">*</span>
              </label>
              <input id="profile-kabupaten" {...field('kabupaten')} />
            </div>
            <div className="field">
              <label htmlFor="profile-area">Luas Wilayah</label>
              <input id="profile-area" placeholder="1.300 ha" {...field('area_size')} />
            </div>
            <div className="field">
              <label htmlFor="profile-elevation">Ketinggian</label>
              <input
                id="profile-elevation"
                placeholder="3,4 mdpl · dataran rendah"
                {...field('elevation')}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-phone">
                Kontak Kantor Desa <span className="required">*</span>
              </label>
              <input id="profile-phone" {...field('contact_phone')} />
            </div>
            <div className="field">
              <label htmlFor="profile-email">
                Email Resmi <span className="required">*</span>
              </label>
              <input id="profile-email" type="email" {...field('email')} />
            </div>
          </div>

          <div className="field content-field-wide">
            <label htmlFor="profile-description">Deskripsi / Sejarah Singkat</label>
            <textarea id="profile-description" rows={5} {...field('description')} />
            <small className="field-hint">
              Ditampilkan pada layar Profil Desa aplikasi warga. Disarankan maksimal{' '}
              {DESCRIPTION_LIMIT} karakter.
            </small>
          </div>

          <div className="content-form-grid">
            <div className="field">
              <label htmlFor="profile-lat">Titik Lokasi Kantor — Lintang</label>
              <input id="profile-lat" {...field('map_lat')} />
            </div>
            <div className="field">
              <label htmlFor="profile-lng">Titik Lokasi Kantor — Bujur</label>
              <input id="profile-lng" {...field('map_lng')} />
            </div>
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Visi &amp; Misi</h2>
          </div>

          <div className="field content-field-wide">
            <label htmlFor="profile-vision">Visi</label>
            <textarea id="profile-vision" rows={3} {...field('vision')} />
          </div>

          <div className="field content-field-wide">
            <span className="field-label">Misi</span>
            <ReorderableList
              items={form.missions}
              onChange={(missions) => {
                markDirty();
                setForm((prev) => ({ ...prev, missions }));
              }}
              placeholder="Tulis satu misi gampong"
              addLabel="Tambah misi"
              itemNoun="misi"
            />
            <small className="field-hint">
              Seret untuk mengubah urutan. Urutan ini dipakai pada layar Profil Desa.
            </small>
          </div>
        </section>
      </div>

      <aside className="content-aside">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Foto Header Profil</h2>
          </div>

          <div className="content-aside-body">
            <ImagePicker
              imageUrl={profileQuery.data?.photo_url ?? null}
              aspect="16 / 9"
              buttonLabel={profileQuery.data?.photo_url ? 'Ganti Foto' : 'Unggah Foto'}
              inputId="profile-photo"
              onUploaded={async (fileId) => {
                await updateVillageProfileRequest({ photo_file_id: fileId });
                await queryClient.invalidateQueries({ queryKey: ['content', 'profile'] });
                toastSuccess('Foto header diperbarui');
              }}
            />
            <small className="field-hint">
              Disarankan rasio 16:9, minimal 1280×720 px, maksimal 2 MB.
            </small>
          </div>
        </section>

        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Blok Statistik Demografi</h2>
          </div>

          <div className="content-aside-body">
            {blocks.length === 0 ? (
              <p className="empty-state">Belum ada blok statistik.</p>
            ) : (
              <div className="stat-block-list">
                {blocks.map((block) => (
                  <div
                    className={`stat-block-row${block.visible ? '' : ' muted'}`}
                    key={block.key}
                  >
                    <span className="stat-block-grip" aria-hidden="true">
                      <AppIcon name="filter" />
                    </span>
                    <div className="stat-block-meta">
                      <b>{block.label}</b>
                      <small>{summarize(block.data)}</small>
                    </div>
                    <button
                      className={`stat-toggle-button${block.visible ? ' on' : ''}`}
                      type="button"
                      aria-pressed={block.visible}
                      aria-label={`Tampilkan ${block.label} di aplikasi warga`}
                      disabled={toggleVisibility.isPending}
                      onClick={() => toggleVisibility.mutate(block)}
                    >
                      <span className="stat-toggle-track" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hiddenBlocks.length > 0 ? (
              <div className="notice-card">
                <AppIcon name="warning" />
                <div>
                  <b>{hiddenBlocks[0].label} belum diisi</b>
                  <small>
                    Blok ini disembunyikan dari aplikasi warga sampai datanya dilengkapi pada tab
                    Demografi.
                  </small>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

/** Renders a stat block's `data` as a short "620 L / 620 P"-style caption. */
function summarize(data: unknown): string {
  if (!data || typeof data !== 'object') return 'data belum tersedia';

  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, value]) => typeof value === 'number',
  );

  if (entries.length === 0) return 'data belum tersedia';
  if (entries.length === 1) return String(entries[0][1]);

  return entries.map(([key, value]) => `${value} ${key.replace(/_/g, ' ')}`).join(' · ');
}
