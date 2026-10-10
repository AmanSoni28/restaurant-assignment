import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';

/**
 * Loads data with the given async function and tracks loading/error state.
 * `deps` works like useEffect dependencies.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        setData(await load());
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
