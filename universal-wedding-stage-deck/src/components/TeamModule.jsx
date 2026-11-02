import ModalShell from './ModalShell';

const PLATFORM_LABELS = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  FACEBOOK: 'Facebook',
  OTHER: 'Other',
};

function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-[#2b3d73] bg-[#111d3b] text-slate-300',
    blue: 'border-[#3b5bdb]/60 bg-[#002395]/30 text-[#b8c6ff]',
    amber: 'border-amber-700/70 bg-amber-950/50 text-amber-200',
    emerald: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
  };
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] ${tones[tone] ?? tones.slate}`}>
      {children}
    </span>
  );
}

export default function TeamModule({ open, onClose, coHosts = [], contentCreators = [] }) {
  const total = coHosts.length + contentCreators.length;

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="team-module-title" size="panel">
      <header className="border-b border-[#1c2a52] bg-[#0b132b] px-5 py-3 pr-16">
        <h2 id="team-module-title" className="font-heading text-lg font-bold text-white">
          🤝 Co-Hosting & Content Creator
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {total === 0
            ? 'No co-hosts or content creators in this cartridge.'
            : `${coHosts.length} co-host${coHosts.length === 1 ? '' : 's'} · ${contentCreators.length} content creator${
                contentCreators.length === 1 ? '' : 's'
              }`}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section>
          <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
            Co-Hosts
          </h3>
          {coHosts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No co-hosts configured.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {coHosts.map((host) => (
                <article
                  key={host.id}
                  className="rounded-lg border border-[#1c2a52] bg-[#070b19]/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-heading text-sm font-semibold text-white">
                        {host.name}
                      </div>
                      <div className="text-[11px] text-[#849dff]">{host.role ?? 'Co-host'}</div>
                    </div>
                    {host.phone ? (
                      <a
                        href={`tel:${host.phone}`}
                        className="font-mono text-[10px] text-slate-400 hover:text-white"
                      >
                        {host.phone}
                      </a>
                    ) : null}
                  </div>

                  {host.responsibilities?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {host.responsibilities.map((item) => (
                        <Chip key={item} tone="blue">
                          {item}
                        </Chip>
                      ))}
                    </div>
                  ) : null}

                  {host.notes ? (
                    <p className="mt-2 text-[11px] leading-snug text-slate-400">{host.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-white">
            Content Creators
          </h3>
          {contentCreators.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No content creators configured.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {contentCreators.map((creator) => (
                <article
                  key={creator.id}
                  className="rounded-lg border border-[#1c2a52] bg-[#070b19]/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-heading text-sm font-semibold text-white">
                        {creator.name}
                      </div>
                      <div className="text-[11px] text-[#849dff]">
                        {PLATFORM_LABELS[creator.platform] ?? creator.platform ?? 'Content creator'}
                        {creator.handle ? (
                          <span className="ml-1 font-mono text-slate-400">{creator.handle}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-400">
                      {creator.arrivalTime || creator.departureTime ? (
                        <div>
                          {creator.arrivalTime ?? '—'}–{creator.departureTime ?? '—'}
                        </div>
                      ) : null}
                      {creator.phone ? <div>{creator.phone}</div> : null}
                    </div>
                  </div>

                  {creator.deliverables?.length ? (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        Deliverables
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {creator.deliverables.map((item) => (
                          <Chip key={item} tone="emerald">
                            {item}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {creator.boundaries?.length ? (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-wider text-amber-300/80">
                        Boundaries
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {creator.boundaries.map((item) => (
                          <li key={item} className="text-[11px] leading-snug text-amber-100/80">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {creator.notes ? (
                    <p className="mt-2 text-[11px] leading-snug text-slate-400">{creator.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}
