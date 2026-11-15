import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// Printable per-role QR cards (issue #76). The QR payload is the room deep
// link only; the PIN is never rendered or encoded here.
// Issue #1017: the screen surface is a one-card carousel; the same slide markup
// becomes the printable two-column grid under `@media print`.
function QrCard({ card, image }) {
  return (
    <article className="admin-qr-card rounded-xl border border-line bg-white p-5 text-slate-900 shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="font-heading text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            {card.couple || 'Wedding'}
          </div>
          <h3 className="font-heading text-2xl font-black uppercase tracking-wide">{card.label}</h3>
        </div>
        <div className="text-right font-mono text-[10px] text-muted">
          <div>{card.date || '—'}</div>
          <div>{card.venue || ''}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {image ? (
          <img
            src={image}
            alt={`QR code for the ${card.label} role`}
            className="h-56 w-56 shrink-0"
          />
        ) : (
          <div className="flex h-56 w-56 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 font-mono text-[10px] text-muted">
            QR…
          </div>
        )}
        <div className="min-w-0 text-center text-xs sm:text-left">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Room code</div>
          <div className="font-mono text-3xl font-bold tracking-widest">{card.roomCode}</div>
          <div className="mt-2 font-mono text-[9px] break-all text-muted">{card.url}</div>
          <div className="mt-2 text-[10px] text-muted">
            Scan, then enter the 6-digit PIN. PINs are never printed.
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminQrCards({ cards = [] }) {
  const [images, setImages] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(null);
  const pillRefs = useRef([]);
  const lastIndex = Math.max(0, cards.length - 1);
  const currentIndex = Math.min(activeIndex, lastIndex);

  useEffect(() => {
    pillRefs.current[currentIndex]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [currentIndex]);

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

  const go = (direction) => {
    setActiveIndex((current) => (current + direction + cards.length) % cards.length);
  };
  const jump = (index) => setActiveIndex(Math.max(0, Math.min(index, lastIndex)));

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      jump(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      jump(lastIndex);
    }
  };

  const onTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches?.[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="space-y-3">
      {cards.length > 1 ? (
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          aria-label="Jump to a role card"
        >
          {cards.map((card, index) => (
            <button
              key={`pill-${card.role}`}
              ref={(node) => {
                pillRefs.current[index] = node;
              }}
              type="button"
              aria-pressed={index === currentIndex}
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => jump(index)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                index === currentIndex
                  ? 'border-brand-strong bg-brand/30 text-ink'
                  : 'border-line bg-raised text-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              {card.label}
            </button>
          ))}
        </div>
      ) : null}

      <section
        aria-label="QR role cards"
        aria-roledescription="carousel"
        className="relative flex items-center gap-2"
        onKeyDown={onKeyDown}
      >
        {cards.length > 1 ? (
          <button
            type="button"
            aria-label="Previous role card"
            onClick={() => go(-1)}
            className="z-raised flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-xl font-bold text-ink shadow-md transition hover:bg-line"
          >
            ‹
          </button>
        ) : null}

        <div
          className="admin-print-track min-w-0 flex-1 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="admin-print-rail flex transition-transform duration-300 motion-reduce:transition-none"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {cards.map((card, index) => {
              const active = index === currentIndex;
              return (
                <div
                  key={card.role}
                  className="admin-print-slide w-full shrink-0 px-1"
                  aria-hidden={active ? undefined : 'true'}
                  inert={active ? undefined : true}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${card.label}, ${index + 1} of ${cards.length}`}
                >
                  <div className="mx-auto max-w-md">
                    <QrCard card={card} image={images[card.role]} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {cards.length > 1 ? (
          <button
            type="button"
            aria-label="Next role card"
            onClick={() => go(1)}
            className="z-raised flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-raised text-xl font-bold text-ink shadow-md transition hover:bg-line"
          >
            ›
          </button>
        ) : null}
      </section>

      {cards.length > 1 ? (
        <div className="flex items-center justify-center gap-1.5">
          {cards.map((card, index) => (
            <button
              key={card.role}
              type="button"
              aria-label={`Show ${card.label} card`}
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => jump(index)}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                index === currentIndex
                  ? 'border-brand-strong bg-brand'
                  : 'border-line-strong bg-raised hover:bg-line'
              }`}
            />
          ))}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {`${cards[currentIndex]?.label ?? ''}, ${currentIndex + 1} of ${cards.length}`}
      </p>
    </div>
  );
}
