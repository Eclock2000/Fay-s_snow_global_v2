# Fay's Snow Globe · v2

An independent, mobile-first successor to
[`Eclock2000/Fay-s_snow_global`](https://github.com/Eclock2000/Fay-s_snow_global).
The original repository is intentionally left untouched.

## What changed

- responsive layout sized for iPhone safe areas and short screens;
- a physically scaled, optimized GLB/USDZ snow globe with a true tilted
  spherical-cap snow volume;
- a fall-line-aligned downhill stance, recessed twin tracks, and a default
  globe-space crosswind whose projection and depth change while you rotate;
- curved-on-wood engraving kept deliberately quiet rather than promoted into
  greeting-card copy;
- native iPhone AR through Apple Quick Look;
- local, pinned runtime assets (no Google Fonts or third-party CDN dependency);
- reduced-motion support, visibility pausing, and mobile-friendly pointer
  handling;
- explicit loading, AR readiness, and in-app-browser-to-Safari guidance.

## Local preview

```bash
npm install
npm run serve
```

Open <http://127.0.0.1:4173/Fay-s_snow_global_v2/>.

## Rebuild the 3D/AR assets

The source HTML from the original project contains the penguin mesh and
textures. Pass its path explicitly so this repository never edits the original:

```bash
npm run build:model -- /path/to/Fay-s_snow_global/index.html
```

The build writes `assets/models/fay-snow-globe.glb` and
`assets/models/fay-snow-globe.usdz`.

## Publish

This repository is designed for GitHub Pages from the `main` branch root. Its
project path is intentionally handled as a relative URL, so local preview and
GitHub Pages use the same files.
