import type { RequestDetailAttachment } from '../api/client';
import { AppIcon } from './AppIcon';

export function AttachmentViewer({ attachments }: { attachments: RequestDetailAttachment[] }) {
  if (attachments.length === 0) {
    return <div className="empty-state">Belum ada lampiran yang diunggah untuk permohonan ini.</div>;
  }

  return (
    <div className="attachment-grid">
      {attachments.map((attachment) => {
        const isImage = attachment.mime.startsWith('image/');
        return (
          <a
            key={attachment.file_id}
            className="attachment-card"
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
          >
            <div className="attachment-card-preview">
              <AppIcon name={isImage ? 'image' : 'file'} />
            </div>
            <div className="attachment-card-label">
              <strong>{formatAttachmentKind(attachment.kind)}</strong>
              <small>
                {attachment.mime} · {formatFileSize(attachment.size)}
              </small>
            </div>
          </a>
        );
      })}

      <div className="attachment-card request-more">
        <div className="attachment-card-preview transparent">
          <AppIcon name="warning" />
        </div>
        <div className="attachment-card-label muted">
          <strong>Minta lampiran tambahan</strong>
          <small>Opsional pada tahap berikutnya</small>
        </div>
      </div>
    </div>
  );
}

function formatAttachmentKind(kind: string) {
  switch (kind) {
    case 'KTP':
      return 'KTP';
    case 'KK':
      return 'Kartu Keluarga';
    case 'photo':
      return 'Foto Pendukung';
    case 'document':
      return 'Dokumen Tambahan';
    default:
      return kind;
  }
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}
