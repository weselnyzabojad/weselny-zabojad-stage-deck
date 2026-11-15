// Revision-scoped acknowledgement keys for mandatory safety updates (#1042).
export function ackKey(weddingId, role, updatedAt) {
  return `wzsd:mandatory-ack:${weddingId}:${role}:${updatedAt}`;
}

export function isUpdateAcknowledged(storage, { weddingId, role, updatedAt }) {
  if (!storage || !weddingId || !role || !updatedAt) return false;
  try {
    return storage.getItem(ackKey(weddingId, role, updatedAt)) === updatedAt;
  } catch {
    return false;
  }
}

export function acknowledgeUpdate(storage, { weddingId, role, updatedAt }) {
  if (!storage || !weddingId || !role || !updatedAt) return false;
  try {
    storage.setItem(ackKey(weddingId, role, updatedAt), updatedAt);
    return true;
  } catch {
    return false;
  }
}
