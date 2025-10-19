// 簡單的翻譯測試
const DeepLService = require("./server/services/deeplService");

async function testTranslation() {
  console.log("🧪 開始測試翻譯功能...");

  const deepl = new DeepLService();

  try {
    // 測試中文到英文
    console.log("📝 測試中文到英文翻譯...");
    const result1 = await deepl.translate("你好，這是一個測試", "en", "zh");
    console.log("✅ 結果:", JSON.stringify(result1, null, 2));

    // 測試英文到中文
    console.log("📝 測試英文到中文翻譯...");
    const result2 = await deepl.translate("Hello, this is a test", "zh", "en");
    console.log("✅ 結果:", JSON.stringify(result2, null, 2));

    console.log("🎉 所有翻譯測試完成！");
  } catch (error) {
    console.error("❌ 翻譯測試失敗:", error);
  }
}

testTranslation();
