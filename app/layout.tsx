import type { Metadata } from "next";
import { Instrument_Serif, Newsreader } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Backdrop, { preloadBackdrop } from "@/components/backdrop";
import BackdropWarmup from "@/components/backdrop-warmup";
import Richie from "@/components/richie/richie";
import cloud1 from "@/public/GalleryExcluded/cloud1-mono.jpeg";
import cloud2 from "@/public/GalleryExcluded/cloud2.jpeg";
import cloud4 from "@/public/GalleryExcluded/cloud4.jpeg";

const text = Newsreader({ subsets: ["latin"], variable: "--font-text" });

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Reece Resnik's Portfolio",
  description:
    "Reece Resnik is a computer science student at the University of Washington Tacoma looking for software engineering internships. Projects, experience, photography, and resume.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The projects and contact page backdrops: downloaded early so they don't
  // flash in on navigation, and decoded while idle (<BackdropWarmup>) so they
  // don't stall the slide
  preloadBackdrop(cloud1);
  preloadBackdrop(cloud4);

  return (
    <html
      lang="en"
      data-theme="business"
      className={`${serif.variable} ${text.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly) add attributes to <body> before React loads */}
      <body suppressHydrationWarning className="relative isolate font-serif min-h-full flex-1 flex flex-col">
            {/* Site-wide background; page layouts can cover it with their own */}
            <Backdrop src={cloud2} />
            <BackdropWarmup src={cloud1} />
            <BackdropWarmup src={cloud4} />
            <Header />
            {children}
            <Richie />
      </body>
    </html>
  );
}
