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
  geometry.normalizeNormals();
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
  context.font = '500 96px "Gift Engraving", serif';

  // A two-pixel light/shadow offset reads like shallow tooling instead of a label.
  context.fillStyle = 'rgb(58, 58, 58)';
  drawTrackedText(context, '喜欢滑雪的 Fay', 512, 133, 8);
  context.fillStyle = 'rgb(255, 255, 255)';
  drawTrackedText(context, '喜欢滑雪的 Fay', 512, 128, 8);

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

async function createSnowTexture() {
  const canvas = createCanvas(512, 512);
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(54, 60, 468, 460);
  gradient.addColorStop(0, '#fbfdff');
  gradient.addColorStop(0.46, '#eaf3f9');
  gradient.addColorStop(1, '#bed3e4');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const crest = context.createRadialGradient(154, 167, 14, 154, 167, 200);
  crest.addColorStop(0, 'rgba(255,255,255,.36)');
  crest.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = crest;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom(0x534e4f57);
  context.lineCap = 'round';
  for (let line = 0; line < 20; line += 1) {
    const y = 72 + line * 19 + (random() - 0.5) * 12;
    context.beginPath();
    context.moveTo(44 + random() * 54, y);
    context.bezierCurveTo(
      168, y - 7 - random() * 12,
      314, y + 6 + random() * 12,
      460 - random() * 60, y + (random() - 0.5) * 14,
    );
    context.strokeStyle = line % 3 === 0
      ? 'rgba(114,151,181,.032)'
      : 'rgba(255,255,255,.055)';
    context.lineWidth = 0.7 + random() * 1.2;
    context.stroke();
  }

  return textureFromCanvas(canvas, { color: true });
}

const GLOBE_CENTER_Y = 0.18;
const GLOBE_RADIUS = 1.16;
const SNOW_CAP_RADIUS = GLOBE_RADIUS - 0.055;
const SNOW_SURFACE_Y = -0.31;
const SNOW_DISC_RADIUS = Math.sqrt(SNOW_CAP_RADIUS ** 2 - SNOW_SURFACE_Y ** 2);
const SLOPE_ROTATION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(THREE.MathUtils.degToRad(2.5), 0, THREE.MathUtils.degToRad(-25), 'XYZ'),
);
const GLOBE_CENTER = new THREE.Vector3(0, GLOBE_CENTER_Y, 0);
const TRACK_END = new THREE.Vector2(-0.22, 0.13);

function smoothstep01(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function trackCenter(trackIndex, t) {
  // Keep the ski pair close enough to feel physically linked, but far enough
  // apart that the two recessed cuts survive the default low camera angle.
  const spacing = (trackIndex === 0 ? -1 : 1) * THREE.MathUtils.lerp(0.082, 0.06, t);
  const carve = Math.sin(t * Math.PI) * 0.105 + Math.sin(t * Math.PI * 2) * 0.018;
  return {
    x: THREE.MathUtils.lerp(-0.82, TRACK_END.x, t),
    z: THREE.MathUtils.lerp(-0.08, TRACK_END.y, t) + carve + spacing,
  };
}

function sculptedTrackField(x, z) {
  let heightOffset = 0;
  let compression = 0;
  for (let trackIndex = 0; trackIndex < 2; trackIndex += 1) {
    let closestDistance = Infinity;
    let closestT = 0;
    for (let sample = 0; sample <= 48; sample += 1) {
      const t = sample / 48;
      const center = trackCenter(trackIndex, t);
      const distance = Math.hypot(x - center.x, z - center.z);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestT = t;
      }
    }

    const strength = smoothstep01(closestT / 0.18);
    const width = 0.028 + closestT * 0.011;
    const grooveWeight = strength * Math.exp(
      -(closestDistance * closestDistance) / (2 * width * width),
    );
    const lipDistance = Math.abs(closestDistance - width * 1.5);
    const lipWeight = strength * Math.exp(
      -(lipDistance * lipDistance) / (2 * (width * 0.5) ** 2),
    );
    heightOffset += -0.063 * grooveWeight + 0.017 * lipWeight;
    compression = Math.max(compression, grooveWeight);
  }
  return { heightOffset, compression };
}

function snowSurfaceHeight(x, z, { tracks = true } = {}) {
  const radius = Math.hypot(x, z) / SNOW_DISC_RADIUS;
  const edgeEnvelope = smoothstep01((1 - radius) / 0.18);
  const windRelief = edgeEnvelope * (
    Math.sin(x * 11.5 + z * 2.6) * 0.0045
      + Math.sin(z * 16.3 - x * 2.1) * 0.0025
  );
  const track = tracks ? sculptedTrackField(x, z) : { heightOffset: 0 };
  return SNOW_SURFACE_Y + windRelief + track.heightOffset;
}

function slopePointToWorld(x, y, z) {
  return new THREE.Vector3(x, y, z).applyQuaternion(SLOPE_ROTATION).add(GLOBE_CENTER);
}

function createInclinedSnowCapGeometry() {
  const radialSegments = 46;
  const angularSegments = 120;
  const shellSegments = 20;
  const positions = [];
  const uvs = [];
  const indices = [];

  function addVertex(x, y, z, u = 0.5 + x / (SNOW_DISC_RADIUS * 2), v = 0.5 + z / (SNOW_DISC_RADIUS * 2)) {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  }

  const topCenter = addVertex(0, snowSurfaceHeight(0, 0), 0);
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const radial = ring / radialSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      const x = Math.cos(angle) * SNOW_DISC_RADIUS * radial;
      const z = Math.sin(angle) * SNOW_DISC_RADIUS * radial;
      addVertex(x, snowSurfaceHeight(x, z), z);
    }
  }

  const topRingVertex = (ring, segment) => (
    1 + (ring - 1) * angularSegments + (segment + angularSegments) % angularSegments
  );
  for (let segment = 0; segment < angularSegments; segment += 1) {
    const next = (segment + 1) % angularSegments;
    indices.push(topCenter, topRingVertex(1, next), topRingVertex(1, segment));
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments;
      const inner = topRingVertex(ring, segment);
      const innerNext = topRingVertex(ring, next);
      const outer = topRingVertex(ring + 1, segment);
      const outerNext = topRingVertex(ring + 1, next);
      indices.push(inner, innerNext, outerNext, inner, outerNext, outer);
    }
  }

  const shellStarts = [];
  const capLatitude = Math.asin(SNOW_SURFACE_Y / SNOW_CAP_RADIUS);
  const bottomPole = addVertex(0, -SNOW_CAP_RADIUS, 0, 0.5, 0);
  for (let layer = 1; layer <= shellSegments; layer += 1) {
    const t = layer / shellSegments;
    const latitude = THREE.MathUtils.lerp(-Math.PI / 2, capLatitude, t);
    const ringRadius = Math.cos(latitude) * SNOW_CAP_RADIUS;
    const y = Math.sin(latitude) * SNOW_CAP_RADIUS;
    const ringStart = positions.length / 3;
    shellStarts.push(ringStart);
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      addVertex(
        Math.cos(angle) * ringRadius,
        y,
        Math.sin(angle) * ringRadius,
        segment / angularSegments,
        t,
      );
    }
  }

  for (let segment = 0; segment < angularSegments; segment += 1) {
    const next = (segment + 1) % angularSegments;
    indices.push(bottomPole, shellStarts[0] + segment, shellStarts[0] + next);
  }
  for (let layer = 0; layer < shellStarts.length - 1; layer += 1) {
    const lowerStart = shellStarts[layer];
    const upperStart = shellStarts[layer + 1];
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments;
      indices.push(
        lowerStart + segment,
        upperStart + segment,
        upperStart + next,
        lowerStart + segment,
        upperStart + next,
        lowerStart + next,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.normalizeNormals();

  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const topVertexCount = 1 + radialSegments * angularSegments;
  const shadowSnow = new THREE.Color(0xa9c3d7);
  const lightSnow = new THREE.Color(0xf9fbfd);
  const compressedSnow = new THREE.Color(0xa7c2d6);
  const colors = [];
  for (let index = 0; index < position.count; index += 1) {
    const isTop = index < topVertexCount;
    const upward = THREE.MathUtils.clamp(normal.getY(index), 0, 1);
    const color = shadowSnow.clone().lerp(lightSnow, isTop ? 0.72 + upward * 0.22 : 0.2 + upward * 0.28);
    if (isTop) {
      const track = sculptedTrackField(position.getX(index), position.getZ(index));
      color.lerp(compressedSnow, track.compression * 0.66);
    }
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.name = 'InclinedSnowCapGeometry';
  return geometry;
}

function createTrackBedGeometry(trackIndex) {
  const segments = 58;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const center = trackCenter(trackIndex, t);
    const before = trackCenter(trackIndex, Math.max(0, t - 0.012));
    const after = trackCenter(trackIndex, Math.min(1, t + 0.012));
    const tangentX = after.x - before.x;
    const tangentZ = after.z - before.z;
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
    const perpendicularX = -tangentZ / tangentLength;
    const perpendicularZ = tangentX / tangentLength;
    const width = THREE.MathUtils.lerp(0.002, 0.023, smoothstep01(t / 0.22));

    for (const side of [-1, 1]) {
      const x = center.x + perpendicularX * width * side;
      const z = center.z + perpendicularZ * width * side;
      positions.push(x, snowSurfaceHeight(x, z) + 0.002, z);
      uvs.push(t, side < 0 ? 0 : 1);
    }
  }

  for (let index = 0; index < segments; index += 1) {
    const a = index * 2;
    indices.push(a, a + 3, a + 2, a, a + 1, a + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.name = `CompressedTrackBed${trackIndex + 1}Geometry`;
  return geometry;
}

function baseRadiusAtY(profile, y) {
  const outer = profile.filter((point) => point.x > 0.5).sort((a, b) => a.y - b.y);
  for (let index = 0; index < outer.length - 1; index += 1) {
    const low = outer[index];
    const high = outer[index + 1];
    if (y < low.y || y > high.y) continue;
    const t = (y - low.y) / (high.y - low.y);
    return THREE.MathUtils.lerp(low.x, high.x, t);
  }
  return outer.reduce(
    (closest, point) => (Math.abs(point.y - y) < Math.abs(closest.y - y) ? point : closest),
    outer[0],
  ).x;
}

function createCurvedEngravingGeometry(profile) {
  const horizontalSegments = 64;
  const verticalSegments = 8;
  const halfArc = 0.72;
  const yBottom = -1.285;
  const yTop = -1.105;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let row = 0; row <= verticalSegments; row += 1) {
    const v = row / verticalSegments;
    const y = THREE.MathUtils.lerp(yBottom, yTop, v);
    const radius = baseRadiusAtY(profile, y) + 0.0035;
    for (let column = 0; column <= horizontalSegments; column += 1) {
      const u = column / horizontalSegments;
      const angle = THREE.MathUtils.lerp(-halfArc, halfArc, u);
      positions.push(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      uvs.push(u, v);
    }
  }

  const stride = horizontalSegments + 1;
  for (let row = 0; row < verticalSegments; row += 1) {
    for (let column = 0; column < horizontalSegments; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.name = 'CurvedBaseEngravingGeometry';
  return geometry;
}

function seededRandom(seed = 0x5f3759df) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function namedMesh(name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSnowfallVolume(material) {
  const random = seededRandom(0x5f4e4f57);
  const volume = new THREE.Group();
  volume.name = 'VolumetricSnowfall';
  const geometry = new THREE.OctahedronGeometry(0.016, 0);
  geometry.name = 'WindSnowCrystalGeometry';
  const animationTracks = [];
  const clipDuration = 4.8;
  const sampleCount = 40;
  const flakeCount = 44;

  for (let index = 0; index < flakeCount; index += 1) {
    let localX;
    let localZ;
    do {
      const landingAngle = random() * Math.PI * 2;
      const landingRadius = Math.sqrt(random()) * SNOW_DISC_RADIUS * 0.72;
      localX = Math.cos(landingAngle) * landingRadius;
      localZ = Math.sin(landingAngle) * landingRadius;
    } while (Math.hypot(localX - TRACK_END.x, localZ - TRACK_END.y) < 0.24);

    // The landing coordinate is chosen on the tilted cap, then transformed
    // back into globe space. Snow still falls vertically, while the opaque cap
    // hides each crystal immediately after it crosses the physical slope.
    const landing = slopePointToWorld(
      localX,
      snowSurfaceHeight(localX, localZ),
      localZ,
    );
    const endX = landing.x;
    const endZ = landing.z;
    let startX = endX + 0.44 + random() * 0.24;
    let startZ = endZ + (random() - 0.5) * 0.28;
    const startRadius = Math.hypot(startX, startZ);
    if (startRadius > 0.88) {
      const inwardScale = 0.88 / startRadius;
      startX *= inwardScale;
      startZ *= inwardScale;
    }
    const interiorRadius = GLOBE_RADIUS - 0.09;
    const startY = GLOBE_CENTER_Y
      + Math.sqrt(Math.max(0.02, interiorRadius ** 2 - startX * startX - startZ * startZ))
      - 0.045
      - random() * 0.22;
    const endY = landing.y - 0.09;
    const travelDuration = 2.05 + random() * 0.42;
    const phaseOffset = random() * clipDuration;
    const swayPhase = random() * Math.PI * 2;

    const flake = namedMesh(
      `SnowFlake${String(index).padStart(2, '0')}`,
      geometry,
      material,
    );
    flake.castShadow = false;
    flake.receiveShadow = false;
    flake.position.set(startX, startY, startZ);
    const velocity = new THREE.Vector3(
      endX - startX,
      endY - startY,
      endZ - startZ,
    ).normalize();
    flake.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), velocity);
    flake.scale.setScalar(0.001);
    volume.add(flake);

    const visibleScale = 0.64 + random() * 0.88;
    const widthScale = visibleScale * (0.42 + random() * 0.22);
    const lengthScale = visibleScale * (
      random() < 0.28 ? 1.05 + random() * 0.55 : 2.25 + random() * 1.35
    );
    const times = [];
    const positions = [];
    const scales = [];

    for (let sample = 0; sample <= sampleCount; sample += 1) {
      const time = (sample / sampleCount) * clipDuration;
      const phase = (time + phaseOffset) % clipDuration;
      const active = phase < travelDuration;
      const progress = active ? phase / travelDuration : 1;
      const appear = active ? smoothstep01(progress / 0.12) : 0;
      const vanish = active ? 1 - smoothstep01((progress - 0.955) / 0.045) : 0;
      const visibility = Math.max(0.001, appear * vanish);
      const sway = active ? Math.sin(progress * Math.PI * 2 + swayPhase) * 0.018 : 0;

      times.push(time);
      positions.push(
        THREE.MathUtils.lerp(startX, endX, progress),
        THREE.MathUtils.lerp(startY, endY, progress),
        THREE.MathUtils.lerp(startZ, endZ, progress) + sway,
      );
      scales.push(
        widthScale * visibility,
        lengthScale * visibility,
        widthScale * visibility,
      );
    }

    // Exact first/last equality makes model-viewer's loop boundary invisible.
    positions.splice(-3, 3, ...positions.slice(0, 3));
    scales.splice(-3, 3, ...scales.slice(0, 3));
    animationTracks.push(
      new THREE.VectorKeyframeTrack(`${flake.name}.position`, times, positions),
      new THREE.VectorKeyframeTrack(
        `${flake.name}.scale`,
        times,
        scales,
      ),
    );
  }

  return {
    volume,
    animation: new THREE.AnimationClip('Snowfall', clipDuration, animationTracks),
  };
}

const [baseColorBytes, materialBytes] = await Promise.all([
  optimizedImage('TEX0_B64', 'jpeg'),
  optimizedImage('TEX1_B64', 'png'),
]);
const [baseColorTexture, materialTexture] = await Promise.all([
  textureFromBuffer(baseColorBytes, { color: true, mimeType: 'image/jpeg' }),
  textureFromBuffer(materialBytes, { mimeType: 'image/png' }),
]);
const [woodTexture, engravingTexture, snowTexture] = await Promise.all([
  createWoodTexture(),
  createEngravingTexture(),
  createSnowTexture(),
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
  name: 'SculptedSnow',
  color: 0xffffff,
  map: snowTexture,
  roughness: 0.94,
  metalness: 0,
  vertexColors: true,
});
const trackBedMaterial = new THREE.MeshStandardMaterial({
  name: 'CompressedSnowInGrooves',
  color: 0x92aaba,
  roughness: 1,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const snowflakeMaterial = new THREE.MeshStandardMaterial({
  name: 'SnowCrystal',
  color: 0xf8fcff,
  roughness: 0.52,
  metalness: 0.02,
  emissive: 0x14283d,
  emissiveIntensity: 0.16,
});
const woodMaterial = new THREE.MeshStandardMaterial({
  name: 'Walnut',
  color: 0xffffff,
  map: woodTexture,
  roughness: 0.56,
  metalness: 0.025,
  envMapIntensity: 0.68,
});
const woodEdgeMaterial = new THREE.MeshStandardMaterial({
  name: 'WalnutEdge',
  color: 0x29140f,
  roughness: 0.38,
  metalness: 0.08,
});
const brassMaterial = new THREE.MeshStandardMaterial({
  name: 'AntiqueBrass',
  color: 0x9c6935,
  roughness: 0.4,
  metalness: 0.68,
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

const inclinedSnowWorld = new THREE.Group();
inclinedSnowWorld.name = 'InclinedSnowWorld';
inclinedSnowWorld.position.copy(GLOBE_CENTER);
inclinedSnowWorld.quaternion.copy(SLOPE_ROTATION);
gift.add(inclinedSnowWorld);

const snowCap = namedMesh(
  'InclinedSnowCap',
  createInclinedSnowCapGeometry(),
  snowMaterial,
);
inclinedSnowWorld.add(snowCap);
for (let trackIndex = 0; trackIndex < 2; trackIndex += 1) {
  const trackBed = namedMesh(
    `CompressedTrackBed${trackIndex + 1}`,
    createTrackBedGeometry(trackIndex),
    trackBedMaterial,
  );
  trackBed.castShadow = false;
  inclinedSnowWorld.add(trackBed);
}

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
// The figure and the filled snow cap share one parent transform. In local
// coordinates the feet stay on the original flat ground plane; tilting the
// whole miniature creates the downhill stance without a hover gap.
penguinPivot.rotation.order = 'YXZ';
penguinPivot.rotation.y = 0.42;
penguinPivot.rotation.z = -THREE.MathUtils.degToRad(6);
penguinPivot.position.set(
  TRACK_END.x,
  snowSurfaceHeight(TRACK_END.x, TRACK_END.y) - 0.024,
  TRACK_END.y,
);
penguinPivot.add(penguinMesh);
inclinedSnowWorld.add(penguinPivot);

const snowfall = createSnowfallVolume(snowflakeMaterial);
gift.add(snowfall.volume);

const globe = namedMesh(
  'CrystalGlobe',
  new THREE.SphereGeometry(GLOBE_RADIUS, 64, 32),
  glassMaterial,
);
globe.position.y = GLOBE_CENTER_Y;
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

const baseProfile = [
  new THREE.Vector2(0, -1.34),
  new THREE.Vector2(0.75, -1.34),
  new THREE.Vector2(0.83, -1.29),
  new THREE.Vector2(0.86, -1.2),
  new THREE.Vector2(0.82, -1.11),
  new THREE.Vector2(0.7, -1.04),
  new THREE.Vector2(0.58, -1.0),
  new THREE.Vector2(0, -1.0),
];
gift.add(namedMesh('SculptedBase', new THREE.LatheGeometry(baseProfile, 72), woodMaterial));

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
  color: 0xbd8051,
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
  createCurvedEngravingGeometry(baseProfile),
  engravingMaterial,
);
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
  animations: [snowfall.animation],
  binary: true,
  onlyVisible: true,
  maxTextureSize: 1024,
  trs: true,
});
await writeFile(resolve(outputDir, 'fay-snow-globe.glb'), Buffer.from(glb));

// Quick Look receives the quiet collectible at rest. The interactive snowfall
// belongs to the web scene, where the user explicitly asks for it.
snowfall.volume.visible = false;
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
