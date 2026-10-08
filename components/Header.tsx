"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PageDial from "@/components/page-dial";
import { handleSlideRequests, markNavigated, navigateWithTransition } from "@/lib/page-transition";
import { OWN_GESTURES, PAGES, pagePosition } from "@/lib/pages";
import { listenForSwipes, type Swipe } from "@/lib/swipe";

// Not one of the menu's pages (lib/pages.ts), so it opens without a slide
const RESUME = "/resume";

const navLink = "link-underline hover:text-vermilion";

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    // Where an in-flight navigation is headed, so a quick second click or
    // swipe slides relative to that page rather than the one still on screen
    const pendingHref = useRef<string | null>(null);
    const navigationCount = useRef(0);
    // The page dial stays on the page being left until the slide starts, then
    // turns with it. (The new route renders earlier, while the screen is frozen.)
    const [dialHold, setDialHold] = useState<{ path: string; id: number } | null>(null);
    const dialPosition = pagePosition(dialHold?.path ?? pathname);

    // Lets a running page transition know its route has rendered
    useEffect(() => {
        if (pendingHref.current === pathname) pendingHref.current = null;
        markNavigated(pathname);
    }, [pathname]);

    // Slides to another page in the menu
    function goTo(href: string) {
        const from = pagePosition(pendingHref.current ?? pathname);
        const to = pagePosition(href);
        pendingHref.current = href;
        const id = ++navigationCount.current;
        setDialHold((hold) => ({ path: hold?.path ?? pathname, id }));
        // Only this navigation's own start or end lets go of the dial, not an
        // earlier one that a quick second click replaced
        const releaseDial = () => setDialHold((hold) => (hold?.id === id ? null : hold));
        navigateWithTransition(href, to > from ? "forward" : "back", () => router.push(href), releaseDial).finally(() => {
            // Also clear it if the navigation never landed (e.g. the browser's
            // back button mid-transition), or this link would stay dead
            if (pendingHref.current === href) pendingHref.current = null;
            releaseDial();
        });
    }

    // Plain clicks only, so cmd/ctrl-click still opens a new tab
    function slideTo(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (pagePosition(pendingHref.current ?? pathname) === pagePosition(href)) {
            // Already on (or heading to) this page
            if (pendingHref.current) e.preventDefault();
            return;
        }
        e.preventDefault();
        goTo(href);
    }

    // Swiping left or right on a touch screen moves to the next or previous page
    const onSwipe = useEffectEvent((swipe: Swipe, startedOn: Element | null) => {
        if ((swipe !== "left" && swipe !== "right") || startedOn?.closest(OWN_GESTURES)) return;
        const from = pagePosition(pendingHref.current ?? pathname);
        const next = PAGES[from + (swipe === "left" ? 1 : -1)];
        if (from !== -1 && next) goTo(next.href);
    });
    useEffect(() => listenForSwipes(document, (swipe, startedOn) => onSwipe(swipe, startedOn)), []);

    // Links inside the page (<SlideLink>) slide the same way
    const onSlideRequest = useEffectEvent((href: string) => {
        if (pagePosition(pendingHref.current ?? pathname) !== pagePosition(href)) goTo(href);
    });
    useEffect(() => handleSlideRequests((href) => onSlideRequest(href)), []);

    const current = pagePosition(pathname);
    const resumeCurrent = pathname === RESUME ? "page" : undefined;

    return (
    <div data-site-header style={{ viewTransitionName: "site-header" }} className="navbar relative z-40 bg-paper mx-3 my-3 p-3 w-auto flex-col items-stretch gap-1 text-ink border-l-2 border-b-8 border-r-4 border-t border-vermilion md:mx-4 md:my-4 md:p-4 md:flex-row md:items-center md:gap-0">
        <div className="navbar-start w-full justify-between md:w-1/2 md:flex-1 md:justify-start">
            <Link href="/" onClick={(e) => slideTo(e, "/")} className="name-underline mx-2 hover:text-vermilion text-3xl md:mx-8 md:text-4xl">Reece Resnik</Link>
            <Link className={`${navLink} tap-target mx-2 text-lg md:hidden`} href={RESUME} aria-current={resumeCurrent}>Resume</Link>
        </div>
        <div className="navbar-end hidden md:flex">
            {/* The current page is underlined (globals.css), not filled in */}
            <ul className="flex items-center gap-8 px-5 py-3.5 text-2xl">
                {PAGES.slice(1).map((page, i) => (
                    <li key={page.href}><Link className={navLink} href={page.href} aria-current={current === i + 1 ? "page" : undefined} onClick={(e) => slideTo(e, page.href)}>{page.label}</Link></li>
                ))}
                <li><Link className={navLink} href={RESUME} aria-current={resumeCurrent}>Resume</Link></li>
            </ul>
        </div>
        <PageDial pages={PAGES} current={dialPosition} onNavigate={slideTo} className="md:hidden" />
    </div>
    );
}
