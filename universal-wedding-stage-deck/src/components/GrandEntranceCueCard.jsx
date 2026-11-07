import { resolveGrandEntranceOrder } from '../lib/grandEntrance.js';
import { useI18n } from '../i18n/useI18n.js';

// MC entrance cue: guest order comes from the Google Doc cartridge.
export default function GrandEntranceCueCard({ step }) {
  const { t } = useI18n();
  const entrance = resolveGrandEntranceOrder(step);
  if (!entrance) return null;

  return (
    <div className="rounded-lg border border-brand-strong/50 bg-brand/10 p-2.5 text-[11px] text-brand-tint">
      <div className="font-heading text-[10px] font-bold uppercase tracking-widest text-brand-soft">
        🚪 {t('grandEntrance.title')}
      </div>
      <div className="mt-0.5 font-semibold text-white">
        {t(`grandEntrance.${entrance.order}.label`)}
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-slate-300">
        {t(`grandEntrance.${entrance.order}.sequence`)}
      </div>
    </div>
  );
}

