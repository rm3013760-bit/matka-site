const TOKEN = "matka-demo-2026";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-sync-token",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

async function ensureTable(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)").run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (path === "/api/health") return json({ ok: true });

    if (path === "/api/state" && request.method === "GET") {
      await ensureTable(env);
      const rows = await env.DB.prepare("SELECT key, value FROM kv").all();
      const data = {};
      for (const r of rows.results) data[r.key] = r.value;
      return json({ ok: true, data });
    }

    if (path === "/api/state" && request.method === "PUT") {
      if (request.headers.get("x-sync-token") !== TOKEN) return json({ ok: false, message: "Invalid token" }, 403);
      let body;
      try { body = await request.json(); } catch (e) { return json({ ok: false, message: "Bad body" }, 400); }
      await ensureTable(env);
      for (const [k, v] of Object.entries(body || {})) {
        if (!k.startsWith("matka.") || k === "matka.live_results") continue;
        const value = typeof v === "string" ? v : JSON.stringify(v);
        await env.DB.prepare("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, value).run();
      }
      return json({ ok: true });
    }

    if (path === "/live_results.json") {
      await ensureTable(env);
      const row = await env.DB.prepare("SELECT value FROM kv WHERE key = 'matka.live_results'").first();
      return new Response(row ? row.value : "{}", {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
      });
    }

    if (path === "/api/live" && request.method === "PUT") {
      if (request.headers.get("x-sync-token") !== TOKEN) return json({ ok: false, message: "Invalid token" }, 403);
      const body = await request.text();
      try { JSON.parse(body); } catch (e) { return json({ ok: false, message: "Bad body" }, 400); }
      await ensureTable(env);
      await env.DB.prepare("INSERT INTO kv(key, value) VALUES('matka.live_results', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(body).run();
      return json({ ok: true, bytes: body.length });
    }

    if (env.ASSETS) {
      const resp = await env.ASSETS.fetch(request);
      if (resp.status === 404 && url.pathname === "/") {
        return new Response("Not found", { status: 404 });
      }
      return resp;
    }
    return new Response("Not found", { status: 404 });
  }
};