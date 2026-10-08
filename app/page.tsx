import Image from "next/image";
import Link from "next/link";
import BackdropSpace from "@/components/backdrop-space";
import PageTransition from "@/components/page-transition";
import SlideLink from "@/components/slide-link";

const cta = "link-underline tap-target hover:text-vermilion";

export default function Home() {
  return (
    <PageTransition>
    <div className="flex flex-col flex-1 items-center">
      <main className="flex-col items-center justify-between sm:items-start">
        {/* Just enough sky that the card, and who you are, starts on the first screen */}
        <div className="flex justify-center mt-12 mb-10 md:mt-16 md:mb-14">
          <h1 data-richie-perch="hi" className="text-8xl text-vermilion text-center italic md:text-9xl">Hi!</h1>
        </div>
        <div className="hero">
          <div data-richie-perch="card" className="hero-content bg-paper flex-col mx-4 p-5 shadow-[6px_6px_0_var(--color-vermilion)] md:mx-12 md:p-12 lg:flex-row">
            <div className="avatar">
              <div className="w-48 ring ring-2 ring-vermilion ring-offset-6 mx-4">
                <Image
                  src="/GalleryExcluded/profileimage3.jpg"
                  alt="Reece Resnik"
                  width={192}
                  height={192}
                />
              </div>
            </div>
            <div className="font-body text-ink px-1 py-2 md:p-14">
              <h2 className="text-4xl italic font-serif mb-4 md:text-5xl">I&apos;m Reece</h2>
              <p className="mb-6 text-xl leading-snug text-pretty">
                CS student at the University of Washington Tacoma, looking for software engineering internships.
              </p>
              <p className="mb-4 indent-4 text-lg">
                I love to expand my skills while fostering community. Outside of school and research, I like photography, gaming, biking and snowboarding!
              </p>
              <p className="mb-4 indent-4 text-lg">
                My experience varies a lot over different languages and technologies. I have programmed with the OpenCV library on a Raspberry Pi, implemented a database design on SQL Server, and recently a web application with an AI-powered assistant. Actively creating projects with generative AI to reflect and build on the skills I&apos;ve learned from my coursework. Always looking for new opportunities to learn and grow, and to contribute to a team.
              </p>
              <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-serif text-2xl">
                <SlideLink href="/projects" className={cta}>See my projects →</SlideLink>
                <Link href="/resume" className={cta}>Read my resume →</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <BackdropSpace />
    </div>
    </PageTransition>
  );
}
