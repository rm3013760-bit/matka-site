const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STORE_FILE = path.join(__dirname, "store.json");
const PORT = Number(process.env.PORT || 8777);
const TOKEN = "matka-demo-2026";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data));
}

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS"
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 8 * 1024 * 1024) req.destroy();
    });
    req.on("end", () => resolve(raw));
    req.on("error", () => resolve(""));
  });
}

function serveStatic(req, res, urlPath) {
  let filePath = path.join(ROOT, urlPath);
  if (filePath.endsWith("/")) filePath += "index.html";
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      if (filePath.endsWith("index.html")) {
        serveStatic(req, res, "/app.html");
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(buf);
  });
}

function record(log) {
  fs.appendFileSync(path.join(__dirname, "server.log"), new Date().toISOString() + " " + log + "\n");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + req.headers.host);
  const p = url.pathname;
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS"
    });
    res.end();
    return;
  }
  if (req.method === "GET" && p === "/api/state") {
    record("GET /api/state");
    send(res, 200, { ok: true, data: readStore() });
    return;
  }
  if (req.method === "PUT" && p === "/api/state") {
    if (req.headers["x-sync-token"] !== TOKEN) {
      record("PUT /api/state REJECTED (bad token)");
      send(res, 403, { ok: false, message: "Invalid sync token" });
      return;
    }
    const body = await readBody(req);
    try {
      const incoming = JSON.parse(body);
      if (typeof incoming !== "object" || incoming === null) throw new Error("not object");
      const store = readStore();
      for (const k of Object.keys(incoming)) {
        if (typeof incoming[k] === "string" && k.startsWith("matka.") && k !== "matka.live_results") store[k] = incoming[k];
      }
      writeStore(store);
      record("PUT /api/state keys=" + Object.keys(incoming).length);
      send(res, 200, { ok: true, keys: Object.keys(incoming).length });
    } catch (e) {
      record("PUT /api/state BAD BODY " + e.message);
      send(res, 400, { ok: false, message: "Bad body" });
    }
    return;
  }
  if (req.method === "GET" && p === "/api/health") {
    send(res, 200, { ok: true, app: "matkalive-sync" });
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    if (fs.existsSync(path.join(ROOT, p === "/" ? "index.html" : p.slice(1)))) {
      serveStatic(req, res, p === "/" ? "/index.html" : p);
      return;
    }
    if (fs.existsSync(path.join(ROOT, "app.html"))) {
      serveStatic(req, res, "/app.html");
      return;
    }
  }
  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("MatkaLive sync server on http://0.0.0.0:" + PORT);
  console.log("Data file: " + STORE_FILE);
  fs.appendFileSync(path.join(__dirname, "server.log"), new Date().toISOString() + " server started on port " + PORT + "\n");
});

const liveFetcher = require("./fetch-results.js");
const LIVE_INTERVAL = 20 * 60 * 1000;
setTimeout(() => liveFetcher.refreshAll().catch(() => {}), 5 * 1000);
setInterval(() => liveFetcher.refreshAll().catch(() => {}), LIVE_INTERVAL);