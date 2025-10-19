const WebSocket = require("ws");

// 測試 WebSocket 連線和翻譯功能
console.log("開始測試翻譯功能...");

const ws = new WebSocket("ws://localhost:3000");

ws.on("open", () => {
  console.log("✅ WebSocket 連線已建立");

  // 發送配置訊息
  const configMessage = {
    type: "config",
    sourceLang: "zh",
    targetLang: "en",
  };

  console.log("📤 發送配置訊息:", JSON.stringify(configMessage, null, 2));
  ws.send(JSON.stringify(configMessage));
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data);
    console.log("📥 收到訊息:", JSON.stringify(message, null, 2));

    if (message.type === "recording_started") {
      console.log("🎤 錄音已開始，會話 ID:", message.gladiaSessionId);

      // 模擬發送一個假的轉錄結果來測試翻譯
      setTimeout(() => {
        console.log("📤 模擬發送轉錄結果...");
        // 這裡我們無法直接發送轉錄結果，因為需要通過 GLADIA
        // 但我們可以測試翻譯函數
        testTranslationDirectly();
      }, 2000);
    }

    if (message.type === "translation") {
      console.log("✅ 收到翻譯結果:", message.data.translated_utterance.text);
    }

    if (message.type === "translation_error") {
      console.log("❌ 翻譯錯誤:", message.error);
    }

    if (message.type === "error") {
      console.log("❌ 伺服器錯誤:", message.message);
    }
  } catch (error) {
    console.error("❌ 解析訊息失敗:", error);
  }
});

ws.on("error", (error) => {
  console.error("❌ WebSocket 錯誤:", error);
});

ws.on("close", () => {
  console.log("🔌 WebSocket 連線已關閉");
});

// 直接測試翻譯函數
async function testTranslationDirectly() {
  console.log("🧪 直接測試翻譯函數...");

  const DeepLService = require("./server/services/deeplService");
  const deepl = new DeepLService();

  try {
    const result = await deepl.translate("你好，這是一個測試", "en", "zh");
    console.log("✅ 直接翻譯測試結果:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ 直接翻譯測試失敗:", error);
  }
}

// 5秒後關閉連線
setTimeout(() => {
  console.log("⏰ 測試完成，關閉連線");
  ws.close();
}, 10000);
