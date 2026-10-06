import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('optional mobile preview has no redirect loop, serves SPA routes and discourages indexing', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'gbd-nginx-preview-test-'));
  chmodSync(fixture, 0o755);
  const name = `gbd-nginx-preview-test-${process.pid}`;
  const snippet = readFileSync(new URL('../../infra/nginx/production-mobile-preview.conf', import.meta.url), 'utf8')
    .replaceAll('/opt/gampong-blang/production/SAPA-Gampong/mobile/build/web/', '/srv/fixture/web/');
  writeFileSync(join(fixture, 'nginx.conf'), `events {}\nhttp { server { listen 8080; ${snippet} location / { return 200 "Main site unaffected"; } } }\n`);
  let started = false;
  try {
    execFileSync('docker', ['run', '--rm', '-d', '--name', name,
      '-p', '127.0.0.1::8080',
      '--mount', `type=bind,source=${fixture},target=/srv/fixture,readonly`,
      'nginx:1.28-alpine', 'nginx', '-c', '/srv/fixture/nginx.conf', '-g', 'daemon off;'], { stdio: 'pipe' });
    started = true;
    const address = execFileSync('docker', ['port', name, '8080/tcp'], { encoding: 'utf8' }).trim();
    const base = `http://${address}`;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { await fetch(base); break; } catch (error) {
        if (attempt === 49) throw error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.equal((await fetch(base)).status, 200);
    const redirect = await fetch(`${base}/mobile`, { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    // Docker maps a random host port to nginx's internal port 8080.
    assert.equal(new URL(redirect.headers.get('location'), base).pathname, '/mobile/');
    for (const path of ['/mobile/', '/mobile/index.html', '/mobile/profil', '/mobile/assets/missing.png']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404, `Missing build at ${path}`);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    }
    mkdirSync(join(fixture, 'web/assets'), { recursive: true });
    const html = '<!doctype html><title>Preview fixture</title>';
    writeFileSync(join(fixture, 'web/index.html'), html);
    writeFileSync(join(fixture, 'web/assets/example.txt'), 'Asset fixture');
    for (const path of ['/mobile/', '/mobile/index.html', '/mobile/profil', '/mobile/jadwal-sholat']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, `Built preview at ${path}`);
      assert.equal(await response.text(), html);
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    }
    assert.equal(await (await fetch(`${base}/mobile/assets/example.txt`)).text(), 'Asset fixture');
    assert.equal((await fetch(`${base}/mobile/assets/missing.png`)).status, 404);
    assert.equal(await (await fetch(base)).text(), 'Main site unaffected');
  } finally {
    if (started) execFileSync('docker', ['stop', name], { stdio: 'pipe' });
  }
});
