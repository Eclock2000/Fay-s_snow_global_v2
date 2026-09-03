import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CanvasElement,
  GlobalFonts,
  Image,
  ImageData,
  createCanvas,
  loadImage,
} from '@napi-rs/canvas';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const defaultSource = resolve(projectRoot, '..', 'Fay-s_snow_global', 'index.html');
const sourcePath = resolve(process.argv[2] || defaultSource);
const outputDir = resolve(projectRoot, 'assets', 'models');

if (!existsSync(sourcePath)) {
  throw new Error(
    `Original source HTML not found: ${sourcePath}\n` +
      'Pass it explicitly: npm run build:model -- /path/to/Fay-s_snow_global/index.html',
  );
}

// Three's browser-oriented exporters only need this small DOM surface in Node.
globalThis.document = {
  createElement(tagName) {
    if (tagName !== 'canvas') throw new Error(`Unsupported element: ${tagName}`);
    return createCanvas(1, 1);
  },
};
globalThis.HTMLCanvasElement = CanvasElement;
globalThis.HTMLImageElement = Image;
globalThis.ImageData = ImageData;

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer();
      queueMicrotask(() => this.onloadend?.());
    } catch (error) {
      this.onerror?.(error);
    }
  }

  async readAsDataURL(blob) {
    try {
      const bytes = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type};base64,${bytes.toString('base64')}`;
      queueMicrotask(() => this.onloadend?.());
    } catch (error) {
      this.onerror?.(error);
    }
  }
}

globalThis.FileReader = NodeFileReader;

const source = await readFile(sourcePath, 'utf8');

function sourceBuffer(name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*'([^']+)'`));
  if (!match) throw new Error(`Missing embedded source constant: ${name}`);
  return Buffer.from(match[1], 'base64');
}

function typedCopy(buffer, Type) {
  const copy = Uint8Array.from(buffer);
  return new Type(copy.buffer);
}

function createPenguinGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(
    new THREE.BufferAttribute(typedCopy(sourceBuffer('MESH_IDX_B64'), Uint32Array), 1),
  );
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(typedCopy(sourceBuffer('MESH_POS_B64'), Float32Array), 3),
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(typedCopy(sourceBuffer('MESH_NORM_B64'), Float32Array), 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(typedCopy(sourceBuffer('MESH_UV_B64'), Float32Array), 2),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'SkiingPenguinGeometry';
  return geometry;
}

async function optimizedImage(name, format) {
  const input = sourceBuffer(name);
  const pipeline = sharp(input)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .removeAlpha();
  return format === 'jpeg'
    ? pipeline.jpeg({ quality: 86, progressive: true, chromaSubsampling: '4:2:0' }).toBuffer()
    : pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
}

async function textureFromBuffer(buffer, { color = false, mimeType = 'image/png' } = {}) {
  const image = await loadImage(buffer);
  const texture = new THREE.Texture(image);
  texture.flipY = false;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.userData.mimeType = mimeType;
  texture.needsUpdate = true;
  return texture;
}

function registerEngravingFont() {
  const candidates = [
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
    '/System/Library/Fonts/Supplemental/Songti.ttc',
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && GlobalFonts.registerFromPath(candidate, 'Gift Engraving')) return;
  }
}

function drawTrackedText(context, text, centerX, baselineY, tracking) {
  const glyphs = [...text];
  const widths = glyphs.map((glyph) => context.measureText(glyph).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + tracking * (glyphs.length - 1);
  let x = centerX - total / 2;
  for (let index = 0; index < glyphs.length; index += 1) {
    context.fillText(glyphs[index], x, baselineY);
    x += widths[index] + tracking;
  }
}

async function textureFromCanvas(canvas, { color = false } = {}) {
  // Exporters handle an Image reliably in Node; CanvasTexture otherwise serializes
  // as a transparent placeholder with @napi-rs/canvas.
  const image = await loadImage(canvas.toBuffer('image/png'));
  const texture = new THREE.Texture(image);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.userData.mimeType = 'image/png';
  texture.needsUpdate = true;
  return texture;
}

async function createEngravingTexture() {
  registerEngravingFont();
  const canvas = createCanvas(1024, 256);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.font = '500 78px "Gift Engraving", serif';

  // A two-pixel light/shadow offset reads like shallow tooling instead of a label.
  context.fillStyle = 'rgb(58, 58, 58)';
  drawTrackedText(context, '喜欢滑雪的 Fay', 512, 132, 7);
  context.fillStyle = 'rgb(255, 255, 255)';
  drawTrackedText(context, '喜欢滑雪的 Fay', 512, 128, 7);

  return textureFromCanvas(canvas, { color: true });
}

async function createWoodTexture() {
  const canvas = createCanvas(1024, 512);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#6a3b2a');
  gradient.addColorStop(0.46, '#45251c');
  gradient.addColorStop(1, '#2d1712');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(0x5f4159);
  context.lineCap = 'round';
  for (let line = 0; line < 54; line += 1) {
    const y = (line / 53) * canvas.height + (random() - 0.5) * 10;
    context.beginPath();
    for (let x = -24; x <= canvas.width + 24; x += 16) {
      const wave = Math.sin(x * 0.018 + line * 1.7) * (2.2 + random() * 2.5);
      const curl = Math.sin(x * 0.005 + line * 0.41) * 4;
      if (x === -24) context.moveTo(x, y + wave + curl);
      else context.lineTo(x, y + wave + curl);
    }
    context.strokeStyle = line % 3 === 0
      ? `rgba(18, 7, 4, ${0.12 + random() * 0.08})`
      : `rgba(221, 142, 84, ${0.035 + random() * 0.045})`;
    context.lineWidth = 0.8 + random() * 1.35;
    context.stroke();
  }

  const texture = await textureFromCanvas(canvas, { color: true });
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(1.65, 1);
  return texture;
}

function createSnowBankGeometry() {
  // A closed, lathed snow bank keeps the landscape inside the glass silhouette.
  // The older pair of squashed spheres read as a floating white platter in 3D.
  const profile = [
    new THREE.Vector2(0, -0.88),
    new THREE.Vector2(0.95, -0.88),
    new THREE.Vector2(1.0, -0.83),
    new THREE.Vector2(0.97, -0.75),
    new THREE.Vector2(0.83, -0.61),
    new THREE.Vector2(0.64, -0.49),
    new THREE.Vector2(0.42, -0.4),
    new THREE.Vector2(0.2, -0.35),
    new THREE.Vector2(0, -0.34),
  ];
  const geometry = new THREE.LatheGeometry(profile, 72);
  geometry.scale(1, 1, 0.88);
  geometry.rotateZ(0.065);
  geometry.computeVertexNormals();
  geometry.name = 'SnowBankGeometry';
  return geometry;
}

function seededRandom(seed = 0x5f3759df) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createStaticSnowGeometry() {
  const random = seededRandom();
  const sourceFlake = new THREE.IcosahedronGeometry(0.018, 0);
  const flakes = [];

  for (let index = 0; index < 112; index += 1) {
    let x;
    let y;
    let z;
    do {
      x = (random() * 2 - 1) * 0.98;
      y = -0.52 + random() * 1.58;
      z = (random() * 2 - 1) * 0.92;
    } while (x * x + (y - 0.18) ** 2 + z * z > 0.98 ** 2);

    const scale = 0.55 + random() * 1.15;
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI),
      ),
      new THREE.Vector3(scale, scale, scale),
    );
    const flake = sourceFlake.clone();
    flake.applyMatrix4(matrix);
    flakes.push(flake);
  }

  const geometry = mergeGeometries(flakes, false);
  geometry.name = 'SuspendedSnowGeometry';
  sourceFlake.dispose();
  flakes.forEach((flake) => flake.dispose());
  return geometry;
}

function namedMesh(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const [baseColorBytes, materialBytes] = await Promise.all([
  optimizedImage('TEX0_B64', 'jpeg'),
  optimizedImage('TEX1_B64', 'png'),
]);
const [baseColorTexture, materialTexture] = await Promise.all([
  textureFromBuffer(baseColorBytes, { color: true, mimeType: 'image/jpeg' }),
  textureFromBuffer(materialBytes, { mimeType: 'image/png' }),
]);

const penguinMaterial = new THREE.MeshStandardMaterial({
  name: 'PenguinPBR',
  map: baseColorTexture,
  roughnessMap: materialTexture,
  metalnessMap: materialTexture,
  roughness: 0.96,
  metalness: 0.24,
});

const snowMaterial = new THREE.MeshStandardMaterial({
  name: 'Snow',
  color: 0xf2f7ff,
  roughness: 0.86,
  metalness: 0,
});
const flakeMaterial = new THREE.MeshStandardMaterial({
  name: 'Snowflakes',
  color: 0xf8fcff,
  roughness: 0.48,
  metalness: 0.02,
  emissive: 0x182b42,
  emissiveIntensity: 0.28,
});
const [woodTexture, engravingTexture] = await Promise.all([
  createWoodTexture(),
  createEngravingTexture(),
]);
const woodMaterial = new THREE.MeshStandardMaterial({
  name: 'Walnut',
  color: 0xffffff,
  map: woodTexture,
  roughness: 0.4,
  metalness: 0.05,
});
const woodEdgeMaterial = new THREE.MeshStandardMaterial({
  name: 'WalnutEdge',
  color: 0x29140f,
  roughness: 0.38,
  metalness: 0.08,
});
const brassMaterial = new THREE.MeshStandardMaterial({
  name: 'AntiqueBrass',
  color: 0xa76e34,
  roughness: 0.3,
  metalness: 0.72,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  name: 'CrystalGlass',
  color: 0xc6e9ff,
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.18,
  transmission: 0.92,
  thickness: 0.035,
  ior: 1.46,
  clearcoat: 1,
  clearcoatRoughness: 0.025,
  depthWrite: false,
});

const scene = new THREE.Scene();
scene.name = 'FaySnowGlobeScene';
const gift = new THREE.Group();
gift.name = 'FaySnowGlobe';
gift.scale.setScalar(0.085); // About 24 cm tall in glTF/USDZ metre units.
scene.add(gift);

const snowMound = namedMesh(
  'SnowMound',
  createSnowBankGeometry(),
  snowMaterial,
);
gift.add(snowMound);

const penguinGeometry = createPenguinGeometry();
const penguinMesh = namedMesh('SkiingPenguin', penguinGeometry, penguinMaterial);
const penguinBounds = penguinGeometry.boundingBox;
const penguinSize = new THREE.Vector3();
penguinBounds.getSize(penguinSize);
const penguinScale = 0.88 / Math.max(penguinSize.x, penguinSize.y, penguinSize.z);
penguinMesh.scale.setScalar(penguinScale);
penguinMesh.position.y = -penguinBounds.min.y * penguinScale;

const penguinPivot = new THREE.Group();
penguinPivot.name = 'PenguinPlacement';
penguinPivot.rotation.order = 'YXZ';
penguinPivot.rotation.y = -Math.PI / 2;
penguinPivot.rotation.x = 0.08;
penguinPivot.position.set(0.01, -0.335, 0.015);
penguinPivot.add(penguinMesh);
gift.add(penguinPivot);

gift.add(namedMesh('SuspendedSnow', createStaticSnowGeometry(), flakeMaterial));

const globe = namedMesh(
  'CrystalGlobe',
  new THREE.SphereGeometry(1.16, 64, 32),
  glassMaterial,
);
globe.position.y = 0.18;
globe.castShadow = false;
globe.renderOrder = 10;
gift.add(globe);

const neck = namedMesh(
  'BaseNeck',
  new THREE.CylinderGeometry(0.58, 0.66, 0.2, 64),
  woodMaterial,
);
neck.position.y = -0.94;
gift.add(neck);

const profile = [
  new THREE.Vector2(0.58, -1.0),
  new THREE.Vector2(0.7, -1.04),
  new THREE.Vector2(0.82, -1.11),
  new THREE.Vector2(0.86, -1.2),
  new THREE.Vector2(0.83, -1.29),
  new THREE.Vector2(0.75, -1.34),
];
gift.add(namedMesh('SculptedBase', new THREE.LatheGeometry(profile, 72), woodMaterial));

const topBand = namedMesh(
  'TopBrassBand',
  new THREE.TorusGeometry(0.67, 0.022, 10, 72),
  brassMaterial,
);
topBand.rotation.x = Math.PI / 2;
topBand.position.y = -1.015;
gift.add(topBand);

const foot = namedMesh(
  'BaseFoot',
  new THREE.CylinderGeometry(0.77, 0.82, 0.09, 72),
  woodEdgeMaterial,
);
foot.position.y = -1.375;
gift.add(foot);

const footBand = namedMesh(
  'FootBrassBand',
  new THREE.TorusGeometry(0.79, 0.014, 8, 72),
  brassMaterial,
);
footBand.rotation.x = Math.PI / 2;
footBand.position.y = -1.345;
gift.add(footBand);

const engravingMaterial = new THREE.MeshStandardMaterial({
  name: 'QuietEngraving',
  map: engravingTexture,
  color: 0x9a6747,
  roughness: 0.72,
  metalness: 0.12,
  transparent: false,
  alphaTest: 0.5,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});
const engraving = namedMesh(
  'BaseEngraving',
  new THREE.PlaneGeometry(1.2, 0.24),
  engravingMaterial,
);
engraving.position.set(0, -1.205, 0.875);
engraving.castShadow = false;
engraving.receiveShadow = false;
gift.add(engraving);

scene.updateMatrixWorld(true);

function triangleCount(root) {
  let triangles = 0;
  root.traverse((object) => {
    if (!object.isMesh) return;
    const { geometry } = object;
    triangles += geometry.index
      ? geometry.index.count / 3
      : geometry.getAttribute('position').count / 3;
  });
  return Math.round(triangles);
}

await mkdir(outputDir, { recursive: true });

const gltfExporter = new GLTFExporter();
const glb = await gltfExporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  maxTextureSize: 1024,
  trs: false,
});
await writeFile(resolve(outputDir, 'fay-snow-globe.glb'), Buffer.from(glb));

const usdzExporter = new USDZExporter();
const usdz = await usdzExporter.parseAsync(scene, {
  ar: {
    anchoring: { type: 'plane' },
    planeAnchoring: { alignment: 'horizontal' },
  },
  includeAnchoringProperties: true,
  onlyVisible: true,
  maxTextureSize: 1024,
  quickLookCompatible: true,
});
await writeFile(resolve(outputDir, 'fay-snow-globe.usdz'), Buffer.from(usdz));

const dimensions = new THREE.Box3().setFromObject(gift).getSize(new THREE.Vector3());
const metadata = {
  source: sourcePath,
  sourceCommit: 'e1ab21e7d32d54694c46687e372ba005bb51b9d0',
  generatedAt: new Date().toISOString(),
  triangles: triangleCount(gift),
  dimensionsMeters: {
    width: Number(dimensions.x.toFixed(4)),
    height: Number(dimensions.y.toFixed(4)),
    depth: Number(dimensions.z.toFixed(4)),
  },
  textureMaxPixels: 1024,
  files: {
    glb: 'fay-snow-globe.glb',
    usdz: 'fay-snow-globe.usdz',
  },
};
await writeFile(
  resolve(outputDir, 'model-info.json'),
  `${JSON.stringify(metadata, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(metadata, null, 2));
