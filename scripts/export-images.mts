// Makes the resized copies lib/image-loader.ts points at. A static export has
// no server to resize images on request, so after `next build` this saves
// every JPEG and PNG in out/ at every width the site can ask for, as WebP
// beside the original: out/photo.jpeg -> out/photo-640w.webp, ...
//
//   node scripts/export-images.mts      (part of `npm run build`)
//
// The widths are the build's own (deviceSizes and imageSizes in
// next.config.ts), read back from .next/images-manifest.json.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const RASTER = /\.(jpe?g|png)$/i;

const manifest = path.join(ROOT, ".next", "images-manifest.json");
const { images }: { images: { deviceSizes: number[]; imageSizes: number[] } } = JSON.parse(
  await readFile(manifest, "utf8")
);
const widths = [...new Set([...images.imageSizes, ...images.deviceSizes])].sort((a, b) => a - b);

const files = (await readdir(OUT, { recursive: true }))
  .filter((file) => RASTER.test(file))
  .map((file) => path.join(OUT, file));

const start = performance.now();
let written = 0;

// One image at a time, its widths in parallel: libvips already spreads each
// resize across the cores, and every full-size photo at once would need
// gigabytes of memory
for (const file of files) {
  const { width: original } = (await sharp(file).metadata()).autoOrient;
  // Asking for more than the original gets the original size, so those
  // widths share one copy
  const sizes = [...new Set(widths.map((width) => Math.min(width, original)))];
  const copies = await Promise.all(
    sizes.map((width) => sharp(file).rotate().resize({ width }).webp({ quality: 75 }).toBuffer())
  );
  const bySize = new Map(sizes.map((width, i) => [width, copies[i]]));

  const base = file.replace(RASTER, "");
  await Promise.all(
    widths.map((width) => writeFile(`${base}-${width}w.webp`, bySize.get(Math.min(width, original))!))
  );
  written += widths.length;
}

const seconds = ((performance.now() - start) / 1000).toFixed(1);
console.log(`export-images: ${files.length} images at ${widths.join(", ")}px, ${written} files in ${seconds}s`);
