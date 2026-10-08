import Backdrop from "@/components/backdrop";
import cloud4 from "@/public/GalleryExcluded/cloud4.jpeg";

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Backdrop src={cloud4} />
      {children}
    </>
  );
}
