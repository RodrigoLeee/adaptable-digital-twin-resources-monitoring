import { useEffect, useRef } from 'react';
import { useRecommendationStore } from '../store/recommendationStore';

export function useSSE(url: string) {
  const setCurrent = useRecommendationStore((s) => s.setCurrent);
  const setConnected = useRecommendationStore((s) => s.setConnected);
  const setClientProfile = useRecommendationStore((s) => s.setClientProfile);
  const reconnectMs = Number(import.meta.env.VITE_SSE_RECONNECT_MS ?? 3000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (active) setConnected(true);
      };

      es.onmessage = (e) => {
        if (!active) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'recommendation' && data.payload) {
            setCurrent(data.payload);
          }
          if (data.type === 'client_profile' && data.payload) {
            setClientProfile(data.payload);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        if (!active) return;
        setConnected(false);
        es.close();
        timerRef.current = setTimeout(connect, reconnectMs);
      };
    }

    connect();

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (esRef.current) esRef.current.close();
      setConnected(false);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
}
