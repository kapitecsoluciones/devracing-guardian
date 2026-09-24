import { guardReply, sign } from "../lib/guard.js";

// Límite por IP: 12 mensajes por minuto. Evita que un script acapare el servicio.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter(t => now - t < 60000);
  w.push(now); hits.set(ip, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 12;
}
// Un mensaje a la vez por IP: un humano no manda en paralelo, un script sí.
const inflight = new Set();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST" });
  const ip = String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  if (limited(ip)) {
    const reply = "Vas muy rápido, tómate un respiro. Sigo aquí para platicar (y sigo sin soltar el código).";
    return res.status(200).json({ reply, sig: sign(reply) });
  }
  const { history, message } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "message" });
  if (inflight.has(ip)) {
    const reply = "Un mensaje a la vez, que te estoy contestando el anterior.";
    return res.status(200).json({ reply, sig: sign(reply) });
  }
  inflight.add(ip);
  let out;
  try { out = await guardReply(history, message); } finally { inflight.delete(ip); }
  const { reply, blocked } = out;
  // Bitácora completa: sirve para refutar screenshots editados.
  console.log("chat", JSON.stringify({ t: new Date().toISOString(), ip, blocked: blocked || false, q: message.slice(0, 500), a: reply, sig: sign(reply).slice(0, 8) }));
  res.status(200).json({ reply, sig: sign(reply) });
}
