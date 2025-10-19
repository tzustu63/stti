沒問題！你已經升級到 **DeepL API Pro**，下面給你一份「快速設定＋重要參數」的懶人包（含 cURL / Python / Node.js 範例），以及常見最佳做法與踩坑提醒。所有要點都以 **Pro** 版本為主。

---

# 一、快速設定（Pro）

1. 取得 API Key

- 登入 DeepL 帳戶後，在「API keys」頁籤複製金鑰（完整值僅能複製時看得到）。([support.deepl.com][1])

2. 使用 Pro 網域

- **Pro**：`https://api.deepl.com`
- **Free**（僅對照用）：`https://api-free.deepl.com`。 ([developers.deepl.com][2])

3. 你的第一個請求（cURL）

```bash
curl -X POST "https://api.deepl.com/v2/translate" \
  -H "Authorization: DeepL-Auth-Key YOUR_API_KEY" \
  -d "text=早安，今天心情如何？" \
  -d "target_lang=EN-US"
```

- 這支 `/v2/translate` 是文字翻譯主力端點。([developers.deepl.com][3])

4. 官方 SDK / Postman

- DeepL 提供 Python、Node.js、.NET、PHP、Ruby、Java 等官方套件，且有公開的 Postman 集合可以直接測。([deepl.com][4])

---

# 二、最重要、最常用的可調參數（/v2/translate）

> 端點文件：**Translate Text API reference**（建議加到書籤）。([developers.deepl.com][3])

- `text`（必填）：要翻譯的文字；可傳陣列，一次最多 50 筆並維持順序。([GitHub][5])
- `target_lang`（必填）：目標語言，例如 `EN-US`、`JA`、**繁中：`ZH-HANT`**、簡中：`ZH-HANS`。**注意不是 `zh-TW` / `zh-CN`**。([developers.deepl.com][6])
- `source_lang`（選填）：來源語言；不填會自動偵測。支援清單可用 `/v2/languages` 取得。([developers.deepl.com][6])
- `formality`：`default` / `more` / `less`（僅部分語言支援），控制語氣正式度。([developers.deepl.com][7])
- `split_sentences`：句子切分策略

  - `0`：完全不切（常用在你已經分好句的情境）
  - `1`：預設（標點＋換行切）
  - `nonewlines`：忽略換行，只依標點切。([developers.deepl.com][3])

- `preserve_formatting`：`0/1`，盡量保留大小寫、換行等格式。([developers.deepl.com][3])
- `context`：提供額外上下文影響翻譯，但**不會被翻譯也不計費**；屬 alpha 功能（可能調整/變更）。用於歧義詞改善品質很有效。([developers.deepl.com][8])
- `glossary_id`：指定術語庫（詞彙固定對應）；Glossary 支援語對需先查 `/glossary-language-pairs`。([developers.deepl.com][9])
- **HTML/XML 處理**

  - `tag_handling=html` 啟用 HTML 模式
  - `outline_tags` / `ignore_tags` / `non_splitting_tags`：精細控制哪些標籤要翻、不翻、或避免在其中切句。([developers.deepl.com][10])

---

# 三、文件翻譯（/v2/document）— 三步驟

1. 上傳：`POST /v2/document` → 回傳 `document_id` 與 `document_key`（**你必須保存**，之後查狀態／下載都要用）。
2. 查狀態：`GET /v2/document/{id}`（帶 `document_key`）
3. 下載：`POST /v2/document/{id}/result`（帶 `document_key`）

- 伺服器會立即用**唯一金鑰加密文件**，金鑰不會長存於伺服器端。不同檔型有大小上限，.docx/.pptx 可用官方套件自動壓縮媒體以避開上限。([developers.deepl.com][11])

---

# 四、用量與成本控管（Pro）

- 查詢本期用量與上限：`GET /v2/usage`（Postman 也有現成請求）。([developers.deepl.com][12])
- 計費以**原文字元**（Unicode code point）計算；即使 `source_lang==target_lang` 也會計數。([developers.deepl.com][13])
- **Cost control**：可在後台設定上限；達上限後 API 會停止處理直到下個計費期。([support.deepl.com][14])
- Pro 沒固定月量上限，屬「隨用隨付」，建議主動監控用量避免費用暴衝。([wwagner.net][15])

---

# 五、實作範例

## cURL（HTML ＋術語庫＋上下文）

```bash
curl -X POST "https://api.deepl.com/v2/translate" \
  -H "Authorization: DeepL-Auth-Key YOUR_API_KEY" \
  -d "text=<p>本校綠能課程</p><p>淨零人才培育</p>" \
  -d "target_lang=EN-US" \
  -d "tag_handling=html" \
  -d "glossary_id=YOUR_GLOSSARY_ID" \
  -d "context=此為大學官方課程說明，請使用學術/正式風格"
```

（參數與用法見官方參考與 HTML 指南、context 說明。）([developers.deepl.com][3])

## Python（官方套件）

```python
# pip install deepl
import deepl

translator = deepl.Translator("YOUR_API_KEY")
res = translator.translate_text(
    "感恩與環保志工服務說明", target_lang="EN-US",
    formality="more", split_sentences="nonewlines",
    context="Tzu Chi University volunteer briefing; formal tone"
)
print(res.text)
```

（官方提供多語言 SDK；參數對應 API。）([deepl.com][4])

## Node.js（fetch）

```js
const params = new URLSearchParams({
  text: "請於週末參與校內環保活動",
  target_lang: "ZH-HANT",
  formality: "less",
  split_sentences: "1",
});
const r = await fetch("https://api.deepl.com/v2/translate", {
  method: "POST",
  headers: { Authorization: "DeepL-Auth-Key YOUR_API_KEY" },
  body: params,
});
console.log(await r.json());
```

（目標語言代碼請用 `ZH-HANT` 表示繁體中文。）([developers.deepl.com][16])

---

# 六、Glossary（術語庫）重點

- 建立：`POST /v2/glossaries`，可用 `tsv`/`csv` 內容建立；回傳 `glossary_id`。
- 查可用語對：`GET /v2/glossary-language-pairs`。
- 讀取／刪除／列舉 glossary 條目：`/v2/glossaries/{id}/entries`。
- 每個帳戶有不同數量上限（Pro 高很多）。([developers.deepl.com][9])

---

# 七、最佳實務與常見坑

- **中文代碼**：繁體用 `ZH-HANT`、簡體 `ZH-HANS`；不要用 `zh-TW`/`zh-CN` 以免報錯或不支援。([developers.deepl.com][16])
- **先分句再傳**：若你前端已做分句，請設 `split_sentences=0`，避免 DeepL 再切造成對齊錯亂。([developers.deepl.com][3])
- **HTML/富文本**：含標籤請加 `tag_handling=html`，並用 `ignore_tags` 避開不該翻的區塊（例如 `<code>`、品牌名 span）。([developers.deepl.com][10])
- **上下文（context）**：對專有名詞/歧義用詞很有幫助，但屬 **alpha**（介面可能調整）；字元 **不計費**。([developers.deepl.com][8])
- **文件大小與加密**：不同副檔名有上限；文件上傳即被以唯一金鑰加密，金鑰需你端保存。([developers.deepl.com][17])
- **用量監控**：以 `/v2/usage` 拉資料做警戒或報表；設定後台成本上限避免超支。([developers.deepl.com][12])

---

# 八、你可能會用到的 API 索引

- 文字翻譯：`POST /v2/translate`（主文件）([developers.deepl.com][3])
- 語言清單：`GET /v2/languages?type=source|target`（含 formality 支援資訊）([developers.deepl.com][7])
- 文件翻譯：`/v2/document`（上傳／查狀態／下載）([developers.deepl.com][18])
- Glossary：建立／語對／讀寫條目等（v2/v3 端點依文件）([developers.deepl.com][9])
- 用量／額度：`GET /v2/usage`（含 Pro 期間起迄）([developers.deepl.com][19])

---

需要我幫你把 **Tzu Chi 大學的常用詞彙**（如「淨零」、「感恩」、「環保志工」…）整理成一份 TSV 檔、直接上傳建立 Glossary 嗎？我可以先依你提供的詞表生出檔案與上傳指令給你。

[1]: https://support.deepl.com/hc/en-us/articles/360020695820-API-key-for-DeepL-API?utm_source=chatgpt.com "API key for DeepL API – DeepL Help Center | How Can We Help You? - DeepL Translator"
[2]: https://developers.deepl.com/api-reference/glossaries?utm_source=chatgpt.com "Monolingual glossaries (v2 endpoints) - DeepL Documentation"
[3]: https://developers.deepl.com/api-reference?utm_source=chatgpt.com "Translate Text - DeepL Documentation"
[4]: https://www.deepl.com/zh/pro-api?cta=&utm_source=chatgpt.com "DeepL 使用 API Pro 进行翻译和写作"
[5]: https://github.com/rdwz/deepl-translator-go-api-client/blob/main/docs/TranslatingTextApi.md?plain=1&utm_source=chatgpt.com "deepl-translator-go-api-client/docs/TranslatingTextApi.md at main · rdwz/deepl-translator-go-api-client - GitHub"
[6]: https://developers.deepl.com/docs/api-reference/languages?utm_source=chatgpt.com "Retrieve languages - DeepL Documentation"
[7]: https://developers.deepl.com/api-reference/languages/retrieve-supported-languages?utm_source=chatgpt.com "Retrieve supported languages - DeepL Documentation"
[8]: https://developers.deepl.com/docs/best-practices/working-with-context?utm_source=chatgpt.com "Translation context - DeepL Documentation"
[9]: https://developers.deepl.com/api-reference/glossaries/create-a-glossary?utm_source=chatgpt.com "Create a glossary - DeepL Documentation"
[10]: https://developers.deepl.com/docs/xml-and-html-handling/html?utm_source=chatgpt.com "HTML handling - DeepL Documentation"
[11]: https://developers.deepl.com/docs/api-reference/document/openapi-spec-for-document-translation?utm_source=chatgpt.com "Upload and translate a document - DeepL Documentation"
[12]: https://developers.deepl.com/docs/api-reference/usage-and-quota?utm_source=chatgpt.com "Retrieve usage and quota - DeepL Documentation"
[13]: https://developers.deepl.com/docs/resources/usage-limits?utm_source=chatgpt.com "Usage and limits - DeepL Documentation"
[14]: https://support.deepl.com/hc/en-us/articles/360020685580-Cost-control-and-usage-limit?utm_source=chatgpt.com "Cost control and usage limit – DeepL Help Center | How Can We Help You? - DeepL Translator"
[15]: https://wwagner.net/en/blog/a/deepl-api-keep-an-eye-on-character-consumption?utm_source=chatgpt.com "DeepL API: Keep an eye on character consumption"
[16]: https://developers.deepl.com/docs/resources/language-release-process?utm_source=chatgpt.com "Language release process - DeepL Documentation"
[17]: https://developers.deepl.com/docs/best-practices/document-translations?utm_source=chatgpt.com "Document translations - DeepL Documentation"
[18]: https://developers.deepl.com/api-reference/document?utm_source=chatgpt.com "Translate documents - DeepL Documentation"
[19]: https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits?utm_source=chatgpt.com "Check usage and limits - DeepL Documentation"
