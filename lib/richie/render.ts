import type { Atlas } from "./atlas.ts";
import { CELL, FEET } from "./sprites/frame.ts";

// Room above the 32x32 frame for hops (frames with lift are drawn higher)
export const LIFT_ROOM = 8;
const ROWS = LIFT_ROOM + CELL;

// Sprite-pixel insets hidden by a peek, measured on the drawn (possibly
// mirrored) frame. lean slants the left edge to follow an italic letter: the
// edge sits at `left` on frame row 16 and moves right by `lean` px per row up.
export type Inset = { top?: number; right?: number; bottom?: number; left?: number; lean?: number };

// Owns Richie's DOM: a wrapper moved only with transforms, one canvas, and the
// speech bubble. Writes to the DOM only when something actually changed.
export class Renderer {
  readonly scale: number; // CSS px per sprite pixel
  private readonly device: number; // device px per sprite pixel
  private readonly dpr: number;
  private readonly wrapper: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly bubbleEl: HTMLDivElement;
  private drawn = "";
  private transform = "";
  private clipValue = "";
  private bubbleKey = "";

  constructor(
    private readonly stage: HTMLElement,
    private readonly atlas: Atlas
  ) {
    this.dpr = window.devicePixelRatio || 1;
    // Two CSS px per sprite pixel, snapped to whole device pixels so the art stays crisp
    this.device = Math.max(1, Math.round(2 * this.dpr));
    this.scale = this.device / this.dpr;

    this.wrapper = document.createElement("div");
    Object.assign(this.wrapper.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${CELL * this.scale}px`,
      height: `${ROWS * this.scale}px`,
      willChange: "transform",
      contain: "strict",
      transition: "opacity 300ms ease",
    } satisfies Partial<CSSStyleDeclaration>);

    this.canvas = document.createElement("canvas");
    this.canvas.width = CELL * this.device;
    this.canvas.height = ROWS * this.device;
    Object.assign(this.canvas.style, { display: "block", width: "100%", height: "100%" });
    this.context = this.canvas.getContext("2d")!;
    this.context.imageSmoothingEnabled = false;
    this.wrapper.append(this.canvas);

    this.bubbleEl = document.createElement("div");
    Object.assign(this.bubbleEl.style, {
      position: "absolute",
      left: "0",
      top: "0",
      display: "none",
      padding: "1px 8px 2px",
      font: "italic 20px/1.15 var(--font-instrument-serif), Georgia, serif",
      color: "var(--color-vermilion, #e4402b)",
      background: "var(--color-paper, #f4f2ed)",
      border: "1px solid var(--color-ink, #141414)",
      borderRadius: "3px",
      whiteSpace: "nowrap",
    } satisfies Partial<CSSStyleDeclaration>);

    stage.append(this.wrapper, this.bubbleEl);
  }

  // Draws a frame; the shadow stays on the ground when the frame is lifted
  draw(frame: string, mirror: boolean) {
    const key = `${frame}|${mirror}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const cell = this.atlas.cells.get(frame);
    const c = this.context;
    const d = this.device;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Shadow under his feet, two rows of a soft ellipse
    c.fillStyle = "rgba(20, 20, 20, 0.16)";
    const ground = LIFT_ROOM + FEET[1] + 1;
    c.fillRect(9 * d, ground * d, 14 * d, d);
    c.fillRect(11 * d, (ground + 1) * d, 10 * d, d);
    if (!cell) return;
    if (mirror) c.setTransform(-1, 0, 0, 1, this.canvas.width, 0);
    c.drawImage(this.atlas.image, cell.sx, cell.sy, CELL, CELL, 0, (LIFT_ROOM - cell.lift) * d, CELL * d, CELL * d);
  }

  // Puts his feet at (x, y) in document coordinates
  place(x: number, y: number) {
    const snap = (v: number) => Math.round(v * this.dpr) / this.dpr;
    const left = snap(x - FEET[0] * this.scale);
    const top = snap(y - (LIFT_ROOM + FEET[1]) * this.scale);
    const transform = `translate3d(${left}px, ${top}px, 0)`;
    if (transform !== this.transform) {
      this.transform = transform;
      this.wrapper.style.transform = transform;
    }
  }

  // Hides part of the frame (peeking from behind an element), in sprite pixels
  // of the 32x32 frame; null shows all of him
  clip(inset: Inset | null) {
    const s = this.scale;
    let value = "";
    if (inset?.lean) {
      // A slanted left edge, from the top of the canvas (LIFT_ROOM rows above
      // the frame) to the bottom
      const at = (row: number) => ((inset.left ?? 0) + inset.lean! * (16 - row)) * s;
      value = `polygon(${at(-LIFT_ROOM)}px 0, 100% 0, 100% 100%, ${at(CELL)}px 100%)`;
    } else if (inset) {
      value = `inset(${((inset.top ?? 0) + (inset.top ? LIFT_ROOM : 0)) * s}px ${(inset.right ?? 0) * s}px ${(inset.bottom ?? 0) * s}px ${(inset.left ?? 0) * s}px)`;
    }
    if (value !== this.clipValue) {
      this.clipValue = value;
      this.canvas.style.clipPath = value;
    }
  }

  // The speech bubble above his head, on the side away from the screen edge
  bubble(text: string | null, x = 0, y = 0, side: "left" | "right" = "right") {
    const key = text ? `${text}|${Math.round(x)}|${Math.round(y)}|${side}` : "";
    if (key === this.bubbleKey) return;
    this.bubbleKey = key;
    if (!text) {
      this.bubbleEl.style.display = "none";
      return;
    }
    this.bubbleEl.textContent = text;
    this.bubbleEl.style.display = "block";
    const width = this.bubbleEl.offsetWidth;
    const left = side === "right" ? x + 6 * this.scale : x - 6 * this.scale - width;
    const top = y - 30 * this.scale - this.bubbleEl.offsetHeight;
    this.bubbleEl.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  }

  // Named so a page slide captures him on his own, above the sliding pages
  transitionName(on: boolean) {
    this.wrapper.style.viewTransitionName = on ? "richie" : "";
  }

  opacity(value: number) {
    this.wrapper.style.opacity = String(value);
  }

  // Shown or hidden without stopping anything (e.g. behind the photo viewer)
  visible(on: boolean) {
    this.stage.style.visibility = on ? "" : "hidden";
  }

  // Pins him to the bottom-right corner of the screen, beside the paw button
  // (reduced motion: no following, so he stays put on screen)
  pinToCorner(on: boolean) {
    Object.assign(this.wrapper.style, on
      ? { position: "fixed", left: "auto", top: "auto", right: "64px", bottom: "8px", transform: "none" }
      : { position: "absolute", left: "0", top: "0", right: "auto", bottom: "auto", transform: this.transform });
  }

  get size() {
    return { width: CELL * this.scale, height: ROWS * this.scale };
  }

  destroy() {
    this.wrapper.remove();
    this.bubbleEl.remove();
  }
}
