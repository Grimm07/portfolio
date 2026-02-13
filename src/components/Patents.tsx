import { useState, useRef, useEffect } from 'react';

interface Patent {
  id: number;
  title: string;
  status: string;
  description: string;
  patentNumber: string;
}

const patents: Patent[] = [
  {
    id: 1,
    title: 'AI-Centric Developer Support Tool',
    status: 'Published',
    description:
      'AI agent that monitors feeds for package & vendor updates and patches them in the pipeline',
    patentNumber: 'US-20240289113-A1',
  },
  {
    id: 2,
    title: 'Autodetection of communication system errors',
    status: 'Published',
    description:
      'Method for automatically detecting and categorizing errors in complex software systems',
    patentNumber: 'US-20240283697-A1',
  },
  {
    id: 3,
    title: 'Automated Communication System Responses',
    status: 'Published',
    description:
      'Techniques for improving automated communication system responses using interactive chat machine learning models',
    patentNumber: 'US-20240281706-A1',
  },
];

function PatentCard({ patent }: { patent: Patent }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(patent.patentNumber);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="glass-card-sm p-6 flex flex-col h-full">
      <h3 className="text-xl font-semibold mb-2 min-h-[3.5rem]">{patent.title}</h3>
      <p className="text-sm text-secondary mb-3">{patent.status}</p>
      <p className="text-text-primary flex-grow">{patent.description}</p>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-primary hover:text-primary-light transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-tertiary rounded group mt-4"
        aria-label={`Copy patent number ${patent.patentNumber} to clipboard`}
      >
        <span className="font-mono text-sm">{patent.patentNumber}</span>
        {copied ? (
          <span className="text-green-500 text-sm font-medium animate-pulse">
            ✓ Copied!
          </span>
        ) : (
          <svg
            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Patents() {
  return (
    <section id="patents" className="py-20 lg:py-32 bg-bg-primary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-4">Patents & Innovation</h2>
        <p className="text-text-secondary text-lg mb-12">
          3 patent applications filed in AI-centric customer support automation
          and intelligent error handling
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {patents.map((patent) => (
            <PatentCard key={patent.id} patent={patent} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <a
            href="https://ppubs.uspto.gov/pubwebapp/static/pages/landing.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded"
            aria-label="Search patents on USPTO"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span>Search on USPTO</span>
          </a>
        </div>
      </div>
    </section>
  );
}
