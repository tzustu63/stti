# STTI - 即時語音翻譯系統 v7.1.0

一個基於 GLADIA ASR 和 DeepL 翻譯的即時語音翻譯網頁應用程式。

## 🚀 主要功能

- **即時語音轉文字**: 使用 GLADIA API 進行高精度語音識別
- **即時翻譯**: 使用 DeepL API 提供多語言翻譯服務
- **多語言支援**: 支援 9 種語言的即時翻譯
- **響應式設計**: 適配各種裝置和螢幕尺寸
- **即時通訊**: 基於 WebSocket 的低延遲通訊

## 🌐 支援的語言

| 語言代碼 | 語言名稱         | 支援狀態 |
| -------- | ---------------- | -------- |
| zh       | 中文             | ✅       |
| en       | English          | ✅       |
| id       | Bahasa Indonesia | ✅       |
| vi       | Tiếng Việt       | ✅       |
| th       | ไทย              | ✅       |
| pt       | Português        | ✅       |
| es       | Español          | ✅       |
| ja       | 日本語           | ✅       |
| ko       | 한국어           | ✅       |

## 🛠 技術棧

### 前端

- React 18
- Vite
- Tailwind CSS
- Lucide React (圖示)

### 後端

- Node.js
- Express
- WebSocket (ws)
- Axios

### 外部服務

- GLADIA API (語音識別)
- DeepL API (翻譯)

## 📦 安裝與執行

### 環境需求

- Node.js >= 18.0.0
- GLADIA API 金鑰
- DeepL API 金鑰（付費版本）

### 安裝依賴

```bash
npm run install:all
```

### 環境變數設定

建立 `.env` 檔案：

```env
# GLADIA API 設定
GLADIA_API_KEY=your_gladia_api_key_here

# DeepL API 設定
DEEPL_API_KEY=your_deepl_api_key_here

# 伺服器設定
PORT=3000
NODE_ENV=development
```

### 開發模式

```bash
npm run dev
```

### 生產模式

```bash
npm run build
npm start
```

## 🎯 使用方式

### 主要應用程式

1. 開啟 `http://localhost:3000`
2. 選擇來源語言和目標語言
3. 點擊「開始錄音」開始語音轉文字和翻譯
4. 查看即時顯示的原文和翻譯結果

### 調試工具

1. 開啟 `http://localhost:3000/debug-translation.html`
2. 使用調試面板監控系統狀態
3. 測試各項功能是否正常運作

## 🔧 調試工具

### 調試頁面功能

- **WebSocket 連線狀態監控**
- **即時錄音功能測試**
- **原文逐字稿即時顯示**
- **翻譯結果即時顯示**
- **詳細的日誌記錄系統**

### 測試工具

- `test-simple.js`: 翻譯功能獨立測試
- `test-translation.js`: WebSocket 完整流程測試

## 📊 版本歷史

### v7.1.0 (2025-01-19)

- ✅ **音訊處理優化**: 減少緩衝區大小從 4096 到 1024，降低延遲 50-75%
- ✅ **GLADIA API 配置優化**: 添加語言配置和端點檢測參數，提升辨識準確度
- ✅ **音訊品質優化**: 改善音訊設定，添加 Google 音訊處理參數
- ✅ **音訊緩衝機制**: 實作智慧緩衝，累積 2048 samples 再發送以提高效率

### v6.0.0 (2025-10-19)

- ✅ 翻譯功能完全修正
- ✅ 建立完整調試工具
- ✅ DeepL API 認證方式更新
- ✅ 詳細的錯誤處理和日誌系統

### v5.0.0 (2025-10-19)

- ✅ 即時語音轉文字功能
- ✅ 多語言支援
- ✅ WebSocket 即時通訊

### v4.0.0 (2025-10-19)

- ✅ 只顯示最終轉錄結果
- ✅ RWD 響應式設計優化

## 🚀 部署

### Railway 部署

1. 將程式碼推送到 GitHub
2. 在 Railway 中連接 GitHub 倉庫
3. 設定環境變數
4. 自動部署

### 本地部署

```bash
npm run build
npm start
```

## 📝 開發指南

### 專案結構

```
stti/
├── client/          # 前端 React 應用
├── server/          # 後端 Node.js 服務
├── debug-translation.html  # 調試工具
├── test-*.js        # 測試工具
├── V6-ANALYSIS.md   # v6 版本分析
├── CHANGELOG.md     # 版本變更記錄
└── README.md        # 專案說明
```

### 開發流程

1. 修改程式碼
2. 執行測試工具驗證功能
3. 使用調試頁面測試完整流程
4. 提交變更到 Git
5. 建立版本發布

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 📞 聯絡資訊

如有問題或建議，請透過 GitHub Issues 聯絡。
