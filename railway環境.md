太好，為了確保你「GitHub → Railway 自動部署」一路順暢，我幫你把**Railway 相容性檢查表**、**必要設定檔**與**最小可運行範例**都整理好了。照這份做，Cursor 產出的程式碼就能直接跑在 Railway 上。

---

# Railway 相容性檢查表（給 Cursor 落地用）

1. **服務監聽位址與埠**

- 後端必須 `listen 0.0.0.0`，且使用 `process.env.PORT`（由 Railway 注入）。任一固定埠（3000、8080…）在 Railway 都可能失敗。([Railway Docs][1])

2. **Config as Code（建議放在 repo root）**

- 在專案根目錄放 `railway.json`（或 `railway.toml`），定義 `deploy.startCommand`、`deploy.healthcheckPath`、可選的 build 設定。這些值會覆蓋面板上的設定，只影響當次部署。([Railway Docs][2])

3. **Docker vs Railpack（Nixpacks 已列為 Deprecated）**

- 專案若存在 `Dockerfile`，Railway 會**優先**用 Docker build；否則預設用 Railpack。選一種即可，不要同時給 Dockerfile 又期待 Railpack/Nixpacks 的設定生效。([Railway Docs][2])

4. **環境變數與密鑰**

- 在 Railway 的 Service/Project 層級設定：`GLADIA_API_KEY`、`DEEPL_API_KEY`、`ALLOWED_ORIGINS`（CORS）。這些變數在**建置和執行**階段都會注入。([Railway Docs][3])

5. **（若是 Monorepo）設定 Root Directory / 多服務 Start Command**

- 在服務設定頁指定 root 目錄；`railway.json/railway.toml` 的路徑要填**絕對路徑**（相對於 repo root）。不同服務可各有自己的 startCommand。([Railway Docs][4])

6. **Healthcheck**

- 後端提供 `/healthz` 或 `/health`，並在 `railway.json` 設定 `deploy.healthcheckPath`，避免「Application failed to respond」。([Railway Docs][1])

7. **WebSocket / Realtime**

- Railway 的代理可透明轉發 WebSocket；確保你的伺服器升級協議、維持心跳（ping/pong），通常就可工作。([HAProxy Technologies][5])

---

# 推薦的 repo 結構（單一服務，最單純好維護）

```
/ (repo root)
├─ package.json
├─ railway.json
├─ .env.example              # 只放鍵名，勿放真實值
├─ /client                   # React 前端（Vite/CRA 皆可）
│  └─ dist                   # build 後的靜態檔，交由後端靜態服務
├─ /server
│  ├─ src
│  │  ├─ index.ts            # Express 入口：/api/*、/healthz、WebSocket 代理/直連
│  │  └─ routes/*
│  └─ tsconfig.json
└─ /scripts
   └─ postbuild.cjs          # 可選：把 client/dist 複製到 server/dist/public
```

> 備註：用單一 Node 服務同時提供 API 與前端靜態檔，部署管理最簡單。若日後要拆分前後端，可改用 Monorepo + 兩個 Railway 服務。([Railway Docs][6])

---

# 必備檔案範例（可直接複製）

### 1) `railway.json`（Config as Code）

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "node server/dist/index.js",
    "healthcheckPath": "/healthz",
    "drainingSeconds": 10
  }
}
```

- `build.buildCommand`：交給 Railpack 在雲端執行（若你改用 Dockerfile，Railway 會忽略這個設定）。([Railway Docs][2])
- `deploy.startCommand`：等同在 UI 設定 Start Command。([Railway Docs][2])

### 2) `package.json`（位於 repo root）

```json
{
  "name": "realtime-interpreter",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "build": "npm --workspaces run build && node ./scripts/postbuild.cjs",
    "start": "node server/dist/index.js",
    "dev": "concurrently \"npm:dev:*\"",
    "dev:client": "npm --workspace client run dev",
    "dev:server": "npm --workspace server run dev"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

### 3) `server/src/index.ts`（Express 最小實作）

```ts
import express from "express";
import cors from "cors";
import path from "path";

const app = express();

// CORS：允許你的前端網域（若前後端同服務可收斂）
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || "*").split(","),
  })
);

app.use(express.json({ limit: "2mb" }));

// 健康檢查
app.get("/healthz", (_req, res) => res.status(200).send("OK"));

// 範例翻譯 API（轉呼叫 DeepL）
app.post("/api/translate", async (req, res) => {
  // TODO: 呼叫 DeepL，使用 process.env.DEEPL_API_KEY
  res.json({ translated_text: "..." });
});

// 範例逐字稿 API（轉呼叫 GLADIA Realtime / 或前端直連）
app.post("/api/transcribe", async (req, res) => {
  // TODO: 呼叫 GLADIA，使用 process.env.GLADIA_API_KEY
  res.json({ transcript: "..." });
});

// 服務靜態前端（若採單服務）
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
```

> 關鍵點：**一定**要 `listen("0.0.0.0", PORT)` 才符合 Railway。([Railway Docs][1])

### 4) `scripts/postbuild.cjs`（把前端打包結果放進後端）

```js
// 將 client/dist 拷貝到 server/dist/public
const { cpSync } = require("fs");
const { resolve } = require("path");
cpSync(
  resolve(__dirname, "../client/dist"),
  resolve(__dirname, "../server/dist/public"),
  { recursive: true }
);
```

### 5) `.env.example`（示意鍵名，值放 Railway Variables）

```
GLADIA_API_KEY=
DEEPL_API_KEY=
ALLOWED_ORIGINS=https://你的前端網域,https://其他允許來源
```

> 將以上鍵值在 Railway 的 **Variables** 設定；支援「表單新增」或 **RAW Editor** 貼上整段。([Railway Docs][3])

---

# （可選）改用 Dockerfile 的寫法

如果你偏好自控映像檔，提供這個最小可行 `Dockerfile`。只要專案有 `Dockerfile`，Railway 就會用它（忽略 Railpack build）。([Railway Docs][2])

```Dockerfile
# ---- Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci --workspaces
COPY . .
RUN npm run build

# ---- Runtime stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Railway 會在「執行時」注入 $PORT 等變數
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/server/node_modules ./server/node_modules
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
```

> 注意：若要在**建置階段**使用 Railway 變數，必須用 `ARG` 接收（大多數密鑰不建議在 build-time 使用）。([Railway Docs][7])

---

# GitHub → Railway 連動要點

- **連接 repo 與分支**、啟用自動部署（push/PR 即建置）。
- **（Monorepo）在 Service 設定 Root Directory** 只抓子資料夾；`railway.json`/`toml` 要用 repo 根目錄的**絕對路徑**指定。([Railway Docs][4])
- 若 UI 看不到 Start Command，請將它寫進 `railway.json` 的 `deploy.startCommand`。([Railway Help Station][8])

---

# WebSocket / Realtime 小提醒

- Railway 代理可處理 WebSocket 升級，通常不需要額外反向代理設定；專注在你的 server／客戶端維持心跳與正確的 `wss://` 端點即可。([HAProxy Technologies][5])

---

如果你願意，我也可以把上面的檔案改寫成**完整可跑的模板（含 React + Express 最小實作）**，讓你直接 push 到 GitHub 再在 Railway 綁定部署。

[1]: https://docs.railway.com/reference/errors/application-failed-to-respond?utm_source=chatgpt.com "Application Failed to Respond | Railway Docs"
[2]: https://docs.railway.com/reference/config-as-code "Config as Code | Railway Docs"
[3]: https://docs.railway.com/guides/variables?utm_source=chatgpt.com "Using Variables | Railway Docs"
[4]: https://docs.railway.com/guides/monorepo?utm_source=chatgpt.com "Deploying a Monorepo | Railway Docs"
[5]: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/?utm_source=chatgpt.com "WebSocket | HAProxy config tutorials"
[6]: https://docs.railway.com/tutorials/deploying-a-monorepo?utm_source=chatgpt.com "Deploying a Monorepo to Railway | Railway Docs"
[7]: https://docs.railway.com/guides/dockerfiles?utm_source=chatgpt.com "Build from a Dockerfile | Railway Docs"
[8]: https://station.railway.com/questions/dont-see-start-command-70ae8c46?utm_source=chatgpt.com "dont see start command - Railway Help Station"
