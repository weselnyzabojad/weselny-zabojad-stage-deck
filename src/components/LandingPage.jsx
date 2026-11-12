// Public landing shell (issue #805). Copy, visuals, i18n and release metadata
// are delivered by the follow-up landing tasks; this component only provides
// the public entry and a safe link into the private crew surface.
import logo from '../assets/img/logo.png';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12 text-ink">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-card p-8 text-center shadow-2xl">
        <img
          src={logo}
          alt="Weselny Żabojad"
          className="mx-auto h-20 w-auto object-contain"
        />
        <h1 className="mt-6 font-heading text-3xl font-bold text-ink">
          Universal Wedding Stage Deck
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One shared timeline for the MC, DJ, photo and video crew, speaker and
          venue manager. Offline-first, live-synced, built for the wedding day.
        </p>
        <a
          href="/join"
          className="mt-6 inline-flex rounded-lg border border-brand-strong bg-brand px-5 py-2.5 text-sm font-bold text-on-accent transition hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
        >
          Crew sign in
        </a>
      </section>
    </main>
  );
}
