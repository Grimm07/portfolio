import { useEffect, useRef } from 'react';

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function Hero() {
  const nameRef = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleThemeChange = () => {
      // Skip animation replay on first render (page load animation handles it)
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (!nameRef.current) return;

      // Remove animation, force reflow, then re-add to replay
      nameRef.current.classList.remove('animate-active');
      nameRef.current.classList.add('animate');

      // Force reflow
      void nameRef.current.offsetWidth;

      // Re-enable animation
      nameRef.current.classList.remove('animate');
      nameRef.current.classList.add('animate-active');
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden"
    >
      {/* Background gradient orbs for glass effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
      </div>

      {/* Glass card */}
      <div className="glass-card max-w-4xl mx-auto px-8 py-12 md:px-12 md:py-16 text-center relative z-10">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold">
          <span ref={nameRef} className="hero-name-gradient bg-clip-text text-transparent">
            Trystan Bates-Maricle
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-text-secondary mt-4">
          AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure
        </p>
        <p className="text-lg text-text-tertiary mt-2">
          Building intelligent systems that scale
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={() => scrollToSection('experience')}
            className="btn-primary"
            aria-label="Navigate to Experience section"
          >
            View Experience
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="btn-secondary"
            aria-label="Navigate to Contact section"
          >
            Let's Connect
          </button>
        </div>
      </div>
    </section>
  );
}
