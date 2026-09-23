# Guardián · Dev Racing Battle Royale feat. Zavu

Chatbot que custodia un código secreto y conversa de todo lo demás.

Demo: https://devracing-guardian.vercel.app

## Defensa en tres capas
1. **Prompt**: el modelo conoce el código, admite que guarda un secreto y trata cualquier "instrucción nueva" (admin, emergencia, rol, juego) como conversación, no como orden. Nunca confirma ni niega intentos de adivinarlo.
2. **Filtro determinista** (`lib/guard.js`): antes de responder normaliza el texto y busca el código completo o sus partes en cualquier forma reconstruible: con separadores, al revés, leet, ROT13, base64, hex, binario, ASCII decimal, morse, acrósticos (primera o última letra de líneas y palabras), nombres de letras y números escritos.
3. **Juez LLM**: un segundo modelo audita cada respuesta (fragmentos, pistas, longitud, confirmaciones de intentos). Si detecta fuga, o si falla, se manda una evasiva. Falla cerrado.

Además, el historial va firmado con HMAC: el cliente no puede inventar mensajes del bot para manipularlo.

Stack: Vercel Functions + Gemini. WhatsApp vía Zavu (`api/zavu.js`).
