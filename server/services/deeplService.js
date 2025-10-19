const axios = require("axios");
require("dotenv").config();

class DeepLService {
  constructor() {
    this.apiKey = process.env.DEEPL_API_KEY;
    this.baseURL = "https://api.deepl.com/v2"; // 使用付費版本

    // 支援的語言對應
    this.languageMap = {
      zh: "ZH",
      en: "EN",
      id: "ID",
      vi: "VI",
      th: "TH",
      pt: "PT",
      es: "ES",
      ja: "JA",
      ko: "KO",
    };
  }

  /**
   * 翻譯文字
   * @param {string} text - 要翻譯的文字
   * @param {string} targetLang - 目標語言代碼
   * @param {string} sourceLang - 來源語言代碼（可選）
   * @returns {Promise<Object>} 翻譯結果
   */
  async translate(text, targetLang, sourceLang = null) {
    try {
      if (!text || !text.trim()) {
        throw new Error("翻譯文字不能為空");
      }

      const targetLanguageCode = this.languageMap[targetLang];
      if (!targetLanguageCode) {
        throw new Error(`不支援的目標語言: ${targetLang}`);
      }

      const params = {
        text: text.trim(),
        target_lang: targetLanguageCode,
      };

      // 如果指定了來源語言，加入參數
      if (sourceLang) {
        const sourceLanguageCode = this.languageMap[sourceLang];
        if (sourceLanguageCode) {
          params.source_lang = sourceLanguageCode;
        }
      }

      const response = await axios.post(`${this.baseURL}/translate`, null, {
        params: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      });

      if (
        response.data &&
        response.data.translations &&
        response.data.translations.length > 0
      ) {
        const translation = response.data.translations[0];

        return {
          success: true,
          originalText: text,
          translatedText: translation.text,
          detectedLanguage: translation.detected_source_language,
          targetLanguage: targetLang,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error("翻譯 API 回應格式錯誤");
      }
    } catch (error) {
      console.error("DeepL 翻譯失敗:", error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data || error.message,
        originalText: text,
        translatedText: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 批量翻譯文字
   * @param {Array<string>} texts - 要翻譯的文字陣列
   * @param {string} targetLang - 目標語言代碼
   * @param {string} sourceLang - 來源語言代碼（可選）
   * @returns {Promise<Array>} 翻譯結果陣列
   */
  async translateBatch(texts, targetLang, sourceLang = null) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("翻譯文字陣列不能為空");
      }

      const targetLanguageCode = this.languageMap[targetLang];
      if (!targetLanguageCode) {
        throw new Error(`不支援的目標語言: ${targetLang}`);
      }

      const params = {
        target_lang: targetLanguageCode,
      };

      // 如果指定了來源語言，加入參數
      if (sourceLang) {
        const sourceLanguageCode = this.languageMap[sourceLang];
        if (sourceLanguageCode) {
          params.source_lang = sourceLanguageCode;
        }
      }

      // 批量翻譯需要將文字陣列轉換為查詢參數格式
      texts.forEach((text, index) => {
        params[`text[${index}]`] = text;
      });

      const response = await axios.post(`${this.baseURL}/translate`, null, {
        params: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      });

      if (response.data && response.data.translations) {
        return response.data.translations.map((translation, index) => ({
          success: true,
          originalText: texts[index],
          translatedText: translation.text,
          detectedLanguage: translation.detected_source_language,
          targetLanguage: targetLang,
          timestamp: new Date().toISOString(),
        }));
      } else {
        throw new Error("批量翻譯 API 回應格式錯誤");
      }
    } catch (error) {
      console.error(
        "DeepL 批量翻譯失敗:",
        error.response?.data || error.message
      );

      return texts.map((text) => ({
        success: false,
        error: error.response?.data || error.message,
        originalText: text,
        translatedText: null,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  /**
   * 檢查 API 金鑰是否有效
   * @returns {Promise<boolean>}
   */
  async validateApiKey() {
    try {
      const response = await axios.get(`${this.baseURL}/usage`, {
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      console.error(
        "DeepL API 金鑰驗證失敗:",
        error.response?.data || error.message
      );
      return false;
    }
  }

  /**
   * 取得 API 使用量資訊
   * @returns {Promise<Object>}
   */
  async getUsageInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/usage`, {
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "取得 DeepL 使用量資訊失敗:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * 取得支援的語言清單
   * @returns {Promise<Array>}
   */
  async getSupportedLanguages() {
    try {
      const response = await axios.get(`${this.baseURL}/languages`, {
        params: {
          type: "target",
        },
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "取得 DeepL 支援語言清單失敗:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = DeepLService;
