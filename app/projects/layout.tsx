// app/(clouds)/layout.tsx
import Backdrop from "@/components/backdrop";
// cloud1.jpeg with grayscale(1) contrast(1.25) brightness(1.05) baked in
// (sharp). As a CSS filter, Firefox re-applied it to the whole screen on every
// frame of the page slide.
import cloud1 from "@/public/GalleryExcluded/cloud1-mono.jpeg";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Backdrop src={cloud1} />
      {children}
    </>
  );
}