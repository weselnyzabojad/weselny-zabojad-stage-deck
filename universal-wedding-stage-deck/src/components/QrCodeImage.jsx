import { useEffect, useState } from 'react';

// Renders a QR code locally as inline SVG. Dark modules on a white background
// with a 4-module quiet zone and never inverted (Phase 1.5d). No external QR
// service and no network call: generation works offline; opening the target
// does not. The encoder is loaded on demand so the main deck bundle stays lean
// (the PWA precaches the chunk, so QR generation still works offline).
export default function QrCodeImage({ text, size = 60, label = 'QR code' }) {
  const renderKey = `${text ?? ''}|${size}`;
  const [result, setResult] = useState({ key: '', markup: '', failed: false });

  useEffect(() => {
    let cancelled = false;

    if (!text) return undefined;

    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toString(text, {
          type: 'svg',
          margin: 4,
          width: size,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        }),
      )
      .then((svg) => {
        if (!cancelled) setResult({ key: renderKey, markup: svg, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: renderKey, markup: '', failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [text, size, renderKey]);

  // Ignore stale markup from a previous song while the new QR is generated.
  const current = result.key === renderKey ? result : { markup: '', failed: false };

  if (current.failed) {
    return (
      <div
        className="flex items-center justify-center rounded border border-amber-700 bg-amber-950/60 text-center font-mono text-[8px] leading-tight text-amber-200"
        style={{ width: size, height: size }}
      >
        QR
        <br />
        failed
      </div>
    );
  }

  if (!current.markup) {
    return (
      <div
        className="animate-pulse rounded bg-slate-200"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-hidden rounded bg-white [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: current.markup }}
    />
  );
}
