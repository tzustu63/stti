太好了！你的用途是「**即時語音逐字稿 → 螢幕字幕**」。以下給你一份 **Gladia API（Real-time STT）快速設定＋關鍵參數＋前端/後端範例**，專門針對舞台／演講字幕情境整理。

---

# 一、整體流程（Real-time）

1. **建立一個即時轉寫工作（session）**
   以 REST 先呼叫 `POST /v2/live`，取得 **WebSocket URL（含 token）** 與 `id`。之後用這個 URL 開 **單一 WebSocket 連線** 送音訊塊；避免同時多開，以免重複事件/不可預期行為。([docs.gladia.io][1])

2. **用 WebSocket 串流音訊**
   連線到 `wss://api.gladia.io/v2/live?token=...`，以 **base64 的 PCM**（或二進位 frame）持續送「audio_chunk」訊息；結束時送 `{"type":"stop_recording"}`。服務會回傳 **partial/final transcript**、語音起迄事件（speech_start/end）、以及可選的翻譯/NER/情緒等事件。([docs.gladia.io][2])

3. **呈現字幕 or 下載結果**
   前端根據即時 **transcript 事件**（含字級時間戳）組字幕；或在會後用 `GET /v2/live/{id}` 拉最終結果（含 **SRT/VTT** 字幕欄位）。([docs.gladia.io][2])

---

# 二、最小可用範例

## 1) 後端先開 session（cURL）

```bash
curl --request POST https://api.gladia.io/v2/live \
  -H 'Content-Type: application/json' \
  -H 'x-gladia-key: YOUR_GLADIA_API_KEY' \
  -d '{
    "encoding":"wav/pcm",
    "bit_depth":16,
    "sample_rate":16000,
    "channels":1,
    "model":"solaria-1",
    "messages_config":{"receive_partial_transcripts": true, "receive_final_transcripts": true}
  }'
# ↑ 會回傳 { "id": "...", "url": "wss://api.gladia.io/v2/live?token=..." }
```

（此端點用來安全地在**後端**產生一次性 WebSocket URL；避免把 API key 暴露到前端 App。）([docs.gladia.io][1])

## 2) 前端（Browser）串 WebSocket 並送音訊（概念性範例）

```js
// 1) 你的後端把 "wssUrl" 回傳給前端
const ws = new WebSocket(wssUrl);

// 2) 建錄音 (16kHz, mono) 並轉成 16-bit PCM 小端，切片 ~20–40ms
//    下面省略編碼細節：把每片 PCM Buffer -> base64Str，包成 audio_chunk 丟給 WS
function sendPcmChunk(base64Str) {
  ws.send(JSON.stringify({ type: "audio_chunk", data: { chunk: base64Str } }));
}

// 3) 接收逐字稿事件，顯示 partial / final
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.type === "transcript") {
    const { is_final, utterance } = msg.data;
    // utterance.text、utterance.start、utterance.end、utterance.words[].start/end 在這裡
    renderSubtitle(utterance.text, is_final, utterance.start, utterance.end);
  }
};

// 4) 結束錄音時
// ws.send(JSON.stringify({ type: "stop_recording" }));
```

（WebSocket 訊息型別與欄位如文件所示：`audio_chunk`、`transcript`、`speech_start/end`…）([docs.gladia.io][2])

> 會後如需官方產出的 **SRT/VTT** 文字檔，可再呼叫 `GET /v2/live/{id}`，回應中的 `result.transcription.subtitles[]` 會提供 SRT/VTT 字串。([docs.gladia.io][3])

---

# 三、即時字幕情境必調參數（`POST /v2/live`）

> 完整參數範例與說明見官方「Initiate a session」與「Live WebSocket」文件。([docs.gladia.io][1])

**音訊與模型**

- `encoding`：`wav/pcm`（也可 `wav/alaw`、`wav/ulaw`）。**Raw PCM 無需 WAV header**。([docs.gladia.io][1])
- `bit_depth`：常用 `16`。([docs.gladia.io][1])
- `sample_rate`：`16000`（也支援 8k/32k/44.1k/48k）。([docs.gladia.io][1])
- `channels`：`1`（單聲道利於低延遲字幕）。([docs.gladia.io][1])
- `model`：如 `solaria-1`（文件示例）。([docs.gladia.io][1])
- `region`（Query）：`us-west` 或 `eu-west`。就近可減延遲。([docs.gladia.io][1])

**語言設定與端點判斷（斷句）**

- `language_config.languages`：明確指定語言（如 `["zh","en"]`），可提升辨識與斷句；或留空用自動偵測。
- `language_config.code_switching`：是否允許語碼切換（中英夾雜）。([docs.gladia.io][1])
- `endpointing`：**語音端點門檻（秒）**，影響一句話何時定稿；例如 `0.05` 表示 50ms 靜音即視為結束，字幕會更快定稿。([docs.gladia.io][1])
- `maximum_duration_without_endpointing`：若持續講不停，最長多久強制切一句（秒）。避免超長不卡行。([docs.gladia.io][1])

**前/即/後處理**

- `pre_processing.audio_enhancer`、`speech_threshold`：雜訊較大或環境複雜時有幫助。([docs.gladia.io][1])
- `realtime_processing.custom_vocabulary` 與 `..._config`：**自訂詞彙/口音讀音/強化程度**（非常適合專有名詞、中文姓名、地名）。([docs.gladia.io][1])
- `realtime_processing.custom_spelling`：把特定詞正規化（如 SQL → “Sequel”）。([docs.gladia.io][1])
- `realtime_processing.translation`：需要同步翻譯字幕可開（可指定 `target_languages`、是否對齊原句 `match_original_utterances` 等）。([docs.gladia.io][1])
- （也支援 NER、情緒、摘要、章節化等加值事件）([docs.gladia.io][2])

**回傳訊息種類（很關鍵）**

- `messages_config.receive_partial_transcripts`：**true** 會有「即時暫時」字幕；
- `messages_config.receive_final_transcripts`：**true** 會有「定稿」字幕；
- 還可選擇是否接收 speech 事件與其他處理事件。([docs.gladia.io][1])

**查詢最終結果（含字幕檔）**

- `GET /v2/live/{id}`：可拿到 **full_transcript**、**utterances（含詞級時間戳）**，以及 `subtitles`（SRT/VTT）。([docs.gladia.io][3])

---

# 四、字幕呈現實務建議（演講場合）

1. **Partial 先顯示、Final 覆蓋**
   收到 `transcript` 的 `is_final=false` 就更新當前字幕；`true` 時將文字固化到下方歷史列。([docs.gladia.io][2])

2. **行寬與換行**
   每行約 **32–40 字符**，每段 **1–2 行**；英文/數字加空白能減卡字。會後也可用 Gladia 的 **字幕輸出**再做微調（最終檔 SRT/VTT）。([docs.gladia.io][3])

3. **時間同步**
   善用 `utterance.start/end` 或 `words[].start/end` 來生成 **WebVTT cue** 的時間軸，確保字幕跟口型同步。([docs.gladia.io][2])

4. **延遲 vs 正確性**
   `endpointing` 越小 → **更快定稿**但可能切太碎；可搭配 `maximum_duration_without_endpointing` 取得平衡。([docs.gladia.io][1])

5. **專有名詞保真**
   把講者姓名、學校/院系、活動名稱、地名、佛教術語等放進 **custom_vocabulary**（可含讀音與強化程度），中文字也適用。([docs.gladia.io][1])

---

# 五、常見坑位與排錯

- **一次 session 一條 WebSocket**：不要多開，否則事件重複、狀態混亂。([support.gladia.io][4])
- **PCM 編碼**：若你送的是 **raw PCM**，**不用 WAV header**；記得採樣率、位元深度、聲道數與 session 參數一致。([docs.gladia.io][1])
- **網路斷線**：用 `POST /v2/live` 先開 session 的流程具備 **可重連**優勢；斷線後用同一 `token` 續上。([docs.gladia.io][1])
- **繁中/中英夾雜**：`language_config.languages` 指定 `["zh"]` 或加上 `en`，並把 `code_switching` 設 `true`。([docs.gladia.io][1])

---

# 六、更多資源（可加書籤）

- **API 總覽**（含 Live/Pre-recorded 文件）([docs.gladia.io][5])
- **POST /v2/live（建立即時工作）**：參數、範例、為何先 POST 的好處。([docs.gladia.io][1])
- **Live WebSocket**：訊息格式、事件與欄位。([docs.gladia.io][2])
- **GET /v2/live/{id}**：拿最終 transcript ＋**SRT/VTT**。([docs.gladia.io][3])
- **功能頁（Real-time 特色）**：支援自訂詞彙、情緒、摘要、章節化等。([gladia.io][6])
- **（延伸）字幕輸出參數**（主要用於錄音檔批次轉寫，但可參考行長/行數限制規則）([docs.gladia.io][7])

---

# 七、你要不要我幫你做「Tzu Chi 活動／演講常見術語」詞庫草案（custom vocabulary）？

只要給我一份詞表（人名、地名、佛教相關用語、校內專有名詞），我可以直接幫你整理成 **Gladia `custom_vocabulary_config`** 的 JSON 範本（含可選讀音與強化強度），並附上你的即時字幕預設參數（低延遲版／高準確版）兩套配置，讓你貼上就能跑。

[1]: https://docs.gladia.io/api-reference/v2/live/init "Initiate a session - Gladia"
[2]: https://docs.gladia.io/api-reference/v2/live/websocket "Live WebSocket - Gladia"
[3]: https://docs.gladia.io/api-reference/v2/live/get "Get result - Gladia"
[4]: https://support.gladia.io/article/how-to-handle-the-websocket-connection?utm_source=chatgpt.com "How to handle the Websocket connection ? | Gladia Help Center"
[5]: https://docs.gladia.io/api-reference/index "Introduction - Gladia"
[6]: https://www.gladia.io/product/real-time?utm_source=chatgpt.com "Real-Time Transcription API"
[7]: https://docs.gladia.io/chapters/pre-recorded-stt/features/subtitles?utm_source=chatgpt.com "Export subtitles (SRT/VTT) - Gladia"

這個頁面是 Gladia API 的「**Initiate a session（開啟即時轉寫工作）**」端點說明（`POST /v2/live`）的大致內容。我幫你整理出重點：用途、參數、回傳、為什麼要先呼叫這一步。

---

## ✅ 用途

這個端點是用於「建立一個即時語音轉寫（live transcription）會話」的第一步。呼叫後會得到一個 **session ID** 和專屬的 **WebSocket URL**，你接著用這條 WebSocket 傳送音訊、接收即時結果。 ([docs.gladia.io][1])
好處包括：

- 保護你的 API 金鑰（前端不用直接暴露） ([docs.gladia.io][1])
- 客戶端直接連 WebSocket 減少你後端負擔 ([docs.gladia.io][1])
- 若連線中斷，可利用這 session id 重連，不會整個從頭開始 ([docs.gladia.io][1])

---

## 🛠️ 主要參數（在 Body 裡）

這裡列出一些你最可能用到且可調整的重要參數：

| 參數                                   | 說明                                                             | 可選值／備註                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `encoding`                             | 音訊編碼格式                                                     | 預設 `wav/pcm`，也支援 `wav/alaw`、`wav/ulaw` ([docs.gladia.io][1])                                                                 |
| `bit_depth`                            | 位元深度                                                         | 預設 `16`，可選 `8,16,24,32` ([docs.gladia.io][1])                                                                                  |
| `sample_rate`                          | 採樣率                                                           | 預設 `16000`，可選 `8000,16000,32000,44100,48000` ([docs.gladia.io][1])                                                             |
| `channels`                             | 聲道數                                                           | 預設 `1`（單聲道） ([docs.gladia.io][1])                                                                                            |
| `model`                                | 使用的模型                                                       | 預設 `solaria-1` ([docs.gladia.io][1])                                                                                              |
| `endpointing`                          | 靜音多久視為一句話結束                                           | 預設 `0.05`（秒） ([docs.gladia.io][1])                                                                                             |
| `maximum_duration_without_endpointing` | 若沒偵測到靜音，最長等多久就強制結束一句                         | 預設 `5`（秒） ([docs.gladia.io][1])                                                                                                |
| `language_config`                      | 語言設定（譬如語言清單、是否語碼切換）                           | 如 `languages: []`, `code_switching: false` ([docs.gladia.io][1])                                                                   |
| `pre_processing`                       | 前處理設定（如雜訊強化、語音門檻）                               | 如 `audio_enhancer: false, speech_threshold: 0.6` ([docs.gladia.io][1])                                                             |
| `realtime_processing`                  | 即時處理功能（自訂詞彙、自訂拼字、翻譯、命名實體識別、情緒分析） | 如 `custom_vocabulary`, `custom_spelling`, `translation`, `named_entity_recognition`, `sentiment_analysis` 等 ([docs.gladia.io][1]) |
| `post_processing`                      | 後處理功能（如摘要、章節化）                                     | 如 `summarization`, `chapterization` ([docs.gladia.io][1])                                                                          |
| `messages_config`                      | WebSocket 訊息你要接收哪些類型／事件                             | 如 `receive_partial_transcripts`, `receive_final_transcripts`, `receive_speech_events` 等 ([docs.gladia.io][1])                     |
| `callback`／`callback_config`          | 若要把結果以 webhook 推送到你的 URL                              | 預設 `callback: false` 若不用 webhook ([docs.gladia.io][1])                                                                         |
| `region`（Query 參數）                 | 處理音訊的資料中心區域                                           | 如 `us-west`, `eu-west` ([docs.gladia.io][1])                                                                                       |

---

## 📬 回傳內容（Response）

成功時回傳 HTTP 201，內容類似：

```json
{
  "id": "45463597-20b7-4af7-b3b3-f5fb778203ab",
  "created_at": "2023-12-28T09:04:17.210Z",
  "url": "wss://api.gladia.io/v2/live?token=4a39145c-2844-4557-8f34-34883f7be7d9"
}
```

- `id`：該會話的唯一識別碼。 ([docs.gladia.io][1])
- `created_at`：建立時間。 ([docs.gladia.io][1])
- `url`：你要連 WebSocket 的地址（含 token 認證）—用這個地址在客戶端／瀏覽器或服務器端建立連線。 ([docs.gladia.io][1])

---

## 🔍 為什麼要先呼叫這一步（Init）？

頁面中也明確說明了幾大理由：

- **安全性**：透過後端呼叫 init 取得 WebSocket URL，避免將 API 金鑰直接傳給前端。 ([docs.gladia.io][1])
- **降低基礎設施負擔**：一旦 URL 發出，客戶端直接連至 Gladia 的 WebSocket 伺服器，不需你中轉。 ([docs.gladia.io][1])
- **可重連／不中斷狀態**：若 WebSocket 因網路斷線，可用這 session 重新連線，保持上下文，不必從頭重新建立。 ([docs.gladia.io][1])

---

如果你願意，我可以幫你把這個端點的 **完整參數清單（含可選值／說明）** 下載成 PDF 或貼 Markdown，方便你夾在開發文件中。要的話我幫你做。

[1]: https://docs.gladia.io/api-reference/v2/live/init?utm_source=chatgpt.com "Initiate a session - Gladia"

這個頁面是 Gladia API 的 **Live WebSocket 傳訊規範**（端點 `wss://api.gladia.io/v2/live?token={SESSION}`），也就是你在即時語音逐字稿/字幕應用中，用來傳送音訊並接收字幕＋事件的「雙向通道」。以下說明它裡面的重點內容：

---

## 📡 連線位置

你先透過 `POST /v2/live` 收到一組會話 ID 與 WebSocket URL。這個 URL 形如：

```
wss://api.gladia.io/v2/live?token=<session-token>
```

連上這條 WebSocket 後，你即可傳送音訊塊、並接收文字／語音相關的各種事件。 ([docs.gladia.io][1])

---

## 📨 傳送（你 → Gladia）主用訊息類型

在這個 WebSocket 通道，你會用以下方式送訊息：

- **Audio Chunk (JSON 格式)**

  ```json
  {
    "type": "audio_chunk",
    "data": {
      "chunk": "…base64-encoded audio bytes…"
    }
  }
  ```

  用於把你錄製或捕捉到的音訊以 Base64 編碼送出。 ([docs.gladia.io][1])

- **Audio Chunk (Binary frame)**
  可直接送二進位形式音訊流（非 JSON）作為 frame。 ([docs.gladia.io][1])

- **Stop Recording**
  當你結束錄音／傳送音訊時，送出：

  ```json
  {
    "type": "stop_recording"
  }
  ```

  表示音訊串流結束，系統可進入後處理階段。 ([docs.gladia.io][1])

---

## 🎯 接收（Gladia → 你）主要訊息類型

當你連上並開始送音訊，Gladia 會透過 WebSocket 回傳各種事件。常見的有：

- **Start Session**
  表示 session 開啟。

  ````json
  {
    "session_id": "...",
    "created_at": "...",
    "type": "start_session"
  }
  ``` :contentReference[oaicite:5]{index=5}

  ````

- **Start Recording**
  開始錄音／音訊接收的事件。 ([docs.gladia.io][1])

- **Transcript**
  當系統辨識出一句話或部分話語時，傳回結果。例：

  ````json
  {
    "session_id": "...",
    "created_at": "...",
    "type": "transcript",
    "data": {
      "id": "…",
      "is_final": true|false,
      "utterance": {
        "start": 0,
        "end": 0.48,
        "confidence": 0.91,
        "channel": 0,
        "words": [
          {
            "word": "Hello",
            "start": 0,
            "end": 0.35,
            "confidence": 0.91
          },
          {
            "word": "world",
            "start": 0.36,
            "end": 0.48,
            "confidence": 0.91
          }
        ],
        "text": "Hello world.",
        "language": "en"
      }
    }
  }
  ``` :contentReference[oaicite:7]{index=7}
  - `is_final=false` 表示暫時逐字稿，`true` 表示定稿。
  - `utterance.words[]` 提供詞級（word-level）時間戳。
  - `channel` 表示如果你有多聲道音訊，可標註是哪條。

  ````

- **Speech Start / Speech End**
  錯識／句開始、結束的事件。例：

  ```json
  {
    "type": "speech_start",
    "data": { "time": 1.24, "channel": 0 }
  }
  ```

  ([docs.gladia.io][1])

- **Translation**
  若你設定即時翻譯功能，會收到翻譯後的 utterance。例：

  ````json
  {
    "type": "translation",
    "data": {
      "utterance_id": "utt_001",
      "utterance": { "text": "buenos días", "language": "es", "start": 4.2, "end": 6.1 },
      "original_language": "es",
      "target_language": "en",
      "translated_utterance": { "text": "good morning", "language": "en", "start": 4.2, "end": 6.1 }
    }
  }
  ``` :contentReference[oaicite:9]{index=9}

  ````

- **Named Entity Recognition (NER)**
  若你啟用該功能，會收到辨識出的實體（如人名、地名、組織）。例：

  ````json
  {
    "type": "named_entity_recognition",
    "data": {
      "utterance_id": "utt_002",
      "utterance": { "text": "meeting with Alice at 3pm", "start": 7, "end": 10.5 },
      "results": [
        { "entity_type": "PERSON", "text": "Alice", "start":2, … }
      ]
    }
  }
  ``` :contentReference[oaicite:10]{index=10}

  ````

- **Audio Chunk Acknowledgment**
  系統確認你送的音訊塊已接收。例：

  ````json
  {
    "type": "audio_chunk",
    "acknowledged": true,
    "data": {
      "byte_range": [0, 4095],
      "time_range": [0, 0.256]
    }
  }
  ``` :contentReference[oaicite:11]{index=11}

  ````

- **Stop Recording Acknowledgment**, **End Recording**, **End Session** 等監控流程結束的事件。 ([docs.gladia.io][1])

---

## 🔍 為你「做演講字幕」用途特別要注意的點

- 確保你 receiving `transcript` 訊息中 `is_final=true` 才把那句固化為字幕。暫時 (`is_final=false`) 可以先呈現預覽。
- 利用 `utterance.start` 和 `utterance.end`（或 `words[].start/end`）來定位字幕的時間碼／同步。
- 如你有中英交雜，請在 init 時設定 `language_config.code_switching = true`，連 WebSocket 也會將 `language` 欄位傳回。
- 若多聲道（講者 & 翻譯不同麥克風／不同軌道），可設定 `channels` >1，WebSocket 回的 `channel` 欄位可用來區分不同聲源。
- 切句／字幕延遲：因 `endpointing` 設太長可能導致你字幕產生延遲、設太短又可能中斷講者語句。WebSocket 模式中你收到的是 **即時逐字稿事件**，延遲在網路與音訊串流可能稍微變動。

---

如果你願意，我可以幫你 **抓出該頁面所有「訊息類型（type）＋欄位說明」** 做成 Markdown 表格（方便你做字幕系統對應），你要嗎？

[1]: https://docs.gladia.io/api-reference/v2/live/websocket?utm_source=chatgpt.com "Live WebSocket - Gladia"

這支端點 **`GET /v2/live/{id}`** 是 Gladia API 用於查詢 **即時轉寫（live transcription）任務的狀態、參數與最終結果** 的端點。下面是它的內容重點：

---

## ✅ 端點用途

當你透過 `POST /v2/live` 建立了一個即時轉寫 session（獲得一個 `id`），並經由 WebSocket 傳音訊完成後（或你想查看目前狀態／結果時），就呼叫 `GET /v2/live/{id}` 來：

- 查詢該 job 的 **目前狀態**（queued、processing、done、error）
- 查看該 job 當初使用的 **參數配置**（encoding、sample_rate、語言設定、自訂詞彙、自訂拼字、翻譯等）
- 若已完成 (`status = done`)，查看 **結果**：包含逐字稿全文 (`full_transcript`)、語句陣列、字幕檔(srt/vtt)、詞級時間戳、翻譯結果、語音通道資訊等。 ([docs.gladia.io][1])

---

## 🛠️ 請求細節

- **Method**：GET
- **Path**：`/v2/live/{id}`，其中 `{id}` 為你用 `POST /v2/live` 創建時回傳的 job ID。 ([docs.gladia.io][1])
- **Header**：需帶 `x-gladia-key: YOUR_API_KEY`（你的 API 金鑰）。 ([docs.gladia.io][1])
- **Response Codes**：

  - 200：請求成功並返回內容。
  - 401：未授權 / 金鑰錯誤。
  - 404：找不到該 `id`。 ([docs.gladia.io][1])

---

## 📋 回傳資料主要欄位

下面是一些你特別會用到、與「演講逐字稿／字幕」場景密切相關的欄位：

| 欄位              | 說明                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | 這個 job 的唯一識別碼。 ([docs.gladia.io][1])                                                                                                                                                 |
| `request_id`      | 調試／追蹤用的內部 ID。 ([docs.gladia.io][1])                                                                                                                                                 |
| `version`         | API 版本號。 ([docs.gladia.io][1])                                                                                                                                                            |
| `status`          | 任務目前狀態，可能是 `queued`、`processing`、`done`、`error`。 ([docs.gladia.io][1])                                                                                                          |
| `created_at`      | 任務建立的時間。 ([docs.gladia.io][1])                                                                                                                                                        |
| `completed_at`    | 若狀態為 `done` 或 `error` 時，這是任務結束的時間。 ([docs.gladia.io][1])                                                                                                                     |
| `custom_metadata` | 若你在 init 時有設定 `custom_metadata`，這裡會回傳你設的內容。對後續查詢／過濾有用。 ([docs.gladia.io][2])                                                                                    |
| `error_code`      | 若任務發生錯誤，這裡會有錯誤代碼（例如 HTTP 狀態碼）。 ([docs.gladia.io][1])                                                                                                                  |
| `file`            | 音訊檔案資料（時長、聲道數等）—對即時可能並非「上傳檔案」但這欄位仍可能包含轉錄時使用的音訊資訊。 ([docs.gladia.io][1])                                                                       |
| `request_params`  | 當初你用來建立這 session 的全部參數：如 encoding、sample_rate、channels、語言配置、自訂詞彙、自訂拼字、翻譯設定、訊息配置等。你可以用來確認「你請求的是什麼樣的設定」。 ([docs.gladia.io][1]) |
| `result`          | 如果狀態為 `done`，這裡會含有最終結果。包括：                                                                                                                                                 |

- `metadata`：如音訊長度、計費秒數、聲道數等。
- `transcription`：逐字稿資訊：`full_transcript`（整串文字）、`utterances[]`（每句／每段語句，含 start/end 時間、confidence、文字、語言、詞級時間）
- `subtitles[]`：如果你要求產生字幕（如 SRT 或 VTT 格式），這裡會提供 `format`（例如 “srt”）和 `subtitles`（文字內容）欄位。
- `translation`、`summarization`、`named_entity_recognition`、`sentiment_analysis`、`chapterization` 等：如果在 init 中有啟用這些功能，結果裡也會回傳相對應結果。 ([docs.gladia.io][1]) |

---

## 🎯 所以對你「即時語音逐字稿／演講字幕」的用處

- 當演講進行結束或某段錄音完成後，呼叫 `GET /v2/live/{id}` 你可以拿到最終的 **字幕檔（SRT/VTT）**，直接用來在螢幕上顯示或輸出給影片編輯組。
- 使用 `utterances` 裡的 `start` 和 `end` 值，來對應每句字幕的 **時間軸**，保證字幕與講者語音同步。
- `request_params` 可讓你回查你的設定（例如是否開了翻譯、是否開了 custom vocabulary、自訂拼字）是否是預期中的。
- `custom_metadata` 可讓你用來在多場演講中「標記」哪一場是哪一位講者、哪一場主題，便於後續查詢及管理。
- 若有錯誤（`status = error`），你能從 `error_code`、並可能查看 `result` 內錯誤訊息欄位來診斷。

---

若你願意，我可以幫你 **抓出該頁面完整的「返回 JSON 架構（schema）＋每個欄位說明」**，並標示哪些欄位你在字幕系統中最常用。要嗎？

[1]: https://docs.gladia.io/api-reference/v2/live/get?utm_source=chatgpt.com "Get result - Gladia"
[2]: https://docs.gladia.io/chapters/live-stt/features/custom-metadata?utm_source=chatgpt.com "Custom metadata - Gladia"
