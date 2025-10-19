const axios = require("axios");
const WebSocket = require("ws");

class GladiaService {
  constructor() {
    this.apiKey = process.env.GLADIA_API_KEY;
    this.baseURL = "https://api.gladia.io/v2";
    this.wsURL = "wss://api.gladia.io/v2/live";
    this.sessions = new Map(); // 儲存 WebSocket 連線會話
  }

  /**
   * 建立與 GLADIA 的 WebSocket 連線
   */
  async createSession(inputLanguage = "zh") {
    try {
      // 首先獲取 WebSocket URL
      const response = await axios.post(
        `${this.baseURL}/live`,
        {
          encoding: "wav/pcm",
          bit_depth: 16,
          sample_rate: 16000,
          channels: 1,
          model: "solaria-1",
          messages_config: {
            receive_partial_transcripts: true,
            receive_final_transcripts: true,
          },
        },
        {
          headers: {
            "x-gladia-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const sessionId = response.data.id;
      const wsUrl =
        response.data.url || `${this.wsURL}?token=${response.data.token}`;

      console.log(`建立 GLADIA 會話: ${sessionId}, WebSocket URL: ${wsUrl}`);

      // 建立 WebSocket 連線並等待連線建立
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
          headers: {
            "x-gladia-key": this.apiKey,
          },
        });

        let isResolved = false;

        ws.on("open", () => {
          console.log(`GLADIA WebSocket 連線已建立: ${sessionId}`);
          this.sessions.set(sessionId, {
            id: sessionId,
            ws: ws,
            status: "active",
            language: inputLanguage,
            createdAt: new Date(),
            messageHandler: null,
          });

          if (!isResolved) {
            isResolved = true;
            resolve(sessionId);
          }
        });

        ws.on("error", (error) => {
          console.error(`GLADIA WebSocket 連線失敗: ${error.message}`);
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        });

        ws.on("close", (code, reason) => {
          console.log(
            `GLADIA WebSocket 連線已關閉: ${sessionId}, Code: ${code}, Reason: ${reason}`
          );
          this.sessions.delete(sessionId);
        });

        // 設定超時
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error("WebSocket 連線超時"));
          }
        }, 10000);
      });
    } catch (error) {
      console.error(
        "建立 GLADIA 會話失敗:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * 發送音訊資料到 GLADIA
   */
  async sendAudioData(sessionId, audioBuffer) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.ws) {
        throw new Error("會話不存在或 WebSocket 未連線");
      }

      if (session.ws.readyState === WebSocket.OPEN) {
        // 發送音訊資料到 GLADIA WebSocket
        session.ws.send(audioBuffer);
        console.log("音訊資料已發送到 GLADIA:", audioBuffer.length, "bytes");
        return { success: true };
      } else {
        console.warn(
          `WebSocket 連線狀態: ${session.ws.readyState}, 無法發送音訊資料`
        );
        return { success: false, error: "WebSocket 連線未開啟" };
      }
    } catch (error) {
      console.error("發送音訊資料失敗:", error.message);
      throw error;
    }
  }

  /**
   * 取得轉錄結果
   */
  async getTranscriptionResult(sessionId) {
    try {
      const response = await axios.get(`${this.baseURL}/live/${sessionId}`, {
        headers: {
          "x-gladia-key": this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error("取得轉錄結果失敗:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 結束會話
   */
  async endSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (session && session.ws) {
        session.ws.close();
      }

      // 也嘗試刪除 REST API 會話
      try {
        await axios.delete(`${this.baseURL}/live/${sessionId}`, {
          headers: {
            "x-gladia-key": this.apiKey,
          },
        });
      } catch (restError) {
        console.warn("REST API 刪除會話失敗:", restError.message);
      }

      this.sessions.delete(sessionId);
      console.log("GLADIA 會話已結束:", sessionId);
    } catch (error) {
      console.error("結束會話失敗:", error.message);
      throw error;
    }
  }

  /**
   * 設定 WebSocket 訊息處理器
   */
  setMessageHandler(sessionId, handler) {
    const session = this.sessions.get(sessionId);
    if (session && session.ws) {
      // 儲存處理器引用
      session.messageHandler = handler;

      session.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log("收到 GLADIA 訊息:", JSON.stringify(message, null, 2));

          // 處理不同類型的訊息
          if (message.type === "transcript" && message.data) {
            const transcriptData = message.data;
            console.log(
              `轉錄結果: "${transcriptData.text || ""}" (${
                transcriptData.final ? "最終" : "部分"
              })`
            );
            handler(message);
          } else if (message.type === "audio_chunk") {
            console.log("音訊資料確認:", message.data);
          } else if (message.type === "error") {
            console.error("GLADIA 錯誤:", message.data);
            handler(message);
          } else {
            console.log("其他 GLADIA 訊息:", message.type, message);
            handler(message);
          }
        } catch (error) {
          console.error(
            "解析 GLADIA 訊息失敗:",
            error,
            "原始資料:",
            data.toString()
          );
        }
      });

      session.ws.on("error", (error) => {
        console.error("GLADIA WebSocket 錯誤:", error);
      });

      session.ws.on("close", (code, reason) => {
        console.log("GLADIA WebSocket 連線已關閉:", code, reason);
      });
    } else {
      console.error("無法設定訊息處理器：會話不存在或 WebSocket 未連線");
    }
  }

  /**
   * 檢查 API 金鑰是否有效
   */
  async validateApiKey() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          "x-gladia-key": this.apiKey,
        },
      });
      return true;
    } catch (error) {
      console.error(
        "GLADIA API 金鑰驗證失敗:",
        error.response?.data || error.message
      );
      return false;
    }
  }

  /**
   * 處理 GLADIA 回應並格式化為統一格式
   */
  formatGladiaResponse(gladiaData) {
    if (!gladiaData || !gladiaData.data) {
      return null;
    }

    const data = gladiaData.data;

    return {
      text: data.text || "",
      isFinal: data.final || false,
      confidence: data.confidence || 0,
      language: data.language || "unknown",
      timestamp: new Date().toISOString(),
      start: data.start || 0,
      end: data.end || 0,
      words: data.words || [],
    };
  }

  /**
   * 檢查會話狀態
   */
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { exists: false, status: "not_found" };
    }

    return {
      exists: true,
      status: session.status,
      wsReadyState: session.ws ? session.ws.readyState : null,
      language: session.language,
      createdAt: session.createdAt,
    };
  }
}

module.exports = GladiaService;
