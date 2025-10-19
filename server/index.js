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

// 健康檢查端點
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API 端點
app.get("/api/languages", (req, res) => {
  res.json(SUPPORTED_LANGUAGES);
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

    // 結束 GLADIA 會話
    await gladiaService.endSession(session.gladiaSessionId);
    session.gladiaSessionId = null;
    session.isRecording = false;

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
    if (!session || !session.gladiaSessionId || !session.isRecording) return;

    // 將 base64 音訊資料轉換為 Buffer
    const audioBuffer = Buffer.from(message.data.chunk, "base64");

    // 發送到 GLADIA
    const gladiaResponse = await gladiaService.sendAudioData(
      session.gladiaSessionId,
      audioBuffer
    );
    const asrResult = gladiaService.formatGladiaResponse(gladiaResponse);

    if (asrResult && asrResult.text) {
      // 發送 ASR 結果
      session.ws.send(
        JSON.stringify({
          type: "transcript",
          data: {
            is_final: asrResult.isFinal,
            utterance: {
              text: asrResult.text,
              start: 0,
              end: 0.48,
              confidence: asrResult.confidence,
              words: [],
            },
          },
        })
      );

      // 如果是 final 結果，進行翻譯
      if (asrResult.isFinal) {
        await translateText(
          clientId,
          asrResult.text,
          session.inputLanguage,
          session.outputLanguage
        );
      }
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
