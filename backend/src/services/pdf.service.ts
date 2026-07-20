import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

export const PdfService = {
  async render(html: string) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '18mm',
          right: '16mm',
          bottom: '18mm',
          left: '16mm',
        },
      });
    } finally {
      await page.close();
    }
  },
};

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }

  return browserPromise;
}

process.once('exit', () => {
  if (!browserPromise) return;
  void browserPromise.then((browser) => browser.close()).catch(() => undefined);
});
