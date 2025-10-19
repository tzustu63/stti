import { useState, useEffect, useCallback } from "react";

export const useWebSocket = () => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    // 在開發環境中，直接連接到本地伺服器
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = isDevelopment
      ? "3000"
      : window.location.port || (protocol === "wss:" ? "443" : "3000");
    const wsUrl = `${protocol}//${host}:${port}`;

    console.log("嘗試連接到 WebSocket:", wsUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("WebSocket 連線已建立");
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    websocket.onclose = (event) => {
      console.log("WebSocket 連線已關閉:", event.code, event.reason);
      setIsConnected(false);

      // 如果不是正常關閉，嘗試重連
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.pow(2, reconnectAttempts) * 1000; // 指數退避
        console.log(
          `將在 ${delay}ms 後嘗試重連 (第 ${reconnectAttempts + 1} 次)`
        );
        setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectWebSocket();
        }, delay);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket 錯誤:", error);
      setIsConnected(false);
    };

    setWs(websocket);
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close(1000, "組件卸載");
      }
    };
  }, []);

  const sendMessage = useCallback(
    (message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        console.log("發送訊息:", message);
      } else {
        console.warn("WebSocket 未連線，無法發送訊息:", message);
      }
    },
    [ws]
  );

  return { ws, isConnected, sendMessage };
};
