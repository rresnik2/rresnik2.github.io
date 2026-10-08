

export type Project = {
  title: string;
  description: string;
  technologies: string[];
  bulletPoints: string[];
  link: string;
  buildStatus: string;
  kind?: string;             
  image?: string;             
  lighthouse?: number;        
  linkType?: "live" | "code"; 
};

export function getProjects() {
    return null;

}