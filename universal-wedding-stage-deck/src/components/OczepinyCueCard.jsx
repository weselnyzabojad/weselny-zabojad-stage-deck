function throwingLabels(throwings = {}) {
  const labels = [];
  if (throwings.veil) labels.push('Veil');
  if (throwings.bouquet) labels.push('Bouquet');
  if (throwings.bowTie) labels.push('Bow tie');
  if (throwings.cravat) labels.push('Cravat');
  return labels;
}

export default function OczepinyCueCard({ wedding, audience = 'mc' }) {
  const ocz = wedding?.oczepiny;
  if (!ocz?.enabled) return null;
  const throwings = throwingLabels(ocz.throwings);
  const showWinner = ocz.winnerPhoto?.enabled && ocz.winnerPhoto?.photographerAvailable;

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-ink">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Oczepiny · {ocz.variant ?? ocz.order ?? 'MIDNIGHT'}
      </div>
      {throwings.length > 0 ? (
        <div className="mt-1">Throwings: {throwings.join(' · ')}</div>
      ) : null}
      {ocz.game?.enabled ? (
        <div className="mt-0.5">
          Game: {ocz.game.type === 'TEST_ZGODNOSCI' ? 'Test Zgodności' : ocz.game.type ?? 'Game'}
          {ocz.game.notes ? ` — ${ocz.game.notes}` : ''}
        </div>
      ) : null}
      {ocz.music?.enabled ? (
        <div className="mt-0.5">
          Music: {ocz.music.track ?? ocz.music.playlist ?? 'enabled'}
        </div>
      ) : null}
      {ocz.countdown?.mode === 'MC' ? (
        <div className="mt-0.5">MC countdown</div>
      ) : null}
      {showWinner ? (
        <div className="mt-0.5">
          {audience === 'photo'
            ? 'Photos: winners only + winners with the couple.'
            : 'Winner photo cue: winners only + winners with the couple.'}
        </div>
      ) : null}
      {audience === 'dj-vip' ? (
        <div className="mt-0.5 text-muted">
          DJ VIP cue — follow the MC countdown/music for the throwing sequence.
        </div>
      ) : null}
    </div>
  );
}
