import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { DashboardFrame } from '../components/DashboardFrame';
import { AppIcon } from '../components/AppIcon';
import {
  STAGING_ANDROID_APK_METADATA_URL,
  STAGING_ANDROID_APK_URL,
  STAGING_APP_INSTALL_ENABLED,
} from '../lib/staging-app';

type StagingAppMetadata = {
  app_name?: string;
  package_name?: string;
  version_name?: string;
  version_code?: string;
  build_number?: string;
  commit_sha?: string;
  built_at?: string;
  apk_url?: string;
};

const FALLBACK_METADATA: StagingAppMetadata = {
  app_name: 'Gampong Blang Digital Staging',
  package_name: 'id.gampongblang.sapa_gampong.staging',
};

export function StagingAppInstallPage() {
  const metadataQuery = useQuery({
    queryKey: ['staging-app-metadata'],
    queryFn: async () => {
      const response = await fetch(STAGING_ANDROID_APK_METADATA_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Metadata staging APK belum tersedia.');
      }
      return (await response.json()) as StagingAppMetadata;
    },
    enabled: STAGING_APP_INSTALL_ENABLED,
    retry: false,
  });

  const metadata = metadataQuery.data ?? FALLBACK_METADATA;
  const apkUrl = metadata.apk_url ?? STAGING_ANDROID_APK_URL;
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(apkUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0e3b2a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrCodeUrl(url);
      })
      .catch(() => {
        if (active) setQrCodeUrl('');
      });

    return () => {
      active = false;
    };
  }, [apkUrl]);

  const builtAt = useMemo(() => {
    if (!metadata.built_at) return 'Belum tersedia';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(metadata.built_at));
  }, [metadata.built_at]);

  const version = metadata.version_name
    ? `${metadata.version_name}${metadata.version_code ? ` (${metadata.version_code})` : ''}`
    : 'Belum tersedia';

  return (
    <DashboardFrame
      header={
        <div className="dashboard-topbar-copy">
          <h1>Aplikasi Staging</h1>
          <p>Unduh aplikasi Android untuk pengujian fitur sebelum rilis Play Store.</p>
        </div>
      }
    >
      {!STAGING_APP_INSTALL_ENABLED ? (
        <div className="detail-card staging-app-disabled">
          <div className="detail-card-head">
            <span className="dashboard-stat-icon warning">
              <AppIcon name="warning" />
            </span>
            <div>
              <h2>Fitur khusus staging</h2>
              <p>Panel instalasi aplikasi hanya aktif pada dashboard staging.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="staging-app-layout">
          <section className="detail-card staging-app-card">
            <div className="detail-card-head">
              <span className="dashboard-stat-icon success">
                <AppIcon name="phone" />
              </span>
              <div>
                <h2>{metadata.app_name ?? FALLBACK_METADATA.app_name}</h2>
                <p>Build ini memakai API staging dan dapat dipasang berdampingan dengan aplikasi produksi.</p>
              </div>
            </div>

            <div className="staging-app-body">
              <div className="staging-app-meta-grid">
                <MetaItem label="Versi" value={version} />
                <MetaItem label="Dibuat" value={builtAt} />
                <MetaItem label="Package" value={metadata.package_name ?? FALLBACK_METADATA.package_name ?? '-'} />
                <MetaItem label="Commit" value={metadata.commit_sha?.slice(0, 7) ?? 'Belum tersedia'} />
              </div>

              {metadataQuery.isError ? (
                <div className="notice-card">
                  <AppIcon name="warning" />
                  <div>
                    <b>Metadata APK belum ditemukan</b>
                    <small>Jika APK sudah dipublish, tombol unduh tetap memakai alamat terbaru staging.</small>
                  </div>
                </div>
              ) : null}

              <div className="staging-app-actions">
                <a className="table-action primary staging-app-download" href={apkUrl} download>
                  <AppIcon name="download" />
                  Download APK
                </a>
                <a className="table-action ghost staging-app-download" href={apkUrl} target="_blank" rel="noreferrer">
                  Buka Link
                </a>
              </div>
            </div>
          </section>

          <aside className="detail-card staging-app-qr-card">
            <div className="detail-card-head">
              <span className="dashboard-stat-icon">
                <AppIcon name="qr" />
              </span>
              <div>
                <h2>Scan dari HP</h2>
                <p>Arahkan kamera HP ke QR untuk membuka unduhan APK.</p>
              </div>
            </div>
            <div className="staging-app-qr-body">
              {qrCodeUrl ? <img src={qrCodeUrl} alt="QR download APK staging" /> : <div className="empty-state">QR belum siap.</div>}
              <small>{apkUrl}</small>
            </div>
          </aside>
        </div>
      )}
    </DashboardFrame>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="staging-app-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
