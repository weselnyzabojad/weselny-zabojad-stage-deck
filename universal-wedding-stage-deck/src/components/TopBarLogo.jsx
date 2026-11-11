import logo from '../assets/img/logo.png';

// Shared desktop top-bar logo frame. A soft white surface keeps the mark
// readable while dropping the heavy black frame from the previous palette.
export default function TopBarLogo({ className = '', imgClassName = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-white/50 bg-white/90 px-3 py-1.5 shadow-sm ${className}`}
    >
      <img
        src={logo}
        alt="Weselny Żabojad"
        className={`h-12 w-auto object-contain ${imgClassName}`}
      />
    </div>
  );
}
