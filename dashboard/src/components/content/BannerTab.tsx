import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteBannerRequest,
  listBannersRequest,
  reorderBannersRequest,
  type BannerSlide,
} from '../../api/client';
import { AppIcon } from '../AppIcon';

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

  const query = useQuery({
    queryKey: ['content', 'banners'],
    queryFn: listBannersRequest,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['content', 'banners'] });
  }

  const reorderMutation = useMutation({ mutationFn: reorderBannersRequest, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteBannerRequest, onSuccess: invalidate });

  const banners = query.data ?? [];

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <h2>Banner Beranda</h2>
            <small className="detail-card-note">
              Urutan di sini menentukan urutan tampil pada carousel beranda.
            </small>
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
                    onClick={() => deleteMutation.mutate(banner.id)}
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
