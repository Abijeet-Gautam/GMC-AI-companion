# OpenAI on the local host

The Next.js Node server can call OpenAI while the website and SQLite database run on your laptop. An internet connection and an API key with access to the configured model are required. The offline fallback remains available without either.

1. Create an API key in your OpenAI project: https://platform.openai.com/api-keys.
2. Open `.env.local` in the project root (alongside `package.json`). Keep the existing staff password and encryption key. Set:

```dotenv
AI_MODE=auto
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-6-luna
AI_TIMEOUT_MS=15000
```

3. Restart `npm run dev`. For a production server, restart `npm run start` after building the app.
4. Submit a safe note at `/join`. A successful provider call labels the private reply “OpenAI reply”. A missing key, provider error or timeout uses a clearly labelled “Offline reply”. The staff dashboard also records provider successes and fallbacks.

The key stays on the Node server. Never prefix it with `NEXT_PUBLIC_`, put it in browser code, share it with visitors, or commit `.env.local` (the file is already ignored). You do not need to paste the key into a chat.

For phones on the same Wi-Fi, visit `http://YOUR_LAPTOP_IP:3000/join`. Open `/display` using that LAN address as well, so its scan code points at the laptop rather than the phone's own localhost. `npm run dev` already listens on all network interfaces. A local firewall may need to allow port 3000.

One structured Responses request produces the public leaf, chamber number, and private reply; input and both output texts are moderated. Notes are treated as data rather than instructions. The private reply is encrypted alongside the private note in local SQLite for idempotent retries. It is excluded from public leaf reads, the live display, and shared keepsakes. The browser tab keeps a receipt and reply to recover after refreshing.

Official references: [developer quickstart](https://developers.openai.com/api/docs/quickstart), [API authentication](https://developers.openai.com/api/reference/overview), and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

The default is now `gpt-6-luna`, the official replacement for GPT-4o mini. This small structured request uses `reasoning.effort=none`. An explicitly configured model in an existing `.env.local` is preserved; change `OPENAI_MODEL` if you want to use the new default. The former GPT-4o mini default is scheduled to shut down on January 14, 2027. See the [official deprecation schedule](https://developers.openai.com/api/docs/deprecations) and [Luna model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna). Model access depends on your OpenAI project.
