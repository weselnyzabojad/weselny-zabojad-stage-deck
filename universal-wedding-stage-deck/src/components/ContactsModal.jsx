import { contactAnchorElementId } from '../lib/contacts.js';
import ModalShell from './ModalShell';

function ContactCard({ contact, onOpenAnchor }) {
  const anchorElementId = contactAnchorElementId(contact.anchor);

  return (
    <article className="rounded-xl border border-[#1c2a52] bg-[#070b19]/70 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-widest text-[#849dff]">
            {contact.role}
          </div>
          <h3 className="mt-0.5 font-heading text-base font-bold text-white">
            {contact.name}
          </h3>
        </div>
        {contact.leavesAt ? (
          <span className="shrink-0 rounded border border-[#2b3d73] bg-[#111d3b] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
            🕒 {contact.leavesAt}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {contact.phoneHref ? (
          <a
            href={contact.phoneHref}
            title={`Call ${contact.name}`}
            className="inline-flex items-center gap-1 rounded border border-[#3b5bdb]/60 bg-[#002395]/30 px-2 py-1 font-semibold text-[#b8c6ff] transition hover:bg-[#002395]/60"
          >
            📞 {contact.phone}
          </a>
        ) : contact.phone ? (
          <span className="inline-flex items-center gap-1 rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-1 text-slate-400">
            📞 {contact.phone}
          </span>
        ) : null}

        {contact.emailHref ? (
          <a
            href={contact.emailHref}
            title={`Email ${contact.name}`}
            className="inline-flex items-center gap-1 rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-1 font-semibold text-slate-200 transition hover:bg-[#1c2a52]"
          >
            ✉️ {contact.email}
          </a>
        ) : contact.email ? (
          <span className="inline-flex items-center gap-1 rounded border border-[#2b3d73] bg-[#111d3b] px-2 py-1 text-slate-400">
            ✉️ {contact.email}
          </span>
        ) : null}

        {!contact.phone && !contact.email ? (
          <span className="text-slate-500">No phone or email stored.</span>
        ) : null}
      </div>

      {contact.leavesAt ? (
        contact.anchor && anchorElementId ? (
          <button
            type="button"
            onClick={() => onOpenAnchor(anchorElementId)}
            title="Jump to this departure in the Hard Anchor Radar"
            className="mt-2 inline-flex items-center gap-1 rounded border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-left text-[10px] font-semibold text-amber-200 transition hover:bg-amber-900/50"
          >
            📌 Leaves at {contact.leavesAt} — {contact.anchor.label} · show anchor
          </button>
        ) : (
          <p className="mt-2 text-[10px] text-amber-200">
            Leaves at {contact.leavesAt} — no matching hard anchor. Add one to protect this departure.
          </p>
        )
      ) : null}

      {contact.notes ? (
        <p className="mt-2 text-[11px] leading-snug text-slate-400">{contact.notes}</p>
      ) : null}
    </article>
  );
}

// Vendor contact directory behind the 📇 Contacts header button.
export default function ContactsModal({ open, onClose, contacts = [], onOpenAnchor }) {
  return (
    <ModalShell open={open} onClose={onClose} labelledBy="contacts-title" size="panel">
      <header className="border-b border-[#1c2a52] bg-[#0b132b] px-5 py-4 pr-16">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#849dff]">
          Vendor directory · this device
        </div>
        <h2 id="contacts-title" className="mt-1 font-heading text-xl font-bold text-white">
          📇 Contacts
        </h2>
        <p className="text-xs text-slate-400">
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} · tap a phone or
          email to open it. Departures link to their hard anchor.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {contacts.length === 0 ? (
          <p className="rounded-lg border border-[#1c2a52] bg-[#070b19] p-3 text-sm text-slate-400">
            No contacts in this cartridge. Add them under{' '}
            <span className="font-mono text-slate-300">contacts[]</span>.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} onOpenAnchor={onOpenAnchor} />
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#1c2a52] bg-[#0b132b] px-4 py-3">
        <span className="font-mono text-[10px] text-slate-500">
          Phone and email are vendor details; keep the device with the MC.
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#2b3d73] bg-[#111d3b] px-4 py-2 font-heading text-xs font-bold text-slate-200 transition hover:bg-[#1c2a52]"
        >
          Close
        </button>
      </footer>
    </ModalShell>
  );
}
