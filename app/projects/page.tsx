import Link from "next/link";
import { getProjects, Project } from "@/lib/projects";
import ProjectCard from "@/components/project-card";
import BackdropSpace from "@/components/backdrop-space";
import PageTransition from "@/components/page-transition";



const projects: Project[] = [
  {
    title: "Portfolio Website",
    description: "This site: a personal portfolio with flip-card projects, a photo gallery and an animated mascot.",
    link: "https://github.com/rresnik2/rresnik2.github.io",
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Canvas", "GitHub Pages"],
    buildStatus: "success",
    bulletPoints: [
      "Built the site on Next.js and Tailwind CSS, exported as static pages for GitHub Pages.",
      "Made flip cards that show a project overview on the front and full details on the back.",
      "Animated Richie, a canvas sprite mascot with its own engine, that perches on the page.",
      "Added page transitions and a photo gallery with a custom image loader.",
    ],
    kind: "Website",
    image: "/PortfolioCapture.png",
    lighthouse: 96,
    linkType: "code",
    artifact: 1,
  },
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
    artifact: 2,
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
    artifact: 3,
  },
  {
    title: "Fuel Port",
    description: "Native Apple silicon port of the 2009 open-world off-road racer FUEL, built on a new Metal engine.",
    link: "https://github.com/rresnik2/fuel-macos/tree/main",
    technologies: ["C++", "Objective-C++", "Metal", "Jolt Physics", "CMake", "Core Audio", "GameController"],
    buildStatus: "in progress",
    bulletPoints: [
      "Decoded the game's archives, textures, meshes and 140 km world heightfield from its data files.",
      "Wrote a Metal renderer for vehicles, terrain, sky and streamed world objects.",
      "Tuned Jolt Physics driving for 72 vehicles from the game's own mass, engine and gearbox data.",
      "Rebuilt FUEL's race logic and AI opponents, with ghost lines decoded from the executable.",
      "Packaged a double-clickable macOS launcher that ships no game files.",
    ],
    reflection:
      "So far this week, I’ve been excited to work with new frameworks and a programming language that I’ve never used before. Ghidra and REA are repositories that can be used together for reverse engineering. Ghidra is a decompiler, and REA is an MCP that connects Claude to Ghidra and allows Claude to investigate and map code. I had issues keeping Claude on track using REA. It could get a working game going, but then it would want to continue developing on its own without fully investigating. The game still needs work; ideally, it will be polished and have online multiplayer.",
    kind: "Native macOS game port",
    image: "/FuelPortCapture.jpg",
    linkType: "code",
    artifact: 4,
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