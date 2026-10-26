import Link from "next/link";
import { getProjects, Project } from "@/lib/projects";
import ProjectCard from "@/components/project-card";
import BackdropSpace from "@/components/backdrop-space";
import PageTransition from "@/components/page-transition";



const projects: Project[] = [
  {
    title: "Overload",
    description: "Offline-first strength training log with progress forecasts and evidence-based coaching.",
    link: "https://overload67.com",
    technologies: ["Next.js", "TypeScript", "Prisma", "Dexie", "Claude API", "PostgreSQL", "Tailwind CSS", "Better Auth", "Playwright"],
    buildStatus: "success",
    bulletPoints: [
      "Built an offline-first logger: sets save to IndexedDB and sync through an outbox.",
      "Designed a weight-plate dial for phone navigation with rest timers on its rim.",
      "Wrote 11 evidence-based insight rules and a weekly review from the Claude API.",
      "Scoped all data to the signed-in user with Better Auth, passkeys and isolation tests.",
      "Tested with 4,500+ unit tests plus Playwright end-to-end and visual tests.",
    ],
    kind: "Web app (PWA)",
    image: "/OverloadCapture.png",
    lighthouse: 99,
    linkType: "live",
  },
  {
    title: "Leasing CRM",
    description: "CRM for leasing agents with a follow-up dashboard, lead timelines and tour scheduling.",
    link: "https://leasing-crm.vercel.app/",
    technologies: ["React", "Vite", "Tailwind CSS", "Firestore", "Claude API", "Python", "FastAPI", "Vitest", "Vercel", "Render"],
    buildStatus: "success",
    bulletPoints: [
      "Built a Today dashboard that ranks follow-ups by lead score and due time.",
      "Built lead workspaces with an activity timeline, tasks and a score breakdown.",
      "Added a week calendar for tours that only offers open time slots.",
      "Scored leads in FastAPI on Render, with a Claude Haiku 5.5 assistant for questions.",
      "Built a design system on Tailwind tokens and tested the app with 669 Vitest tests.",
    ],
    kind: "Web app",
    image: "/LeasingCRMCapture.png",
    lighthouse: 94,
    linkType: "live",
  },
  {
    title: "Agent Skills Manager",
    description: "Web application for posting and managing agent skills.",
    link: "https://agent-skills-manager-theta.vercel.app/",
    technologies: ["React", "Next.js", "Tailwind CSS", "Prisma", "PostgreSQL", "Vercel", "TypeScript", "DaisyUI", "Zod"],
    buildStatus: "success",
    bulletPoints: [
      "Implemented a web application for managing agent skills, allowing users to add, edit, and delete skills.",
      "Designed and implemented a RESTful API using NextJS, Prisma and PostgreSQL.",
      "Created a responsive and user-friendly frontend using React, Tailwind CSS, and DaisyUI.",
      "Implemented form validation using Zod to ensure data integrity.",
      "Cookie-based authentication and password change functionality.",
      "Deployed the application on Vercel, ensuring high availability and performance.",
    ],
    kind: "Web app",
    image: "/AgentSkillsManagerCapture.png",
    lighthouse: 99,
    linkType: "live",
  },
  {
    title: "Trivia Maze Game",
    description: "Single-player Java desktop game created as a course project built with three developers.",
    link: "https://github.com/Jessewa-uw/TCSS360MazeProject",
    technologies: ["Java", "JSwing", "SQLite"],
    buildStatus: "success",
    bulletPoints: [
      "Wrote the repository for reading the database and implemented the user interface using Java Swing.",
      "Wrote the save manager to handle game state persistence by using Java serialization.",
      "Implemented a custom algorithm to generate a maze with a unique solution and random trivia questions.",
      "Wrote JUnit tests to ensure the correctness of the game logic.",
    ],
    kind: "Java desktop game",
    image: "/TriviaMazeCapture.png",
    linkType: "code",
  },
];

export default async function ProjectsPage() {
  // const projects = await getProjects();     
  return (
    <PageTransition>
    <div className="rounded-4xl mx-4 py-8 mt-24 md:mt-40">
      <section className="bg-paper text-ink px-4 py-12 md:px-12 md:py-16">
        <h1 data-richie-perch="heading" className="text-3xl text-center mb-12 underline decoration-vermilion underline-offset-10">01/Projects</h1>
        {/* min() so a phone narrower than one 300px card doesn't overflow */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-8">
          {projects.map((p) => (
            <ProjectCard key={p.title} project={p} />
          ))}
        </div>
      </section>
    </div>
    <BackdropSpace />
    </PageTransition>
  );
}   