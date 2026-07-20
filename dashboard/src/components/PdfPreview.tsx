type PdfPreviewProps = {
  pdfUrl: string | null;
  title: string;
};

export function PdfPreview({ pdfUrl, title }: PdfPreviewProps) {
  if (!pdfUrl) {
    return (
      <div className="pdf-preview empty">
        <div className="pdf-preview-empty">
          <strong>Pratinjau PDF belum tersedia</strong>
          <p>Generate surat terlebih dahulu untuk melihat hasil PDF resmi beserta QR verifikasinya.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-preview">
      <div className="pdf-preview-toolbar">
        <div>
          <strong>Pratinjau Surat</strong>
          <span>{title}</span>
        </div>
        <a className="pdf-preview-link" href={pdfUrl} target="_blank" rel="noreferrer">
          Buka tab baru
        </a>
      </div>
      <iframe
        className="pdf-preview-frame"
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        title={`Pratinjau PDF ${title}`}
      />
    </div>
  );
}
