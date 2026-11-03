import { useEffect, useRef } from 'react';

const SIZES = {
  full: 'w-full h-full sm:h-[calc(100dvh-2rem)] sm:max-w-6xl rounded-none sm:rounded-2xl',
  panel: 'w-full max-w-2xl max-h-[calc(100dvh-2rem)] rounded-2xl'
};

// Shared dialog shell: backdrop dismiss, Escape to close, focus the close
// button on open and restore focus when the overlay unmounts.
export default function ModalShell({ open, onClose, labelledBy, size = 'panel', children }) {
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative flex flex-col overflow-hidden border border-line bg-page shadow-2xl ${SIZES[size] ?? SIZES.panel}`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close overlay"
          className="absolute right-3 top-3 z-20 h-10 w-10 rounded-lg border border-line-strong bg-raised text-lg font-bold text-slate-200 transition hover:bg-line"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
