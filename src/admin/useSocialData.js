import { useCallback, useEffect, useRef, useState } from 'react';
import { getRecapSource, listVipDjs } from './adminApi';
import { normalizeSocialData } from './socialData.js';

// Issue #1338: one fetch per Social Studio open. Story tab switches never
// re-run this hook because the dependency is only the open state and row id.
export function useSocialData({ row = null, active = false } = {}) {
  const weddingId = row?.wedding_id ?? row?.weddingId ?? null;
  const rowRef = useRef(row);
  // eslint-disable-next-line react/refs -- latest row is read only inside the fetch effect
  rowRef.current = row;
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: '',
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!active || !weddingId) {
      // eslint-disable-next-line react/set-state-in-effect -- closing the studio clears its fetched data
      setState({ data: null, loading: false, error: '' });
      return undefined;
    }
    let alive = true;
    // eslint-disable-next-line react/set-state-in-effect -- fetch starts with the loading flag before the network request
    setState((current) => ({ ...current, loading: true, error: '' }));
    Promise.all([getRecapSource(weddingId), listVipDjs()])
      .then(([source, vip]) => {
        if (!alive) return;
        setState({
          data: normalizeSocialData({
            row: rowRef.current,
            source,
            vipDjs: vip?.vipDjs ?? vip?.vipDJs ?? vip?.data ?? [],
          }),
          loading: false,
          error: '',
        });
      })
      .catch((err) => {
        if (!alive) return;
        setState({
          data: null,
          loading: false,
          error: err?.message ?? 'Could not load the wedding social data.',
        });
      });
    return () => {
      alive = false;
    };
  }, [active, weddingId, attempt]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    retry,
  };
}
