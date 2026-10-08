import { getPhotos, type Photo } from "@/lib/gallery";
import GalleryGrid from "@/components/gallery-grid";

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// Expects photos in chronological order, as returned by getPhotos()
function dateRange(photos: Photo[]) {
  const dates = photos.flatMap((p) => (p.date ? [new Date(p.date)] : []));
  if (dates.length === 0) return null;
  const [first, last] = [monthFormat.format(dates[0]), monthFormat.format(dates[dates.length - 1])];
  return first === last ? first : `${first} – ${last}`;
}

export default async function Gallery() {
  const photos = await getPhotos();
  const range = dateRange(photos);

  return (
    <section id="gallery" className="scroll-mt-8 bg-paper text-ink px-6 py-16 md:px-12">
      <header className="mb-16 text-center">
        <h2 className="text-3xl underline decoration-vermilion underline-offset-10">Gallery</h2>
        <p className="mt-6 font-body text-sm italic text-muted">
          {photos.length} photographs{range ? `, ${range}` : ""}
        </p>
      </header>

      <GalleryGrid photos={photos} />
    </section>
  );
}
