import { useLocation } from 'react-router-dom';

/**
 * QR code displayed in the top bar when the view is on a laptop/desktop width.
 * Scanning the QR opens the same view on the phone (the deck URL with a phone-
 *–optimized query parameter).
 */
export default function PhoneQRCode() {
  const { pathname } = useLocation();
  const isLaptop = window.innerWidth >= 1024;

  if (!isLaptop) return null;

  // Build the phone URL by replacing the current hostname with a phone-friendly
  // path, or just use the same base with a phone parameter.
  const phoneUrl = `${window.location.origin}/?phone=true`;

  return (
    <div
      className="hidden lg:block absolute top-2 right-2 bg-card border border-line rounded-lg p-2 shadow-md z-10"
      aria-label="Open this view on your phone"
    >
      <a
        href={phoneUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:opacity-90 transition-opacity"
      >
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="shrink-0"
        >
          <path d="M17 2l2.93 11.05c-.03-.21-.09-.43-.17-.64L19 7.07 17 2zM3 14.05l2.96 11.03c-.1.26-.17.53-.17.81v1h8v-1c0-.28-.17-.55-.17-.83l-3.04-1.98c-.06-.15-.08-.31-.08-.48v-1h-1v1c0 .55.45 1 1 1h4v-2c0-.66.54-1 1-1h3c.55 0 1 .45 1 1v2h-1v-1c0-.55-.45-1-1-1h-4v2zM5 14.05c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v2h-6v-2zM3 19c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-2H5v2zM3 20c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-2h-6v-1c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v1h-6z" />
        </svg>
        <span className="text-sm font-medium text-white">Open on phone</span>
      </a>
    </div>
  );
}