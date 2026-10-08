// components/project-card.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Project } from "@/lib/projects";

export default function ProjectCard({ project }: { project: Project }) {
  const [flipped, setFlipped] = useState(false);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const hasInteracted = useRef(false);

  const isCode = project.linkType === "code";
  const isLive = !isCode && project.buildStatus === "success";
  const status = isCode ? "Source code" : isLive ? "Live" : "Offline";
  const linkLabel = isCode ? "View code" : "View project";

  useEffect(() => {
    if (!hasInteracted.current) return;
    (flipped ? backButton : frontButton).current?.focus();
  }, [flipped]);

  function toggle() {
    hasInteracted.current = true;
    setFlipped((f) => !f);
  }

  const face = "col-start-1 row-start-1 flex flex-col gap-3 border border-ink/10 bg-paper p-5 backface-hidden";
  // Small text, so tap-target (globals.css) gives a finger a bigger target
  const flipButton = "link-underline tap-target cursor-pointer text-xs text-muted transition-colors hover:text-ink";
  const cta = "link-underline tap-target text-sm hover:text-vermilion";

  return (
    <article data-richie-perch="card" className="group perspective-[1400px]">
      <div
        className={`grid h-full transform-3d transition-transform duration-700 ease-out motion-reduce:transition-none ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <div inert={flipped} className={face}>
          {project.image ? (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={-1}
              aria-hidden="true"
              className="relative aspect-[16/10] overflow-hidden outline outline-[1.5px] outline-offset-[3px] outline-transparent transition-[outline-color] duration-200 group-hover:outline-vermilion"
            >
              <Image
                src={project.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover transition-[filter,transform] duration-500 [@media(hover:hover)]:grayscale group-hover:grayscale-0 motion-safe:group-hover:scale-[1.03]"
              />
            </a>
          ) : null}

          <div className="flex items-center justify-between font-body">
            <p className="text-xs text-muted">
              {project.kind ?? "Project"}
              <span className="mx-1.5 text-vermilion-deep">/</span>
              {status}
            </p>
            <button
              ref={frontButton}
              type="button"
              onClick={toggle}
              aria-label={`Show details for ${project.title}`}
              className={flipButton}
            >
              Details ↻
            </button>
          </div>

          <h2 className="text-3xl leading-none">{project.title}</h2>
          <p className="font-body text-base leading-relaxed tracking-[0.01em]">{project.description}</p>
          {/* The first two points, so the front says what I built; Details has them all */}
          <ul className="list-disc space-y-1.5 pl-4 font-body text-sm leading-relaxed text-muted marker:text-vermilion">
            {project.bulletPoints.slice(0, 2).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="text-xs text-muted font-body">{project.technologies.slice(0, 5).join(", ")}</p>

          <div className="mt-auto flex items-end justify-between border-t border-vermilion pt-3">
            {project.lighthouse != null ? (
              <p className="font-body text-xs text-muted">
                <span className="mr-1.5 font-serif text-3xl leading-none text-ink">
                  {project.lighthouse}
                </span>
                Lighthouse
              </p>
            ) : null}
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${cta} ml-auto`}
            >
              {linkLabel} →
            </a>
          </div>
        </div>

        {/* Back */}
        <div inert={!flipped} className={`${face} rotate-y-180`}>
          <div className="flex items-center justify-between font-body">
            <p className="text-xs text-muted">
              What I built <span className="mx-1.5 text-vermilion-deep">/</span> {project.title}
            </p>
            <button
              ref={backButton}
              type="button"
              onClick={toggle}
              aria-label={`Back to ${project.title} overview`}
              className={flipButton}
            >
              Back ↻
            </button>
          </div>

          <ul className="list-disc space-y-2 pl-4 font-body leading-relaxed marker:text-vermilion">
            {project.bulletPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <p className="text-sm text-muted font-body">{project.technologies.join(", ")}</p>

          <div className="mt-auto flex justify-end border-t border-ink/10 pt-3">
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cta}
            >
              {linkLabel} →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}