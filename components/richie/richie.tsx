"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import PawToggle from "@/components/richie/paw-toggle";
import { hiddenSnapshot, prefersReducedMotion, setHidden, subscribeHidden, subscribeReducedMotion } from "@/lib/richie/prefs";
import type { RichieController } from "@/lib/richie/types";

// The stage and his engine only ever load in the browser, after hydration
const RichieStage = dynamic(() => import("@/components/richie/richie-stage"), { ssr: false });

const waitForSlide = () =>
  new Promise<void>((resolve) => {
    const started = performance.now();
    const check = () => {
      if (!("navDirection" in document.documentElement.dataset) || performance.now() - started > 2000) resolve();
      else window.setTimeout(check, 100);
    };
    check();
  });

// Richie, the cat who follows visitors around: on every page except /richie
// (his game), unless the visitor sent him off to nap with the paw button.
export default function Richie() {
  const pathname = usePathname();
  // null on the server and while hydrating, so nothing renders until the
  // browser knows the visitor's choice (no hydration mismatch)
  const hidden = useSyncExternalStore(subscribeHidden, hiddenSnapshot, () => null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const [entrance, setEntrance] = useState<"auto" | "wake">("auto");
  const controller = useRef<RichieController | null>(null);
  const paw = useRef<HTMLButtonElement>(null);

  if (hidden === null || pathname === "/richie" || pathname.startsWith("/richie/")) return null;

  async function toggle() {
    await waitForSlide();
    if (hidden) {
      setEntrance("wake");
      setHidden(false);
      return;
    }
    // He walks to the paw and curls up first (or gives up after a moment)
    await Promise.race([controller.current?.nap() ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
    setHidden(true);
  }

  return (
    <>
      {hidden ? null : (
        <RichieStage
          reducedMotion={reduced}
          entrance={entrance}
          pawRect={() => paw.current?.getBoundingClientRect() ?? null}
          onController={(c) => (controller.current = c)}
        />
      )}
      <PawToggle ref={paw} hidden={hidden} onToggle={toggle} />
    </>
  );
}
