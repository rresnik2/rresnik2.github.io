import type { Metadata } from "next";
import { CONTACT, EDUCATION, EXPERIENCE, NAME, PROJECTS, RESUME_PDF, SKILLS, type Entry } from "@/lib/resume";

export const metadata: Metadata = { title: "Resume · Reece Resnik" };

// The resume in the site's style: a sheet of paper on screen, and exactly one
// letter page in print (the PDF is printed from this page, see lib/resume.ts).
// Sizes are in points so screen and print match.

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[8pt]">
      <h2 className="mb-[4pt] font-serif text-[14pt] leading-none underline decoration-vermilion decoration-1 underline-offset-[4pt]">
        {String(index).padStart(2, "0")}/{title}
      </h2>
      {children}
    </section>
  );
}

function Heading({ title, meta, dates }: { title: string; meta?: string; dates: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p>
        <span className="font-serif text-[11.5pt] leading-tight">{title}</span>
        {meta ? <span className="text-muted italic"> — {meta}</span> : null}
      </p>
      <p className="shrink-0 text-[9pt] text-muted tabular-nums">{dates}</p>
    </div>
  );
}

function Entries({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-[4pt]">
      {entries.map((entry) => (
        <div key={entry.title} className="break-inside-avoid">
          <Heading title={entry.title} meta={entry.meta} dates={entry.dates} />
          <ul className="mt-[1pt] list-disc space-y-[0.5pt] pl-[14pt] marker:text-vermilion">
            {entry.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ResumePage() {
  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 -z-10 h-lvh bg-paper print:hidden" />
      <main className="mx-4 mt-6 mb-24 md:mx-auto md:w-full md:max-w-[8.5in] print:m-0 print:max-w-none">
        <p className="mb-4 flex justify-end font-body text-lg text-ink print:hidden">
          <a href={RESUME_PDF} download className="link-underline tap-target hover:text-vermilion">
            Download PDF ↓
          </a>
        </p>
        <article
          data-resume
          className="border border-ink/15 bg-white px-6 py-8 font-body text-[9.6pt] leading-[1.3] text-ink shadow-[6px_6px_0_var(--color-vermilion)] md:px-[0.55in] md:py-[0.5in] print:border-0 print:p-0 print:shadow-none"
        >
          <header className="border-b border-vermilion pb-[6pt] text-center">
            <h1 className="font-serif text-[27pt] leading-none">{NAME}</h1>
            <p className="mt-[4pt] text-[9pt] text-muted">
              {CONTACT.map((item, i) => (
                <span key={item.text}>
                  {i ? <span className="mx-[5pt] text-vermilion">•</span> : null}
                  {item.href ? (
                    <a href={item.href} className="hover:text-vermilion">
                      {item.text}
                    </a>
                  ) : (
                    item.text
                  )}
                </span>
              ))}
            </p>
          </header>

          <Section index={1} title="Education">
            <div className="space-y-[4pt]">
              {EDUCATION.map((school) => (
                <div key={school.name} className="break-inside-avoid">
                  <Heading title={school.name} meta={school.place} dates={school.dates} />
                  {school.details.map((line) => (
                    <p key={line} className="mt-[1.5pt]">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Section>

          <Section index={2} title="Technical Skills">
            <dl className="space-y-[1.5pt]">
              {SKILLS.map(([label, items]) => (
                <div key={label}>
                  <dt className="inline font-serif text-[11pt]">{label}: </dt>
                  <dd className="inline">{items}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section index={3} title="Projects">
            <Entries entries={PROJECTS} />
          </Section>

          <Section index={4} title="Experience">
            <Entries entries={EXPERIENCE} />
          </Section>
        </article>
      </main>
    </>
  );
}
