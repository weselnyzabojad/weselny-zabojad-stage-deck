import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Printable per-role QR cards (issue #76). The QR payload is the room deep
// link only; the PIN is never rendered or encoded here.
export default function AdminQrCards({ cards = [] }) {
  const [images, setImages] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      cards.map(async (card) => {
        try {
          const url = await QRCode.toDataURL(card.url, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 360,
          });
          return [card.role, url];
        } catch {
          return [card.role, null];
        }
      }),
    ).then((entries) => {
      if (!cancelled) setImages(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [cards]);

  if (cards.length === 0) {
    return <p className="text-xs text-muted">No roles to print.</p>;
  }

  return (
    <div className="admin-print-grid grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <article
          key={card.role}
          className="admin-qr-card rounded-xl border border-line bg-white p-4 text-slate-900 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <div className="font-heading text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                {card.couple || 'Wedding'}
              </div>
              <h3 className="font-heading text-lg font-black uppercase tracking-wide">
                {card.label}
              </h3>
            </div>
            <div className="text-right font-mono text-[10px] text-muted">
              <div>{card.date || '—'}</div>
              <div>{card.venue || ''}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {images[card.role] ? (
              <img
                src={images[card.role]}
                alt={`QR code for the ${card.label} role`}
                className="h-32 w-32 shrink-0"
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 font-mono text-[10px] text-muted">
                QR…
              </div>
            )}
            <div className="min-w-0 text-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Room code
              </div>
              <div className="font-mono text-2xl font-bold tracking-widest">{card.roomCode}</div>
              <div className="mt-2 font-mono text-[9px] break-all text-muted">{card.url}</div>
              <div className="mt-2 text-[10px] text-muted">
                Scan, then enter the 6-digit PIN. PINs are never printed.
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
