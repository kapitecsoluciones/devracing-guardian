import { guardReply, sign } from "../lib/guard.js";

// Historial por contacto (best effort: vive mientras la función siga caliente).
const threads = new Map();
const seen = new Set();
const sent = new Map();
const sentAll = [];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");
  if (process.env.ZAVU_HOOK_TOKEN && req.query.t !== process.env.ZAVU_HOOK_TOKEN) return res.status(401).send("no");
  const ev = req.body || {};
  const d = ev.data || {};
  if (ev.type !== "message.inbound" || !d.from || seen.has(d.messageId)) return res.status(200).json({ ok: true });
  // Solo chats 1 a 1: nunca contestar en grupos ni a mensajes propios.
  const isGroup = d.isGroup || d.groupId || d.group || /@g\.us$/.test(String(d.from)) || /@g\.us$/.test(String(d.chatId || ""));
  if (isGroup || d.fromMe) { console.log("wa skip group/self"); return res.status(200).json({ ok: true }); }
  console.log("wa in keys:", Object.keys(d).join(","));
  if (d.messageId) seen.add(d.messageId);
  if (seen.size > 20000) seen.clear();
  if (threads.size > 5000) threads.clear();
  // Tope de envíos para no quemar el número: 6/min por contacto y 30/min en total.
  const now = Date.now();
  const mine = (sent.get(d.from) || []).filter(t => now - t < 60000);
  while (sentAll.length && now - sentAll[0] > 60000) sentAll.shift();
  if (mine.length >= 6 || sentAll.length >= 30) { console.log("wa throttled"); return res.status(200).json({ ok: true }); }
  mine.push(now); sent.set(d.from, mine); sentAll.push(now);
  if (sent.size > 2000) sent.clear();
  const text = d.text || d.caption || (d.messageType ? `[El usuario mandó un ${d.messageType}]` : "");
  if (!text) return res.status(200).json({ ok: true });

  const history = threads.get(d.from) || [];
  const { reply, blocked } = await guardReply(history, text);
  console.log("wa", JSON.stringify({ t: new Date().toISOString(), from: d.from, blocked: blocked || false, q: text.slice(0, 500), a: reply }));
  history.push({ role: "user", text }, { role: "assistant", text: reply, sig: sign(reply) });
  threads.set(d.from, history.slice(-12));

  const r = await fetch("https://api.zavu.dev/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ZAVU_API_KEY}`,
      "Content-Type": "application/json",
      "Zavu-Sender": ev.senderId,
    },
    body: JSON.stringify({ to: d.from, channel: d.channel || "whatsapp_alt", text: reply }),
  });
  if (!r.ok) console.error("zavu send", r.status, (await r.text()).slice(0, 300));
  res.status(200).json({ ok: true });
}
