"use client";

import type { Ref } from "react";

// A pixel-art paw print (16x16 grid)
const PAD = [
  [5, 8, 6, 2],
  [4, 10, 8, 2],
  [4, 12, 8, 2],
  [5, 14, 6, 1],
];
const TOES = [
  [2, 5, 2, 3],
  [5, 2, 2, 3],
  [9, 2, 2, 3],
  [12, 5, 2, 3],
];

// What there is to do with him, shown beside the paw button
const TRICKS: [string, string][] = [
  ["Pet him", "stroke his head or back"],
  ["Tease him", "wiggle the cursor near him, then dash away"],
  ["Say hi", "click him"],
  ["Spook him", "flick the cursor right through him"],
  ["Hold still near him", "he'll stalk it"],
  ["Leave him be", "he loafs, then naps"],
  ["This paw", "sends him off to nap, or wakes him up"],
];

// Sends Richie off for a nap, or wakes him up. Fixed in the bottom-right
// corner (clear of the phone's home bar), named for page slides so the sliding
// page never covers it. Hovering it (or tabbing to it) shows a quick guide to
// Richie's tricks; touch screens, with no hover, just get the button.
export default function PawToggle({ ref, hidden, onToggle }: { ref: Ref<HTMLButtonElement>; hidden: boolean; onToggle: () => void }) {
  return (
    <div
      data-richie-paw
      style={{ viewTransitionName: "richie-paw" }}
      className="group fixed right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40"
    >
      <div
        id="richie-guide"
        role="tooltip"
        data-richie-guide
        className="invisible absolute right-0 bottom-full mb-3 hidden max-h-[calc(100svh-5rem)] w-72 overflow-y-auto border border-ink/30 bg-paper px-4 py-3 text-ink opacity-0 shadow-[4px_4px_0_var(--color-vermilion)] transition-[opacity,visibility] delay-[250ms] duration-150 group-hover:visible group-hover:opacity-100 group-hover:delay-150 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100 group-has-[:focus-visible]:delay-0 [@media(hover:hover)]:block"
      >
        <p className="mb-2 text-2xl leading-none">Richie&apos;s tricks</p>
        {hidden ? (
          <p className="font-body text-sm">Richie&apos;s napping. Click the paw to wake him.</p>
        ) : (
          <ol className="space-y-1.5 font-body text-sm leading-snug">
            {TRICKS.map(([title, how], i) => (
              <li key={title} className="flex gap-3 border-t border-vermilion/40 pt-1.5 first:border-t-0 first:pt-0">
                <span className="text-xs text-vermilion-deep tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-serif text-base">{title}</span> <span className="text-muted">— {how}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        aria-label={hidden ? "Wake Richie" : "Hide Richie"}
        aria-describedby="richie-guide"
        className="grid size-10 cursor-pointer place-items-center border border-ink/30 bg-paper/90 text-ink transition-colors hover:border-vermilion hover:text-vermilion focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
      >
        <svg viewBox="0 0 16 16" width="20" height="20" shapeRendering="crispEdges" aria-hidden="true">
          {[...PAD, ...TOES].map(([x, y, w, h]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="currentColor" />
          ))}
          {hidden ? null : <rect x={6} y={10} width={4} height={2} fill="var(--color-vermilion)" />}
        </svg>
      </button>
    </div>
  );
}
