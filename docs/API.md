# API contract

Mutations accept JSON and reject mismatched browser Origins. Staff mutations require a signed staff session. Public reads never expose raw aspirations, request fingerprints, idempotency keys or staff data.

## POST /api/contributions

```json
{
  "aspiration": "I hope students can learn new skills.",
  "theme": "education",
  "consent": true,
  "idempotencyKey": "81f21d10-d81b-4c1f-9f94-8fa26344a37c"
}
```

Themes: `nature`, `innovation`, `education`, `community`, `wellbeing`, `culture`. Aspiration is NFKC-normalized, trimmed, 3–200 characters, without hidden/control characters. Body limit: 4096 bytes. Use one UUID per logical submission and reuse it on retry. Edited content needs a new key. Classification may refine the selected theme.

Success: 201 for a new leaf, 200 for replay. Mismatched content with an old key returns 409; hidden leaves return 410.

```json
{
  "mode": "offline",
  "leaf": {
    "id": "server-generated-uuid",
    "category": "education",
    "leaf_message": "May every learner have the skills and opportunities to shape tomorrow.",
    "chamber_id": 3,
    "chamber_reason": "Your hope connects with learning, innovation and opportunities for tomorrow.",
    "created_at": "2026-11-10T06:00:00.000Z",
    "mode": "offline",
    "is_demo": false
  }
}
```

`mode`: `openai` or `offline`. Errors `{error,code}`: 400 invalid input, 403 cross-origin, 409 key conflict, 410 hidden, 413 oversized, 415 wrong content type, 422 moderation rejection, 429 throttled, 500 server failure. Rate responses include `Retry-After` and `retryAfter` seconds.

## GET /api/leaves

Default: `{leaves,total,stats,reflection,revision,serverTime}`. Up to 120 approved leaves ordered by `(created_at DESC,id DESC)`.

Snapshots also include `settings`, the current public tree appearance and submission availability. Private messages never appear in snapshots or streams.

Historical pagination: `?limit=60&cursor=...` returns `{leaves,nextCursor}`. Limit: 1–120. Cursor is the opaque token from the prior response. Hidden records are excluded.

## GET /api/leaves/:id

`{leaf}` for approved records; 404 for missing/hidden. `/leaf/:id` is the public HTML keepsake.

## GET /api/tree/stream

SSE event `tree` contains the default leaves snapshot. Event ID is the database revision. Initial connections and reconnections receive full capped snapshots. Clients deduplicate by leaf ID. Comment heartbeats keep connections active. Reconnection delay is two seconds; database revisions are checked every 750ms.

## GET /api/tree/stats

`{total,today,demo,categories}`. All approved counts; day boundary uses Asia/Thimphu. Demo leaves count in totals and are separately identified.

## GET /api/tree/reflection

`{reflection:null}` or `{reflection:{body,mode,created_at}}`. Generated from aggregate theme counts after approved inserts and staff actions; cached until the tree changes.

## GET /api/health

`{status:"ok",database:"sqlite",ai:"offline"|"openai",serverTime}`. AI indicates configuration, not provider reachability. Returns 503 if database checks fail.

## Staff session

- `GET /api/admin/session`: `{authenticated,configured}`.
- `POST /api/admin/session`: `{password}`; sets an eight-hour signed HttpOnly SameSite cookie.
- `DELETE /api/admin/session`: signs out.

## Staff operations

`GET /api/admin` returns the recent 500 leaves including status, stats, provider configuration, counters and last 30 audit actions.

`POST /api/admin` accepts:

```json
{ "action": "status", "id": "leaf-uuid", "status": "hidden" }
```

```json
{ "action": "status", "id": "leaf-uuid", "status": "approved" }
```

```json
{ "action": "seed" }
```

```json
{ "action": "clear_demo" }
```

```json
{ "action": "reflect" }
```

Success: `{ok:true}`. Seed preserves an existing demo set. Clear deletes only demo records. Unauthenticated requests return 401. There is no unauthenticated reset endpoint.

## Tree settings

- `GET /api/tree/settings`: public `{settings}` for visitor availability and display rendering.
- `GET /api/admin/tree`: authenticated settings read.
- `PUT /api/admin/tree`: authenticated full `TreeSettings` object, validated in `src/lib/tree-settings.ts`. Returns `{settings}` and increments the public revision so SSE displays update. Invalid settings return 400.

Settings cover species, palette, seed, maturity, density, wind, rotation, quality, renderer, headline and `acceptingContributions`. Pausing returns 503 / `TREE_PAUSED` for new contributions; accepted-key replays can recover existing receipts.

## Private visitor history

Consent now covers private staff review of original words. Successes and moderation rejections are recorded once by idempotency key. Contact-like emails, numbers and links are redacted before AES-256-GCM encryption. Public leaves contain no originals.

- `GET /api/admin/submissions?page=1&query=&outcome=all`: authenticated, 25 rows per page; returns `{submissions,total,page,pages}`. Outcome: all/approved/rejected. Server-side search includes original words, leaf text and selected theme.
- `DELETE /api/admin/submissions` with `{id}`: deletes that private record, hides the linked leaf, and audits the action. Accepted-leaf idempotency records remain so retries cannot republish removed content.

History includes message, selected theme, outcome, moderation reason, timestamp and linked leaf/status. Older starter leaves have no original words to recover. Demo leaves do not invent visitor messages.
