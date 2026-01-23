export function Footer() {
  return (
    <footer className="py-8 bg-bg-tertiary relative overflow-hidden">
      {/* Subtle background orb */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <p className="text-sm text-text-tertiary mb-2">
          © 2025 Trystan Bates-Maricle
        </p>
        <p className="text-sm text-text-tertiary mb-4">
          Built with{' '}
          <a
            href="https://vitejs.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
            aria-label="Vite (opens in new tab)"
          >
            Vite
          </a>
          ,{' '}
          <a
            href="https://react.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
            aria-label="React (opens in new tab)"
          >
            React
          </a>
          ,{' '}
          <a
            href="https://www.typescriptlang.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
            aria-label="TypeScript (opens in new tab)"
          >
            TypeScript
          </a>
          , and{' '}
          <a
            href="https://workers.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
            aria-label="Cloudflare Workers (opens in new tab)"
          >
            Cloudflare Workers
          </a>
        </p>
        <a
          href="https://github.com/Grimm07/portfolio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
          aria-label="View portfolio source code on GitHub (opens in new tab)"
        >
          View Source on GitHub →
        </a>
      </div>
    </footer>
  );
}
