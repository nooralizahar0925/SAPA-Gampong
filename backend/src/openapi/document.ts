import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';
import { env } from '../config/env';

// Importing every module that registers routes is what populates the registry.
// Add a line here whenever a new module with routes is created.
import '../modules/auth/routes';
import '../modules/content/routes';
import '../modules/feedback/routes';
import '../modules/health/routes';
import '../modules/letters/routes';
import '../modules/requests/routes';
import '../modules/settings/routes';
import '../modules/uploads/routes';
import '../modules/verify/routes';

export function buildDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'SAPA Gampong API',
      version: '0.1.0',
      description:
        'API for Gampong Blang services: letter requests, authenticity verification, village content, and citizen feedback. ' +
        'Log in via POST /api/auth/login, copy the returned token, then use Authorize to try protected admin endpoints.',
    },
    servers: [{ url: env.PUBLIC_BASE_URL, description: 'Active server' }],
    tags: [
      { name: 'Health', description: 'Service status endpoints' },
      { name: 'Auth', description: 'Admin authentication endpoints' },
      { name: 'Letter Types', description: 'Letter catalog and dynamic form schemas' },
      { name: 'Requests', description: 'Public request submission and status tracking' },
      { name: 'Content', description: 'Public village content with admin-managed writes' },
      { name: 'Feedback', description: 'Public citizen reports and the admin inbox' },
      { name: 'Settings', description: 'Admin-managed application settings and provider selection' },
      { name: 'Uploads', description: 'Upload endpoints and signed file access' },
      { name: 'Verify', description: 'Public letter authenticity verification' },
    ],
  });
}
