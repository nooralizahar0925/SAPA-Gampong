import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';

export const QrService = {
  newToken() {
    return randomBytes(16).toString('hex');
  },

  async pngDataUrl(verifyUrl: string) {
    return QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      type: 'image/png',
      width: 256,
    });
  },
};
