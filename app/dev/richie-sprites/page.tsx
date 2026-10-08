import { notFound } from "next/navigation";
import SpriteViewer from "./sprite-viewer";

// Development only: every Richie animation, playing, for reviewing the sprites
export default function RichieSpritesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-4 my-8 bg-paper p-6 text-ink md:mx-12 md:p-12">
      <h1 className="mb-8 text-3xl">Richie sprites</h1>
      <SpriteViewer />
    </main>
  );
}
