import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBannerRequest,
  deleteBannerRequest,
  listBannersRequest,
  reorderBannersRequest,
  uploadFileRequest,
  type BannerSlide,
} from '../../api/client';
import { alertApiError, confirmDelete, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { useMarkDirty, useRegisterSave } from './save-context';

const MAX_BYTES = 2 * 1024 * 1024;

type DraftBanner = BannerSlide & {
  isNew?: boolean;
  localId: string;
};

/** Moves `index` one slot toward `direction`, returning the new local list. */
function reordered(banners: DraftBanner[], index: number, direction: -1 | 1): DraftBanner[] {
  const next = [...banners];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;

  [next[index], next[target]] = [next[target], next[index]];
  return next.map((banner, order) => ({ ...banner, order }));
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function BannerTab() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const tempSeq = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [drafts, setDrafts] = useState<DraftBanner[]>([]);
  const markDirty = useMarkDirty();

  const query = useQuery({
    queryKey: ['content', 'banners'],
    queryFn: listBannersRequest,
  });

  useEffect(() => {
    if (!query.data) return;
    setDrafts(query.data.map((banner) => ({ ...banner, localId: banner.id })));
  }, [query.data]);

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'banners'] });
  }

  useRegisterSave(async () => {
    const original = query.data ?? [];
    const originalIds = original.map((banner) => banner.id);
    const keptOriginalIds = drafts.filter((banner) => !banner.isNew).map((banner) => banner.id);
    const deletedIds = originalIds.filter((id) => !keptOriginalIds.includes(id));
    const createdIds = new Map<string, string>();

    for (const id of deletedIds) {
      await deleteBannerRequest(id);
    }

    for (const [index, banner] of drafts.entries()) {
      if (!banner.isNew) continue;
      const created = await createBannerRequest({
        image_file_id: banner.image_file_id,
        order: index,
        active: banner.active,
      });
      createdIds.set(banner.localId, created.id);
    }

    const finalIds = drafts.map((banner) =>
      banner.isNew ? createdIds.get(banner.localId)! : banner.id,
    );

    if (finalIds.length > 0 && !sameOrder(finalIds, originalIds)) {
      await reorderBannersRequest(finalIds);
    }

    await invalidate();
  }, [drafts, query.data]);

  const banners = drafts;

  /** Upload the file now, then stage the banner row until the header save is pressed. */
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alertApiError({ message: 'Banner harus berupa gambar (JPG, PNG, atau WebP).' });
      return;
    }

    if (file.size > MAX_BYTES) {
      alertApiError({ message: 'Ukuran banner melebihi 2 MB. Perkecil gambar lalu coba lagi.' });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFileRequest(file, 'photo');
      const localId = `new-banner-${Date.now()}-${tempSeq.current++}`;
      setDrafts((prev) => [
        ...prev,
        {
          id: localId,
          localId,
          isNew: true,
          image_file_id: uploaded.file_id,
          image_url: uploaded.url,
          link_url: null,
          order: prev.length,
          active: true,
          start_at: null,
          end_at: null,
        },
      ]);
      markDirty();
      toastSuccess('Banner siap disimpan');
    } catch (err) {
      alertApiError(err, 'Banner gagal diunggah.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function moveBanner(index: number, direction: -1 | 1) {
    markDirty();
    setDrafts((prev) => reordered(prev, index, direction));
  }

  async function requestDelete(index: number, banner: DraftBanner) {
    const confirmed = await confirmDelete({
      title: `Hapus banner ${index + 1}?`,
      text: 'Banner ini tidak akan tampil lagi pada carousel beranda.',
    });

    if (confirmed) {
      markDirty();
      setDrafts((prev) =>
        prev
          .filter((item) => item.localId !== banner.localId)
          .map((item, order) => ({ ...item, order })),
      );
    }
  }

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Banner Beranda</h2>
            <small className="detail-card-note">
              Urutan di sini menentukan urutan tampil pada carousel beranda.
            </small>
            <input
              ref={inputRef}
              id="banner-upload"
              className="visually-hidden"
              type="file"
              accept="image/*"
              aria-label="Unggah banner"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <button
              className="secondary-button"
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <AppIcon name="image" />
              {uploading ? 'Mengunggah...' : 'Unggah banner'}
            </button>
          </div>

          {query.isLoading ? <div className="loading-state">Memuat banner...</div> : null}

          {banners.length === 0 && !query.isLoading ? (
            <p className="empty-state">
              Belum ada banner. Unggah gambar untuk mulai mengisi carousel beranda.
            </p>
          ) : null}

          <div className="banner-list">
            {banners.map((banner, index) => (
              <div className="banner-row" data-testid="banner-row" key={banner.id}>
                {banner.image_url ? (
                  <img className="banner-thumb" src={banner.image_url} alt="" />
                ) : (
                  <div className="banner-thumb banner-thumb-empty">
                    <AppIcon name="image" />
                  </div>
                )}

                <div className="banner-row-meta">
                  <b>Urutan {banner.order + 1}</b>
                  <small>{banner.active ? 'Aktif' : 'Nonaktif'}</small>
                </div>

                <div className="banner-row-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    aria-label={`Naikkan banner ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => moveBanner(index, -1)}
                  >
                    <AppIcon name="chevronUp" />
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    aria-label={`Turunkan banner ${index + 1}`}
                    disabled={index === banners.length - 1}
                    onClick={() => moveBanner(index, 1)}
                  >
                    <AppIcon name="chevronDown" />
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    aria-label={`Hapus banner ${index + 1}`}
                    onClick={() => void requestDelete(index, banner)}
                  >
                    <AppIcon name="x" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
