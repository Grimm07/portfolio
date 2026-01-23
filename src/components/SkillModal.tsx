import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  skills: string[];
}

export function SkillModal({ isOpen, onClose, title, skills }: SkillModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-[90vw] max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-bg-primary animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-bg-secondary">
          <h3 id="skill-modal-title" className="text-xl font-semibold text-text-primary">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close (Escape)"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Skills list */}
        <div className="flex-1 min-h-0 overflow-auto p-5 bg-bg-primary">
          <ul className="space-y-3">
            {skills.map((skill) => (
              <li
                key={skill}
                className="flex items-center gap-3 text-text-primary"
              >
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-bg-secondary text-center">
          <span className="text-sm text-text-secondary">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
