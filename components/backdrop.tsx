// components/backdrop.tsx
import Image, { getImageProps, type StaticImageData } from "next/image";
import { preload } from "react-dom";

// Full width at 1x. On 2x+ screens, ask for half: the browser then picks the
// 1920px version instead of 3840px, which decodes ~3x faster (a 3840px decode
// stalled the slide into Projects by ~110ms). It's a filtered cloud texture,
// so the softer upscale isn't noticeable. On screens narrower than the 3:2
// photo (phones, portrait tablets) the cover is sized by height, ~150vh wide,
// so ask for half of that; otherwise a phone got a ~640px image stretched 4-6x.
export const BACKDROP_SIZES = "(max-aspect-ratio: 3/2) 75vh, (min-resolution: 2dppx) 50vw, 100vw";

// A full-screen background image, fixed to the viewport so its scale never
// depends on how tall the page is. Later backdrops in the DOM paint on top.
// Sized to the largest viewport (lvh), so a phone's toolbars sliding in and
// out don't re-fit the image while scrolling.
export default function Backdrop({
  src,
  className = "",
}: {
  src: StaticImageData;
  className?: string;
}) {
  return (
    <div aria-hidden="true" data-backdrop className="fixed inset-x-0 top-0 h-lvh -z-10">
      <Image
        src={src}
        alt=""
        fill
        preload
        sizes={BACKDROP_SIZES}
        placeholder="blur"
        className={`object-cover ${className}`}
      />
    </div>
  );
}

// Fetches a backdrop in the background so it's already cached when the user
// navigates to a page that shows it, instead of flashing the body background.
export function preloadBackdrop(src: StaticImageData) {
  const { props } = getImageProps({ src, alt: "", fill: true, sizes: BACKDROP_SIZES });
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    fetchPriority: "low",
  });
}
