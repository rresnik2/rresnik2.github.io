"use client";

import Link from "next/link";
import { requestSlide } from "@/lib/page-transition";

// A link inside a page to another page in the menu (lib/pages.ts) that slides
// there like the header's links do. onNavigate only runs for a plain click, so
// cmd/ctrl-click still opens a new tab.
export default function SlideLink({
  href,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string }) {
  return (
    <Link
      href={href}
      onNavigate={(e) => {
        if (requestSlide(href)) e.preventDefault();
      }}
      {...props}
    />
  );
}
