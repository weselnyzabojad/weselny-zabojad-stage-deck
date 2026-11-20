import { Sparkles } from 'lucide-react';
import PublicHeader from './PublicHeader';
import { useI18n } from '../i18n/useI18n.js';
import { getMainSiteUrl } from '../lib/mainSite.js';

// Reusable public placeholder (issue #1297).
//
// Any route that is temporarily unavailable can render this page. The optional
// title/subtitle keys let a route explain its own context while the global
// underConstruction.* copy remains the default.
export default function ComingSoonPage({
  titleKey = 'underConstruction.title',
  subtitleKey = 'underConstruction.subtitle',
}) {
  const { t, locale } = useI18n();

  return (
    <div
      data-theme="day"
      className="flex min-h-screen flex-col bg-[#FBF9F5] font-heading text-[#1A1A1A]"
    >
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-[#C5A059]/25 bg-white p-8 text-center shadow-lg shadow-[#C5A059]/10 sm:p-12">
          <span
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F7F2E7] text-[#C5A059]"
          >
            <Sparkles className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
            {t(titleKey)}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#475569] sm:text-base">
            {t(subtitleKey)}
          </p>
          <a
            href={getMainSiteUrl(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#D4AF37]/60 bg-[#C5A059] px-5 py-3.5 text-center text-sm font-bold text-[#1A1A1A] shadow-lg shadow-[#C5A059]/20 transition-all duration-300 hover:bg-[#D4AF37] hover:shadow-xl hover:shadow-[#C5A059]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A6A2F] active:translate-y-0 active:shadow-lg motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none sm:w-auto sm:px-7"
          >
            {t('underConstruction.cta')}
          </a>
        </section>
      </main>
    </div>
  );
}
