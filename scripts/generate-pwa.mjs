import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MAX_ASSETS = 128;
const MAX_ENTRY_BYTES = 1024 * 1024;
const MAX_BUILD_BYTES = 8 * 1024 * 1024;
const MAX_PRECACHE_BYTES = 2 * 1024 * 1024;
const CORE = ['/offline.html', '/theme-init.js', '/images/drava-logo-transparent.svg'];
const PUBLIC_ASSETS = [...CORE, '/favicon.svg', '/apple-touch-icon.png', '/images/drava-icon-192.png', '/images/drava-icon-512.png', '/images/drava-icon-maskable-512.png', '/images/mastercard.svg', '/images/visa.svg'];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function normalizeBasePath(value = '') {
  if (value === '' || value === '/') return '';
  if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(value) || value.split('/').some((part) => part === '.' || part === '..')) throw new Error('Invalid PWA base path');
  return value.replace(/\/$/, '');
}
function publicationOrigin(value) {
  if (typeof value !== 'string' || !value || /\s|[?#]/.test(value)) throw new Error('Invalid PWA site URL');
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid PWA site URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /^[a-z]+:\/\/[^/]*@/i.test(value)) throw new Error('Invalid PWA site URL');
  return url.origin;
}
async function filesWithin(directory, prefix) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('PWA assets must not be symbolic links');
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await filesWithin(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

export async function generatePwa({ outDir = path.join(ROOT, 'out'), basePath = process.env.NEXT_PUBLIC_BASE_PATH || '', siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://drava.click', source = path.join(ROOT, 'public/sw.js') } = {}) {
  const base = normalizeBasePath(basePath);
  const origin = publicationOrigin(siteUrl);
  const exportRoot = path.resolve(outDir);
  const html = await readFile(path.join(exportRoot, 'index.html'), 'utf8');
  const template = await readFile(source, 'utf8');
  if (template.split('/* DRAVA_PWA_BUILD */ null').length !== 2) throw new Error('Expected one PWA manifest placeholder');
  const manifest = JSON.parse(await readFile(path.join(exportRoot, 'manifest.json'), 'utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid PWA web app manifest');
  // Unlike start_url and scope, the manifest id resolves against the origin.
  // Chromium's desktop related-app lookup additionally requires an absolute id.
  const id = `${base}/`;
  const publishedManifest = `${JSON.stringify({
    ...manifest,
    id,
    related_applications: [{ platform: 'webapp', url: './manifest.json', id: new URL(id, origin).href }],
    prefer_related_applications: false,
  }, null, 2)}\n`;
  const candidates = new Set(PUBLIC_ASSETS);
  for (const [directory, prefix, extension] of [['_next/static', '/_next/static', /\.(?:js|css|woff2?)$/], ['images', '/images', /\.(?:svg|png|webp|jpe?g)$/]]) {
    for (const name of await filesWithin(path.join(exportRoot, directory), prefix)) if (extension.test(name)) candidates.add(name);
  }
  const assets = [];
  for (const name of [...candidates].sort()) {
    if (!/^\/[A-Za-z0-9._~/-]+$/.test(name) || name.split('/').some((part) => part === '..' || part === '.')) throw new Error('Unsafe PWA asset path');
    const filename = path.resolve(exportRoot, `.${name}`);
    if (!filename.startsWith(`${exportRoot}${path.sep}`) || !(await stat(filename)).isFile()) throw new Error('PWA asset outside export');
    const contents = await readFile(filename);
    if (!contents.length || contents.length > MAX_ENTRY_BYTES) throw new Error(`PWA asset exceeds size budget: ${name}`);
    assets.push([name, digest(contents), contents.length]);
  }
  const totalBytes = assets.reduce((sum, entry) => sum + entry[2], 0);
  if (assets.length > MAX_ASSETS || totalBytes > MAX_BUILD_BYTES) throw new Error('PWA public cache exceeds its build budget');
  const available = new Set(assets.map(([name]) => name));
  const precache = new Set(CORE);
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    // Browsers capable of this PWA already run the module bundle. Keep the
    // legacy nomodule fallback public, but do not download it during install.
    if (/\snomodule(?:\s|=|\/?>)/i.test(tag)) continue;
    const match = /(?:src|href)=["']([^"']+)["']/i.exec(tag);
    if (!match) continue;
    const url = new URL(match[1].replaceAll('&amp;', '&'), `https://pwa-build.invalid${base}/`);
    if (url.origin !== 'https://pwa-build.invalid' || url.search || url.hash || !url.pathname.startsWith(`${base}/`)) continue;
    const name = url.pathname.slice(base.length);
    if (available.has(name) && name.startsWith('/_next/static/') && /\.(?:js|css|woff2?)$/.test(name)) precache.add(name);
  }
  const precacheBytes = assets.filter(([name]) => precache.has(name)).reduce((sum, entry) => sum + entry[2], 0);
  if (precacheBytes > MAX_PRECACHE_BYTES) throw new Error('PWA bootstrap exceeds its precache budget');
  const version = digest(JSON.stringify({ base, assets, precache: [...precache].sort(), template, html, manifest: publishedManifest })).slice(0, 24);
  const config = { version, assets, precache: [...precache].sort() };
  const generated = template.replace('/* DRAVA_PWA_BUILD */ null', JSON.stringify(config));
  await writeFile(path.join(exportRoot, 'manifest.json'), publishedManifest, 'utf8');
  await writeFile(path.join(exportRoot, 'sw.js'), generated, 'utf8');
  return { version, assets: assets.length, bytes: totalBytes, precache: precache.size, precacheBytes, basePath: base };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generatePwa();
  console.log(`[PWA] ${result.version}: ${result.precache} bootstrap assets (${result.precacheBytes} bytes), ${result.assets} public assets (${result.bytes} bytes), scope ${result.basePath || '/'}`);
}
