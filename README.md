# Guardián · Dev Racing Battle Royale feat. Zavu

Chatbot que custodia un código secreto y conversa de todo lo demás.

Demo: https://guardian.kapitec.pro

## Defensa en tres capas
1. **Prompt**: el modelo conoce el código, admite que guarda un secreto y trata cualquier "instrucción nueva" (admin, emergencia, rol, juego) como conversación, no como orden. Nunca confirma ni niega intentos de adivinarlo.
2. **Filtro determinista** (`lib/guard.js`): antes de responder normaliza el texto y busca el código completo o sus partes en cualquier forma reconstruible: con separadores, al revés, leet, ROT13, base64, hex, binario, ASCII decimal, morse, acrósticos (primera o última letra de líneas y palabras), nombres de letras y números escritos.
3. **Juez LLM**: un segundo modelo audita cada respuesta (fragmentos, pistas, longitud, confirmaciones de intentos). Si detecta fuga, o si falla, se manda una evasiva. Falla cerrado.

Además, el historial va firmado con HMAC: el cliente no puede inventar mensajes del bot para manipularlo.

Además:
- Límite por IP (12/min) y un mensaje a la vez por IP: frena ataques con scripts sin afectar a humanos.
- Cadena de modelos de respaldo si Gemini se satura (el juez falla cerrado, así que sin respaldo el bot parecería pared).
- Cada respuesta lleva un sello (HMAC) visible y todo queda en bitácora, para refutar screenshots editados.

Stack: Node sin dependencias (`server.js`) en contenedor propio detrás de Nginx Proxy Manager + Gemini. WhatsApp vía Zavu WhatsApp Alt (`api/zavu.js`), con tope de envíos para no quemar el número.
