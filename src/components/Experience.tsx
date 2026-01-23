interface ExperienceItem {
  id: number;
  title: string;
  description: string;
  impact: string;
  tech: string[];
  diagram?: string;
}

const experiences: ExperienceItem[] = [
  {
    id: 1,
    title: 'NLP Voice Bot Enhancement',
    description:
      'Architected autonomous rental reservation system using Microsoft LUIS, enabling multi-turn dialog flows and complex intent handling',
    impact: '25% call center load reduction',
    tech: ['Microsoft LUIS', 'NLP', 'Azure', 'API Integration'],
    diagram: `graph LR
    A[User Call] --> B[IVR System]
    B --> C[Microsoft LUIS]
    C --> D{Intent Classification}
    D -->|Book| E[Reservation API]
    D -->|Modify| F[Update API]
    D -->|Cancel| G[Cancel API]
    E --> H[Confirmation]
    F --> H
    G --> H`,
  },
  {
    id: 2,
    title: 'Codebase Modernization',
    description:
      'Led large-scale JavaScript to Kotlin migration, redesigning core UI architecture for improved maintainability',
    impact: '40% LOC reduction',
    tech: ['Kotlin', 'JavaScript', 'Architectural Design', 'Refactoring'],
  },
  {
    id: 3,
    title: 'OCR Document Processing Evaluation',
    description:
      'Conducted comprehensive evaluation of OCR services (AWS Textract, Azure Vision, Lazarus AI) for production deployment',
    impact: 'Multi-vendor cost/accuracy analysis',
    tech: ['AWS Textract', 'Azure Vision API', 'Python', 'Document Understanding'],
    diagram: `graph TD
    A[Document Input] --> B[AWS Textract]
    A --> C[Azure Vision API]
    A --> D[Lazarus AI]
    B --> E[Accuracy Analysis]
    C --> E
    D --> E
    E --> F[Cost Comparison]
    E --> G[Latency Testing]
    F --> H[Vendor Selection]
    G --> H`,
  },
  {
    id: 4,
    title: 'Enterprise LLM Research',
    description:
      'Led evaluation and selection of LLM tools for enterprise use cases, assessing GPT-3.5, GPT-4, and domain-specific models',
    impact: 'Strategic tool selection for production AI',
    tech: ['OpenAI GPT', 'LLMs', 'Prompt Engineering', 'AI Research'],
  },
  {
    id: 5,
    title: 'Computer Vision Community Leadership',
    description:
      'Organized and facilitated workshops on embeddings, transformers, CNNs, RNNs, and vector databases for engineering teams',
    impact: 'Knowledge sharing & mentorship',
    tech: ['PyTorch', 'TensorFlow', 'Computer Vision', 'Teaching'],
  },
];

export function Experience() {
  return (
    <section id="experience" className="py-20 lg:py-32 bg-bg-primary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-12">Experience</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {experiences.map((exp) => (
              <div
                key={exp.id}
                className="glass-card-sm p-6 hover:scale-105 transition-all duration-300"
              >
                <h3 className="text-2xl font-semibold mb-3">{exp.title}</h3>
                <p className="text-text-primary mb-4">{exp.description}</p>
                <div className="text-success font-semibold text-lg mb-4">
                  {exp.impact}
                </div>
                <div className="flex flex-wrap gap-2">
                  {exp.tech.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
          ))}
        </div>
      </div>
    </section>
  );
}
