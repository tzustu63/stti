const axios = require('axios');

class GladiaService {
  constructor() {
    this.apiKey = process.env.GLADIA_API_KEY;
    this.baseURL = 'https://api.gladia.io/v2';
    this.sessions = new Map(); // 儲存 WebSocket 連線會話
  }

  /**
   * 建立與 GLADIA 的 WebSocket 連線
   */
  async createSession(inputLanguage = 'zh') {
    try {
      const response = await axios.post(`${this.baseURL}/transcription`, {
        language: inputLanguage,
        model: 'whisper-1',
        transcription: {
          language: inputLanguage,
          model: 'whisper-1'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const sessionId = response.data.id;
      this.sessions.set(sessionId, {
        id: sessionId,
        status: 'active',
        language: inputLanguage,
        createdAt: new Date()
      });

      return sessionId;
    } catch (error) {
      console.error('建立 GLADIA 會話失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 發送音訊資料到 GLADIA
   */
  async sendAudioData(sessionId, audioBuffer) {
    try {
      const response = await axios.post(`${this.baseURL}/transcription/${sessionId}`, audioBuffer, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'audio/webm'
        }
      });

      return response.data;
    } catch (error) {
      console.error('發送音訊資料失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 取得轉錄結果
   */
  async getTranscriptionResult(sessionId) {
    try {
      const response = await axios.get(`${this.baseURL}/transcription/${sessionId}/result`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('取得轉錄結果失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 結束會話
   */
  async endSession(sessionId) {
    try {
      await axios.delete(`${this.baseURL}/transcription/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      this.sessions.delete(sessionId);
    } catch (error) {
      console.error('結束會話失敗:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 檢查 API 金鑰是否有效
   */
  async validateApiKey() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return true;
    } catch (error) {
      console.error('GLADIA API 金鑰驗證失敗:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * 處理 GLADIA 回應並格式化為統一格式
   */
  formatGladiaResponse(gladiaData) {
    if (!gladiaData || !gladiaData.transcription) {
      return null;
    }

    const transcription = gladiaData.transcription;
    
    return {
      text: transcription.text || '',
      isFinal: transcription.final || false,
      confidence: transcription.confidence || 0,
      language: transcription.language || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GladiaService;
