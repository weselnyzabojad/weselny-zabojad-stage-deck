import { useI18n } from '../i18n/useI18n.js';

function throwingLabels(throwings = {}, t) {
  const labels = [];
  if (throwings.veil) labels.push(t('oczepiny.veil'));
  if (throwings.bouquet) labels.push(t('oczepiny.bouquet'));
  if (throwings.bowTie) labels.push(t('oczepiny.bowTie'));
  if (throwings.cravat) labels.push(t('oczepiny.cravat'));
  return labels;
}

export default function OczepinyCueCard({ wedding, audience = 'mc' }) {
  const { t } = useI18n();
  const ocz = wedding?.oczepiny;
  if (!ocz?.enabled) return null;
  const throwings = throwingLabels(ocz.throwings, t);
  const showWinner = ocz.winnerPhoto?.enabled && ocz.winnerPhoto?.photographerAvailable;
  const musicOn = ocz.music?.enabled === true;
  const playlist = Array.isArray(ocz.music?.playlist)
    ? ocz.music.playlist.filter(Boolean)
    : [];
  const musicLabel = playlist.length > 0 ? playlist.join(' · ') : ocz.music?.track ?? null;

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-heading text-[11px] font-semibold';

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-ink">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Oczepiny · {ocz.variant ?? ocz.order ?? 'MIDNIGHT'}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {throwings.length > 0 ? (
          <span className={`${chip} border-line-strong bg-raised text-ink`}>
            <span aria-hidden="true">💐</span>
            <span>{t('oczepiny.throwings', { labels: throwings.join(' · ') })}</span>
          </span>
        ) : null}
        {ocz.game?.enabled ? (
          <span className={`${chip} border-line-strong bg-raised text-ink`}>
            <span aria-hidden="true">🎮</span>
            <span>{t('oczepiny.gameEnabled')}</span>
          </span>
        ) : null}
        {audience !== 'photo' && musicOn ? (
          <span className={`${chip} border-line-strong bg-raised text-ink`}>
            <span aria-hidden="true">🎵</span>
            <span>{t('oczepiny.music', { music: musicLabel ?? t('oczepiny.enabled') })}</span>
          </span>
        ) : null}
        {audience === 'mc' && !musicOn && ocz.countdown?.mode === 'MC' ? (
          <span className={`${chip} border-line-strong bg-raised text-ink`}>
            <span aria-hidden="true">⏱</span>
            <span>{t('oczepiny.countdown')}</span>
          </span>
        ) : null}
        {showWinner ? (
          <span className={`${chip} border-line-strong bg-raised text-ink`}>
            <span aria-hidden="true">📸</span>
            <span>
              {audience === 'photo' ? t('oczepiny.photoCue') : t('oczepiny.winnerPhotoCue')}
            </span>
          </span>
        ) : null}
        {audience === 'dj-vip' ? (
          <span className={`${chip} border-line-strong bg-raised text-muted`}>
            <span aria-hidden="true">🎧</span>
            <span>{t('oczepiny.djVipCue')}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
