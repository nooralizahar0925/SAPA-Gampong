import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

export const PdfService = {
  async render(html: string) {
    const browser = await getBrowser();
    // Lay out at the real A4 width (794px at 96dpi). The default 1280px viewport wraps
    // text into fewer lines, so a letter can measure as fitting and still paginate to
    // two pages once Chromium reflows it for print.
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });

    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      // Page padding lives entirely in `.page` (templates/letters/partials/styles.html).
      // Keeping Playwright's margins at zero means there is one place to change it,
      // instead of two values that silently add together.
      return await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
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
