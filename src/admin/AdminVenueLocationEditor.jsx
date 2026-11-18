import { useState } from 'react';
import { updateWeddingVenue } from './adminApi';
import { ADMIN_BUTTON } from './adminUi';
import { normalizeCountry, resolveVenueCountry } from '../../supabase/functions/_shared/venueLocation.js';

const ADMIN_DEMO = import.meta.env.DEV && import.meta.env.VITE_ADMIN_DEMO === '1';

const COUNTRY_OPTIONS = [
  'PL',
  'FR',
  'BE',
  'DE',
  'NL',
  'LU',
  'CH',
  'AT',
  'CZ',
  'SK',
  'LT',
  'LV',
  'EE',
  'UA',
  'GB',
  'IE',
  'IT',
  'ES',
  'PT',
  'SE',
  'NO',
  'DK',
  'FI',
  'US',
  'CA',
  'AU',
];

function initialValues(wedding) {
  return {
    name: wedding?.venue_name ?? wedding?.venue ?? '',
    address: wedding?.venue_address ?? '',
    city: wedding?.venue_city ?? '',
    country: wedding?.venue_country ?? '',
  };
}

export default function AdminVenueLocationEditor({
  wedding,
  readOnly = false,
  onSaved = () => {},
}) {
  const [values, setValues] = useState(() => initialValues(wedding));
  const [countryTouched, setCountryTouched] = useState(Boolean(wedding?.venue_country));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const suggestion = resolveVenueCountry({
    city: values.city,
    address: values.address,
  });
  const countryValue = countryTouched ? values.country : values.country || suggestion || '';
  const disabled = readOnly || ADMIN_DEMO || busy;
  const countryOptions = [...new Set([countryValue, suggestion, ...COUNTRY_OPTIONS].filter(Boolean))];

  const update = (field) => (event) => {
    setSaved('');
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const reset = () => {
    setValues(initialValues(wedding));
    setCountryTouched(Boolean(wedding?.venue_country));
    setError('');
    setSaved('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (disabled) return;
    const normalized = normalizeCountry(countryValue);
    if (countryValue && !normalized) {
      setError('Use a two-letter ISO country code, for example PL, FR or BE.');
      return;
    }
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const result = await updateWeddingVenue({
        weddingId: wedding?.wedding_id,
        venueName: values.name,
        venueAddress: values.address,
        venueCity: values.city,
        venueCountry: normalized ?? '',
      });
      const venue = result?.venue ?? {};
      setValues({
        name: venue.name ?? values.name,
        address: venue.address ?? values.address,
        city: venue.city ?? values.city,
        country: venue.country ?? normalized ?? '',
      });
      setCountryTouched(true);
      setSaved('Venue location saved.');
      await onSaved();
    } catch (err) {
      setError(err.message ?? 'Could not save the venue location.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`venue-location-${wedding?.wedding_id ?? 'wedding'}`}
      className="mt-3 rounded-lg border border-line bg-page/50 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4
            id={`venue-location-${wedding?.wedding_id ?? 'wedding'}`}
            className="font-heading text-[11px] font-bold uppercase tracking-widest text-ink"
          >
            Venue location
          </h4>
          <p className="mt-1 text-[10px] text-muted">
            City and country may appear publicly in the season banner as the next wedding.
            Address and venue name stay admin-only.
          </p>
        </div>
        {readOnly ? (
          <span className="rounded border border-line bg-raised px-2 py-1 text-[9px] font-semibold text-muted">
            Editing is disabled while the admin is read-only or the wedding is archived.
          </span>
        ) : null}
        {ADMIN_DEMO ? (
          <span className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-[9px] font-semibold text-amber-200">
            Demo preview: venue edits are disabled.
          </span>
        ) : null}
      </div>

      <form onSubmit={save} className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Venue name
          <input
            value={values.name}
            onChange={update('name')}
            disabled={disabled}
            maxLength={160}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Address
          <input
            value={values.address}
            onChange={update('address')}
            disabled={disabled}
            maxLength={240}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          City
          <input
            value={values.city}
            onChange={update('city')}
            disabled={disabled}
            maxLength={120}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          Country
          <select
            value={countryValue}
            onChange={(event) => {
              setCountryTouched(true);
              setSaved('');
              setValues((current) => ({ ...current, country: event.target.value }));
            }}
            disabled={disabled}
            className="mt-1 w-full rounded border border-line bg-card px-2.5 py-2 text-xs text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-strong disabled:opacity-60"
          >
            <option value="">Not set</option>
            {countryOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[9px] font-normal normal-case tracking-normal text-muted">
            {suggestion
              ? `Suggested from city/address: ${suggestion}. You can change it.`
              : 'No deterministic suggestion; leave blank if unknown.'}
          </span>
        </label>

        <div className="sm:col-span-2">
          {error ? (
            <p role="alert" className="rounded border border-alert/60 bg-alert/15 px-2.5 py-2 text-[11px] text-alert-soft">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="rounded border border-emerald-800 bg-emerald-950/30 px-2.5 py-2 text-[11px] text-emerald-200">
              {saved}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={disabled}
              className={ADMIN_BUTTON.primary}
            >
              {busy ? 'Saving…' : 'Save venue'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={disabled}
              className={ADMIN_BUTTON.secondary}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
