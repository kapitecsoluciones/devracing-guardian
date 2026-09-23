import { guardReply, sign } from "../lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST" });
  const { history, message } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "message" });
  const { reply, blocked } = await guardReply(history, message);
  if (blocked) console.log("blocked:", blocked, JSON.stringify(message).slice(0, 200));
  res.status(200).json({ reply, sig: sign(reply) });
}
