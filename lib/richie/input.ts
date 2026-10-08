import { OWN_GESTURES } from "../pages.ts";
import type { Sample } from "./gestures.ts";

// Hovering these makes him polite: he keeps his distance and won't pounce
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button], [data-richie-guide]";

export type Tap = { x: number; y: number; time: number }; // document coordinates

// Everything the visitor does, recorded as plain numbers. Listeners are all
// passive and never cancel or stop events, so the page behaves exactly as
// before. onActivity wakes Richie's loop.
export class Input {
  kind: "mouse" | "touch" | "none" = "none";
  // Mouse position in viewport coordinates (document = + scroll)
  clientX = 0;
  clientY = 0;
  mouseInside = false;
  lastMouseMove = -Infinity;
  mouseSpeed = 0; // px/s, smoothed
  overInteractive = false;
  buttonDown = false;
  // The cursor's path over the last few seconds, for gestures (gestures.ts)
  samples: Sample[] = [];
  taps: Tap[] = [];
  // Mouse clicks (not on links or controls), document coordinates
  clicks: Tap[] = [];
  lastScroll = -Infinity;
  scrollSettled = true;
  lastActivity = performance.now();
  lastKey = -Infinity;
  dialogOpen = false;
  hidden = document.visibilityState === "hidden";
  zoomed = false;

  private lastMoveTime = 0;
  private press: { x: number; y: number; time: number; ok: boolean } | null = null;
  private touchStart: { x: number; y: number; time: number; ok: boolean } | null = null;
  private scrollTimer = 0;
  private observer: MutationObserver;
  private cleanup: (() => void)[] = [];

  constructor(private readonly onActivity: () => void) {
    const on = <K extends keyof WindowEventMap>(type: K, handler: (e: WindowEventMap[K]) => void) => {
      window.addEventListener(type, handler, { passive: true });
      this.cleanup.push(() => window.removeEventListener(type, handler));
    };
    const onDocument = <K extends keyof DocumentEventMap>(type: K, handler: (e: DocumentEventMap[K]) => void) => {
      document.addEventListener(type, handler, { passive: true });
      this.cleanup.push(() => document.removeEventListener(type, handler));
    };

    on("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      this.kind = "mouse";
      this.mouseInside = true;
      const dt = Math.max(1, now - this.lastMoveTime) / 1000;
      const speed = Math.hypot(e.clientX - this.clientX, e.clientY - this.clientY) / dt;
      this.mouseSpeed = this.mouseSpeed * 0.7 + speed * 0.3;
      // Browsers also send a move after a scroll, with the cursor where it was
      // on screen; only real movement goes in the path
      if (e.clientX !== this.clientX || e.clientY !== this.clientY || !this.samples.length) {
        this.samples.push({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, t: now });
        const old = this.samples.findIndex((p) => now - p.t < 3000);
        if (old > 0) this.samples.splice(0, old);
        if (this.samples.length > 240) this.samples.splice(0, this.samples.length - 240);
      }
      this.clientX = e.clientX;
      this.clientY = e.clientY;
      this.lastMoveTime = now;
      this.lastMouseMove = now;
      this.overInteractive = e.target instanceof Element && !!e.target.closest(INTERACTIVE);
      this.activity(now);
    });

    on("pointerdown", (e) => {
      const now = performance.now();
      if (e.pointerType === "mouse") {
        this.buttonDown = true;
        const target = e.target instanceof Element ? e.target : null;
        this.press = {
          x: e.clientX,
          y: e.clientY,
          time: now,
          ok: e.button === 0 && !target?.closest(OWN_GESTURES) && !target?.closest(INTERACTIVE),
        };
      } else {
        this.kind = "touch";
        const target = e.target instanceof Element ? e.target : null;
        this.touchStart = {
          x: e.clientX,
          y: e.clientY,
          time: now,
          ok: !target?.closest(OWN_GESTURES) && !target?.closest(INTERACTIVE),
        };
      }
      this.activity(now);
    });

    on("pointerup", (e) => {
      const now = performance.now();
      if (e.pointerType === "mouse") {
        this.buttonDown = false;
        const press = this.press;
        this.press = null;
        // A click: short and still, and not on something clickable
        if (press?.ok && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6 && now - press.time < 400) {
          this.clicks.push({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, time: now });
          if (this.clicks.length > 8) this.clicks.shift();
        }
      } else if (this.touchStart) {
        const start = this.touchStart;
        this.touchStart = null;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        // A tap: short and still. Swipes travel at least 50px, so they never count.
        if (start.ok && moved < 10 && now - start.time < 450) {
          this.taps.push({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, time: now });
        }
      }
      this.activity(now);
    });

    on("pointercancel", () => {
      this.touchStart = null;
    });

    on("scroll", () => {
      const now = performance.now();
      this.lastScroll = now;
      this.scrollSettled = false;
      // scrollend where supported, a short quiet period everywhere else
      window.clearTimeout(this.scrollTimer);
      this.scrollTimer = window.setTimeout(() => this.settle(), 150);
      this.activity(now);
    });
    on("scrollend", () => this.settle());

    on("keydown", () => {
      this.lastKey = performance.now();
      this.activity(this.lastKey);
    });

    onDocument("mouseout", (e) => {
      if (!e.relatedTarget) {
        this.mouseInside = false;
        this.samples = [];
        this.activity(performance.now());
      }
    });

    onDocument("visibilitychange", () => {
      this.hidden = document.visibilityState === "hidden";
      this.activity(performance.now());
    });

    const vv = window.visualViewport;
    if (vv) {
      const zoom = () => {
        this.zoomed = vv.scale > 1.01;
        this.activity(performance.now());
      };
      vv.addEventListener("resize", zoom, { passive: true });
      this.cleanup.push(() => vv.removeEventListener("resize", zoom));
    }

    // The photo viewer is a <dialog>: he pauses while one is open
    this.observer = new MutationObserver(() => {
      const open = !!document.querySelector("dialog[open]");
      if (open !== this.dialogOpen) {
        this.dialogOpen = open;
        this.activity(performance.now());
      }
    });
    this.observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  }

  private settle() {
    if (this.scrollSettled) return;
    this.scrollSettled = true;
    this.activity(performance.now());
  }

  private activity(now: number) {
    this.lastActivity = now;
    this.onActivity();
  }

  get mouseX() {
    return this.clientX + window.scrollX;
  }

  get mouseY() {
    return this.clientY + window.scrollY;
  }

  destroy() {
    this.cleanup.forEach((fn) => fn());
    this.observer.disconnect();
    window.clearTimeout(this.scrollTimer);
  }
}
