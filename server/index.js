const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// 引入服務
const GladiaService = require("./services/gladiaService");
const DeepLService = require("./services/deeplService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 初始化服務
const gladiaService = new GladiaService();
const deeplService = new DeepLService();

// 儲存 WebSocket 連線的會話資訊
const clientSessions = new Map();

// 支援的語言清單
const SUPPORTED_LANGUAGES = {
  zh: "中文",
  en: "English",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย",
  pt: "Português",
  es: "Español",
  ja: "日本語",
  ko: "한국어",
};

// 中介軟體
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client/dist")));
// 提供測試頁面
app.use(express.static(path.join(__dirname, "..")));

// 健康檢查端點
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API 端點
app.get("/api/languages", (req, res) => {
  res.json(SUPPORTED_LANGUAGES);
});

// 測試頁面路由
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/test-audio.html"));
});

// WebSocket 連線處理
wss.on("connection", (ws) => {
  const clientId = Date.now().toString();
  console.log(`新的 WebSocket 連線建立 (ID: ${clientId})`);

  // 初始化客戶端會話
  clientSessions.set(clientId, {
    ws: ws,
    gladiaSessionId: null,
    inputLanguage: "zh",
    outputLanguage: "en",
    isRecording: false,
    createdAt: Date.now(),
  });

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`收到訊息 (${clientId}):`, message.type);

      const session = clientSessions.get(clientId);

      switch (message.type) {
        case "config":
          await handleConfig(clientId, message);
          break;

        case "stop_recording":
          await handleStopRecording(clientId);
          break;

        case "audio_chunk":
          await handleAudioData(clientId, message);
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: "未知的訊息類型",
            })
          );
      }
    } catch (error) {
      console.error("處理訊息時發生錯誤:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "處理訊息時發生錯誤",
        })
      );
    }
  });

  ws.on("close", async () => {
    console.log(`WebSocket 連線已關閉 (ID: ${clientId})`);
    await cleanupSession(clientId);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket 錯誤 (${clientId}):`, error);
    cleanupSession(clientId);
  });
});

// 處理配置訊息
async function handleConfig(clientId, message) {
  try {
    const session = clientSessions.get(clientId);
    if (!session) return;

    session.inputLanguage = message.sourceLang || "zh";
    session.outputLanguage = message.targetLang || "en";

    // 建立 GLADIA 會話
    const gladiaSessionId = await gladiaService.createSession(
      session.inputLanguage
    );
    session.gladiaSessionId = gladiaSessionId;
    session.isRecording = true;

    // 設定 GLADIA WebSocket 訊息處理器
    gladiaService.setMessageHandler(gladiaSessionId, (gladiaMessage) => {
      console.log("收到 GLADIA 訊息:", JSON.stringify(gladiaMessage, null, 2));

      // 處理轉錄結果
      if (gladiaMessage.type === "transcript" && gladiaMessage.data) {
        const transcriptData = gladiaMessage.data;
        const utterance = transcriptData.utterance || {};
        const isFinal = transcriptData.is_final || false;
        const text = utterance.text || "";

        console.log(`轉錄結果: "${text}" (${isFinal ? "最終" : "部分"})`);

        // 只處理最終確認的轉錄結果，忽略部分轉錄
        if (text && text.trim().length > 0 && isFinal) {
          // 發送轉錄結果給客戶端
          const transcriptResponse = {
            type: "transcript",
            data: {
              is_final: isFinal,
              utterance: {
                text: text,
                start: utterance.start || 0,
                end: utterance.end || 0,
                confidence: utterance.confidence || 0,
                words: utterance.words || [],
              },
            },
          };

          console.log(
            "發送最終轉錄結果給客戶端:",
            JSON.stringify(transcriptResponse, null, 2)
          );

          try {
            session.ws.send(JSON.stringify(transcriptResponse));
          } catch (error) {
            console.error("發送轉錄結果失敗:", error);
          }

          // 進行翻譯
          translateText(
            clientId,
            text,
            session.inputLanguage,
            session.outputLanguage
          );
        } else if (text && text.trim().length > 0 && !isFinal) {
          // 記錄部分轉錄但不發送給客戶端
          console.log(`部分轉錄（不顯示）: "${text}"`);
        }
      } else if (gladiaMessage.type === "audio_chunk") {
        // 音訊資料確認訊息，不需要處理
        console.log("音訊資料已確認:", gladiaMessage.data);
      } else if (gladiaMessage.type === "error") {
        // 處理錯誤訊息
        console.error("GLADIA 錯誤:", gladiaMessage.data);
        session.ws.send(
          JSON.stringify({
            type: "error",
            message:
              "GLADIA 錯誤: " + (gladiaMessage.data?.message || "未知錯誤"),
          })
        );
      } else {
        // 其他類型的訊息
        console.log("其他 GLADIA 訊息:", gladiaMessage.type, gladiaMessage);
      }
    });

    session.ws.send(
      JSON.stringify({
        type: "recording_started",
        message: "配置完成，開始錄音",
        gladiaSessionId: gladiaSessionId,
      })
    );

    console.log(`配置完成 (${clientId}): GLADIA Session ${gladiaSessionId}`);
  } catch (error) {
    console.error("配置失敗:", error);
    const session = clientSessions.get(clientId);
    if (session) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          message: "配置失敗: " + error.message,
        })
      );
    }
  }
}

// 處理開始錄音（已廢棄，保留向後相容）
async function handleStartRecording(clientId, message) {
  try {
    const session = clientSessions.get(clientId);
    if (!session) return;

    session.inputLanguage = message.inputLanguage || "zh";
    session.outputLanguage = message.outputLanguage || "en";

    // 建立 GLADIA 會話
    const gladiaSessionId = await gladiaService.createSession(
      session.inputLanguage
    );
    session.gladiaSessionId = gladiaSessionId;
    session.isRecording = true;

    session.ws.send(
      JSON.stringify({
        type: "recording_started",
        message: "開始錄音",
        gladiaSessionId: gladiaSessionId,
      })
    );

    console.log(`開始錄音 (${clientId}): GLADIA Session ${gladiaSessionId}`);
  } catch (error) {
    console.error("啟動錄音失敗:", error);
    const session = clientSessions.get(clientId);
    if (session) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          message: "啟動錄音失敗: " + error.message,
        })
      );
    }
  }
}

// 處理停止錄音
async function handleStopRecording(clientId) {
  try {
    const session = clientSessions.get(clientId);
    if (!session || !session.gladiaSessionId) return;

    // 先設定為停止錄音狀態，避免繼續發送音訊
    session.isRecording = false;

    // 結束 GLADIA 會話
    await gladiaService.endSession(session.gladiaSessionId);
    session.gladiaSessionId = null;

    session.ws.send(
      JSON.stringify({
        type: "recording_stopped",
        message: "停止錄音",
      })
    );

    console.log(`停止錄音 (${clientId})`);
  } catch (error) {
    console.error("停止錄音失敗:", error);
    const session = clientSessions.get(clientId);
    if (session) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          message: "停止錄音失敗: " + error.message,
        })
      );
    }
  }
}

// 處理音訊資料
async function handleAudioData(clientId, message) {
  try {
    const session = clientSessions.get(clientId);
    if (!session || !session.gladiaSessionId || !session.isRecording) {
      console.log(`跳過音訊資料處理 (${clientId}): 會話不存在或未錄音`);
      return;
    }

    // 將 base64 PCM 資料轉換為 Buffer
    const pcmBuffer = Buffer.from(message.data.chunk, "base64");

    // 檢查 GLADIA WebSocket 連線狀態
    const sessionStatus = gladiaService.getSessionStatus(
      session.gladiaSessionId
    );
    if (!sessionStatus.exists || sessionStatus.wsReadyState !== 1) {
      console.log(`GLADIA WebSocket 未連線 (${clientId}):`, sessionStatus);
      return;
    }

    // 發送 PCM 資料到 GLADIA WebSocket
    const result = await gladiaService.sendAudioData(
      session.gladiaSessionId,
      pcmBuffer
    );

    if (result.success) {
      console.log(
        `PCM 音訊資料已處理 (${clientId}): ${pcmBuffer.length} bytes`
      );
    } else {
      console.warn(`音訊資料發送失敗 (${clientId}):`, result.error);
    }
  } catch (error) {
    console.error("處理音訊資料失敗:", error);
    const session = clientSessions.get(clientId);
    if (session) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          message: "處理音訊資料失敗: " + error.message,
        })
      );
    }
  }
}

// 翻譯文字
async function translateText(clientId, text, sourceLang, targetLang) {
  try {
    const session = clientSessions.get(clientId);
    if (!session) return;

    const translationResult = await deeplService.translate(
      text,
      targetLang,
      sourceLang
    );

    if (translationResult.success) {
      session.ws.send(
        JSON.stringify({
          type: "translation",
          data: {
            translated_utterance: {
              text: translationResult.translatedText,
            },
          },
        })
      );
    } else {
      session.ws.send(
        JSON.stringify({
          type: "translation_error",
          originalText: text,
          error: translationResult.error,
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (error) {
    console.error("翻譯失敗:", error);
    const session = clientSessions.get(clientId);
    if (session) {
      session.ws.send(
        JSON.stringify({
          type: "error",
          message: "翻譯失敗: " + error.message,
        })
      );
    }
  }
}

// 清理會話
async function cleanupSession(clientId) {
  try {
    const session = clientSessions.get(clientId);
    if (session && session.gladiaSessionId) {
      await gladiaService.endSession(session.gladiaSessionId);
    }
    clientSessions.delete(clientId);
    console.log(`會話已清理 (ID: ${clientId})`);
  } catch (error) {
    console.error("清理會話失敗:", error);
  }
}

// 定期清理過期的會話
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 分鐘

  for (const [clientId, session] of clientSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      console.log(`清理過期會話 (ID: ${clientId})`);
      cleanupSession(clientId);
    }
  }
}, 5 * 60 * 1000); // 每 5 分鐘檢查一次

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`伺服器運行在 http://${HOST}:${PORT}`);
  console.log(`健康檢查端點: http://${HOST}:${PORT}/healthz`);
});
