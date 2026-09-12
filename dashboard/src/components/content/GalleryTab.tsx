import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGalleryItemRequest,
  deleteGalleryItemRequest,
  listGalleryItemsRequest,
  reorderGalleryItemsRequest,
  updateGalleryItemRequest,
  uploadFileRequest,
  type GalleryItem,
  type GalleryMediaType,
} from '../../api/client';
import { alertApiError, confirmDelete, toastSuccess } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';
import { useMarkDirty, useRegisterSave } from './save-context';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

type DraftGalleryItem = GalleryItem & {
  isNew?: boolean;
  localId: string;
};

function reordered(items: DraftGalleryItem[], index: number, direction: -1 | 1): DraftGalleryItem[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;

  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function mediaTypeFor(file: File): GalleryMediaType | null {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type === 'video/mp4' || file.type === 'video/webm' || file.type === 'video/quicktime') return 'video';
  return null;
}

function titleFromFilename(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Dokumentasi kegiatan';
}

function hasChanged(current: DraftGalleryItem, original: GalleryItem) {
  return (
    current.media_type !== original.media_type ||
    current.file_id !== original.file_id ||
    current.title !== original.title ||
    current.caption !== original.caption ||
    current.order !== original.order ||
    current.active !== original.active
  );
}

export function GalleryTab() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const tempSeq = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [drafts, setDrafts] = useState<DraftGalleryItem[]>([]);
  const markDirty = useMarkDirty();

  const query = useQuery({
    queryKey: ['content', 'gallery'],
    queryFn: listGalleryItemsRequest,
  });

  useEffect(() => {
    if (!query.data) return;
    setDrafts(query.data.map((item) => ({ ...item, localId: item.id })));
  }, [query.data]);

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['content', 'gallery'] });
  }

  useRegisterSave(async () => {
    const emptyTitle = drafts.find((item) => item.title.trim().length === 0);
    if (emptyTitle) {
      throw new Error('Judul media galeri wajib diisi.');
    }

    const original = query.data ?? [];
    const originalById = new Map(original.map((item) => [item.id, item]));
    const originalIds = original.map((item) => item.id);
    const keptOriginalIds = drafts.filter((item) => !item.isNew).map((item) => item.id);
    const deletedIds = originalIds.filter((id) => !keptOriginalIds.includes(id));
    const createdIds = new Map<string, string>();

    for (const id of deletedIds) {
      await deleteGalleryItemRequest(id);
    }

    for (const [index, item] of drafts.entries()) {
      if (!item.isNew) continue;
      const created = await createGalleryItemRequest({
        media_type: item.media_type,
        file_id: item.file_id,
        title: item.title.trim(),
        caption: item.caption?.trim() || null,
        order: index,
        active: item.active,
      });
      createdIds.set(item.localId, created.id);
    }

    for (const item of drafts) {
      if (item.isNew) continue;
      const originalItem = originalById.get(item.id);
      if (!originalItem || !hasChanged(item, originalItem)) continue;
      await updateGalleryItemRequest(item.id, {
        title: item.title.trim(),
        caption: item.caption?.trim() || null,
        order: item.order,
        active: item.active,
      });
    }

    const finalIds = drafts.map((item) => (item.isNew ? createdIds.get(item.localId)! : item.id));
    if (finalIds.length > 0 && !sameOrder(finalIds, originalIds)) {
      await reorderGalleryItemsRequest(finalIds);
    }

    await invalidate();
  }, [drafts, query.data]);

  async function handleFile(file: File) {
    const mediaType = mediaTypeFor(file);
    if (!mediaType) {
      alertApiError({ message: 'Media galeri harus berupa gambar atau video MP4/WebM/MOV.' });
      return;
    }

    const maxBytes = mediaType === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      alertApiError({
        message: mediaType === 'photo'
          ? 'Ukuran foto melebihi 5 MB. Perkecil gambar lalu coba lagi.'
          : 'Ukuran video melebihi 50 MB. Kompres video lalu coba lagi.',
      });
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFileRequest(file, mediaType === 'photo' ? 'photo' : 'video');
      const localId = `new-gallery-${Date.now()}-${tempSeq.current++}`;
      setDrafts((prev) => [
        ...prev,
        {
          id: localId,
          localId,
          isNew: true,
          media_type: mediaType,
          file_id: uploaded.file_id,
          media_url: uploaded.url,
          title: titleFromFilename(file.name),
          caption: null,
          order: prev.length,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      markDirty();
      toastSuccess('Media siap disimpan');
    } catch (err) {
      alertApiError(err, 'Media galeri gagal diunggah.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function updateDraft(localId: string, patch: Partial<DraftGalleryItem>) {
    markDirty();
    setDrafts((prev) => prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  function moveItem(index: number, direction: -1 | 1) {
    markDirty();
    setDrafts((prev) => reordered(prev, index, direction));
  }

  async function requestDelete(item: DraftGalleryItem) {
    const confirmed = await confirmDelete({
      title: `Hapus ${item.media_type === 'photo' ? 'foto' : 'video'} ini?`,
      text: 'Media ini tidak akan tampil lagi di galeri aplikasi warga.',
    });

    if (confirmed) {
      markDirty();
      setDrafts((prev) =>
        prev
          .filter((current) => current.localId !== item.localId)
          .map((current, order) => ({ ...current, order })),
      );
    }
  }

  return (
    <div className="content-layout single">
      <div className="content-main">
        <section className="detail-card">
          <div className="detail-card-head">
            <div>
              <h2>Galeri Foto & Video</h2>
              <small className="detail-card-note">
                Tampilkan dokumentasi kegiatan gampong dalam urutan yang paling relevan untuk warga.
              </small>
            </div>
            <input
              ref={inputRef}
              id="gallery-upload"
              className="visually-hidden"
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              aria-label="Unggah media galeri"
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
              {uploading ? 'Mengunggah...' : 'Unggah media'}
            </button>
          </div>

          {query.isLoading ? <div className="loading-state">Memuat galeri...</div> : null}

          {drafts.length === 0 && !query.isLoading ? (
            <p className="empty-state">
              Belum ada media galeri. Unggah foto atau video kegiatan untuk mulai mengisi galeri warga.
            </p>
          ) : null}

          <div className="gallery-editor-grid">
            {drafts.map((item, index) => (
              <article className="gallery-editor-card" data-testid="gallery-card" key={item.localId}>
                <div className="gallery-editor-preview">
                  {item.media_type === 'photo' && item.media_url ? (
                    <img src={item.media_url} alt="" />
                  ) : null}
                  {item.media_type === 'video' && item.media_url ? (
                    <video src={item.media_url} controls preload="metadata" />
                  ) : null}
                  {!item.media_url ? (
                    <div className="gallery-editor-empty">
                      <AppIcon name={item.media_type === 'photo' ? 'image' : 'video'} />
                    </div>
                  ) : null}
                  <span className="gallery-media-badge">
                    <AppIcon name={item.media_type === 'photo' ? 'image' : 'video'} />
                    {item.media_type === 'photo' ? 'Foto' : 'Video'}
                  </span>
                </div>

                <div className="gallery-editor-fields">
                  <label className="field">
                    <span>Judul</span>
                    <input
                      value={item.title}
                      maxLength={160}
                      onChange={(event) => updateDraft(item.localId, { title: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Keterangan</span>
                    <textarea
                      rows={3}
                      value={item.caption ?? ''}
                      maxLength={1000}
                      onChange={(event) => updateDraft(item.localId, { caption: event.target.value || null })}
                    />
                  </label>
                </div>

                <div className="gallery-editor-actions">
                  <label className="gallery-publish-toggle">
                    <input
                      type="checkbox"
                      checked={item.active}
                      onChange={(event) => updateDraft(item.localId, { active: event.target.checked })}
                    />
                    <span>{item.active ? 'Tampil' : 'Disembunyikan'}</span>
                  </label>
                  <div className="banner-row-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      aria-label={`Naikkan media ${index + 1}`}
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      <AppIcon name="chevronUp" />
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      aria-label={`Turunkan media ${index + 1}`}
                      disabled={index === drafts.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      <AppIcon name="chevronDown" />
                    </button>
                    <button
                      className="ghost-button danger"
                      type="button"
                      aria-label={`Hapus media ${index + 1}`}
                      onClick={() => void requestDelete(item)}
                    >
                      <AppIcon name="x" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
