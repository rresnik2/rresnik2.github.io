// The site's pages in menu order, left to right. Moving right (or swiping
// left) slides pages forward, moving left slides them back.
export const PAGES = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// Touches starting in these are theirs (the photo viewer's, or a text field's),
// not page swipes or Richie's
export const OWN_GESTURES = "dialog, input, textarea, select, [contenteditable]";

export function pagePosition(path: string) {
  return PAGES.findLastIndex((page) => path === page.href || path.startsWith(`${page.href}/`));
}
