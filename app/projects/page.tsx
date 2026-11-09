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
    description: "Native Apple silicon port of the 2009 open-world off-road racer FUEL, reverse engineered from its executable and rebuilt on a new Metal engine.",
    link: "https://github.com/rresnik2/fuel-macos/tree/main",
    technologies: ["C++", "Objective-C++", "Metal", "MetalFX", "Jolt Physics", "CMake", "Core Audio", "GameController", "Ghidra"],
    buildStatus: "in progress",
    bulletPoints: [
      "Reverse engineered FUEL.exe in Ghidra and tracked all 11,208 in-scope functions in a ledger, about 68% decoded.",
      "Checked each system against FUEL's own behavior with test vectors from running its code under an emulator, including physics, render, HUD and a 262-event check.",
      "Completed 32 faithful feature packages, including race rules, map and navigator, weather and vehicle effects, animation and save import.",
      "Fixed bugs found in play testing the way FUEL does it, such as the AI difficulty never being set and its real medal rule.",
      "Added controller support with Xbox and PlayStation prompts, FUEL's remap page and DualSense haptics, plus temporal upscaling groundwork with MetalFX.",
      "Added features beyond the original: nitrous, a traction governor, a vehicle upgrade system with career economy, custom vehicles and a reworked player character.",
      "Coordinated the work with Claude Code and many parallel AI agents. Packaged as a self-contained macOS app for personal use only.",
    ],
    reflection:
      "Ghidra and REA can be used together for reverse engineering. Ghidra is a decompiler, and REA is an MCP that connects Claude to Ghidra and allows Claude to investigate and map code. Early on I had trouble keeping Claude on track: it could get a working game going, then keep building without fully investigating the original. Tracking every function in a ledger and checking each system against FUEL's own code fixed that, and play testing turned up real bugs, like opponents that were too fast because the difficulty was never set. A GPU slowdown I chased turned out to be thermal throttling, not code. The game still needs work; ideally it will be polished and have online multiplayer.",
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