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

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-ink">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        Oczepiny · {ocz.variant ?? ocz.order ?? 'MIDNIGHT'}
      </div>
      {throwings.length > 0 ? (
        <div className="mt-1">{t('oczepiny.throwings', { labels: throwings.join(' · ') })}</div>
      ) : null}
      {ocz.game?.enabled ? (
        <div className="mt-0.5">
          {t('oczepiny.game', {
            game: ocz.game.type === 'TEST_ZGODNOSCI' ? 'Test Zgodności' : ocz.game.type ?? '',
          })}
          {ocz.game.notes ? ` — ${ocz.game.notes}` : ''}
        </div>
      ) : null}
      {ocz.music?.enabled ? (
        <div className="mt-0.5">
          {t('oczepiny.music', {
            music: ocz.music.track ?? ocz.music.playlist ?? t('oczepiny.enabled'),
          })}
        </div>
      ) : null}
      {ocz.countdown?.mode === 'MC' ? (
        <div className="mt-0.5">{t('oczepiny.countdown')}</div>
      ) : null}
      {showWinner ? (
        <div className="mt-0.5">
          {audience === 'photo' ? t('oczepiny.photoCue') : t('oczepiny.winnerPhotoCue')}
        </div>
      ) : null}
      {audience === 'dj-vip' ? (
        <div className="mt-0.5 text-muted">
          {t('oczepiny.djVipCue')}
        </div>
      ) : null}
    </div>
  );
}
