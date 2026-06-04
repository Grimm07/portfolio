export function Footer() {
  return (
    <footer className="py-8 bg-bg-tertiary relative overflow-hidden">
      {/* Subtle background orb */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <p className="text-sm text-text-tertiary mb-2">
          © {new Date().getFullYear()} Trystan Bates-Maricle
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
            href="https://aws.amazon.com/lambda/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
            aria-label="AWS Lambda (opens in new tab)"
          >
            AWS Lambda
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

        {/* Official "Powered by AWS" co-marketing badge (aws.amazon.com/co-marketing).
            White variant on dark surfaces, standard variant on light surfaces.
            Wrapped in a block element so it sits on its own line below the source link. */}
        <div className="mt-6">
        <a
          href="https://aws.amazon.com/what-is-cloud-computing/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block opacity-80 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded"
          aria-label="Powered by AWS Cloud Computing (opens in new tab)"
        >
          <img
            src="/powered-by-aws-white.png"
            alt="Powered by AWS Cloud Computing"
            width={100}
            height={36}
            loading="lazy"
            className="hidden dark:inline-block h-9 w-auto"
          />
          <img
            src="/powered-by-aws.png"
            alt="Powered by AWS Cloud Computing"
            width={100}
            height={36}
            loading="lazy"
            className="inline-block dark:hidden h-9 w-auto"
          />
        </a>
        </div>
      </div>
    </footer>
  );
}
