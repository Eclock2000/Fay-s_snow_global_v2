import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const source = resolve(root, 'assets', 'preview', 'og-snow-globe.svg');
const output = resolve(root, 'assets', 'preview', 'og-snow-globe.png');
const svg = await readFile(source);

await writeFile(
  output,
  await sharp(svg, { density: 144 })
    .resize(1200, 630, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
    .toBuffer(),
);

console.log(output);
