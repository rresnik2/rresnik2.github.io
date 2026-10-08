// Whether the visitor has sent Richie off to nap (the paw button), remembered
// on this device, and whether they prefer reduced motion. Both are external
// stores for useSyncExternalStore.

const HIDDEN = "richie:v1:hidden";
const listeners = new Set<() => void>();
// Keeps the choice for this visit even when storage is blocked
let hiddenOverride: boolean | null = null;

export function isHidden() {
  try {
    return localStorage.getItem(HIDDEN) === "1";
  } catch {
    return false; // storage blocked: he just shows
  }
}

export function setHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDDEN, "1");
    else localStorage.removeItem(HIDDEN);
  } catch {
    // Not remembered, but still applied for this visit
  }
  hiddenOverride = hidden;
  listeners.forEach((listener) => listener());
}

export function hiddenSnapshot() {
  return hiddenOverride ?? isHidden();
}

export function subscribeHidden(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it
  const onStorage = (e: StorageEvent) => {
    if (e.key === HIDDEN) {
      hiddenOverride = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const REDUCED = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  return window.matchMedia(REDUCED).matches;
}

export function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
