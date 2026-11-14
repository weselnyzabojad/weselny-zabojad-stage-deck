// Deck-focused public landing (issue #811).
//
// Presents the Stage Deck product to future newlyweds and their wedding
// vendors. The deck is included with a booked Weselny Żabojad wedding; the
// page contains no commercial offers, no tracking and no external assets.
import { useMemo } from 'react';
import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n/useI18n.js';
import logo from '../assets/img/logo.png';
import logoMark from '../assets/img/dj-vip/logo_mark.png';
import logoSzymoniak from '../assets/img/dj-vip/logo_szymoniak.png';

const CONTACT_BASE = 'https://www.weselnyzabojad.pl/';

function buildContactHref(prefill) {
  const url = new URL(CONTACT_BASE);
  url.searchParams.set('prefill', prefill);
  url.hash = 'kontakt';
  return url.toString();
}

function ContactCta({ label, href, className = '' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#D4AF37]/60 bg-[#C5A059] px-7 py-3.5 text-sm font-bold text-[#1A1A1A] shadow-lg shadow-[#C5A059]/20 transition-all duration-300 hover:bg-[#D4AF37] hover:shadow-xl hover:shadow-[#C5A059]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A6A2F] active:translate-y-0 active:shadow-lg motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${className}`}
    >
      {label}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4 w-4 shrink-0 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 10h11m-4-4 4 4-4 4" />
      </svg>
    </a>
  );
}

function HighlightedText({ text, phrase, className = 'font-semibold text-brand-strong' }) {
  const index = phrase ? text.indexOf(phrase) : -1;
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <strong className={className}>{phrase}</strong>
      {text.slice(index + phrase.length)}
    </>
  );
}

function SectionTitle({ children, id, className = '' }) {
  return (
    <h2
      id={id}
      className={`font-heading text-2xl font-bold text-ink sm:text-3xl ${className}`}
    >
      {children}
    </h2>
  );
}

function MockShell({ title, caption, children }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-4 shadow-xl" aria-hidden="true">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-ink">{title}</h3>
        <span className="h-2 w-2 rounded-full bg-brand" />
      </div>
      <div className="mt-3 space-y-2">{children}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">{caption}</p>
    </article>
  );
}

function TimelineMock() {
  const { t } = useI18n();
  const rows = [
    { time: '17:00', width: '90%' },
    { time: '18:30', width: '72%' },
    { time: '20:45', width: '84%' },
    { time: '22:10', width: '60%' },
  ];

  return (
    <MockShell title={t('landing.mock.timeline.title')} caption={t('landing.mock.timeline.caption')}>
      {rows.map((row) => (
        <div key={row.time} className="flex items-center gap-2">
          <span className="w-10 font-mono text-[9px] text-muted">{row.time}</span>
          <span className="h-2 rounded bg-line" style={{ width: row.width }} />
        </div>
      ))}
    </MockShell>
  );
}

function RoleMock() {
  const { t } = useI18n();

  return (
    <MockShell title={t('landing.mock.role.title')} caption={t('landing.mock.role.caption')}>
      <div className="flex gap-1.5">
        {['MC', 'DJ', 'PHOTO'].map((role, index) => (
          <span
            key={role}
            className={`rounded px-2 py-1 font-mono text-[9px] ${
              index === 0 ? 'bg-brand text-on-accent' : 'bg-raised text-muted'
            }`}
          >
            {role}
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-brand-strong/50 bg-raised p-2.5">
        <span className="block h-2 w-1/2 rounded bg-brand/70" />
        <span className="mt-2 block h-1.5 w-4/5 rounded bg-line" />
        <span className="mt-1.5 block h-1.5 w-2/3 rounded bg-line" />
      </div>
    </MockShell>
  );
}

function SongsMock() {
  const { t } = useI18n();

  return (
    <MockShell title={t('landing.mock.songs.title')} caption={t('landing.mock.songs.caption')}>
      {[0, 1].map((index) => (
        <div key={index} className="flex items-center gap-2 rounded-lg border border-line bg-raised p-2">
          <span className="h-6 w-6 shrink-0 rounded-full bg-line" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-1.5 w-2/3 rounded bg-line" />
            <span className="block h-1.5 w-1/2 rounded bg-line" />
          </span>
        </div>
      ))}
    </MockShell>
  );
}

const FEATURE_ICON_PATHS = [
  'M4 6h16M4 12h10M4 18h7',
  'M3 3l18 18M8 8a6 6 0 0 0-2 11h10a4 4 0 0 0 2.5-7.1M9 5.5A6 6 0 0 1 18.5 10',
  'M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.5-2L20 9M4 15l2.4 2A7 7 0 0 0 18 15',
  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  'M9 18V5l10-2v13M9 18a3 3 0 1 1-3-3M19 16a3 3 0 1 1-3-3',
];

function FeatureIcon({ index }) {
  return (
    <span
      aria-hidden="true"
      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#C5A059]/10 text-[#C5A059]"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={FEATURE_ICON_PATHS[index - 1]} />
      </svg>
    </span>
  );
}

export default function LandingPage() {
  const { t, locale } = useI18n();
  const contactHref = useMemo(
    () => buildContactHref(t('landing.contact.prefill')),
    [locale, t],
  );
  const features = [1, 2, 3, 4, 5, 6, 7].map((index) => ({
    index,
    title: t(`landing.features.${index}.title`),
    body: t(`landing.features.${index}.body`),
  }));
  const steps = [1, 2, 3].map((index) => ({
    title: t(`landing.how.${index}.title`),
    body: t(`landing.how.${index}.body`),
  }));
  const faqs = [1, 2, 3, 4, 5].map((index) => ({
    q: t(`landing.faq.${index}.q`),
    a: t(`landing.faq.${index}.a`),
  }));

  return (
    <div
      data-theme="day"
      className="min-h-screen bg-[#FBF9F5] font-heading text-[#1A1A1A]"
    >
      <header className="border-b border-[#C5A059]/15 bg-white/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Weselny Żabojad" className="h-14 w-auto object-contain sm:h-16" />
            <div>
              <p className="font-heading text-lg font-bold leading-none text-[#1A1A1A]">
                Stage Deck
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8A6A2F]">
                {t('landing.hero.eyebrow')}
              </p>
            </div>
          </div>
          <LanguageToggle variant="desktop" />
        </div>
      </header>

      <main>
        <div className="mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[#C5A059]/30 bg-white/90 p-6 text-left shadow-xl shadow-slate-900/5 backdrop-blur sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#C5A059]/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#D4AF37]/10 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="absolute left-0 top-10 h-12 w-1 rounded-r-full bg-gradient-to-b from-[#D4AF37] to-[#C5A059]/20"
            />
            <div className="relative">
              <p className="font-body text-base italic leading-relaxed text-[#1E293B] sm:text-lg sm:leading-8">
                <HighlightedText
                  text={t('landing.intro.p1')}
                  phrase={t('landing.intro.p1.highlight')}
                  className="font-semibold not-italic text-[#8A6A2F]"
                />
              </p>
              <div className="mt-6 rounded-2xl border border-[#C5A059]/25 bg-[#FBF9F5]/80 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0 text-[#C5A059]"
                    fill="currentColor"
                  >
                    <path d="M12 2.5l2.1 6.1 6.4 2.1-6.4 2.1L12 19l-2.1-6.2-6.4-2.1 6.4-2.1L12 2.5z" />
                  </svg>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gradient-to-r from-[#C5A059]/40 to-transparent"
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#1E293B] sm:text-base">
                  <HighlightedText
                    text={t('landing.intro.p2')}
                    phrase={t('landing.intro.p2.highlight')}
                    className="font-semibold text-[#8A6A2F]"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pt-14">
          <div aria-hidden="true" className="mx-auto mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A059]/70" />
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#C5A059]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <path d="M12 3l2.2 6.3L20.5 12l-6.3 2.7L12 21l-2.2-6.3L3.5 12l6.3-2.7L12 3Z" />
            </svg>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C5A059]/70" />
          </div>
          <h1 className="mx-auto max-w-4xl font-heading text-4xl font-bold leading-tight tracking-tight text-[#1A1A1A] sm:text-5xl">
            {t('landing.hero.title')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#475569]">
            {t('landing.hero.lead')}
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <ContactCta label={t('landing.hero.cta')} href={contactHref} />
            <p className="mt-1 max-w-5xl rounded-xl border border-[#C5A059]/35 bg-[#C5A059]/10 px-4 py-3 text-center text-sm font-semibold leading-relaxed text-[#1A1A1A] sm:whitespace-nowrap sm:text-base">
              {t('landing.hero.included')}
            </p>
          </div>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            <TimelineMock />
            <RoleMock />
            <SongsMock />
          </div>
        </section>

        <section
          aria-labelledby="landing-features"
          className="border-t border-[#C5A059]/15 bg-[#FBF9F5]"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionTitle id="landing-features" className="text-center">
              {t('landing.features.title')}
            </SectionTitle>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#C5A059]/20 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C5A059]/60 hover:shadow-lg hover:shadow-[#C5A059]/10 motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-8"
                >
                  <FeatureIcon index={item.index} />
                  <h3 className="mt-4 font-heading text-base font-semibold text-[#1A1A1A]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#475569]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-how" className="border-t border-line">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <SectionTitle id="landing-how">{t('landing.how.title')}</SectionTitle>
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

        <section aria-labelledby="landing-contact" className="bg-[#FBF9F5] px-4 py-8 sm:px-6 sm:py-12">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-[#C5A059]/20 bg-[#0B132B] px-6 py-16 text-center shadow-2xl shadow-[#0B132B]/20 sm:px-10 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C5A059]/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl"
            />
            <div className="relative">
              <div aria-hidden="true" className="mx-auto mb-5 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#C5A059]/70" />
                <span className="h-1.5 w-1.5 rotate-45 bg-[#C5A059]" />
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#C5A059]/70" />
              </div>
              <h2
                id="landing-contact"
                className="font-heading text-2xl font-bold tracking-tight text-[#FFFFFF] sm:text-4xl"
              >
                {t('landing.footer.ctaTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                {t('landing.footer.ctaBody')}
              </p>
              <ContactCta label={t('landing.hero.cta')} href={contactHref} className="mt-8" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#C5A059]/15 bg-[#FBF9F5]">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-[#C5A059]/20 bg-white/80 px-5 py-8 text-center shadow-sm sm:px-8">
            <div className="flex items-center justify-center gap-4">
              <span
                aria-hidden="true"
                className="h-px min-w-6 flex-1 bg-gradient-to-r from-transparent to-[#C5A059]/50"
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A6A2F]">
                {t('landing.footer.partners')}
              </p>
              <span
                aria-hidden="true"
                className="h-px min-w-6 flex-1 bg-gradient-to-l from-transparent to-[#C5A059]/50"
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
              <img
                src={logoMark}
                alt="DJ Mark"
                className="h-14 w-auto object-contain sm:h-16"
              />
              <img
                src={logoSzymoniak}
                alt="DJ Szymoniak"
                className="h-10 w-auto object-contain sm:h-12"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-[#C5A059]/15 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
