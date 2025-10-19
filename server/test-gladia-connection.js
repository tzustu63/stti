const axios = require("axios");
require("dotenv").config();

async function testGladiaConnection() {
  const apiKey = process.env.GLADIA_API_KEY;
  const baseURL = "https://api.gladia.io/v2";

  if (!apiKey) {
    console.error("❌ GLADIA_API_KEY 環境變數未設定");
    return;
  }

  console.log("🔑 使用 API 金鑰:", apiKey.substring(0, 10) + "...");

  try {
    // 測試 API 金鑰有效性 - 直接嘗試建立會話
    console.log("📡 測試 API 金鑰有效性...");

    // 測試建立即時轉錄會話
    console.log("\n🎤 測試建立即時轉錄會話...");
    const sessionResponse = await axios.post(
      `${baseURL}/live`,
      {
        encoding: "wav/pcm",
        bit_depth: 16,
        sample_rate: 16000,
        channels: 1,
        model: "solaria-1",
        // 新增語言配置以提升辨識準確度
        language_config: {
          languages: ["zh"], // 明確指定語言
          code_switching: false, // 禁用語碼切換以提升準確度
        },
        // 新增端點檢測參數以加快斷句速度
        endpointing: 0.3, // 300ms 靜音視為句子結束（更快定稿）
        maximum_duration_without_endpointing: 10, // 最長 10 秒強制斷句
        // 新增音訊預處理以提升品質
        pre_processing: {
          audio_enhancer: true, // 啟用音訊增強
          speech_threshold: 0.3, // 語音檢測閾值
        },
        messages_config: {
          receive_partial_transcripts: true,
          receive_final_transcripts: true,
        },
      },
      {
        headers: {
          "x-gladia-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 會話建立成功");
    console.log("🆔 會話 ID:", sessionResponse.data.id);
    console.log("🔗 WebSocket URL:", sessionResponse.data.url);

    // 清理會話
    console.log("\n🧹 清理測試會話...");
    await axios.delete(`${baseURL}/live/${sessionResponse.data.id}`, {
      headers: {
        "x-gladia-key": apiKey,
      },
    });
    console.log("✅ 會話已清理");
  } catch (error) {
    console.error("❌ 測試失敗:");
    if (error.response) {
      console.error("狀態碼:", error.response.status);
      console.error("錯誤訊息:", error.response.data);
    } else {
      console.error("錯誤:", error.message);
    }
  }
}

testGladiaConnection();
