import { useCallback, useState } from 'react';
import { loadRole, normalizeRole, saveRole } from '../lib/roles';

// Persisted, per-device role selection.
export function useRole() {
  const [role, setRoleState] = useState(() => loadRole());

  const setRole = useCallback((next) => {
    const normalized = normalizeRole(next);
    saveRole(normalized);
    setRoleState(normalized);
  }, []);

  return { role, setRole };
}
