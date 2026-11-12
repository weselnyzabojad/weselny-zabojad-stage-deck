// Customer-facing landing (issue #806).
//
// Sells Erick's trilingual wedding MC/DJ service to engaged couples. The Stage
// Deck is mentioned only as a coordination benefit; no commercial offers,
// third-party tracking or external assets are used here.
import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n/useI18n.js';
import logo from '../assets/img/logo.png';

const CONTACT_URL = 'https://www.weselnyzabojad.pl/#kontakt';

function ContactCta({ label, className = '' }) {
  return (
    <a
      href={CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-strong bg-brand px-6 py-3 text-sm font-bold text-on-accent transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${className}`}
    >
      {label}
    </a>
  );
}

function SectionTitle({ children, id }) {
  return (
    <h2 id={id} className="font-heading text-2xl font-bold text-ink sm:text-3xl">
      {children}
    </h2>
  );
}

function DeckMockup() {
  const { t } = useI18n();
  const rows = [
    { role: 'MC', width: '85%' },
    { role: 'DJ', width: '70%' },
    { role: 'PHOTO', width: '60%' },
    { role: 'SPEAKER', width: '45%' },
  ];

  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-line bg-card p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>{t('landing.mock.title')}</span>
        <span>20:45</span>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.role} className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
            <span className="h-2 rounded bg-line" style={{ width: row.width }} />
            <span className="ml-auto rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">
              {row.role}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted">{t('landing.mock.caption')}</p>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useI18n();
  const values = [1, 2, 3, 4].map((index) => ({
    title: t(`landing.value.${index}.title`),
    body: t(`landing.value.${index}.body`),
  }));
  const reasons = [1, 2, 3, 4, 5].map((index) => ({
    title: t(`landing.why.${index}.title`),
    body: t(`landing.why.${index}.body`),
  }));
  const steps = [1, 2, 3].map((index) => ({
    title: t(`landing.steps.${index}.title`),
    body: t(`landing.steps.${index}.body`),
  }));
  const faqs = [1, 2, 3, 4].map((index) => ({
    q: t(`landing.faq.${index}.q`),
    a: t(`landing.faq.${index}.a`),
  }));

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <img src={logo} alt="Weselny Żabojad" className="h-14 w-auto object-contain" />
        <LanguageToggle variant="desktop" />
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-2 lg:pb-24">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-brand-strong">
              {t('landing.hero.eyebrow')}
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-ink sm:text-5xl">
              {t('landing.hero.title')}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              {t('landing.hero.lead')}
            </p>
            <div className="mt-7 flex flex-col items-start gap-3">
              <ContactCta label={t('landing.hero.cta')} />
              <p className="text-xs leading-relaxed text-muted">{t('landing.hero.note')}</p>
            </div>
          </div>
          <DeckMockup />
        </section>

        <section aria-labelledby="landing-value" className="border-t border-line bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <SectionTitle id="landing-value">{t('landing.value.title')}</SectionTitle>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((item) => (
                <article key={item.title} className="rounded-xl border border-line bg-card p-5">
                  <h3 className="font-heading text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-team" className="border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
            <div>
              <SectionTitle id="landing-team">{t('landing.team.title')}</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t('landing.team.lead')}</p>
            </div>
            <ul className="space-y-3 self-center">
              {[1, 2, 3].map((index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink"
                >
                  <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span>{t(`landing.team.${index}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="landing-why" className="border-t border-line bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <SectionTitle id="landing-why">{t('landing.why.title')}</SectionTitle>
            <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {reasons.map((item) => (
                <li key={item.title} className="rounded-xl border border-line bg-card p-4">
                  <h3 className="font-heading text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="landing-steps" className="border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <SectionTitle id="landing-steps">{t('landing.steps.title')}</SectionTitle>
            <ol className="mt-7 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border border-line bg-card p-5">
                  <span className="font-mono text-xs font-bold text-brand-strong">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-heading text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="landing-faq" className="border-t border-line bg-card/40">
          <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
            <SectionTitle id="landing-faq">{t('landing.faq.title')}</SectionTitle>
            <div className="mt-6 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.q} className="rounded-xl border border-line bg-card px-4 py-3">
                  <summary className="cursor-pointer font-heading text-sm font-semibold text-ink">
                    {faq.q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
            <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
              {t('landing.footer.ctaTitle')}
            </h2>
            <p className="mt-3 text-sm text-muted">{t('landing.footer.ctaBody')}</p>
            <ContactCta label={t('landing.hero.cta')} className="mt-6" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>{t('landing.footer.note')}</span>
          <a
            href="/join"
            className="inline-flex min-h-11 items-center rounded px-2 font-semibold text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
          >
            {t('landing.footer.crew')}
          </a>
        </div>
      </footer>
    </div>
  );
}
