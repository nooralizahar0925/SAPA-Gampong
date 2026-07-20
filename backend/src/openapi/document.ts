import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import { env } from '../config/env';

// Importing every module that registers routes is what populates the registry.
// Add a line here whenever a new module with routes is created.
import '../modules/auth/routes';
import '../modules/health/routes';
import '../modules/letters/routes';
import '../modules/uploads/routes';

export function buildDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'SAPA Gampong API',
      version: '0.1.0',
      description:
        'API layanan Gampong Blang: pengajuan surat, verifikasi keaslian, konten desa, dan pelaporan warga. ' +
        'Login lewat POST /api/auth/login, salin `token`, lalu tekan tombol Authorize untuk mencoba endpoint admin.',
    },
    servers: [{ url: env.PUBLIC_BASE_URL, description: 'Server aktif' }],
    tags: [
      { name: 'Health', description: 'Status layanan' },
      { name: 'Auth', description: 'Autentikasi admin' },
      { name: 'Letter Types', description: 'Katalog tipe surat dan skema formulir' },
      { name: 'Uploads', description: 'Unggah dan akses lampiran bertanda tangan' },
    ],
  });
}
