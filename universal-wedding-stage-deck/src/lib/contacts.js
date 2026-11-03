// Structured vendor contacts for the MC directory (project.md TODO 10).
//
// `contacts[]` carries role/name/phone/email/notes plus an optional `leavesAt`
// clock. A departure is linked to the matching `hardAnchors[]` entry by time so
// the directory can jump to the protected departure anchor.

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizePhoneHref(phone) {
  if (typeof phone !== 'string') return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Keep a leading + and digits only; drop spaces, dashes, dots and brackets.
  const digits = trimmed.replace(/[^\d+]/g, '');
  const normalized = digits.startsWith('+')
    ? `+${digits.slice(1).replace(/\+/g, '')}`
    : digits.replace(/\+/g, '');

  return /\d{5,}/.test(normalized.replace(/\D/g, '')) ? `tel:${normalized}` : null;
}

export function normalizeEmailHref(email) {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
}

export function contactAnchorElementId(anchor) {
  return anchor?.id ? `anchor-${anchor.id}` : null;
}

export function resolveContacts(wedding) {
  const contacts = Array.isArray(wedding?.contacts) ? wedding.contacts : [];
  const anchors = Array.isArray(wedding?.hardAnchors) ? wedding.hardAnchors : [];

  return contacts
    .filter((contact) => contact && typeof contact === 'object' && text(contact.name))
    .map((contact, index) => {
      const id = text(contact.id) ?? `contact_${index + 1}`;
      const leavesAt = text(contact.leavesAt);
      const validLeavesAt = leavesAt && CLOCK_PATTERN.test(leavesAt) ? leavesAt : null;

      const anchor = validLeavesAt
        ? anchors.find((candidate) => candidate && candidate.time === validLeavesAt) ?? null
        : null;

      return {
        id,
        role: text(contact.role) ?? 'Vendor',
        name: text(contact.name),
        phone: text(contact.phone),
        phoneHref: normalizePhoneHref(contact.phone),
        email: text(contact.email),
        emailHref: normalizeEmailHref(contact.email),
        notes: text(contact.notes),
        leavesAt: validLeavesAt,
        anchor: anchor
          ? {
              // Same fallback order as the Hard Anchor Radar row ids.
              id: text(anchor.id) ?? text(anchor.label) ?? anchor.time,
              label: text(anchor.label) ?? 'Hard anchor',
              time: anchor.time,
            }
          : null,
        missingAnchor: Boolean(validLeavesAt && !anchor),
      };
    });
}
