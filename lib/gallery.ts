import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CAPTIONS } from "@/lib/gallery-captions";

export type Photo = {
  src: string;
  width: number;
  height: number;
  label: string | null; // what it shows, from lib/gallery-captions.ts
  alt: string | null;
  date: string | null; // YYYY-MM-DD, parsed from the filename
};

const PUBLIC_DIR = path.join(process.cwd(), "public");
const JPEG = /\.jpe?g$/i;
// Camera exports look like 20260905-DSC_0115.jpeg
const DATED = /^(\d{4})(\d{2})(\d{2})-(DSC_\d+)$/;

function titleCase(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/(\D)(\d)/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Reads every JPEG in public/ at build time. Dated camera shots come first in
// chronological order, followed by everything else alphabetically.
export async function getPhotos(): Promise<Photo[]> {
  const files = (await readdir(PUBLIC_DIR)).filter((f) => JPEG.test(f)).sort();

  const photos = await Promise.all(
    files.map(async (file): Promise<Photo> => {
      const { autoOrient } = await sharp(path.join(PUBLIC_DIR, file)).metadata();
      const name = file.replace(JPEG, "");
      const match = name.match(DATED);
      const text = CAPTIONS[file];

      return {
        src: `/${file}`,
        width: autoOrient.width,
        height: autoOrient.height,
        // A camera's own name (DSC 0115) says nothing, so those go without
        label: text?.caption ?? (match ? null : titleCase(name)),
        alt: text?.alt ?? null,
        date: match ? `${match[1]}-${match[2]}-${match[3]}` : null,
      };
    })
  );

  return [...photos.filter((p) => p.date), ...photos.filter((p) => !p.date)];
}
