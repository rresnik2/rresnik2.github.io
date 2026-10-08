"use client";

import { useEffect, useRef } from "react";
import { clipFor } from "@/lib/richie/atlas";
import { LIFT_ROOM } from "@/lib/richie/render";
import { CELL, rasterize } from "@/lib/richie/sprites/frame";
import { ANIMATIONS, FRAMES } from "@/lib/richie/sprites/index";
import { DIRECTIONS, type AnimationName, type Direction } from "@/lib/richie/types";

// Gaits shown at a typical speed (CSS px/s at 2x)
const SPEED = { stroll: 90, run: 480 };

function Animation({ name, direction, scale }: { name: AnimationName; direction: Direction; scale: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvas.current!.getContext("2d")!;
    context.imageSmoothingEnabled = false;
    const clip = clipFor(name, direction);
    const images = clip.frames.map((frame) => {
      const tile = document.createElement("canvas");
      tile.width = tile.height = CELL;
      tile.getContext("2d")!.putImageData(new ImageData(rasterize(FRAMES[frame]), CELL, CELL), 0, 0);
      return tile;
    });
    const lifts = clip.frames.map((frame) => FRAMES[frame].lift ?? 0);
    const speed = SPEED[name as keyof typeof SPEED];
    // Frame-by-frame animations (pounce, pet) are stepped through at 6fps
    const fps = clip.def.stride && speed ? speed / (clip.def.stride * 2) : (clip.def.fps ?? 6);
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const i = Math.floor(((now - start) / 1000) * fps) % images.length;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, CELL * scale, (CELL + LIFT_ROOM) * scale);
      if (clip.mirror) context.setTransform(-1, 0, 0, 1, CELL * scale, 0);
      context.drawImage(images[i], 0, (LIFT_ROOM - lifts[i]) * scale, CELL * scale, CELL * scale);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [name, direction, scale]);

  return <canvas ref={canvas} width={CELL * scale} height={(CELL + LIFT_ROOM) * scale} className="bg-paper" />;
}

export default function SpriteViewer() {
  const names = Object.keys(ANIMATIONS) as AnimationName[];
  return (
    <div className="space-y-10">
      {names.map((name) => {
        // Every direction for animations drawn in more than one view
        const frames = ANIMATIONS[name]!.frames;
        const directional = !!(frames.N || frames.NE || frames.SE);
        const directions = directional ? DIRECTIONS : (["E", "W"] as Direction[]);
        return (
          <section key={name}>
            <h2 className="mb-3 text-xl">{name}</h2>
            <div className="flex flex-wrap gap-4">
              {directions.map((direction) => (
                <figure key={direction} className="text-center text-xs text-muted">
                  <div className="flex gap-2 border border-ink/10 bg-[url(/GalleryExcluded/cloud2.jpeg)] bg-cover p-2">
                    <Animation name={name} direction={direction} scale={2} />
                    <Animation name={name} direction={direction} scale={4} />
                  </div>
                  <figcaption className="mt-1">{direction}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
