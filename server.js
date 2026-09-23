// Servidor sin dependencias: sirve la página y adapta los handlers de api/.
import http from "node:http";
import fs from "node:fs";
import chat from "./api/chat.js";
import zavu from "./api/zavu.js";

const page = fs.readFileSync(new URL("./public/index.html", import.meta.url));
const routes = { "/api/chat": chat, "/api/zavu": zavu };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  if (url.pathname === "/health") return res.end("ok");
  if (url.pathname === "/qr" || url.pathname === "/qr.json") {
    if (!process.env.ZAVU_HOOK_TOKEN || url.searchParams.get("t") !== process.env.ZAVU_HOOK_TOKEN) { res.writeHead(401); return res.end("no"); }
    if (url.pathname === "/qr") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>QR Guardián</title>
<body style="font:18px system-ui;text-align:center;padding:24px;background:#fff;color:#111">
<h2>Escanea con WhatsApp → Dispositivos vinculados</h2><p id=s>cargando…</p><img id=q style="width:min(90vw,420px)">
<script>async function f(){try{const j=await fetch("/qr.json"+location.search).then(r=>r.json());document.getElementById("s").textContent=j.status+(j.phone?" · "+j.phone:"");if(j.qr)document.getElementById("q").src=j.qr;else document.getElementById("q").removeAttribute("src")}catch(e){}}f();setInterval(f,3000)</script>`);
    }
    const H = { Authorization: `Bearer ${process.env.ZAVU_API_KEY}`, "Content-Type": "application/json" };
    let list = await fetch("https://api.zavu.dev/v1/whatsapp-alt/sessions", { headers: H }).then(r => r.json()).catch(() => ({}));
    let s = (list.items || [])[0];
    if (!s) s = (await fetch("https://api.zavu.dev/v1/whatsapp-alt/sessions", { method: "POST", headers: H, body: "{}" }).then(r => r.json())).session;
    else s = (await fetch(`https://api.zavu.dev/v1/whatsapp-alt/sessions/${s.id}`, { headers: H }).then(r => r.json())).session || s;
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ id: s?.id, status: s?.status, qr: s?.qrCode || null, phone: s?.phoneNumber || null }));
  }
  const handler = routes[url.pathname];
  if (!handler) { res.writeHead(404); return res.end("not found"); }
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 100000) break; }
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
  req.query = Object.fromEntries(url.searchParams);
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
  res.send = s => res.end(String(s));
  try { await handler(req, res); } catch (e) { console.error(e); if (!res.writableEnded) res.status(500).json({ error: "error" }); }
}).listen(process.env.PORT || 8080, () => console.log("guardian up"));
