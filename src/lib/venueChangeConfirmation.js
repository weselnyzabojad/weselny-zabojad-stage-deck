// Pure decision for Venue Manager mandatory edits. Empty old values are
// applied immediately; populated values that actually change need confirmation.
export function venueChangeDecision(oldValue, newValue) {
  const oldText = oldValue == null ? '' : String(oldValue).trim();
  const newText = newValue == null ? '' : String(newValue).trim();
  if (oldText === newText) return 'noop';
  if (!oldText) return 'apply';
  return 'confirm';
}
