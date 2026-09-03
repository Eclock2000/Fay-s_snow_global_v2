import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const serverRoot = resolve(projectRoot, '..');
const port = Number(process.env.PORT || 4173);

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.usdz', 'model/vnd.usdz+zip'],
]);

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  let requestedPath = decodeURIComponent(url.pathname);
  if (requestedPath.endsWith('/')) requestedPath += 'index.html';

  const filePath = resolve(serverRoot, `.${requestedPath}`);
  if (!filePath.startsWith(`${serverRoot}${sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const type = mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
  response.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Snow Globe v2: http://127.0.0.1:${port}/Fay-s_snow_global_v2/`);
});
