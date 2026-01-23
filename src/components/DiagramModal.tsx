import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArchitectureDiagram } from './ArchitectureDiagram';

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: string;
  title?: string;
}

export function DiagramModal({ isOpen, onClose, chart, title }: DiagramModalProps) {
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
      // Store current focus
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Add escape listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus the modal
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';

      // Restore focus
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
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal content - comfortable viewing size */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-[85vw] max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-bg-primary animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-bg-secondary">
          {title && (
            <h3 id="modal-title" className="text-xl font-semibold text-text-primary">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close diagram (Escape)"
          >
            <svg
              className="w-6 h-6"
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

        {/* Diagram - solid background, starts at top */}
        <div className="flex-1 min-h-0 overflow-auto p-6 bg-bg-primary flex items-start justify-center">
          <ArchitectureDiagram chart={chart} className="max-w-none [&_svg]:w-full [&_svg]:h-auto" />
        </div>
      </div>
    </div>,
    document.body
  );
}
