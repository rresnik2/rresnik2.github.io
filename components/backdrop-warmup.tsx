"use client";

import { useEffect } from "react";
import { getImageProps, type StaticImageData } from "next/image";
import { BACKDROP_SIZES } from "@/components/backdrop";

// Off-screen copies, kept referenced so the browser holds on to their
// decoded pixels until the backdrop is actually shown
const warmed = new Map<string, HTMLImageElement>();

// Decodes a backdrop while the browser is idle, so navigating to its page
// doesn't stall the first frames of the slide decoding a full-screen image.
// Uses the same srcset/sizes as <Backdrop>, so it's the same file and request.
export default function BackdropWarmup({ src }: { src: StaticImageData }) {
  useEffect(() => {
    const { props } = getImageProps({ src, alt: "", fill: true, sizes: BACKDROP_SIZES });

    let img = warmed.get(props.src);
    if (!img) {
      img = new Image();
      // sizes and srcset before src, so only the chosen candidate is fetched
      if (props.sizes) img.sizes = props.sizes;
      if (props.srcSet) img.srcset = props.srcSet;
      img.src = props.src;
      warmed.set(props.src, img);
    }

    const decode = () => void img.decode().catch(() => {});
    // Safari has no requestIdleCallback
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(decode, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(decode, 500);
    return () => window.clearTimeout(id);
  }, [src]);

  return null;
}
