import { ArchitectureDiagram } from './ArchitectureDiagram';

interface ArchitecturePattern {
  id: number;
  title: string;
  description: string;
  diagram: string;
}

const patterns: ArchitecturePattern[] = [
  {
    id: 1,
    title: 'Enterprise LLM Integration Pattern',
    description:
      'Scalable architecture for integrating large language models into enterprise applications with context retrieval, validation, and content filtering.',
    diagram: '', // Coming soon
  },
  {
    id: 2,
    title: 'Multi-Vendor OCR Pipeline',
    description:
      'Intelligent routing system that selects optimal OCR service based on document complexity, with aggregation and confidence scoring.',
    diagram: '', // Coming soon
  },
  {
    id: 3,
    title: 'NLP Dialog Management Flow',
    description:
      'End-to-end flow for voice-based interactions, from transcription through intent classification to business logic execution.',
    diagram: '', // Coming soon
  },
];

export function ArchitectureShowcase() {
  return (
    <section id="architecture" className="py-20 lg:py-32 bg-bg-secondary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-4">Architecture Patterns</h2>
        <p className="text-lg text-text-secondary mb-12">
          Generic system design patterns demonstrating enterprise-scale thinking
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="glass-card-sm p-6 hover:scale-105 transition-all duration-300 flex flex-col h-full"
            >
              <h3 className="text-2xl font-semibold mb-3 min-h-[4rem]">{pattern.title}</h3>
              <p className="text-text-secondary mb-4 text-sm leading-relaxed flex-grow">
                {pattern.description}
              </p>
              <div className="mt-auto pt-4">
                {pattern.diagram ? (
                  <ArchitectureDiagram 
                    chart={pattern.diagram} 
                    className="max-w-none mx-0"
                  />
                ) : (
                  <div className="glass-card-sm p-12 text-center">
                    <div className="text-text-secondary text-lg font-medium mb-2">
                      Coming Soon
                    </div>
                    <div className="text-text-tertiary text-sm">
                      Architecture diagram will be available soon
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
