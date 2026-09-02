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

function readBody(req, maxBytes) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > (maxBytes || 8 * 1024 * 1024)) req.destroy();
    });
    req.on("end", () => resolve(raw));
    req.on("error", () => resolve(""));
  });
}

function commitAndPush(msg) {
  // Fire-and-forget: commit new/updated files and push to GitHub (mirrors commit-push.sh).
  const { execFile } = require("child_process");
  const repo = __dirname + "/..";
  const token = (() => { try { return fs.readFileSync(path.join(__dirname, "actions", "gh-token"), "utf8").trim(); } catch { return ""; } })();
  if (!token) { record("upload commit skipped (no token)"); return; }
  const run = (cmd, args, dir) => new Promise((resolve) => { execFile(cmd, args, { cwd: dir, timeout: 60000 }, (e) => resolve(!e)); });
  (async () => {
    await run("git", ["add", "-A"], repo);
    await run("git", ["-c", "credential.helper=", "commit", "-q", "-m", msg], repo);
    const url = "https://oauth2:" + token + "@github.com/rm3013760-bit/matka-site.git";
    await run("git", ["-c", "credential.helper=", "push", "-q", url, "master"], repo);
    record("upload git commit/push done: " + msg);
  })().catch((e) => record("upload git push error " + (e && e.message)));
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
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
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
  if (req.method === "POST" && p === "/api/upload/video") {
    if (req.headers["x-sync-token"] !== TOKEN) {
      record("POST /api/upload/video REJECTED (bad token)");
      send(res, 403, { ok: false, message: "Invalid sync token" });
      return;
    }
    const raw = await readBody(req, 10 * 1024 * 1024);
    let title, b64, ext = "mp4";
    try {
      const body = JSON.parse(raw);
      title = String(body.title || "How to Play").trim().slice(0, 120) || "How to Play";
      b64 = String(body.base64 || "");
      if (body.ext) ext = String(body.ext).replace(/[^a-z0-9]/gi, "").toLowerCase();
    } catch (e) { send(res, 400, { ok: false, message: "Bad body" }); return; }
    if (!b64 || !/^data:/.test(b64)) { send(res, 400, { ok: false, message: "No file data (expects base64 data URL)" }); return; }
    const comma = b64.indexOf(",");
    const mime = b64.slice(5, comma).split(";")[0];
    if (!/video\/(mp4|webm|ogg)/.test(mime)) { send(res, 400, { ok: false, message: "Unsupported type: " + mime }); return; }
    ext = mime.replace("video/", "") || ext;
    const buf = Buffer.from(b64.slice(comma + 1), "base64");
    const maxBytes = 8 * 1024 * 1024;
    if (buf.length === 0 || buf.length > maxBytes) {
      send(res, 413, { ok: false, message: "Video must be under 8 MB" });
      return;
    }
    const id = "v" + Date.now();
    const file = id + "." + ext;
    const dir = path.join(ROOT, "assets", "videos");
    fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(path.join(dir, file), buf);
    } catch (e) {
      record("upload WRITE FAIL " + (e && e.message));
      send(res, 500, { ok: false, message: "Could not write file" });
      return;
    }
    const url = "/assets/videos/" + file;
    const st = readStore();
    let meta;
    try { meta = JSON.parse(st["matka.videos"]); } catch { meta = null; }
    if (!Array.isArray(meta)) meta = [];
    meta.push({ title, file, url, size: buf.length, id });
    st["matka.videos"] = JSON.stringify(meta);
    writeStore(st);
    fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify({ videos: meta }));
    record("POST /api/upload/video saved " + file + " (" + buf.length + " bytes)");
    send(res, 200, { ok: true, file, url, id, count: meta.length });
    commitAndPush("auto: add video " + file);
    return;
  }
  if (req.method === "POST" && p === "/api/delete/video") {
    if (req.headers["x-sync-token"] !== TOKEN) {
      record("POST /api/delete/video REJECTED (bad token)");
      send(res, 403, { ok: false, message: "Invalid sync token" });
      return;
    }
    let id = "";
    try { id = JSON.parse(await readBody(req, 1 * 1024 * 1024)).id; } catch { send(res, 400, { ok: false, message: "Bad body" }); return; }
    const st = readStore();
    let meta; try { meta = JSON.parse(st["matka.videos"]); } catch { meta = null; }
    if (!Array.isArray(meta)) { send(res, 404, { ok: false, message: "None found" }); return; }
    const hit = meta.find((m) => m.id === id);
    const rest = meta.filter((m) => m.id !== id);
    if (hit) {
      try { fs.unlinkSync(path.join(ROOT, "assets", "videos", hit.file)); } catch {}
      st["matka.videos"] = JSON.stringify(rest);
      writeStore(st);
      fs.writeFileSync(path.join(ROOT, "assets", "videos", "index.json"), JSON.stringify({ videos: rest }));
      record("POST /api/delete/video " + id);
      send(res, 200, { ok: true, count: rest.length });
      commitAndPush("auto: remove video " + id);
    } else {
      send(res, 404, { ok: false, message: "Not found" });
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
setTimeout(() => liveFetcher.refreshAll().catch(() => {}), 5 * 1000);