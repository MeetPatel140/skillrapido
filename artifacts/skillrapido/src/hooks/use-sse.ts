import { useEffect, useRef } from "react";

type SseMessage = { type: string; [key: string]: unknown };

export function useSSE(
  userId: number | null,
  role: string | null,
  onMessage: (msg: SseMessage) => void,
  enabled = true
) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!userId || !role || !enabled) return;

    function connect() {
      const apiBase = (import.meta.env.VITE_API_URL ?? "");
      const url = `${apiBase}/api/sse?userId=${userId}&role=${role}`;
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as SseMessage;
          handlerRef.current(msg);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        reconnectRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [userId, role, enabled]);

  return esRef;
}
