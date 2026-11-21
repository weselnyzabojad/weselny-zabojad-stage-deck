import { useI18n } from '../i18n/useI18n.js';

function tossLabels(ocz = {}, t) {
  const labels = [];
  if (ocz.toss === 'VEIL') labels.push(t('oczepiny.veil'));
  if (ocz.toss === 'BOUQUET') labels.push(t('oczepiny.bouquet'));
  if (ocz.ties === 'BOW_TIE') labels.push(t('oczepiny.bowTie'));
  if (ocz.ties === 'CRAVAT') labels.push(t('oczepiny.cravat'));
  return labels;
}

export default function OczepinyCueCard({ wedding, audience = 'mc' }) {
  const { t } = useI18n();
  const ocz = wedding?.oczepiny;
  if (!ocz?.enabled) return null;
  const throwings = tossLabels(ocz, t);
  const showWinner = ocz.winnerPhoto?.enabled && ocz.winnerPhoto?.photographerAvailable;
  const songs = Array.isArray(ocz.music?.songs) ? ocz.music.songs.filter(Boolean) : [];
  const musicOn = songs.length > 0 || ocz.music?.decidedByDj === true;
  const musicLabel = songs.length > 0
    ? songs.join(' · ')
    : ocz.music?.decidedByDj
      ? t('oczepiny.enabled')
      : null;

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-heading text-[11px] font-semibold';

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-ink">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Oczepiny · {ocz.order ?? 'MIDNIGHT'}
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
        {audience === 'mc' && ocz.countdown?.mode === 'MC_MIC_COUNTDOWN' ? (
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
