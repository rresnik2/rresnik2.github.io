// The site is a static export (next.config.ts) on GitHub Pages, with no
// server to resize images on request. scripts/export-images.mts saves every
// size the site can ask for after the build instead, as WebP beside the
// original: /photo.jpeg at 640px wide is /photo-640w.webp.
//
// No "use client": the root layout calls this on the server too, through
// getImageProps (preloadBackdrop in components/backdrop.tsx).

const RASTER = /\.(jpe?g|png)$/i;

export default function imageLoader({ src, width }: { src: string; width: number }) {
  // `next dev` has no resized copies, so it serves the original at every size
  if (process.env.NODE_ENV === "development" || !RASTER.test(src)) return `${src}?w=${width}`;
  return src.replace(RASTER, `-${width}w.webp`);
}
