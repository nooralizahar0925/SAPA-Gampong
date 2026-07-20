import { describe, expect, it } from 'vitest';
import { QrService } from '../src/modules/letters/qr.service';

describe('QrService', () => {
  it('creates opaque 128-bit verification tokens', () => {
    const first = QrService.newToken();
    const second = QrService.newToken();

    expect(first).toMatch(/^[a-f0-9]{32}$/);
    expect(second).toMatch(/^[a-f0-9]{32}$/);
    expect(first).not.toBe(second);
  });

  it('renders PNG QR codes as data URLs', async () => {
    const pngDataUrl = await QrService.pngDataUrl('http://localhost:8080/verify/example');
    expect(pngDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
