import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const MAX_BYTES = 2 * 1024 * 1024;

/** Moves `index` one slot toward `direction`, returning the new id order. */
function reordered(banners: BannerSlide[], index: number, direction: -1 | 1): string[] {
  const next = [...banners];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next.map((b) => b.id);

  [next[index], next[target]] = [next[target], next[index]];
  return next.map((b) => b.id);
}

export function BannerTab() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: ['content', 'banners'],
    queryFn: listBannersRequest,
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'banners'] });
  }

  const reorderMutation = useMutation({
    mutationFn: reorderBannersRequest,
    onSuccess: invalidate,
    onError: (error) => alertApiError(error, 'Urutan banner gagal disimpan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBannerRequest,
    onSuccess: async () => {
      await invalidate();
      toastSuccess('Banner dihapus');
    },
    onError: (error) => alertApiError(error, 'Banner gagal dihapus.'),
  });

  const banners = query.data ?? [];

  /** Upload then immediately create the slide, so one file pick adds one banner. */
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
      await createBannerRequest({ image_file_id: uploaded.file_id, order: banners.length });
      await invalidate();
      toastSuccess('Banner ditambahkan');
    } catch (err) {
      alertApiError(err, 'Banner gagal diunggah.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function requestDelete(index: number, banner: BannerSlide) {
    const confirmed = await confirmDelete({
      title: `Hapus banner ${index + 1}?`,
      text: 'Banner ini tidak akan tampil lagi pada carousel beranda.',
    });

    if (confirmed) deleteMutation.mutate(banner.id);
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
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => reorderMutation.mutate(reordered(banners, index, -1))}
                  >
                    <AppIcon name="chevronUp" />
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    aria-label={`Turunkan banner ${index + 1}`}
                    disabled={index === banners.length - 1 || reorderMutation.isPending}
                    onClick={() => reorderMutation.mutate(reordered(banners, index, 1))}
                  >
                    <AppIcon name="chevronDown" />
                  </button>
                  <button
                    className="ghost-button danger"
                    type="button"
                    aria-label={`Hapus banner ${index + 1}`}
                    disabled={deleteMutation.isPending}
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
