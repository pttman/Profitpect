import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { recognize } from "./recognize.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const requests = new Map();
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  const origin = req.headers.origin;
  const allowed = [
    "https://app.xiaozhang.local",
    "http://127.0.0.1:8787",
    "http://localhost:8787",
    "http://127.0.0.1:5173",
    process.env.PUBLIC_ORIGIN,
  ]
    .filter(Boolean)
    .includes(origin);
  if (origin && !allowed) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/api/recognize") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (
      req.method !== "POST" ||
      !req.headers["content-type"]?.startsWith("application/json")
    ) {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "请使用 JSON POST 请求" }));
      return;
    }
    const now = Date.now();
    for (const [key, item] of requests)
      if (item.until < now) requests.delete(key);
    const key = req.socket.remoteAddress;
    const rate = requests.get(key) ?? { count: 0, until: now + 60000 };
    rate.count++;
    requests.set(key, rate);
    if (rate.count > 15) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: "请求较多，请稍后重试" }));
      return;
    }
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192)
          throw Object.assign(new Error("描述过长"), { status: 413 });
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw Object.assign(new Error("请求格式无效"), { status: 400 });
      }
      const entry = await recognize(input.text, {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL,
      });
      res.writeHead(200);
      res.end(JSON.stringify(entry));
    } catch (err) {
      const status = err.status ?? 502;
      res.writeHead(status);
      res.end(
        JSON.stringify({
          error: err.status
            ? err.message
            : "云端 AI 响应超时或暂不可用，请稍后重试",
        }),
      );
    }
    return;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost");
    const name = decodeURIComponent(url.pathname);
    const target = resolve(dist, "." + (name === "/" ? "/index.html" : name));
    if (!target.startsWith(resolve(dist) + sep)) throw new Error();
    const data = await readFile(target);
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
    };
    res.setHeader(
      "Content-Type",
      (types[extname(target)] ?? "application/octet-stream") +
        "; charset=utf-8",
    );
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(
  Number(process.env.PORT || 8787),
  process.env.HOST || "127.0.0.1",
  () => console.log("小账岛服务已启动，端口 " + (process.env.PORT || 8787)),
);
