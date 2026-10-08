import type { NavDirection, PageTransitionEvent } from "@/lib/richie/types";

export type { NavDirection };

type Listener = (event: PageTransitionEvent) => void;
const listeners = new Set<Listener>();
let transitionCount = 0;

// Lets things outside the page (Richie) move with page transitions. Listeners
// run synchronously at each phase; see PageTransitionEvent for the phases.
export function onPageTransition(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(event: PageTransitionEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error(error);
    }
  }
}

// Lets a link inside a page (<SlideLink>) slide like the header's menu. The
// header does the navigating, so it tracks these alongside its own.
let slideHandler: ((href: string) => void) | null = null;

export function handleSlideRequests(handler: (href: string) => void) {
  slideHandler = handler;
  return () => {
    if (slideHandler === handler) slideHandler = null;
  };
}

// False when nothing is handling them, so the link navigates on its own
export function requestSlide(href: string) {
  if (!slideHandler) return false;
  slideHandler(href);
  return true;
}

type RouteWaiter = { href: string; resolve: (arrived: boolean) => void };

// Transitions waiting for their destination route to render
const routeWaiters = new Set<RouteWaiter>();
// The newest transition; only it may clear the attributes on <html>
let current: ViewTransition | null = null;

// Called by the header whenever the pathname changes. Resolves only the
// transitions headed to this page, so an earlier navigation finishing can't
// release a later one before its page exists.
export function markNavigated(pathname: string) {
  for (const waiter of routeWaiters) {
    if (waiter.href !== pathname) continue;
    waiter.resolve(true);
    routeWaiters.delete(waiter);
  }
}

// Stops every pending wait; used when a newer navigation takes over
function releaseRouteWaiters() {
  for (const waiter of routeWaiters) waiter.resolve(false);
  routeWaiters.clear();
}

function waitForRoute(href: string, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const waiter: RouteWaiter = { href, resolve };
    routeWaiters.add(waiter);
    setTimeout(() => {
      routeWaiters.delete(waiter);
      resolve(false);
    }, timeoutMs);
  });
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Resolves once every image currently on screen has loaded and decoded, so
// the new page doesn't slide in with photos still popping in
async function visibleImagesReady() {
  const pending = [...document.images].filter((img) => {
    if (img.complete) return false;
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  });
  for (const img of pending) {
    // Lazy images only start loading when the page renders, and rendering is
    // paused until this callback finishes, so they would never arrive
    if (img.loading === "lazy") img.loading = "eager";
  }
  await Promise.all(pending.map((img) => img.decode().catch(() => {})));
}

// Navigates to href inside a view transition. The browser freezes a snapshot
// of the old page, runs the async callback, and only animates once it
// resolves, so the slide starts after the new page has rendered, scrolled to
// the top and loaded its visible images, instead of mid-update.
// onAnimationStart runs as the slide starts, for things that should move with
// it (the header's page dial) rather than when the new page renders.
export async function navigateWithTransition(
  href: string,
  direction: NavDirection,
  navigate: () => void,
  onAnimationStart?: () => void
) {
  const id = ++transitionCount;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reduceMotion) {
    emit({ phase: "start", id, direction, href });
    const arrived = waitForRoute(href, 2000);
    navigate();
    await arrived;
    emit({ phase: "end", id, animated: false });
    return;
  }

  // A transition already running gets skipped by the browser; let its
  // callback finish now instead of waiting out its timeout
  releaseRouteWaiters();

  const root = document.documentElement;
  root.dataset.navDirection = direction;
  emit({ phase: "start", id, direction, href });

  // Timings show up in the browser console (development only) and in the
  // Timings track of Chrome DevTools' Performance panel
  const start = performance.now();
  let routeReady = start;
  let imagesReady = start;

  // Set once the transition is over. A skipped transition (a hidden tab, or a
  // newer one taking over) can finish before its callback runs, and the clip
  // set then would never be cleared
  let settled = false;
  const transition = document.startViewTransition(async () => {
    // The old page has been captured by now. Clip the incoming page to one
    // screen so content below the fold (like the gallery) isn't rendered and
    // decoded mid-slide; see html[data-nav-clip] in globals.css.
    if (!settled) root.dataset.navClip = "";

    const arrived = waitForRoute(href, 2000);
    navigate();
    // If the page doesn't render within the cap (slow network, or a newer
    // click took over), skip the animation rather than slide the old page in
    if (!(await arrived)) {
      transition.skipTransition();
      return;
    }
    routeReady = performance.now();
    await Promise.race([visibleImagesReady(), wait(1000)]);
    imagesReady = performance.now();
    emit({ phase: "rendered", id });
  });
  current = transition;

  let animated = false;
  try {
    await transition.ready;
    onAnimationStart?.();
    emit({ phase: "animating", id });
    const animationStart = performance.now();
    await transition.finished;
    animated = true;
    reportTimings(start, routeReady, imagesReady, animationStart, performance.now());
  } catch {
    // Skipped (a newer navigation took over, or the route was too slow); the
    // navigation itself still completes
  } finally {
    settled = true;
    if (current === transition) {
      current = null;
      delete root.dataset.navDirection;
      delete root.dataset.navClip;
    }
    emit({ phase: "end", id, animated });
  }
}

function reportTimings(start: number, routeReady: number, imagesReady: number, animationStart: number, end: number) {
  performance.measure("page transition: waiting for route", { start, end: routeReady });
  performance.measure("page transition: waiting for images", { start: routeReady, end: imagesReady });
  performance.measure("page transition: animation", { start: animationStart, end });

  if (process.env.NODE_ENV === "development") {
    const ms = (n: number) => `${Math.round(n)}ms`;
    console.info(
      `[page transition] frozen ${ms(animationStart - start)} ` +
        `(route ${ms(routeReady - start)}, images ${ms(imagesReady - routeReady)}), ` +
        `animation ${ms(end - animationStart)}`
    );
  }
}
