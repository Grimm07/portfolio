export function About() {
  return (
    <section id="about" className="py-20 lg:py-32 bg-bg-secondary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-12">About</h2>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Text Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Current Role
              </h3>
              <p className="text-lg text-text-primary leading-relaxed">
                Software Engineer at State Farm with 4+ years of experience
                architecting AI/ML systems for production environments.
                Specialized in NLP, Computer Vision, and LLM integration, with
                expertise spanning the full stack from model training to cloud
                deployment and infrastructure automation.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Focus Areas
              </h3>
              <p className="text-lg text-text-primary leading-relaxed">
                Currently focused on enterprise LLM applications, scalable cloud
                architecture, and bringing AI research into production systems.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-primary mb-3">
                Education
              </h3>
              <p className="text-lg text-text-primary leading-relaxed">
                B.S. Computer Science, Illinois State University (May 2023)
              </p>
            </div>
          </div>

          {/* Right Column - Glass Cards */}
          <div className="space-y-6">
            <div className="glass-card-sm p-6">
              <h3 className="text-xl font-semibold mb-4">Quick Facts</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">4+</span>
                  <span className="text-text-secondary">
                    Years of professional experience
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-semibold">3</span>
                  <span className="text-text-secondary">Patent applications filed</span>
                </li>
              </ul>
            </div>

            <div className="glass-card-sm p-6">
              <h3 className="text-xl font-semibold mb-4">Core Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'NLP',
                  'Computer Vision',
                  'LLMs',
                  'Cloud Architecture',
                  'Full-Stack Development',
                  'Infrastructure Automation',
                ].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
