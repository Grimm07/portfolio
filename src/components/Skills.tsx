import { useState } from 'react';
import { SkillModal } from './SkillModal';

interface SkillCategory {
  title: string;
  icon: React.ReactNode;
  skills: string[];
}

const skillCategories: SkillCategory[] = [
  {
    title: 'AI/ML Tools & Products',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    skills: [
      'Lazarus Rikai',
      'Azure Document Understanding',
      'Hyperscience',
      'AWS Textract Queries',
      'OpenAI (GPT-4, DALL-E, Codex)',
    ],
  },
  {
    title: 'AWS Services',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    skills: [
      'Lambda',
      'EC2',
      'S3',
      'DynamoDB',
      'ECS',
      'Fargate',
      'SQS',
      'SNS',
      'Textract',
      'SageMaker',
    ],
  },
  {
    title: 'Azure Services',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    skills: [
      'EntraID',
      'Cognitive Services',
      'Vision API',
      'Document Understanding',
    ],
  },
  {
    title: 'Frontend',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    skills: [
      'React',
      'TypeScript',
      'Vite',
      'Tailwind CSS',
      'TanStack Query',
      'TanStack Form',
      'TanStack Router',
    ],
  },
  {
    title: 'Python Ecosystem',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
      </svg>
    ),
    skills: [
      'Poetry',
      'PyTorch',
      'TensorFlow',
      'scikit-learn',
      'XGBoost',
      'spaCy',
      'NLTK',
      'OpenCV',
    ],
  },
  {
    title: 'JVM Ecosystem',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    skills: [
      'Kotlin',
      'Java',
      'Gradle',
    ],
  },
  {
    title: 'DevOps & Infrastructure',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    skills: [
      'Terraform',
      'Docker',
      'GitLab CI/CD',
      'Git',
    ],
  },
  {
    title: 'Languages',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    skills: [
      'Python (Primary)',
      'Kotlin (Primary)',
      'TypeScript (Primary)',
      'Go (Secondary)',
      'Java (Secondary)',
      'C++ (Secondary)',
    ],
  },
];

const PREVIEW_COUNT = 5;

function SkillCategoryCard({ category, onClick }: { category: SkillCategory; onClick: () => void }) {
  const previewSkills = category.skills.slice(0, PREVIEW_COUNT);
  const remainingCount = category.skills.length - PREVIEW_COUNT;

  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card-sm p-5 flex flex-col items-start text-left h-full cursor-pointer transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary group"
      aria-label={`${category.title} - ${category.skills.length} skills. Click to view details.`}
    >
      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          {category.icon}
        </div>
        <h3 className="text-base font-semibold text-text-primary">{category.title}</h3>
      </div>

      {/* Skill tags preview */}
      <div className="flex flex-wrap gap-2 mb-3">
        {previewSkills.map((skill) => (
          <span
            key={skill}
            className="px-2 py-1 text-xs rounded-full bg-secondary/20 text-secondary"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* More indicator */}
      {remainingCount > 0 && (
        <p className="text-xs text-primary mt-auto">
          +{remainingCount} more
        </p>
      )}
    </button>
  );
}

export function Skills() {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);

  return (
    <section id="skills" className="py-20 lg:py-32 bg-bg-secondary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/3 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-12">Technical Skills</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {skillCategories.map((category) => (
            <SkillCategoryCard
              key={category.title}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </div>
      </div>

      {/* Skill modal */}
      {selectedCategory && (
        <SkillModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          title={selectedCategory.title}
          skills={selectedCategory.skills}
        />
      )}
    </section>
  );
}
