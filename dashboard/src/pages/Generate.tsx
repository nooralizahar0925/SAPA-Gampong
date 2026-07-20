import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PUBLIC_BASE_URL,
  generateRequestLetterRequest,
  getRequestDetailRequest,
  listLetterTypesRequest,
  sendRequestLetterRequest,
} from '../api/client';
import { AppIcon } from '../components/AppIcon';
import { DashboardFrame } from '../components/DashboardFrame';
import { PdfPreview } from '../components/PdfPreview';
import { StatusBadge } from '../components/StatusBadge';

export function GeneratePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['request-detail', id],
    queryFn: () => getRequestDetailRequest(id),
    enabled: Boolean(id),
  });

  const letterTypesQuery = useQuery({
    queryKey: ['letter-types'],
    queryFn: listLetterTypesRequest,
  });

  const detail = detailQuery.data;
  const letterType = useMemo(
    () => letterTypesQuery.data?.find((item) => item.code === detail?.letter_type),
    [detail?.letter_type, letterTypesQuery.data],
  );

  const generateMutation = useMutation({
    mutationFn: () => generateRequestLetterRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['requests'] }),
        queryClient.invalidateQueries({ queryKey: ['requests-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['request-detail', id] }),
      ]);
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendRequestLetterRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['requests'] }),
        queryClient.invalidateQueries({ queryKey: ['requests-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['request-detail', id] }),
      ]);
    },
  });

  if (detailQuery.isLoading) {
    return (
      <DashboardFrame
        header={
          <>
            <button className="dashboard-icon-button" type="button" onClick={() => navigate('/requests')}>
              <AppIcon name="left" />
            </button>
            <div className="dashboard-topbar-copy">
              <h1>Memuat Surat...</h1>
              <p>Menyiapkan pratinjau PDF dan status pengiriman.</p>
            </div>
          </>
        }
      >
        <div className="loading-state">Memuat data surat...</div>
      </DashboardFrame>
    );
  }

  if (!detail) {
    return (
      <DashboardFrame
        header={
          <>
            <button className="dashboard-icon-button" type="button" onClick={() => navigate('/requests')}>
              <AppIcon name="left" />
            </button>
            <div className="dashboard-topbar-copy">
              <h1>Surat Tidak Ditemukan</h1>
              <p>Data surat tidak tersedia atau sudah berubah.</p>
            </div>
          </>
        }
      >
        <div className="error-box" role="alert">
          {detailQuery.error instanceof Error ? detailQuery.error.message : 'Data surat tidak dapat dimuat.'}
        </div>
      </DashboardFrame>
    );
  }

  const title = letterType?.name ?? detail.letter_type;
  const effectiveStatus = sendMutation.data?.status ?? (generateMutation.data ? 'GENERATED' : detail.status);
  const previewUrl = generateMutation.data?.pdf_url ?? detail.generated_pdf_url ?? null;
  const verificationToken = generateMutation.data?.verification_token ?? detail.verification_token ?? null;
  const verificationUrl =
    detail.verification_url ?? (verificationToken ? `${PUBLIC_BASE_URL}/verify/${verificationToken}` : null);
  const effectiveNomorSurat = generateMutation.data?.nomor_surat ?? detail.nomor_surat ?? 'Belum ditetapkan';
  const canGenerate = detail.status === 'APPROVED' || detail.status === 'GENERATED';
  const canSend = effectiveStatus === 'GENERATED';
  const isReadyForPreview = detail.status === 'APPROVED' || detail.status === 'GENERATED' || detail.status === 'SENT';

  return (
    <DashboardFrame
      header={
        <>
          <button className="dashboard-icon-button" type="button" onClick={() => navigate(`/requests/${id}`)}>
            <AppIcon name="left" />
          </button>
          <div className="dashboard-topbar-copy">
            <h1>Generate &amp; Kirim Surat</h1>
            <p>
              {detail.reference_code} · {title}
            </p>
          </div>
          <div className="dashboard-spacer" />
          <StatusBadge status={effectiveStatus} />
        </>
      }
    >
      {!isReadyForPreview ? (
        <section className="generate-not-ready">
          <div className="warning-box">
            <AppIcon name="warning" />
            <div>
              <strong>Surat belum siap dibuat</strong>
              <p>
                Surat harus berada pada status disetujui terlebih dahulu. Lanjutkan peninjauan dan persetujuan di halaman detail permohonan.
              </p>
            </div>
          </div>
          <button className="table-action primary" type="button" onClick={() => navigate(`/requests/${id}`)}>
            Kembali ke Review Permohonan
          </button>
        </section>
      ) : (
        <div className="generate-grid">
          <section className="detail-card generate-main-card">
            <div className="detail-card-head">
              <h2>Pratinjau Surat Resmi</h2>
              <span className="detail-card-meta">{effectiveNomorSurat}</span>
            </div>
            <div className="detail-card-body">
              <PdfPreview pdfUrl={previewUrl} title={title} />
            </div>
          </section>

          <div className="generate-side-column">
            <section className="detail-card">
              <div className="detail-card-head">
                <h2>Aksi Surat</h2>
              </div>
              <div className="detail-card-body stacked">
                <div className="mini-summary-row">
                  <span>Status saat ini</span>
                  <StatusBadge status={effectiveStatus} />
                </div>
                <div className="mini-summary-row">
                  <span>Email tujuan</span>
                  <strong>{detail.applicant_email}</strong>
                </div>
                <div className="mini-summary-row">
                  <span>Nomor surat</span>
                  <strong className="mono-muted strong-text">{effectiveNomorSurat}</strong>
                </div>

                {generateMutation.error ? (
                  <div className="error-box" role="alert">
                    {generateMutation.error instanceof Error
                      ? generateMutation.error.message
                      : 'PDF surat tidak dapat dibuat.'}
                  </div>
                ) : null}

                {sendMutation.error ? (
                  <div className="error-box" role="alert">
                    {sendMutation.error instanceof Error
                      ? sendMutation.error.message
                      : 'Surat tidak dapat dikirim.'}
                  </div>
                ) : null}

                {sendMutation.isSuccess || detail.status === 'SENT' ? (
                  <div className="info-box" role="status">
                    <strong>Surat berhasil dikirim</strong>
                    <p>PDF resmi telah dikirim ke email pemohon dan siap diverifikasi melalui QR.</p>
                  </div>
                ) : null}

                <div className="generate-actions">
                  <button
                    className="table-action primary strong"
                    type="button"
                    onClick={() => generateMutation.mutate()}
                    disabled={!canGenerate || generateMutation.isPending || detail.status === 'SENT'}
                  >
                    {previewUrl ? 'Generate Ulang PDF' : 'Generate PDF'}
                  </button>
                  <button
                    className="table-action gold"
                    type="button"
                    onClick={() => sendMutation.mutate()}
                    disabled={!canSend || sendMutation.isPending}
                  >
                    Kirim ke Email Pemohon
                  </button>
                </div>
              </div>
            </section>

            <section className="detail-card">
              <div className="detail-card-head">
                <h2>Verifikasi Publik</h2>
              </div>
              <div className="detail-card-body stacked">
                <div className="verification-block">
                  <span>Token verifikasi</span>
                  <strong className="mono-muted strong-text">
                    {verificationToken ?? 'Akan dibuat setelah generate PDF'}
                  </strong>
                </div>
                <div className="verification-block">
                  <span>Tautan verifikasi</span>
                  {verificationUrl ? (
                    <a href={verificationUrl} target="_blank" rel="noreferrer" className="verification-link">
                      {verificationUrl}
                    </a>
                  ) : (
                    <strong>Belum tersedia</strong>
                  )}
                </div>
              </div>
            </section>

            <section className="detail-card">
              <div className="detail-card-head">
                <h2>Checklist Operator</h2>
              </div>
              <div className="detail-card-body stacked">
                <div className="generate-check">
                  <AppIcon name={detail.nomor_surat ? 'check' : 'clock'} />
                  <div>
                    <strong>Nomor surat sudah ditetapkan</strong>
                    <p>Pastikan nomor surat final sesuai buku register sebelum PDF dibuat.</p>
                  </div>
                </div>
                <div className="generate-check">
                  <AppIcon name={previewUrl ? 'check' : 'clock'} />
                  <div>
                    <strong>Pratinjau PDF sudah diperiksa</strong>
                    <p>Cek isi surat, QR verifikasi, dan tata letak sebelum pengiriman email.</p>
                  </div>
                </div>
                <div className="generate-check">
                  <AppIcon name={effectiveStatus === 'SENT' ? 'check' : 'send'} />
                  <div>
                    <strong>Email pemohon siap dikirim</strong>
                    <p>Kirim setelah seluruh data dipastikan sesuai dan surat siap diterbitkan.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </DashboardFrame>
  );
}
