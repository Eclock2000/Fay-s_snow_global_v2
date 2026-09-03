import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function file(relativePath) {
  const path = resolve(root, relativePath);
  requireCondition(existsSync(path), `Missing ${relativePath}`);
  return path;
}

const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  '.nojekyll',
  'assets/models/fay-snow-globe.glb',
  'assets/models/fay-snow-globe.usdz',
  'assets/models/model-info.json',
  'assets/icons/snow-globe.svg',
  'assets/icons/ar-cube.svg',
  'assets/preview/og-snow-globe.png',
  'vendor/model-viewer/model-viewer.min.js',
  'vendor/model-viewer/LICENSE',
];
requiredFiles.forEach(file);

const html = readFileSync(file('index.html'), 'utf8');
const css = readFileSync(file('styles.css'), 'utf8');
const app = readFileSync(file('app.js'), 'utf8');
const modelInfo = JSON.parse(readFileSync(file('assets/models/model-info.json'), 'utf8'));

for (const token of [
  'viewport-fit=cover',
  'ios-src="./assets/models/fay-snow-globe.usdz"',
  'ar-modes="quick-look"',
  'ar-scale="fixed"',
  'rel="ar"',
  '喜欢滑雪的 Fay',
  '画面不会上传到这个网页',
]) {
  requireCondition(html.includes(token), `HTML contract token missing: ${token}`);
}

for (const token of [
  '100svh',
  'env(safe-area-inset-top)',
  'env(safe-area-inset-bottom)',
  'prefers-reduced-motion',
  'min-height: 48px',
]) {
  requireCondition(css.includes(token), `CSS contract token missing: ${token}`);
}

for (const token of [
  "viewer.activateAR()",
  "location.hash === '#ar'",
  "document.addEventListener('visibilitychange'",
  "viewer.addEventListener('ar-status'",
  "navigator.clipboard.writeText",
  "loadState.classList.add('is-quiet')",
]) {
  requireCondition(app.includes(token), `Runtime contract token missing: ${token}`);
}

requireCondition(!html.includes('fonts.googleapis.com'), 'External Google Fonts request found');
requireCondition(!html.includes('cdnjs.cloudflare.com'), 'External CDN request found');
requireCondition(!app.includes('localStorage'), 'Persistent localStorage is not allowed');
requireCondition(!/google-analytics|gtag\(|mixpanel|segment\.io/i.test(html + app), 'Analytics code found');

const glbPath = file('assets/models/fay-snow-globe.glb');
const glb = readFileSync(glbPath);
requireCondition(glb.subarray(0, 4).toString() === 'glTF', 'GLB magic is invalid');
requireCondition(glb.readUInt32LE(4) === 2, 'GLB version is not 2');
requireCondition(glb.readUInt32LE(8) === glb.length, 'GLB declared length differs from file size');
requireCondition(glb.length <= 4 * 1024 * 1024, `GLB exceeds 4 MiB: ${glb.length}`);

const usdzPath = file('assets/models/fay-snow-globe.usdz');
const usdz = readFileSync(usdzPath);
requireCondition(usdz.subarray(0, 2).toString() === 'PK', 'USDZ ZIP magic is invalid');
requireCondition(usdz.length <= 8 * 1024 * 1024, `USDZ exceeds 8 MiB: ${usdz.length}`);
try {
  execFileSync('unzip', ['-t', usdzPath], { stdio: 'ignore' });
} catch {
  failures.push('USDZ ZIP integrity check failed');
}

requireCondition(modelInfo.triangles <= 70_000, `Triangle budget exceeded: ${modelInfo.triangles}`);
requireCondition(modelInfo.textureMaxPixels <= 1024, 'Texture dimension budget exceeded');
requireCondition(
  modelInfo.dimensionsMeters.height >= 0.22 && modelInfo.dimensionsMeters.height <= 0.26,
  `AR height is outside the 22–26 cm contract: ${modelInfo.dimensionsMeters.height} m`,
);

for (const script of ['app.js', 'scripts/build-model.mjs', 'scripts/serve.mjs']) {
  try {
    execFileSync(process.execPath, ['--check', resolve(root, script)], { stdio: 'ignore' });
  } catch {
    failures.push(`JavaScript syntax check failed: ${script}`);
  }
}

const firstPartyBudget = ['index.html', 'styles.css', 'app.js'].reduce(
  (total, relativePath) => total + statSync(file(relativePath)).size,
  0,
);
requireCondition(firstPartyBudget <= 100 * 1024, `HTML/CSS/JS exceeds 100 KiB: ${firstPartyBudget}`);

if (failures.length) {
  console.error(`CHECK FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      firstPartyBytes: firstPartyBudget,
      glbBytes: glb.length,
      usdzBytes: usdz.length,
      triangles: modelInfo.triangles,
      arHeightMeters: modelInfo.dimensionsMeters.height,
    },
    null,
    2,
  ),
);
