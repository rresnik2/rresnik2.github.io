export type Swipe = "left" | "right" | "up" | "down";

// A swipe is a quick, mostly straight flick with one finger. Slower or curvier
// gestures are left alone, so scrolling and text selection work as usual.
const MIN_DISTANCE = 50; // px, or 15% of the screen width if that's larger
const MAX_DURATION = 600; // ms
const STRAIGHTNESS = 1.5; // the main direction must outweigh the other by this much
// Touches starting this close to the left or right edge belong to the
// browser's and the phone's own back/forward swipes
const EDGE = 30;

type Start = { x: number; y: number; time: number; on: Element | null };

// Reports swipes on target until the returned cleanup function is called.
// onSwipe also gets the element the touch started on.
export function listenForSwipes(target: EventTarget, onSwipe: (swipe: Swipe, startedOn: Element | null) => void) {
  let start: Start | null = null;

  function touchStart(event: Event) {
    const e = event as TouchEvent;
    const touch = e.touches[0];
    // A second finger (pinch zoom) cancels the gesture, and on a zoomed-in
    // page a drag pans the zoomed view
    const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
    const inEdge = touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE;
    start =
      e.touches.length === 1 && !zoomed && !inEdge
        ? { x: touch.clientX, y: touch.clientY, time: e.timeStamp, on: e.target instanceof Element ? e.target : null }
        : null;
  }

  function touchEnd(event: Event) {
    const e = event as TouchEvent;
    const from = start;
    start = null;
    if (!from || e.touches.length > 0 || e.timeStamp - from.time > MAX_DURATION) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;
    const distance = Math.max(MIN_DISTANCE, window.innerWidth * 0.15);
    if (Math.abs(dx) >= distance && Math.abs(dx) >= Math.abs(dy) * STRAIGHTNESS) {
      onSwipe(dx < 0 ? "left" : "right", from.on);
    } else if (Math.abs(dy) >= distance && Math.abs(dy) >= Math.abs(dx) * STRAIGHTNESS) {
      onSwipe(dy < 0 ? "up" : "down", from.on);
    }
  }

  function cancel() {
    start = null;
  }

  const options = { passive: true };
  target.addEventListener("touchstart", touchStart, options);
  target.addEventListener("touchend", touchEnd, options);
  target.addEventListener("touchcancel", cancel, options);
  return () => {
    target.removeEventListener("touchstart", touchStart);
    target.removeEventListener("touchend", touchEnd);
    target.removeEventListener("touchcancel", cancel);
  };
}
