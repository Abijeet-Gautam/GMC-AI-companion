# GMC AI Companion

A working local hackathon prototype for the Gelephu Mindfulness City Experience Centre. One Node.js service serves reception, mobile chat and staff tools. SQLite persists published content, feedback and short-lived conversation history.

## Start on Windows

Open PowerShell in this folder and run:

```powershell
npm install
npm start
```

Node.js 22.13 or newer is required. Open these pages after startup:

- Reception touchscreen: http://127.0.0.1:3000/screen
- Mobile companion: http://127.0.0.1:3000/chat
- Staff console: http://127.0.0.1:3000/admin

On the first local launch the app creates a random staff password in `data/staff-password.txt`. Read it locally with `Get-Content .\data\staff-password.txt` and use it to sign in. Set `STAFF_PASSWORD` in `.env` to override it. Treat this file and the database as private. Use a unique password of at least 12 characters.

## Enable the OpenAI chatbot

ChatGPT Plus does not include OpenAI API credits. Configure separate API billing on the [OpenAI Platform](https://platform.openai.com/settings/organization/billing/overview), then create a dedicated project API key.

Copy `.env.example` to `.env`, set `OPENAI_API_KEY` and restart. The default model is `gpt-5.4-mini` and the default cap is 200 provider calls per UTC day. No key is necessary for **Approved guide** mode, which returns relevant published passages, uses recent same-chamber context for simple follow-ups and redirects between chambers. OpenAI responses are labeled **OpenAI**. The app uses approved-guide mode when the provider is unavailable, reaches its cap or returns an answer without a valid source reference.

## Scan from a real phone

The default QR opens the local computer and will not reach this app from another phone. For a trusted private Wi-Fi demo, set `HOST=0.0.0.0` and `PUBLIC_BASE_URL=http://YOUR_COMPUTER_LAN_IP:3000` in `.env`. Restart and use the displayed URL. The phone and PC must be on the same reachable network, and Windows Firewall must allow the chosen port. Use HTTPS for public or shared-network use. Do not use the staff console over an untrusted HTTP connection.

For public deployment, put one Node service behind HTTPS, use the platform's port, set `HOST=0.0.0.0`, `PUBLIC_BASE_URL` to the exact HTTPS origin, and provide a strong `STAFF_PASSWORD`. Use a persistent writable volume for `DATA_DIR`, and keep the app to one instance with this SQLite setup. There is no hosted instance included. Production use calls for individual staff identities and approval of the source pack, accessibility, retention and operational controls.

## Demo and staff review

1. Open Reception in full-screen portrait mode. The QR opens Mobile Companion. A chamber selected in Explore creates a chamber-specific QR. Reception returns home after 60 seconds of inactivity.
2. Try a starter question in each of the four chambers. Ask about sectors while in The Vision to see the redirect to Economy of Tomorrow. Rate a response and submit overall satisfaction. Reception refreshes news and scores every 30 seconds.
3. Sign in as staff. Add a draft announcement, verify its content and publish. Official news can be entered manually using a verified GMC article link or imported from the fixed GMC home page as drafts. Imported titles are inferred from article links and must be verified. The website can change or be unreachable, so manual entry remains available.
4. In Feedback Inbox, review the note and cited sources. In Knowledge, draft a correction to an existing entry and publish it after reviewing the source. The prior version is archived. Re-run the question and resolve the feedback item. Ratings remain separate from the knowledge workflow.
5. Use **Start a new visit** to clear that session’s conversation. The app removes expired sessions and their chat history, and clears optional feedback comments after 30 days. Numeric ratings and aggregate engagement persist. The app asks visitors to avoid sharing personal information.

## Verification

```powershell
npm test
```

The smoke test starts a temporary database and checks the local pages, QR response, all chambers, redirects and session isolation, ratings, staff access, news publication and a reviewed knowledge revision. It does not make a billable OpenAI request or fetch GMC news. Test on the physical touchscreen and a phone before presenting.

