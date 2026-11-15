// Distinguish revoked/expired sessions from ordinary network/offline errors.
export function isSyncAuthError(error) {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  if (error.code === 'PGRST301' || error.code === '401' || error.code === '403') return true;
  return /jwt|session (?:revoked|expired)|not authorized|permission denied/i.test(
    String(error.message ?? ''),
  );
}
