import logo from '../assets/img/logo.png';

// Shared top-bar logo frame. The white surface with a black frame is part of the
// header control palette, so every role renders the same mark.
export default function TopBarLogo({ className = '', imgClassName = '' }) {
  return (
    <div className={`flex items-center justify-center rounded-lg border-2 border-black bg-white px-2 py-1 ${className}`}>
      <img
        src={logo}
        alt="Weselny Żabojad"
        className={`h-12 w-auto object-contain ${imgClassName}`}
      />
    </div>
  );
}
