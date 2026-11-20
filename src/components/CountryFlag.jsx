// Minimal inline SVG flags for the public season widget (issue #1246).
// Emoji flags render as letters on Windows, so every supported country uses a
// vector mark. Unknown ISO codes fall back to a neutral code chip.

const FLAGS = {
  PL: (
    <>
      <rect width="24" height="8" fill="#F5F5F5" />
      <rect y="8" width="24" height="8" fill="#D4213D" />
    </>
  ),
  FR: (
    <>
      <rect width="8" height="16" fill="#1B3A8C" />
      <rect x="8" width="8" height="16" fill="#F5F5F5" />
      <rect x="16" width="8" height="16" fill="#D4213D" />
    </>
  ),
  BE: (
    <>
      <rect width="8" height="16" fill="#1C1C1C" />
      <rect x="8" width="8" height="16" fill="#F2C94C" />
      <rect x="16" width="8" height="16" fill="#D4213D" />
    </>
  ),
  DE: (
    <>
      <rect width="24" height="5.33" fill="#1C1C1C" />
      <rect y="5.33" width="24" height="5.34" fill="#D4213D" />
      <rect y="10.67" width="24" height="5.33" fill="#F2C94C" />
    </>
  ),
  IT: (
    <>
      <rect width="8" height="16" fill="#1F7A4D" />
      <rect x="8" width="8" height="16" fill="#F5F5F5" />
      <rect x="16" width="8" height="16" fill="#D4213D" />
    </>
  ),
  ES: (
    <>
      <rect width="24" height="16" fill="#D4213D" />
      <rect y="4" width="24" height="8" fill="#F2C94C" />
    </>
  ),
  NL: (
    <>
      <rect width="24" height="5.33" fill="#D4213D" />
      <rect y="5.33" width="24" height="5.34" fill="#F5F5F5" />
      <rect y="10.67" width="24" height="5.33" fill="#1B3A8C" />
    </>
  ),
  GB: (
    <>
      <rect width="24" height="16" fill="#1B3A8C" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#F5F5F5" strokeWidth="3" />
      <path d="M12 0v16M0 8h24" stroke="#F5F5F5" strokeWidth="5" />
      <path d="M12 0v16M0 8h24" stroke="#D4213D" strokeWidth="2" />
    </>
  ),
  CH: (
    <>
      <rect width="24" height="16" fill="#D4213D" />
      <path d="M10 3h4v3h3v4h-3v3h-4v-3H7V6h3z" fill="#F5F5F5" />
    </>
  ),
  AT: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      <rect y="5.33" width="24" height="5.34" fill="#D4213D" />
    </>
  ),
  PT: (
    <>
      <rect width="24" height="16" fill="#1F7A4D" />
      <rect x="10" width="14" height="16" fill="#D4213D" />
      <circle cx="10" cy="8" r="3.4" fill="#F2C94C" stroke="#F5F5F5" strokeWidth="1" />
    </>
  ),
  US: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      {[0, 4, 8, 12].map((y) => (
        <rect key={y} y={y} width="24" height="2" fill="#D4213D" />
      ))}
      <rect width="10" height="9" fill="#1B3A8C" />
    </>
  ),
  CA: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      <rect width="6" height="16" fill="#D4213D" />
      <rect x="18" width="6" height="16" fill="#D4213D" />
      <path d="M12 4l1.1 2.6L15.5 6l-1.4 2.2 2.4 1.3-2.6.6.6 2.6L12 11l-2.5 1.7.6-2.6-2.6-.6 2.4-1.3L8.5 6l2.4.6z" fill="#D4213D" />
    </>
  ),
  AU: (
    <>
      <rect width="24" height="16" fill="#1B3A8C" />
      <path d="M0 0l10 7M10 0L0 7" stroke="#F5F5F5" strokeWidth="1.2" />
      <circle cx="17" cy="7" r="1.2" fill="#F5F5F5" />
      <circle cx="20" cy="11" r="1.2" fill="#F5F5F5" />
      <circle cx="14" cy="12" r="1.2" fill="#F5F5F5" />
    </>
  ),
  CZ: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      <rect y="8" width="24" height="8" fill="#D4213D" />
      <path d="M0 0l10 8-10 8z" fill="#1B3A8C" />
    </>
  ),
  SK: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      <rect y="5.33" width="24" height="5.34" fill="#1B3A8C" />
      <rect y="10.67" width="24" height="5.33" fill="#D4213D" />
    </>
  ),
  UA: (
    <>
      <rect width="24" height="8" fill="#2F6FBE" />
      <rect y="8" width="24" height="8" fill="#F2C94C" />
    </>
  ),
  SE: (
    <>
      <rect width="24" height="16" fill="#2F6FBE" />
      <path d="M8 0v16M0 8h24" stroke="#F2C94C" strokeWidth="3" />
    </>
  ),
  NO: (
    <>
      <rect width="24" height="16" fill="#D4213D" />
      <path d="M7 0v16M0 8h24" stroke="#F5F5F5" strokeWidth="4" />
      <path d="M7 0v16M0 8h24" stroke="#1B3A8C" strokeWidth="2" />
    </>
  ),
  DK: (
    <>
      <rect width="24" height="16" fill="#D4213D" />
      <path d="M8 0v16M0 8h24" stroke="#F5F5F5" strokeWidth="3" />
    </>
  ),
  FI: (
    <>
      <rect width="24" height="16" fill="#F5F5F5" />
      <path d="M8 0v16M0 8h24" stroke="#2F6FBE" strokeWidth="3" />
    </>
  ),
  IE: (
    <>
      <rect width="8" height="16" fill="#1F7A4D" />
      <rect x="8" width="8" height="16" fill="#F5F5F5" />
      <rect x="16" width="8" height="16" fill="#F08A24" />
    </>
  ),
  LU: (
    <>
      <rect width="24" height="5.33" fill="#D4213D" />
      <rect y="5.33" width="24" height="5.34" fill="#F5F5F5" />
      <rect y="10.67" width="24" height="5.33" fill="#2F6FBE" />
    </>
  ),
};

export default function CountryFlag({ code, className = 'h-3 w-4' }) {
  const normalized = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const flag = FLAGS[normalized];
  if (!flag) {
    return (
      <span
        data-flag-fallback={normalized}
        className={`inline-flex min-w-4 items-center justify-center rounded-[2px] border border-[#EAE2D3] bg-[#FAF8F5] px-1 text-[8px] font-semibold text-[#78716C] ${className}`}
      >
        {normalized || '—'}
      </span>
    );
  }
  return (
    <svg
      data-country-flag={normalized}
      aria-hidden="true"
      viewBox="0 0 24 16"
      className={`${className} shrink-0 overflow-hidden rounded-[2px] shadow-xs`}
    >
      {flag}
    </svg>
  );
}
