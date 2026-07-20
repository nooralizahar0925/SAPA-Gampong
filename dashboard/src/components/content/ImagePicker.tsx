import { useRef, useState } from 'react';
import { uploadFileRequest } from '../../api/client';
import { alertApiError } from '../../lib/alerts';
import { AppIcon } from '../AppIcon';

type ImagePickerProps = {
  imageUrl: string | null;
  /** CSS aspect-ratio for the preview box, e.g. "16 / 9" or "1 / 1". */
  aspect: string;
  buttonLabel: string;
  inputId: string;
  onUploaded: (fileId: string, url: string) => Promise<void> | void;
};

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Uploads an image to POST /uploads and hands the resulting file id back. Shows the
 * current image when there is one and a placeholder when there is not, so a missing
 * photo reads as "not set yet" rather than as a broken image.
 */
export function ImagePicker({
  imageUrl,
  aspect,
  buttonLabel,
  inputId,
  onUploaded,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alertApiError({ message: 'Berkas harus berupa gambar (JPG, PNG, atau WebP).' });
      return;
    }

    if (file.size > MAX_BYTES) {
      alertApiError({ message: 'Ukuran gambar melebihi 2 MB. Perkecil gambar lalu coba lagi.' });
      return;
    }

    setBusy(true);
    try {
      const uploaded = await uploadFileRequest(file, 'photo');
      await onUploaded(uploaded.file_id, uploaded.url);
    } catch (err) {
      alertApiError(err, 'Gambar gagal diunggah.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="image-picker">
      <div className="image-picker-preview" style={{ aspectRatio: aspect }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <span className="image-picker-placeholder">
            <AppIcon name="image" />
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <button
        className="secondary-button full-width"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <AppIcon name="edit" />
        {busy ? 'Mengunggah...' : buttonLabel}
      </button>
    </div>
  );
}
