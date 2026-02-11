import { Hero } from './components/Hero';
import { About } from './components/About';
import { Experience } from './components/Experience';
import { Skills } from './components/Skills';
import { Patents } from './components/Patents';
import { Projects } from './components/Projects';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { ThemeToggle } from './components/ThemeToggle';

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
        <Patents />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
