"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { createRichie } from "@/lib/richie/engine";
import type { RichieController } from "@/lib/richie/types";

// The layer Richie lives in: covers the whole page, never takes clicks, and
// clips anything he does off-screen so the page never grows a scrollbar.
export default function RichieStage({
  reducedMotion,
  entrance,
  pawRect,
  onController,
}: {
  reducedMotion: boolean;
  entrance: "auto" | "wake";
  pawRect: () => DOMRect | null;
  onController: (controller: RichieController | null) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<RichieController | null>(null);

  // He's created once per mount, with the options as they are at that moment
  const start = useEffectEvent((element: HTMLDivElement) => {
    const params = new URLSearchParams(window.location.search);
    const seed = params.has("richie-seed") ? Number(params.get("richie-seed")) : undefined;
    const debug = process.env.NODE_ENV === "development" || params.has("richie-debug");
    const created = createRichie(element, { reducedMotion, entrance, pawRect, seed, debug });
    onController(created);
    return created;
  });
  const stop = useEffectEvent(() => onController(null));

  useEffect(() => {
    const created = start(stage.current!);
    controller.current = created;
    return () => {
      created.destroy();
      controller.current = null;
      stop();
    };
  }, []);

  useEffect(() => {
    controller.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return <div ref={stage} data-richie-stage aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-clip" />;
}
