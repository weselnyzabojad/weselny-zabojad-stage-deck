import { useState } from 'react';
import ModalShell from './ModalShell';
import QrCodeImage from './QrCodeImage';
import { roleLabel } from '../lib/roles.js';
import { buildOpenOnPhoneUrl, canOpenOnPhone } from '../lib/openOnPhone.js';
import { useI18n } from '../i18n/useI18n.js';

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function roleTitle(role, tier, t) {
  if (role === 'dj') {
    return String(tier).toUpperCase() === 'VIP'
      ? t('openOnPhone.djVip')
      : t('openOnPhone.djStandard');
  }
  return roleLabel(role);
}

export function OpenOnPhoneDialog({ open, onClose, role, tier = null, roomCode = null }) {
  const { t } = useI18n();
  const url = buildOpenOnPhoneUrl({
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    baseUrl: import.meta.env.BASE_URL,
    roomCode,
    role,
  });
  const title = roleTitle(role, tier, t);

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="open-on-phone-title" size="panel">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
        <div className="font-heading text-[10px] font-semibold uppercase tracking-widest text-brand-soft">
          {t('openOnPhone.pocketView')}
        </div>
        <h2 id="open-on-phone-title" className="mt-1 font-heading text-xl font-bold text-ink">
          {t('openOnPhone.title', { role: title })}
        </h2>
        <p className="mt-1 text-xs text-muted">{t('openOnPhone.description')}</p>

        <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3">
          <QrCodeImage
            text={url}
            size={260}
            label={t('openOnPhone.qrLabel', { role: title })}
          />
        </div>

        <p className="mt-4 break-all rounded border border-line bg-page/70 px-2 py-1.5 font-mono text-[10px] text-muted">
          {url}
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-strong bg-brand px-4 py-2 text-xs font-bold text-on-accent transition hover:bg-brand-hover"
          >
            {t('openOnPhone.close')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function OpenOnPhoneButton({
  role = 'mc',
  tier = null,
  roomCode = null,
  compact = false,
  className = '',
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!canOpenOnPhone({ role, tier, compact })) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-line ${className}`}
        title={t('openOnPhone.buttonTitle')}
      >
        <PhoneIcon />
        <span>{t('openOnPhone.button')}</span>
      </button>
      <OpenOnPhoneDialog
        open={open}
        onClose={() => setOpen(false)}
        role={role}
        tier={tier}
        roomCode={roomCode}
      />
    </>
  );
}
