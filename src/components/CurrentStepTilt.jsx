import { useEffect, useRef } from 'react';

const MAX_TILT_DEG = 6;

function matchesQuery(query) {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches
  );
}

function reducedMotion() {
  return matchesQuery('(prefers-reduced-motion: reduce)');
}

// The 6-degree tilt is only for precise hovering pointers (mouse/trackpad).
// Touch and coarse-pointer devices keep the flat border/ring/shadow hierarchy.
function finePointer() {
  return matchesQuery('(hover: hover) and (pointer: fine)');
}

// Lightweight pointer-driven tilt for the current step. CSS variables are
// updated inside requestAnimationFrame so React never re-renders on pointer move.
export default function CurrentStepTilt({ children }) {
  const rootRef = useRef(null);
  const frameRef = useRef(0);

  const reset = () => {
    const node = rootRef.current;
    if (!node) return;
    node.style.setProperty('--tilt-x', '0deg');
    node.style.setProperty('--tilt-y', '0deg');
  };

  const onPointerMove = (event) => {
    if (event.pointerType === 'touch' || !finePointer() || reducedMotion()) return;
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const tiltY = (x * 2 - 1) * MAX_TILT_DEG;
    const tiltX = (y * 2 - 1) * -MAX_TILT_DEG;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      node.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      node.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    });
  };

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      data-current-step-tilt
      className="current-step-tilt transform-gpu"
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </div>
  );
}
