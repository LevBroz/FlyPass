import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Carga datos al enfocar la pantalla. Si pollMs está definido, consulta
 * periódicamente solo mientras la pantalla está enfocada y la app activa.
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[] = [], pollMs?: number | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      void run();
      if (!pollMs) return;
      let appActive = AppState.currentState === 'active';
      const sub = AppState.addEventListener('change', (s) => {
        appActive = s === 'active';
        if (appActive) void run();
      });
      const t = setInterval(() => appActive && void run(), pollMs);
      return () => {
        clearInterval(t);
        sub.remove();
      };
    }, [run, pollMs, ...deps]),
  );

  return { data, error, loading, refreshing, refresh, reload: run };
}
