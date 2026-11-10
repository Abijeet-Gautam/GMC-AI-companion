# The Living Tree of GMC

A local hackathon app for the GMC Experience Centre: scan one QR, share an anonymous aspiration, watch a leaf join the reception tree, and discover a related chamber.

**Next.js 16, React 19, TypeScript, Tailwind 4, shadcn-style components with Radix, local SQLite, OpenAI Responses and Moderation APIs.** One Node server serves phones, display, staff console and API.

## Start

Use **Node 22.13+ in the 22.x line**, or a newer supported release. The built-in SQLite warning on Node 22 is expected.

```powershell
npm install
npm run setup
npm run dev
```

Open http://localhost:3000. Setup creates `.env.local` with a random staff password in `ADMIN_PASSWORD`. It preserves an existing password and does not print it. SQLite initializes and migrates automatically, keeping existing starter leaves.

| Route        | Experience                                                       |
| ------------ | ---------------------------------------------------------------- |
| `/`          | Introduction, live tree preview, theme shortcuts                 |
| `/join`      | Theme selection, aspiration, consent, result                     |
| `/display`   | Reception tree, QR, queued leaf arrivals, reflection, fullscreen |
| `/leaf/[id]` | Public keepsake, sharing/copy fallback, downloadable SVG         |
| `/chambers`  | Four-chamber guide and suggested thematic pathways               |
| `/privacy`   | Participation, external processing, cookies and retention        |
| `/admin`     | Staff sign-in, hide/restore, demo data, counts and reflection    |

## Enable OpenAI

Set `OPENAI_API_KEY` in `.env.local`, leave `AI_MODE=auto`, and restart. `OPENAI_MODEL` defaults to `gpt-4o-mini` and can be changed to a model supporting Responses structured output.

Free text passes local checks, `omni-moderation-latest`, structured generation, schema validation and final output moderation before persistence. Keys stay server-side. Generation requests use `store: false`.

The integration follows the official [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and [Moderation](https://developers.openai.com/api/docs/guides/moderation) documentation.

No key, `AI_MODE=offline`, provider failure, malformed output or timeout activates the **curated offline fallback**. It uses keywords and the chosen theme to select a prewritten safe leaf. It never publishes raw input and labels its mode on the result. Moderation rejections never become fallback approvals. Local patterns are conservative and do not replace semantic moderation; curated output avoids exposing arbitrary visitor text.

Automated tests exercise the OpenAI integration using a local protocol mock. Verify live account/model access using your own key before presenting.

## Phones and display

1. Connect the host laptop, phones and display to the same Wi-Fi.
2. Find the laptop's Wi-Fi IPv4 address using `ipconfig`.
3. Open `http://YOUR-LAPTOP-IP:3000/display` on the display. The QR derives its address from that browser URL.
4. Scan from a phone. Allow Node through the private-network firewall if Windows prompts.
5. Optionally set `NEXT_PUBLIC_APP_URL` to a fixed browser-reachable address and restart/rebuild. Leave it blank for automatic origin detection.

`localhost` on a phone means the phone itself. Use the laptop IP. UUID generation and the share-link fallback work on LAN HTTP; native sharing/clipboard depend on browser support and a secure context.

For a stable presentation:

```powershell
npm run build
npm start
```

Run one Node server and one SQLite file. Static export cannot run the backend. Keep the database on the host disk, not a shared network drive. The offline experience needs no internet after dependencies are installed.

## Staff tools

Sign into `/admin` using `ADMIN_PASSWORD` from `.env.local`. Signed HttpOnly SameSite sessions expire after eight hours. Changing the password and restarting invalidates sessions. Login attempts are limited.

- Load 24 labelled demo leaves; repeated loading preserves that demo set.
- Hide/restore a leaf; hidden leaves return 404 publicly and disappear from connected displays.
- Remove demo leaves while keeping visitor contributions.
- Search/filter recent leaves, view theme and AI/fallback counts, and refresh reflection.

Staff operations are audited locally. The console shows up to 500 recent records. The public tree renders up to 120 leaves; older approved leaves remain in SQLite and can be retrieved with cursor pagination or keepsake URLs.

## Reliability and privacy

- Unique request keys and fingerprints protect retries. Changed content with an old key returns 409. Concurrent retries share one in-flight task in the single server process.
- SSE sends database snapshots when the revision changes, with 15-second reconciliation. The display queues arrivals and reconciles removals.
- Display caching stores approved public data for up to a day. Connection loss keeps the tree visible. A disconnected screen learns about removals after reconnecting.
- Default rate limits: five attempts per signed browser cookie per ten minutes, plus 60 global attempts per minute. Cookies can be cleared, so this is hackathon abuse control rather than bot-proof identity.
- Application code stores no raw aspirations or visitor IP addresses. SQLite holds approved leaves, anonymous request fingerprints, counters and staff actions. See `/privacy` for provider processing and retention details.
- WAL, transactions, constraints and server timestamps protect persistence. Day counts use Asia/Thimphu.
- Reflections describe participating visitors' themes, not a representative survey. Demo leaves are flagged throughout.
- Chamber names follow the report. Descriptions and thematic pathways are project interpretations awaiting GMC review; the official chamber page could not be retrieved.

## Code map

```text
src/app/                 Pages and API routes
src/features/home/       Introduction and live preview
src/features/join/       Guided mobile submission
src/features/display/    SVG tree, animation queue, QR and kiosk
src/features/leaf/       Result, share and SVG download
src/features/admin/      Staff console
src/components/ui/       Local shadcn-style components
src/lib/                 Types, catalog, schemas and browser helpers
src/hooks/use-tree.ts    SSE, reconciliation, offline state and cache
src/server/db/           SQLite migration, queries and transactions
src/server/services/     OpenAI, moderation, fallback and reflection
src/server/auth.ts       Signed sessions and authorization
src/server/http.ts       Bounded body parsing and origin checks
scripts/                 Setup, smoke test and isolated test servers
tests/                   Browser, API and mocked OpenAI tests
data/                    Ignored SQLite files
docs/                    API, team ownership and demonstration guide
```

`components.json` configures shadcn aliases. Use `npx shadcn@latest add ...` to extend the component library.

## Validate

```powershell
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The suite starts isolated servers on 3100/3101, a provider mock on 3102, and timestamped databases under `data/tests/`. It never uses the real API key or event database. Ports must be free. Reports and screenshots are ignored in `playwright-report/` and `test-results/`.

`npm run test:smoke` runs against an existing server (`TEST_BASE_URL` overrides localhost:3000). It creates six real test leaves in that database. Prefer the isolated suite for clean event data.

See [API contract](docs/API.md), [team ownership](docs/TEAM_TASKS.md), and [demo guide](docs/DEMO.md).
