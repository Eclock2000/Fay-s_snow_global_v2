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
const modelBuilder = readFileSync(file('scripts/build-model.mjs'), 'utf8');
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
  'function startAmbientSnow()',
  'function pauseAmbientSnow()',
  'viewer.play()',
  "navigator.clipboard.writeText",
  "loadState.classList.add('is-quiet')",
]) {
  requireCondition(app.includes(token), `Runtime contract token missing: ${token}`);
}

for (const token of [
  'InclinedSnowCapGeometry',
  "inclinedSnowWorld.name = 'InclinedSnowWorld'",
  'inclinedSnowWorld.quaternion.copy(SLOPE_ROTATION)',
  'createCurvedEngravingGeometry',
  "new THREE.AnimationClip('Snowfall'",
]) {
  requireCondition(modelBuilder.includes(token), `Model-builder contract token missing: ${token}`);
}

requireCondition(!html.includes('fonts.googleapis.com'), 'External Google Fonts request found');
requireCondition(!html.includes('cdnjs.cloudflare.com'), 'External CDN request found');
requireCondition(!app.includes('localStorage'), 'Persistent localStorage is not allowed');
requireCondition(!html.includes('id="snowLayer"'), 'Screen-space snow canvas found');
requireCondition(!html.includes('class="glass-light"'), 'Screen-space glass highlight found');
requireCondition(!html.includes('id="snowButton"'), 'Manual snow button found');
requireCondition(!app.includes("getContext('2d')"), '2D runtime particle renderer found');
requireCondition(!app.includes('class Snowfall'), 'Legacy 2D Snowfall class found');
requireCondition(!modelBuilder.includes('new THREE.PlaneGeometry'), 'Planar engraving carrier found');
requireCondition(!modelBuilder.includes('createDirectionalTerrainGeometry'), 'Legacy mound terrain found');
requireCondition(!/google-analytics|gtag\(|mixpanel|segment\.io/i.test(html + app), 'Analytics code found');

const glbPath = file('assets/models/fay-snow-globe.glb');
const glb = readFileSync(glbPath);
requireCondition(glb.subarray(0, 4).toString() === 'glTF', 'GLB magic is invalid');
requireCondition(glb.readUInt32LE(4) === 2, 'GLB version is not 2');
requireCondition(glb.readUInt32LE(8) === glb.length, 'GLB declared length differs from file size');
requireCondition(glb.length <= 4 * 1024 * 1024, `GLB exceeds 4 MiB: ${glb.length}`);

let gltf = null;
try {
  const jsonChunkLength = glb.readUInt32LE(12);
  const jsonChunkType = glb.subarray(16, 20).toString();
  requireCondition(jsonChunkType === 'JSON', `Unexpected first GLB chunk: ${jsonChunkType}`);
  gltf = JSON.parse(glb.subarray(20, 20 + jsonChunkLength).toString('utf8').trim());
} catch (error) {
  failures.push(`GLB JSON chunk could not be parsed: ${error.message}`);
}

if (gltf) {
  const nodeNames = (gltf.nodes || []).map((node) => node.name || '');
  for (const name of [
    'InclinedSnowWorld',
    'InclinedSnowCap',
    'CompressedTrackBed1',
    'CompressedTrackBed2',
    'BaseEngraving',
    'VolumetricSnowfall',
  ]) {
    requireCondition(nodeNames.includes(name), `GLB node missing: ${name}`);
  }
  const flakes = nodeNames.filter((name) => /^SnowFlake\d{2}$/.test(name));
  requireCondition(flakes.length === 44, `Expected 44 volumetric flakes, found ${flakes.length}`);
  const snowfall = (gltf.animations || []).find((animation) => animation.name === 'Snowfall');
  requireCondition(Boolean(snowfall), 'GLB Snowfall animation missing');
  if (snowfall) {
    requireCondition(snowfall.channels?.length === 88, `Snowfall channel count changed: ${snowfall.channels?.length}`);
    requireCondition(snowfall.samplers?.length === 88, `Snowfall sampler count changed: ${snowfall.samplers?.length}`);
    const durations = (snowfall.samplers || []).map((sampler) => gltf.accessors?.[sampler.input]?.max?.[0]);
    requireCondition(
      durations.length === 88 && durations.every((duration) => Math.abs(duration - 4.8) < 0.001),
      'Snowfall loop duration is not consistently 4.8 seconds',
    );
  }
}

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
