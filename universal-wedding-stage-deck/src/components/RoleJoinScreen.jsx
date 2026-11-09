import { useEffect, useRef, useState } from 'react';
import logo from '../assets/img/logo.png';
import { ROLES, roleShort } from '../lib/roles';
import { joinRoom } from '../lib/sync/joinRoom';
import { useI18n } from '../i18n/useI18n';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';

const JOIN_ROLES = ['mc', 'dj', 'photo', 'speaker'];

// Production `/deck/` gate: per-role PIN validated server-side by the
// `join_room` Edge Function. No couple names or cartridge data are rendered
// before the server returns a role token.
export default function RoleJoinScreen({ intent, onJoined, theme = 'night', onToggleTheme }) {
  const { t } = useI18n();
  const [roomCode, setRoomCode] = useState(intent?.roomCode ?? '');
  const [role, setRole] = useState(
    intent?.role && JOIN_ROLES.includes(intent.role) ? intent.role : 'mc',
  );
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const roomRef = useRef(null);
  const pinRef = useRef(null);

  useEffect(() => {
    if (intent?.roomCode && intent?.role) pinRef.current?.focus();
    else roomRef.current?.focus();
  }, [intent?.roomCode, intent?.role]);

  const submit = async (event) => {
    event?.preventDefault();
    if (busy) return;

    const cleanRoom = roomCode.trim();
    if (!cleanRoom) {
      setError({ key: 'join.errors.roomRequired' });
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError({ key: 'join.errors.pinRequired' });
      return;
    }

    setBusy(true);
    setError(null);
    const result = await joinRoom({ roomCode: cleanRoom, role, pin });
    setBusy(false);

    if (!result.ok) {
      const key = result.code ? `join.errors.${result.code}` : null;
      const translated = key ? t(key) : null;
      setError(translated && translated !== key ? { key } : { text: result.error });
      setPin('');
      return;
    }

    onJoined(result.session);
  };

  const errorText = error?.key ? t(error.key) : error?.text ?? '';

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-page px-4 py-8 font-body text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(0,35,149,0.45),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(237,41,57,0.18),transparent_50%)]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
      </div>

      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-line bg-card p-7 shadow-2xl sm:p-9"
      >
        <div className="mb-6 flex items-center justify-center rounded-xl bg-white px-4 py-3 shadow-md">
          <img src={logo} alt="Weselny Żabojad" className="h-16 w-auto max-w-[220px] object-contain" />
        </div>

        <div className="text-center">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-soft">
            {t('join.production')}
          </span>
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink">{t('join.title')}</h1>
          <p className="mt-1 font-mono text-xs text-muted">{t('join.subtitle')}</p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="join-room-code"
            className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
          >
            {t('join.roomCode')}
          </label>
          <input
            ref={roomRef}
            id="join-room-code"
            value={roomCode}
            onChange={(event) => {
              setRoomCode(event.target.value.replace(/\s/g, ''));
              setError(null);
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={t('join.roomPlaceholder')}
            className="mt-1.5 w-full rounded-lg border border-line bg-page px-3 py-2.5 font-mono text-sm text-ink outline-none transition focus:border-brand-strong"
          />
        </div>

        <div className="mt-4">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted">
            {t('join.role')}
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('join.deviceRole')}>
            {JOIN_ROLES.map((id) => {
              const meta = ROLES[id];
              const active = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setRole(id);
                    setPin('');
                    setError(null);
                  }}
                  className={`rounded-lg border px-2 py-2.5 text-center transition ${
                    active
                      ? 'border-brand-strong bg-brand/40 text-ink'
                      : 'border-line bg-raised text-ink hover:border-line-strong'
                  }`}
                >
                  <span aria-hidden="true" className="block text-lg leading-none">
                    {meta.icon}
                  </span>
                  <span className="mt-1 block font-heading text-[10px] font-bold uppercase tracking-wide">
                    {roleShort(id)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="join-role-pin"
            className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted"
          >
            {t('join.pin', { role: roleShort(role) })}
          </label>
          <div className="relative">
            <input
              ref={pinRef}
              id="join-role-pin"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              onKeyDown={(event) => setCapsLock(event.getModifierState?.('CapsLock') ?? false)}
              onKeyUp={(event) => setCapsLock(event.getModifierState?.('CapsLock') ?? false)}
              onBlur={() => setCapsLock(false)}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('join.pinPlaceholder')}
              aria-invalid={Boolean(error)}
              className="w-full rounded-lg border border-line bg-page px-3 py-3 pr-16 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none transition focus:border-brand-strong"
            />
            <button
              type="button"
              onClick={() => setShowPin((value) => !value)}
              aria-pressed={showPin}
              className="absolute right-2 top-1/2 min-h-11 -translate-y-1/2 rounded border border-line px-2 py-1 text-[10px] font-semibold text-ink"
            >
              {showPin ? t('join.hidePin') : t('join.showPin')}
            </button>
          </div>
          {capsLock ? (
            <p role="status" className="mt-1 text-center font-mono text-[10px] text-amber-300">
              {t('join.capsLock')}
            </p>
          ) : null}
          {intent?.roomCode ? (
            <p className="mt-1 text-center text-[10px] text-muted">{t('join.qrHint')}</p>
          ) : null}
        </div>

        <div className="mt-2 min-h-[1.25rem] text-center" aria-live="polite">
          {errorText ? <span className="text-xs font-mono text-alert-soft">{errorText}</span> : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-brand-strong bg-brand py-3.5 font-heading text-sm font-bold text-on-accent shadow-lg shadow-blue-950/60 transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? t('join.checking') : t('join.submit')}
        </button>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
          {t('join.footnote')}
        </p>
      </form>
    </div>
  );
}
