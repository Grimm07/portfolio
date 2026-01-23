import { useState } from 'react';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { DiagramModal } from './DiagramModal';

interface Project {
  id: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  tech: string[];
  githubUrl: string;
  diagram?: string;
  status: 'active' | 'coming-soon';
}

const projects: Project[] = [
  {
    id: 1,
    title: 'Portfolio Website',
    shortDescription: 'Modern portfolio with glassmorphism design and serverless backend',
    fullDescription:
      'A fully responsive portfolio website built with React, TypeScript, and Tailwind CSS. Features include glassmorphism UI design, dark/light theme toggle with smooth transitions, animated gradient effects, and a serverless contact form powered by Cloudflare Workers. The backend implements multi-layer spam protection including rate limiting, honeypot fields, time validation, and Turnstile CAPTCHA verification.',
    tech: ['React', 'TypeScript', 'Tailwind CSS', 'Cloudflare Workers', 'Terraform'],
    githubUrl: 'https://github.com/Grimm07/portfolio',
    diagram: `graph TD
    A[User] --> B[Cloudflare Pages]
    B --> C[React Frontend]
    C --> D[Contact Form]
    D --> E[Cloudflare Worker]
    E --> F{Validation}
    F -->|Rate Limit| G[In-Memory Store]
    F -->|Honeypot| H[Bot Detection]
    F -->|Turnstile| I[CAPTCHA Verify]
    F -->|Valid| J[MailChannels API]
    J --> K[Email Delivery]`,
    status: 'active',
  },
  {
    id: 2,
    title: 'Project 2',
    shortDescription: 'Coming soon - A new project is in development',
    fullDescription: 'Details about this project will be available soon. Check back for updates!',
    tech: [],
    githubUrl: '',
    status: 'coming-soon',
  },
  {
    id: 3,
    title: 'Project 3',
    shortDescription: 'Coming soon - A new project is in development',
    fullDescription: 'Details about this project will be available soon. Check back for updates!',
    tech: [],
    githubUrl: '',
    status: 'coming-soon',
  },
];

function ProjectCard({ project }: { project: Project }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isActive = project.status === 'active';

  return (
    <div
      className={`glass-card-sm p-6 transition-all duration-300 ${
        isActive ? 'cursor-pointer hover:scale-105' : 'opacity-50'
      }`}
      onClick={() => isActive && setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (isActive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      tabIndex={isActive ? 0 : -1}
      role={isActive ? 'button' : undefined}
      aria-expanded={isActive ? isExpanded : undefined}
      aria-label={isActive ? `${project.title} - Click to ${isExpanded ? 'collapse' : 'expand'} details` : undefined}
    >
      {/* Status badge */}
      <div className={`text-sm font-semibold mb-2 ${isActive ? 'text-green-500' : 'text-primary'}`}>
        {isActive ? 'Active' : 'Coming Soon'}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-3">{project.title}</h3>

      {/* Description */}
      <p className="text-text-secondary mb-4">
        {isExpanded ? project.fullDescription : project.shortDescription}
      </p>

      {/* Expanded content */}
      {isExpanded && isActive && (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Tech stack */}
          {project.tech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Architecture diagram preview */}
          {project.diagram && (
            <div className="pt-2">
              <ArchitectureDiagram
                chart={project.diagram}
                preview
                onExpand={() => setIsModalOpen(true)}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary"
                aria-label={`View ${project.title} source code on GitHub (opens in new tab)`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View Code
              </a>
            )}
          </div>

          {/* Diagram modal */}
          {project.diagram && (
            <DiagramModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              chart={project.diagram}
              title={`${project.title} Architecture`}
            />
          )}
        </div>
      )}

      {/* Expand indicator for active projects */}
      {isActive && !isExpanded && (
        <div className="mt-4 text-sm text-text-tertiary flex items-center gap-1">
          <span>Click to expand</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function Projects() {
  return (
    <section id="projects" className="py-20 lg:py-32 bg-bg-primary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-4">Projects</h2>
        <p className="text-text-secondary text-lg mb-12">
          Personal projects showcasing full-stack development and system design
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
