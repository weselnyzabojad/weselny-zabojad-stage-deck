import { useI18n } from '../i18n/useI18n';

function Metric({ label, value }) {
  return (
    <div className="recap-print-avoid rounded-2xl border border-line bg-card/80 px-4 py-3 print:border-slate-300 print:bg-white">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted print:text-gray-700">
        {label}
      </div>
      <div className="mt-1 font-heading text-2xl font-bold text-ink print:text-black">
        {value ?? '—'}
      </div>
    </div>
  );
}

function Compatibility({ game }) {
  const { t } = useI18n();
  const questions = Array.isArray(game?.questions) ? game.questions : [];
  const answered = questions.length;
  const compatible = questions.filter((question) => question.isCompatible === true).length;
  const percentage = answered > 0 ? Math.round((compatible / answered) * 100) : null;

  if (answered === 0) {
    return (
      <section className="recap-print-avoid mt-8 rounded-3xl border border-line bg-card p-6 print:border-slate-300 print:bg-white">
        <h2 className="font-heading text-lg font-bold text-ink print:text-black">
          {t('recap.compatibility.title')}
        </h2>
        <p className="mt-2 text-sm text-muted print:text-gray-700">
          {t('recap.compatibility.none')}
        </p>
      </section>
    );
  }

  return (
    <section className="recap-print-avoid mt-8 rounded-3xl border border-line bg-card p-6 print:border-slate-300 print:bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted print:text-gray-700">
            {t('recap.compatibility.title')}
          </p>
          <h2 className="mt-1 font-heading text-3xl font-bold text-ink print:text-black">
            {t('recap.compatibility.percentage', { percentage })}
          </h2>
        </div>
        <p className="font-mono text-[11px] text-muted print:text-gray-700">
          {t('recap.compatibility.answered', {
            answered,
            total: game?.totalQuestions ?? answered,
          })}
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {questions.map((question, index) => (
          <li
            key={question.id ?? index}
            className="recap-print-avoid flex items-start justify-between gap-3 rounded-xl border border-line/70 bg-page/40 px-3 py-2 print:border-slate-200 print:bg-white"
          >
            <span className="text-sm text-ink print:text-black">
              {question.text || t('recap.compatibility.questionFallback', { index: index + 1 })}
            </span>
            <span
              className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                question.isCompatible
                  ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200 print:border-emerald-600 print:bg-white print:text-emerald-700'
                  : 'border-red-800 bg-red-950/40 text-red-200 print:border-red-600 print:bg-white print:text-red-700'
              }`}
            >
              {question.isCompatible
                ? `✓ ${t('recap.compatibility.compatible')}`
                : `✕ ${t('recap.compatibility.incompatible')}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ClientExecutiveSummaryView({ recap, onPrint }) {
  const { t } = useI18n();
  const summary = recap?.summary ?? {};
  const compatibilityGame =
    (recap?.games ?? []).find((game) => Array.isArray(game.questions) && game.questions.length > 0) ??
    null;

  return (
    <div>
      <section className="recap-print-avoid rounded-3xl border border-line bg-card/80 p-6 shadow-xl print:border-0 print:bg-white print:p-0 print:shadow-none sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted print:text-gray-700">
              {t('recap.eyebrow')}
            </p>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight text-ink print:text-black sm:text-5xl">
              {recap?.wedding?.couple ?? t('recap.title')}
            </h1>
            <p className="mt-2 text-sm text-muted print:text-gray-700">
              {[recap?.wedding?.date, recap?.wedding?.venue].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onPrint}
            className="min-h-10 rounded-full border border-line-strong bg-raised px-4 py-2 text-xs font-bold text-ink print:hidden"
          >
            {t('recap.print')}
          </button>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted print:text-gray-700">
          {t('recap.subtitle')}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label={t('recap.executive.end')} value={summary.actualEnd} />
          <Metric
            label={t('recap.executive.completed')}
            value={`${summary.completedSteps ?? 0}/${summary.totalSteps ?? 0}`}
          />
          <Metric
            label={t('recap.executive.accepted')}
            value={summary.acceptedSongRequests ?? 0}
          />
          <Metric
            label={t('recap.executive.animations')}
            value={summary.animations ?? summary.completedSteps ?? 0}
          />
        </div>
      </section>

      <Compatibility game={compatibilityGame} />
    </div>
  );
}
