import { useEffect, useRef, useCallback } from "react";

type WsMessage = { type: string; [key: string]: unknown };

export function useWebSocket(
  userId: number | null,
  role: string | null,
  onMessage: (msg: WsMessage) => void,
  enabled = true
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    if (!userId || !role || !enabled) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const url = `${proto}://${host}/ws?userId=${userId}&role=${role}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        handlerRef.current(msg);
      } catch {}
    };

    ws.onclose = () => {
      if (enabled) {
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => ws.close();
  }, [userId, role, enabled]);

  useEffect(() => {
    connect();
    return () => {
      enabled && (wsRef.current?.close());
      reconnectRef.current && clearTimeout(reconnectRef.current);
    };
  }, [connect, enabled]);

  return wsRef;
}
