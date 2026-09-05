// Local production preview: keeps the PWA isolated from the Next dev server.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBasePath } from './generate-pwa.mjs';

const directory = fileURLToPath(new URL('../out/', import.meta.url));
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH || '');
const port = Number(process.env.PWA_PREVIEW_PORT || 3001);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('PWA_PREVIEW_PORT must be between 1024 and 65535');
const worker = await readFile(path.join(directory, 'sw.js'), 'utf8').catch(() => '');
if (!/const BUILD = \{"version":"[a-f0-9]{24}"/.test(worker)) throw new Error('Run npm run build before previewing the production PWA');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  try {
    const url = new URL(request.url, 'http://localhost');
    if (basePath && url.pathname === basePath) {
      response.writeHead(308, { Location: `${basePath}/${url.search}` }); response.end(); return;
    }
    if (!url.pathname.startsWith(`${basePath}/`)) throw new Error('Outside preview scope');
    const relative = decodeURIComponent(url.pathname.slice(basePath.length));
    let filename = path.resolve(directory, `.${relative}`);
    const boundary = directory.replace(/[\\/]$/, '');
    if (filename !== boundary && !filename.startsWith(`${boundary}${path.sep}`)) throw new Error('Outside export');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    const bytes = await readFile(filename);
    const extension = path.extname(filename);
    const headers = {
      'Content-Type': types[extension] || 'application/octet-stream',
      'Content-Length': bytes.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': relative.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    if (relative === '/sw.js') headers['Service-Worker-Allowed'] = `${basePath}/`;
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); response.end('Not found');
  }
});
server.on('error', error => { console.error(`PWA preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Drava PWA: http://127.0.0.1:${port}${basePath}/`));
