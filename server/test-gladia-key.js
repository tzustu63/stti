const axios = require("axios");
require("dotenv").config();

async function testGladiaKey() {
  try {
    console.log("測試 GLADIA API 金鑰...");
    console.log("API 金鑰:", process.env.GLADIA_API_KEY);

    const response = await axios.post(
      "https://api.gladia.io/v2/live",
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
          "x-gladia-key": process.env.GLADIA_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ API 金鑰有效！");
    console.log("可用模型:", response.data);
  } catch (error) {
    console.error("❌ API 金鑰無效或錯誤:");
    console.error("狀態碼:", error.response?.status);
    console.error("錯誤訊息:", error.response?.data);
  }
}

testGladiaKey();
