import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const templatesRoot = resolve(process.cwd(), 'templates', 'letters');
const assetsRoot = resolve(process.cwd(), 'assets');

export async function renderLetterTemplate(templateName: string, values: Record<string, string>) {
  const source = await readFile(resolve(templatesRoot, templateName), 'utf8');
  const withPartials = await expandPartials(source);

  return withPartials.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return escapeHtml(values[key] ?? '');
  });
}

async function expandPartials(source: string): Promise<string> {
  const matches = [...source.matchAll(/\{\{\>\s*([a-zA-Z0-9_-]+)\s*\}\}/g)];
  if (matches.length === 0) return source;

  let rendered = source;
  for (const match of matches) {
    const partialName = match[1];
    const partialSource = await readFile(resolve(templatesRoot, 'partials', `${partialName}.html`), 'utf8');
    rendered = rendered.replace(match[0], partialSource);
  }

  return expandPartials(rendered);
}

export async function readAssetDataUrl(fileName: string) {
  const absolutePath = resolve(assetsRoot, fileName);
  const buffer = await readFile(absolutePath);
  const mime = mimeFromExtension(extname(fileName).toLowerCase());
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function mimeFromExtension(extension: string) {
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
