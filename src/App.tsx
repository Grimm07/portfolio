import { lazy, Suspense } from 'react';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Experience } from './components/Experience';
import { Skills } from './components/Skills';
import { Patents } from './components/Patents';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ThemeToggle } from './components/ThemeToggle';

// Lazy load ArchitectureShowcase (contains Mermaid.js - large dependency)
const ArchitectureShowcase = lazy(() => 
  import('./components/ArchitectureShowcase').then(module => ({ 
    default: module.ArchitectureShowcase 
  }))
);

export function App() {
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <ThemeToggle />
      <main id="main-content">
        <Hero />
        <About />
        <Experience />
        <Suspense fallback={
          <section id="architecture" className="py-20 lg:py-32 bg-bg-secondary" aria-label="Architecture diagrams">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center text-text-secondary" role="status" aria-live="polite">
                Loading architecture diagrams...
              </div>
            </div>
          </section>
        }>
          <ArchitectureShowcase />
        </Suspense>
        <Patents />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
