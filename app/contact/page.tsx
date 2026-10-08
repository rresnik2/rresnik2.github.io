import Link from "next/link";
import BackdropSpace from "@/components/backdrop-space";
import PageTransition from "@/components/page-transition";
import { EXTERNAL_ARROW } from "@/lib/symbols";

type Contact = { label: string; text: string; href: string; external?: boolean };

const contacts: Contact[] = [
  { label: "Email", text: "rresnik2@gmail.com", href: "mailto:rresnik2@gmail.com" },
  { label: "GitHub", text: "github.com/rresnik2", href: "https://github.com/rresnik2", external: true },
  {
    label: "LinkedIn",
    text: "linkedin.com/in/reece-resnik",
    href: "https://www.linkedin.com/in/reece-resnik/",
    external: true,
  },
  { label: "Resume", text: "View my resume", href: "/resume" },
];

export default function ContactPage() {
  return (
    <PageTransition>
      <div className="rounded-4xl mx-4 py-8 mt-24 md:mt-40">
        <section className="bg-paper text-ink px-4 py-12 md:px-12 md:py-16">
          <h1 data-richie-perch="heading" className="text-3xl text-center mb-12 underline decoration-vermilion underline-offset-10 md:mb-16">
            03/Contact
          </h1>
          <ol className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {contacts.map((contact, i) => (
              <li key={contact.label} className="border-t border-vermilion pt-4">
                {/* The whole entry is the link, so it's an easy tap target.
                    Link also handles the mailto and external addresses. */}
                <Link
                  href={contact.href}
                  {...(contact.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group block"
                >
                  <span className="text-sm text-vermilion-deep">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.2em] text-muted">{contact.label}</span>
                  <span className="link-underline mt-3 inline-block text-2xl leading-tight wrap-anywhere transition-colors group-hover:text-vermilion md:text-3xl">
                    {contact.text}
                    {contact.external ? ` ${EXTERNAL_ARROW}` : null}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <BackdropSpace />
    </PageTransition>
  );
}
