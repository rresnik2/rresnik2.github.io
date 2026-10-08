// The resume, as data: rendered by app/resume/page.tsx, which is also printed
// to public/Reece_Resnik_Resume_SWE_Intern.pdf

export type ContactItem = { text: string; href?: string };
export type School = { name: string; place: string; dates: string; details: string[] };
export type Entry = { title: string; meta: string; dates: string; points: string[] };

export const RESUME_PDF = "/Reece_Resnik_Resume_SWE_Intern.pdf";

export const NAME = "Reece Resnik";

export const CONTACT: ContactItem[] = [
  { text: "Seattle, WA" },
  { text: "(775) 267-7751", href: "tel:+17752677751" },
  { text: "resnikr@uw.edu", href: "mailto:resnikr@uw.edu" },
  { text: "linkedin.com/in/reece-resnik", href: "https://www.linkedin.com/in/reece-resnik/" },
  { text: "github.com/rresnik2", href: "https://github.com/rresnik2" },
];

export const EDUCATION: School[] = [
  {
    name: "University of Washington",
    place: "Tacoma, WA",
    dates: "Expected Dec 2027",
    details: [
      "Bachelor of Arts, Computer Science and Systems | Minor: Business Administration | GPA: 3.4",
      "Relevant Coursework: Data Structures & Algorithms, Computer Architecture, Object-Oriented Programming, Software Development & Quality Assurance, Database Systems, Discrete Mathematics, Probability and Statistics in Engineering and Science (IP), Generative AI in Software Development (IP)",
    ],
  },
  { name: "Bellevue College", place: "Bellevue, WA", dates: "Completed 2024", details: [] },
];

export const SKILLS: [string, string][] = [
  ["Languages", "Java, Python, JavaScript, TypeScript, C#, SQL"],
  ["Frameworks & Libraries", "React, Node.js, FastAPI, OpenCV, MediaPipe, Pandas, Tailwind CSS, NextJS, DaisyUI"],
  [
    "Infrastructure & Tools",
    "Linux/Unix, Git/GitHub, Docker, CI/CD, PostgreSQL, SQLite, Firebase/Firestore, REST APIs, JUnit, Raspberry Pi, Vercel, Cloudflare Workers",
  ],
];

export const PROJECTS: Entry[] = [
  {
    title: "Gesture-Controlled Tower Defense",
    meta: "Python, OpenCV, MediaPipe, Raspberry Pi 4",
    dates: "2025",
    points: [
      "Built a real-time computer vision pipeline that tracks hand landmarks from a live camera feed, and maps recognized gestures to in-game actions, running end to end on a Raspberry Pi 4.",
      "Tuned capture resolution and per-frame processing to keep the detection-to-render loop responsive on constrained ARM hardware.",
      "Designed gesture state handling to filter noisy landmark data, reducing false inputs during continuous play.",
    ],
  },
  {
    title: "Leasing CRM",
    meta: "React, TypeScript, Python/FastAPI, Firestore, Anthropic API",
    dates: "2025 – Present",
    points: [
      "Designed and deployed a full-stack CRM with a React/TypeScript frontend and a Python/FastAPI backend on Render, backed by Firestore, including an AI assistant built on the Anthropic API.",
      "Diagnosed a critical Firebase Admin SDK incompatibility by analyzing REST API documentation and refactoring the data access layer onto Firestore's REST API, restoring functionality without rewriting the application.",
      "Debugged production deployment failures spanning cold-start latency, environment variable misconfiguration, and corrupted service-account credentials.",
    ],
  },
  {
    title: "Trivia Maze",
    meta: "Java, SQLite, JUnit",
    dates: "2025",
    points: [
      "Built the GUI and controller layers of a multi-room maze game on a three-person team, wiring user input to model state updates under an MVC architecture.",
      "Implemented question retrieval from a SQLite database, decoupling game content from game logic so question sets could change without touching the engine.",
      "Wrote JUnit tests covering game logic and collaborated through a shared Git repository with code review before merge.",
    ],
  },
];

export const EXPERIENCE: Entry[] = [
  {
    title: "Leasing Agent",
    meta: "Eclipse Staffing LLC, Seattle, WA",
    dates: "Oct 2025 – Present",
    points: [
      "Automated recurring leasing workflows with Python scripts and AI tooling, cutting manual data entry out of daily operations.",
      "Ramped onto new property systems and requirements across multiple sites during management transitions.",
    ],
  },
  {
    title: "Leasing Agent",
    meta: "Greystar, Seattle, WA",
    dates: "Aug 2024 – Aug 2025",
    points: [
      "Cut lease generation time from 45 minutes to 15 by designing a standardized lease checklist, which also reduced post-creation corrections.",
      "Reduced application decision turnaround from 3 days to 1 by clarifying requirements and streamlining handoffs across teams.",
    ],
  },
];
