import Link from "next/link";

type Page = { href: string; label: string };

// How a page name looks by its distance from the current page: the current one
// large and facing you, the others smaller, fainter and turned away, as if
// wrapped around a drum
const SLOT = [2.4, 1.4, 1.1, 1]; // share of the dial's width
const SCALE = [1, 0.62, 0.54, 0.5];
const TILT = [0, 20, 30, 38]; // degrees
const OPACITY = [1, 0.9, 0.8, 0.7];

// Turns with the page slide; see --page-total in globals.css
const turn = "duration-(--page-total) ease-(--page-ease-out) motion-reduce:transition-none";

// The phone header's page picker: every page name on a line, the current one
// large among its neighbours. It turns as you tap or swipe between pages.
export default function PageDial({
  pages,
  current,
  onNavigate,
  className = "",
}: {
  pages: Page[];
  current: number;
  onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
  className?: string;
}) {
  const distance = (i: number) => Math.min(Math.abs(i - current), SLOT.length - 1);

  return (
    <nav aria-label="Pages" className={className}>
      <ul
        // minmax(0, …): the labels are laid out at full size and scaled down
        // after, so their full width mustn't stop a slot from narrowing
        style={{ gridTemplateColumns: pages.map((_, i) => `minmax(0, ${SLOT[distance(i)]}fr)`).join(" ") }}
        className={`relative grid perspective-[30rem] transition-[grid-template-columns] ${turn} before:absolute before:inset-x-0 before:top-1/2 before:border-t before:border-vermilion`}
      >
        {pages.map((page, i) => {
          const d = distance(i);
          return (
            <li key={page.href} className="transform-3d">
              <Link
                href={page.href}
                aria-current={i === current ? "page" : undefined}
                onClick={(e) => onNavigate(e, page.href)}
                className="flex h-11 items-center justify-center transform-3d"
              >
                <span
                  style={{ transform: `rotateY(${Math.sign(i - current) * TILT[d]}deg) scale(${SCALE[d]})` }}
                  className={`bg-paper px-1.5 text-3xl leading-none whitespace-nowrap transition-transform ${turn}`}
                >
                  <span style={{ opacity: OPACITY[d] }} className={`transition-opacity ${turn}`}>
                    {page.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
