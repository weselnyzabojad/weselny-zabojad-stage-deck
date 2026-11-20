import LanguageToggle from './LanguageToggle';
import { useI18n } from '../i18n/useI18n.js';
import logo from '../assets/img/logo.png';

// Shared public header (issue #1297).
//
// The landing and the under-construction page must show the same logo,
// editorial eyebrow and EN/FR/PL selector. Keep this markup identical to the
// former inline landing header so the landing has no visual regression.
export default function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="border-b border-[#C5A059]/15 bg-white/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Weselny Żabojad" className="h-14 w-auto object-contain sm:h-16" />
          <div className="min-w-0">
            <p className="font-heading text-lg font-bold leading-none text-[#1A1A1A]">
              Stage Deck
            </p>
            <p className="mt-1 break-words font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-[#8A6A2F]">
              {t('landing.hero.eyebrow')}
            </p>
          </div>
        </div>
        <LanguageToggle variant="desktop" />
      </div>
    </header>
  );
}
