import { useEffect, useState } from 'react';
import { fetchSeasonStats } from '../lib/seasonStats.js';

// Owner-admin season aggregates for the Social Export Studio (issue #1258).
// The public RPC already returns aggregated, season-scoped data.
export function useSeasonStats({ active = false, seasonYear = null, month = null } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    // eslint-disable-next-line react/set-state-in-effect -- fetch starts with the loading flag before the network request
    setLoading(true);
    setError('');
    fetchSeasonStats({ seasonYear, month })
      .then((next) => {
        if (alive) setData(next);
      })
      .catch((err) => {
        if (alive) setError(err?.message ?? 'Could not load the season.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [active, seasonYear, month]);

  return { data, loading, error };
}
