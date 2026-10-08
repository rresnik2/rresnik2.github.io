"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { Photo } from "@/lib/gallery";
import { listenForSwipes, type Swipe } from "@/lib/swipe";

type Slot = { landscape: string; portrait: string; sizes: string };

// An 8-photo rhythm on a 12-column grid: a full-width lead, two offset pairs,
// then a staggered row of three. Portraits get narrower columns so they don't
// tower over the page. Phones get two columns instead (half-width images).
const SLOTS: Slot[] = [
  { landscape: "md:col-span-12", portrait: "md:col-start-4 md:col-span-6", sizes: "(min-width: 768px) 90vw, 50vw" },
  { landscape: "md:col-start-1 md:col-span-7", portrait: "md:col-start-2 md:col-span-4", sizes: "(min-width: 768px) 55vw, 50vw" },
  { landscape: "md:col-start-8 md:col-span-5 md:mt-32", portrait: "md:col-start-9 md:col-span-4 md:mt-32", sizes: "(min-width: 768px) 40vw, 50vw" },
  { landscape: "md:col-start-2 md:col-span-5", portrait: "md:col-start-2 md:col-span-4", sizes: "(min-width: 768px) 40vw, 50vw" },
  { landscape: "md:col-start-7 md:col-span-6 md:mt-48", portrait: "md:col-start-8 md:col-span-4 md:mt-48", sizes: "(min-width: 768px) 50vw, 50vw" },
  { landscape: "md:col-start-1 md:col-span-4", portrait: "md:col-start-1 md:col-span-4", sizes: "(min-width: 768px) 33vw, 50vw" },
  { landscape: "md:col-start-5 md:col-span-4 md:mt-24", portrait: "md:col-start-5 md:col-span-4 md:mt-24", sizes: "(min-width: 768px) 33vw, 50vw" },
  { landscape: "md:col-start-9 md:col-span-4 md:mt-12", portrait: "md:col-start-9 md:col-span-4 md:mt-12", sizes: "(min-width: 768px) 33vw, 50vw" },
];

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Fisher–Yates
function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const subscribe = () => () => {};

// Shuffles once per visit: each time the gallery mounts it gets a new order,
// which then holds through re-renders. Keyed by the photos themselves, not the
// array, because a server refresh (or a hot reload in development) delivers a
// new array of the same photos and would otherwise reshuffle the page.
function useShuffled(photos: Photo[]) {
  const shuffled = useRef<{ key: string; photos: Photo[] } | null>(null);
  const key = photos.map((p) => p.src).join("\n");
  return useSyncExternalStore(
    subscribe,
    () => {
      if (shuffled.current?.key !== key) shuffled.current = { key, photos: shuffle(photos) };
      return shuffled.current.photos;
    },
    // The page is prerendered in file order; the browser swaps in the shuffle
    // after hydrating, so the server and client HTML still match.
    () => photos
  );
}

function describe(photo: Photo, index: number) {
  const number = String(index + 1).padStart(3, "0");
  const date = photo.date ? dateFormat.format(new Date(photo.date)) : null;
  return { number, date, alt: photo.alt ?? `Photograph ${number}${date ? `, ${date}` : ""}` };
}

// accent colours the number: the deeper vermilion is readable this small on
// paper, the brighter one on the lightbox's dark backdrop
function Caption({ photo, index, accent, className }: { photo: Photo; index: number; accent: string; className: string }) {
  const { number, date } = describe(photo, index);
  return (
    <figcaption className={`flex flex-wrap items-baseline justify-between gap-x-2 border-t pt-2 text-xs md:gap-x-4 ${className}`}>
      <span>
        <span className={`mr-2 ${accent}`}>{number}</span>
        {photo.label}
      </span>
      {date ? <span className="font-body italic">{date}</span> : null}
    </figcaption>
  );
}

const LIGHTBOX_SIZES = "100vw";

// Two rounds of SLOTS before "Show all", so the page isn't every photo long
const PREVIEW = 16;

// Starts downloading a photo at the size the pop-up will request, so it's
// cached by the time the user steps to it.
function preloadLightboxPhoto(photo: Photo) {
  const { props } = getImageProps({
    src: photo.src,
    alt: "",
    width: photo.width,
    height: photo.height,
    sizes: LIGHTBOX_SIZES,
  });
  preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes });
}

export default function GalleryGrid({ photos }: { photos: Photo[] }) {
  const ordered = useShuffled(photos);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Which way the user last moved: 1 = next, -1 = previous, 0 = just opened
  const [direction, setDirection] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = activeIndex === null ? null : ordered[activeIndex];
  // The lightbox still steps through every photo, shown here or not
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? ordered : ordered.slice(0, PREVIEW);
  const firstRevealed = useRef<HTMLButtonElement>(null);

  // "Show all" is gone once clicked, so focus moves on to the first new photo
  useEffect(() => {
    if (showAll) firstRevealed.current?.focus();
  }, [showAll]);

  if (activeIndex !== null) {
    preloadLightboxPhoto(ordered[(activeIndex + 1) % ordered.length]);
    preloadLightboxPhoto(ordered[(activeIndex - 1 + ordered.length) % ordered.length]);
  }

  useEffect(() => {
    if (active && !dialog.current?.open) dialog.current?.showModal();
  }, [active]);

  // Moves through the gallery, wrapping around at either end
  function step(delta: number) {
    setDirection(delta);
    setActiveIndex((i) => (i === null ? null : (i + delta + ordered.length) % ordered.length));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else return;
    e.preventDefault();
  }

  // On touch screens: swipe left or right to step through the photos, down to close
  const onSwipe = useEffectEvent((swipe: Swipe) => {
    if (swipe === "left") step(1);
    else if (swipe === "right") step(-1);
    else if (swipe === "down") dialog.current?.close();
  });
  useEffect(() => {
    const viewer = dialog.current;
    return viewer ? listenForSwipes(viewer, (swipe) => onSwipe(swipe)) : undefined;
  }, []);

  const arrowButton =
    "fixed top-1/2 -translate-y-1/2 cursor-pointer px-3 py-6 text-4xl leading-none text-paper/80 transition-colors hover:text-vermilion";

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-12 md:gap-x-8 md:gap-y-24">
        {shown.map((photo, i) => {
          const slot = SLOTS[i % SLOTS.length];
          const isPortrait = photo.height >= photo.width;

          return (
            // On phones a portrait (with its caption) is about as tall as two
            // landscape photos, so it spans two rows and the columns stagger
            <figure key={photo.src} className={isPortrait ? `row-span-2 md:row-span-1 ${slot.portrait}` : slot.landscape}>
              <button
                ref={i === PREVIEW ? firstRevealed : undefined}
                type="button"
                onClick={() => {
                  setDirection(0);
                  setActiveIndex(i);
                }}
                aria-label={`Enlarge photograph ${describe(photo, i).number}${photo.label ? `, ${photo.label}` : ""}`}
                className="group block w-full cursor-zoom-in bg-ink/5"
              >
                <Image
                  src={photo.src}
                  alt={describe(photo, i).alt}
                  width={photo.width}
                  height={photo.height}
                  sizes={slot.sizes}
                  className="h-auto w-full transition-opacity duration-300 group-hover:opacity-90"
                />
              </button>
              <Caption photo={photo} index={i} accent="text-vermilion-deep" className="mt-2 border-ink/15 text-muted md:mt-3" />
            </figure>
          );
        })}
      </div>
      {showAll || ordered.length <= PREVIEW ? null : (
        <div className="mt-16 text-center md:mt-24">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="link-underline tap-target cursor-pointer text-3xl hover:text-vermilion"
          >
            Show all {ordered.length} photos ↓
          </button>
        </div>
      )}

      {/* Native modal dialog: Escape closes it, focus stays inside, and the
          page behind is inert. Clicking the dimmed area also closes it. */}
      <dialog
        ref={dialog}
        onClose={() => setActiveIndex(null)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        onKeyDown={handleKeyDown}
        aria-label={active ? describe(active, activeIndex!).alt : undefined}
        className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-ink/90"
      >
        {active ? (
          <>
            {/* Keyed by photo so the slide-in replays on every step; the
                offset makes it come from the side the user moved toward. */}
            <figure
              key={active.src}
              style={{ "--lightbox-offset": `${direction * 60}px` } as React.CSSProperties}
              className="flex flex-col items-center motion-safe:animate-lightbox-in"
            >
              <Image
                src={active.src}
                alt={describe(active, activeIndex!).alt}
                width={active.width}
                height={active.height}
                sizes={LIGHTBOX_SIZES}
                className="h-auto max-h-[85dvh] w-auto max-w-[92vw] object-contain"
              />
              <Caption
                photo={active}
                index={activeIndex!}
                accent="text-vermilion"
                className="mt-3 w-full max-w-[92vw] border-paper/20 text-paper/70"
              />
            </figure>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="fixed top-2 right-4 cursor-pointer p-2 text-3xl leading-none text-paper/80 transition-colors hover:text-vermilion"
            >
              ×
            </button>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${arrowButton} left-2`}>
              ←
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${arrowButton} right-2`}>
              →
            </button>
          </>
        ) : null}
      </dialog>
    </>
  );
}
