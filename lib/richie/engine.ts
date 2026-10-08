import { onPageTransition } from "../page-transition.ts";
import { buildAtlas } from "./atlas.ts";
import { Brain, type Output } from "./brain.ts";
import { Input } from "./input.ts";
import { createRandom } from "./random.ts";
import { Renderer } from "./render.ts";
import { Mover } from "./steering.ts";
import type { RichieController, RichieOptions } from "./types.ts";
import { World } from "./world.ts";

declare global {
  interface Window {
    __richie?: unknown;
  }
}

const STEP = 1 / 60; // seconds; longer frames are split into steps this size

// Starts Richie inside `stage` (an empty layer over the whole document) and
// runs him until destroy(). One requestAnimationFrame loop, which stops
// whenever he's sitting still and is woken by input or his next timer.
export function createRichie(stage: HTMLElement, options: RichieOptions): RichieController {
  const random = createRandom(options.seed);
  const renderer = new Renderer(stage, buildAtlas());
  const world = new World(stage);
  const mover = new Mover(random);
  if (window.matchMedia("(pointer: coarse)").matches) mover.speedScale = 0.75;

  let destroyed = false;
  let reduced = options.reducedMotion;
  let frozen = false;
  let raf = 0;
  let timer = 0;
  let last = 0;
  let path = location.pathname;
  let scroll = { x: window.scrollX, y: window.scrollY };
  let shown = { transitionName: false, opacity: 1, hidden: false };
  const trace: object[] = [];

  const input = new Input(() => wake());
  const brain = new Brain(
    {
      world,
      input,
      mover,
      random,
      scale: renderer.scale,
      size: renderer.size,
      entrance: options.entrance,
      pawRect: options.pawRect,
    },
    performance.now()
  );

  function render(out: Output) {
    renderer.place(out.x, out.y);
    renderer.draw(out.frame, out.mirror);
    renderer.clip(out.clip);
    renderer.bubble(out.bubble?.text ?? null, out.x, out.y, out.bubble?.side);
    if (out.transitionName !== shown.transitionName) renderer.transitionName(out.transitionName);
    if (out.opacity !== shown.opacity) renderer.opacity(out.opacity);
    if (out.hidden !== shown.hidden) renderer.visible(!out.hidden);
    shown = { transitionName: out.transitionName, opacity: out.opacity, hidden: out.hidden };
    if (options.debug) {
      const d = brain.debug();
      for (const [key, value] of [["richieState", d.state], ["richieGait", d.gait ?? ""], ["richieDir", d.dir]] as const) {
        if (stage.dataset[key] !== value) stage.dataset[key] = value;
      }
      trace.push({ t: Math.round(performance.now()), ...d, frame: out.frame });
      if (trace.length > 600) trace.shift();
    }
  }

  function tick(now: number, seconds: number) {
    // A navigation nobody announced (back/forward): re-place him on the new page
    if (location.pathname !== path) {
      path = location.pathname;
      if (brain.mode !== "slide") brain.unannouncedNavigation(scroll);
    }
    let out: Output | null = null;
    const steps = Math.max(1, Math.ceil(seconds / STEP));
    for (let i = 0; i < steps; i++) out = brain.update(now - (steps - 1 - i) * STEP * 1000, seconds / steps);
    render(out!);
    scroll = { x: window.scrollX, y: window.scrollY };
  }

  function frame(now: number) {
    raf = 0;
    if (destroyed || reduced || frozen) return;
    // dt is capped: rAF stalls while a page transition holds rendering
    const seconds = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    tick(now, seconds);
    if (brain.busy()) raf = requestAnimationFrame(frame);
    else timer = window.setTimeout(wake, brain.nextEventIn());
  }

  function wake() {
    if (destroyed || reduced || frozen) return;
    window.clearTimeout(timer);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // Page slides: handled synchronously so he's in place before each capture
  const stopListening = onPageTransition((event) => {
    if (destroyed || reduced) return;
    if (options.debug && event.phase === "start") {
      const named = [...document.querySelectorAll<HTMLElement>("*")].filter((el) => el.style.viewTransitionName === "richie");
      if (named.length > 1) console.error("Richie: more than one element named 'richie' would skip every page slide");
    }
    brain.transition(event);
    path = location.pathname;
    if (event.phase === "start" || event.phase === "rendered" || event.phase === "end") tick(performance.now(), 0);
    wake();
  });

  // Back/forward: Next renders and restores scroll first
  const onPopState = () => window.setTimeout(wake, 80);
  window.addEventListener("popstate", onPopState);

  // Reduced motion: he sits in the corner by the paw button and doesn't move
  function applyReduced() {
    renderer.pinToCorner(reduced);
    if (reduced) {
      cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(timer);
      renderer.draw("sit_front", false);
      renderer.clip(null);
      renderer.bubble(null);
      renderer.transitionName(false);
      renderer.opacity(1);
    } else {
      wake();
    }
  }

  // His entrance waits for the fonts (the "Hi!" must be measured in its real
  // font) and an idle moment, so it doesn't compete with the page loading
  const ready = () => {
    if (destroyed) return;
    brain.ready(performance.now());
    wake();
  };
  const idle = (fn: () => void) =>
    typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 200);
  Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => idle(ready));

  applyReduced();

  if (options.debug) {
    window.__richie = {
      get state() {
        return brain.debug();
      },
      get loopActive() {
        return raf !== 0;
      },
      trace,
      // Advances him by hand, for browsers that don't render frames (tests)
      step(ms: number) {
        const start = performance.now();
        for (let t = 0; t < ms; t += 16) tick(start + t, 0.016);
      },
      freeze() {
        frozen = true;
        cancelAnimationFrame(raf);
        raf = 0;
        window.clearTimeout(timer);
      },
      thaw() {
        frozen = false;
        wake();
      },
    };
  }

  return {
    async nap() {
      const done = brain.nap();
      wake();
      await done;
    },
    setReducedMotion(value: boolean) {
      if (value === reduced) return;
      reduced = value;
      applyReduced();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      stopListening();
      window.removeEventListener("popstate", onPopState);
      brain.remember();
      input.destroy();
      world.destroy();
      renderer.destroy();
      const root = document.documentElement;
      root.style.removeProperty("--richie-dx");
      root.style.removeProperty("--richie-dy");
      delete root.dataset.richieRun;
      if (options.debug) delete window.__richie;
    },
  };
}
