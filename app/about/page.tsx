import Image from "next/image";
import Gallery from "@/components/gallery";
import PageTransition from "@/components/page-transition";
import portrait from "@/public/GalleryExcluded/profileimage3.jpg";

type Job = { title: string; employer: string; place?: string; dates: string; points: string[] };

// Newest first
const experience: Job[] = [
  {
    title: "Leasing Agent",
    employer: "Eclipse Staffing",
    place: "Seattle, WA",
    dates: "Oct 2025 – Present",
    points: [
      "Automated recurring leasing workflows with Python scripts and AI tooling, cutting manual data entry out of daily operations.",
      "Ramped onto new property systems and requirements across multiple sites during management transitions.",
    ],
  },
  {
    title: "Leasing Agent",
    employer: "Greystar",
    place: "Seattle, WA",
    dates: "Aug 2024 – Aug 2025",
    points: [
      "Cut lease generation time from 45 minutes to 15 by designing a standardized lease checklist, which also reduced post-creation corrections.",
      "Reduced application decision turnaround from 3 days to 1 by clarifying requirements and streamlining handoffs across teams.",
    ],
  },
  {
    title: "Customer Service Supervisor",
    employer: "Whole Foods Market",
    dates: "Oct 2022 – Aug 2024",
    points: [
      "Led front-end operations; coached and scheduled team members; handled escalations and cross-department comms.",
      "Streamlined checkout/guest support workflows to reduce wait times and improve store readiness.",
    ],
  },
];

type Interest = { title: string; blurb: string; href?: string };

// TODO: replace the blurbs with your own words
const interests: Interest[] = [
  { title: "Photography", blurb: "I recently got my first DSLR camera, and have had a blast shooting landscapes. It's an old Nikon D5000, and I absolutely cherish it. Trying to master life shots so I can capture the moment.", href: "#gallery" },
  { title: "Biking", blurb: "I have my own e-bike that I use to commute around the city. When I visit my home town in the Lake Tahoe area, you'll find me riding the mountains." },
  { title: "Snowboarding", blurb: "Grew up snowboarding. After a long hiatus, I'm better than ever, and loving it." },
  { title: "Gaming", blurb: "You can find me in the Fortnite lobbies or racing around Silverstone in an Alpine A110. Love to dominate the world in Civilization 6 and build my walkable fever dream in Cities: Skylines." },
  { title: "Transit Riders Union", blurb: "New member in TRU, working on supporting the technology and legislation committees." },
];

export default function AboutPage() {
  return (
    <PageTransition>
    <div className="rounded-4xl mx-4 my-8 py-8 min-h-screen space-y-8">
      <section className="bg-paper text-ink px-6 py-16 md:px-12">
        <h1 data-richie-perch="heading" className="text-3xl text-center mb-16 underline decoration-vermilion underline-offset-10">02/About</h1>

        {/* Portrait + intro */}
        <div className="grid gap-12 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5 md:col-start-1">
            <div data-richie-perch="card" className="relative">
              <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 border-2 border-vermilion" />
              <Image
                src={portrait}
                alt="Reece Resnik"
                placeholder="blur"
                sizes="(min-width: 768px) 40vw, 100vw"
                className="relative h-auto w-full"
              />
            </div>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            <p className="text-4xl leading-tight md:text-5xl">
              I&apos;m Reece, a CS student at the{" "}
              <span className="italic text-vermilion">University of Washington Tacoma</span>.
            </p>
            <p className="mt-8 font-body text-lg leading-relaxed">
              I love to expand my skills while fostering community. Outside of school and work, you&apos;ll
              usually find me behind a camera, on a bike, or on a snowboard.
            </p>
          </div>
        </div>

        {/* Experience: role, employer and dates beside what the job involved
            (stacked on phones) */}
        <div className="mt-24">
          <h2 className="mb-10 text-xs uppercase tracking-[0.2em] text-muted">Experience</h2>
          <ol className="grid gap-y-12">
            {experience.map((job, i) => (
              <li key={job.employer} className="border-t border-vermilion pt-4 md:grid md:grid-cols-12 md:gap-x-12">
                <div className="md:col-span-5">
                  <p className="text-sm text-vermilion-deep">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 text-3xl leading-none">{job.title}</h3>
                  <p className="mt-3 font-body">
                    {job.employer}
                    {job.place ? <span className="text-muted">, {job.place}</span> : null}
                  </p>
                  <p className="mt-1 font-body text-sm italic text-muted">{job.dates}</p>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-4 font-body leading-relaxed text-muted marker:text-vermilion md:col-span-7 md:mt-7">
                  {job.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {/* Interests */}
        <div className="mt-24">
          <h2 className="mb-10 text-xs uppercase tracking-[0.2em] text-muted">Outside the code</h2>
          <ol className="grid gap-x-12 gap-y-12 sm:grid-cols-2">
            {interests.map((interest, i) => (
              <li key={interest.title} className="border-t border-vermilion pt-4">
                <p className="text-sm text-vermilion-deep">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-3xl leading-none">{interest.title}</h3>
                <p className="mt-3 font-body leading-relaxed text-muted">{interest.blurb}</p>
                {interest.href ? (
                  <a href={interest.href} className="link-underline tap-target mt-4 inline-block text-sm hover:text-vermilion">
                    See my photos ↓
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        {/* Lead into the gallery */}
        <div className="mt-24 flex flex-col items-start justify-between gap-6 border-t border-ink/15 pt-8 md:flex-row md:items-end">
          <p className="max-w-xl font-body text-lg italic text-muted">
            Photography is the hobby I share most. Here&apos;s some of what I&apos;ve shot recently.
          </p>
          <a href="#gallery" className="link-underline tap-target text-3xl hover:text-vermilion">
            Check out my gallery ↓
          </a>
        </div>
      </section>

      <Gallery />
    </div>
    </PageTransition>
  );
}
