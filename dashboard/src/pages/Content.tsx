import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardFrame } from '../components/DashboardFrame';
import { alertApiError, toastSuccess } from '../lib/alerts';
import { formatSavedAt } from '../lib/format';
import { BannerTab } from '../components/content/BannerTab';
import { DemographicsTab } from '../components/content/DemographicsTab';
import { GalleryTab } from '../components/content/GalleryTab';
import { MosqueTab } from '../components/content/MosqueTab';
import { OfficialsTab } from '../components/content/OfficialsTab';
import { ProfileTab } from '../components/content/ProfileTab';
import { StrengthsTab } from '../components/content/StrengthsTab';
import { ContentSaveContext, type SaveHandler } from '../components/content/save-context';

export type ContentTabId =
  | 'banner'
  | 'galeri'
  | 'profil'
  | 'perangkat'
  | 'masjid'
  | 'demografi'
  | 'potensi';

const TABS: Array<{ id: ContentTabId; label: string; slug: string }> = [
  { id: 'banner', label: 'Banner', slug: 'banners' },
  { id: 'galeri', label: 'Galeri', slug: 'gallery' },
  { id: 'profil', label: 'Profil & Visi Misi', slug: 'profile' },
  { id: 'perangkat', label: 'Perangkat', slug: 'officials' },
  { id: 'masjid', label: 'Masjid & Sholat', slug: 'mosques' },
  { id: 'demografi', label: 'Demografi', slug: 'demographics' },
  { id: 'potensi', label: 'Potensi Desa', slug: 'strengths' },
];

function tabFromSlug(slug: string | undefined): ContentTabId {
  return TABS.find((tab) => tab.slug === slug)?.id ?? 'banner';
}

export function ContentPage() {
  const { tab: tabSlug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeTab = tabFromSlug(tabSlug);

  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Each tab registers how to persist itself. The header owns the single save action
   * (per the approved design), so tabs expose a handler instead of their own button.
   */
  const [saveHandler, setSaveHandler] = useState<SaveHandler | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(false);
    setSaveHandler(null);
  }, [activeTab]);

  const saveContext = useMemo(
    () => ({
      register: (handler: SaveHandler | null) => setSaveHandler(() => handler),
      markDirty: () => setDirty(true),
    }),
    [],
  );

  async function saveChanges() {
    if (!saveHandler) return;

    setSaving(true);

    try {
      await saveHandler();
      setSavedAt(new Date());
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toastSuccess('Perubahan tersimpan');
    } catch (err) {
      alertApiError(err, 'Perubahan gagal disimpan.');
    } finally {
      setSaving(false);
    }
  }

  const savedLabel = formatSavedAt(savedAt);

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Manajemen Konten</h1>
            <p>Perubahan tersimpan langsung tampil di aplikasi warga</p>
          </div>

          <div className="content-header-actions">
            <span className="content-saved-at">
              {savedLabel ? `Terakhir disimpan ${savedLabel}` : 'Belum ada perubahan tersimpan'}
            </span>
            <button
              className="primary-button"
              type="button"
              onClick={saveChanges}
              disabled={saving || !saveHandler || !dirty}
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <div className="content-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={`content-tab${tab.id === activeTab ? ' active' : ''}`}
            onClick={() => navigate(`/content/${tab.slug}`)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {dirty && !saving ? (
        <p className="content-dirty-hint">Ada perubahan yang belum disimpan.</p>
      ) : null}

      <ContentSaveContext.Provider value={saveContext}>
        {activeTab === 'banner' ? <BannerTab /> : null}
        {activeTab === 'galeri' ? <GalleryTab /> : null}
        {activeTab === 'profil' ? <ProfileTab /> : null}
        {activeTab === 'perangkat' ? <OfficialsTab /> : null}
        {activeTab === 'masjid' ? <MosqueTab /> : null}
        {activeTab === 'demografi' ? <DemographicsTab /> : null}
        {activeTab === 'potensi' ? <StrengthsTab /> : null}
      </ContentSaveContext.Provider>
    </DashboardFrame>
  );
}
