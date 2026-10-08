import type { PerchKind } from "./types.ts";

export type Box = { left: number; top: number; right: number; bottom: number };
// inkRight: for headings, where the letters' ink ends on the right at a given
// document y (the italic "!" leans, so its edge depends on the height)
export type Perch = { kind: PerchKind; box: Box; element: Element; inkRight?: (y: number) => number | null };

const toDocument = (r: DOMRect): Box => ({
  left: r.left + window.scrollX,
  top: r.top + window.scrollY,
  right: r.right + window.scrollX,
  bottom: r.bottom + window.scrollY,
});

// What Richie knows about the page, in document coordinates. Layout is only
// measured on refresh (resizes, navigation), never per frame.
export class World {
  headerBottom = 0;
  docWidth = 0;
  docHeight = 0;
  perches: Perch[] = [];
  private observer: ResizeObserver;
  private pending = 0;

  constructor(private readonly stage: HTMLElement) {
    this.refresh();
    this.observer = new ResizeObserver(() => this.refreshSoon());
    this.observer.observe(document.body);
    window.addEventListener("resize", this.refreshSoon, { passive: true });
  }

  refreshSoon = () => {
    cancelAnimationFrame(this.pending);
    this.pending = requestAnimationFrame(() => this.refresh());
  };

  refresh() {
    const header = document.querySelector("[data-site-header]");
    this.headerBottom = header ? toDocument(header.getBoundingClientRect()).bottom : 0;
    this.docWidth = this.stage.clientWidth || document.documentElement.clientWidth;
    this.docHeight = this.stage.clientHeight || document.documentElement.scrollHeight;
    this.perches = [...document.querySelectorAll("[data-richie-perch]")]
      .map((element) => {
        const kind = element.getAttribute("data-richie-perch") as PerchKind;
        return kind === "hi"
          ? { kind, box: inkBox(element), element, inkRight: inkEdge(element) }
          : { kind, box: toDocument(element.getBoundingClientRect()), element };
      })
      .filter((p) => p.box.right > p.box.left && p.box.bottom > p.box.top);
  }

  // The visible part of the page (pinch zoom aware)
  view(): Box {
    const vv = window.visualViewport;
    const left = vv ? vv.pageLeft : window.scrollX;
    const top = vv ? vv.pageTop : window.scrollY;
    const width = vv ? vv.width : window.innerWidth;
    const height = vv ? vv.height : window.innerHeight;
    return { left, top, right: left + width, bottom: top + height };
  }

  // How much of a box is on screen, 0-1
  visibleFraction(box: Box) {
    const v = this.view();
    const w = Math.max(0, Math.min(box.right, v.right) - Math.max(box.left, v.left));
    const h = Math.max(0, Math.min(box.bottom, v.bottom) - Math.max(box.top, v.top));
    const area = (box.right - box.left) * (box.bottom - box.top);
    return area > 0 ? (w * h) / area : 0;
  }

  // Where his feet may go: the page below the header, far enough from the
  // sides that none of him is cut off (he's 64px wide, centred on his feet)
  bounds(): Box {
    return {
      left: 40,
      right: Math.max(80, this.docWidth - 40),
      top: this.headerBottom + 36,
      bottom: Math.max(this.headerBottom + 72, this.docHeight - 8),
    };
  }

  clamp(x: number, y: number) {
    const b = this.bounds();
    return { x: Math.min(b.right, Math.max(b.left, x)), y: Math.min(b.bottom, Math.max(b.top, y)) };
  }

  destroy() {
    this.observer.disconnect();
    window.removeEventListener("resize", this.refreshSoon);
    cancelAnimationFrame(this.pending);
  }
}

// The box around a heading's glyphs rather than its whole line (so peeking
// from behind "Hi!" lines up with the letters, not the empty space around them)
function inkBox(element: Element): Box {
  const range = document.createRange();
  range.selectNodeContents(element);
  const rect = range.getBoundingClientRect();
  range.detach();
  const box = toDocument(rect.width ? rect : element.getBoundingClientRect());
  // Glyph boxes include the font's side bearings; trim them a little
  const trim = (box.right - box.left) * 0.04;
  return { ...box, left: box.left + trim, right: box.right - trim };
}

// The right edge of a heading's ink, row by row: the text is drawn again on a
// canvas in the same font and scanned, since the browser only reports the box
// round the letters, not where an italic glyph's slanted stroke actually is
function inkEdge(element: Element): ((y: number) => number | null) | undefined {
  const text = element.textContent ?? "";
  const range = document.createRange();
  range.selectNodeContents(element);
  const rect = range.getBoundingClientRect();
  range.detach();
  if (!text.trim() || !rect.width || !rect.height) return undefined;
  const style = getComputedStyle(element);
  const dpr = window.devicePixelRatio || 1;
  const pad = Math.ceil(rect.height / 2); // room for italic overhang
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((rect.width + pad * 2) * dpr);
  canvas.height = Math.ceil((rect.height + pad * 2) * dpr);
  const c = canvas.getContext("2d", { willReadFrequently: true });
  if (!c) return undefined;
  c.scale(dpr, dpr);
  c.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ("letterSpacing" in c) c.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
  const metrics = c.measureText(text);
  // The range's box is the line's ascent and descent around the baseline
  c.fillText(text, pad, pad + metrics.fontBoundingBoxAscent);
  const { data, width, height } = c.getImageData(0, 0, canvas.width, canvas.height);
  const edges = new Float32Array(height).fill(NaN);
  for (let row = 0; row < height; row++) {
    for (let col = width - 1; col >= 0; col--) {
      if (data[(row * width + col) * 4 + 3] > 96) {
        edges[row] = (col + 1) / dpr - pad;
        break;
      }
    }
  }
  const left = rect.left + window.scrollX;
  const top = rect.top + window.scrollY;
  return (y) => {
    const row = Math.round((y - top + pad) * dpr);
    const edge = edges[row];
    return row >= 0 && row < height && !Number.isNaN(edge) ? left + edge : null;
  };
}
