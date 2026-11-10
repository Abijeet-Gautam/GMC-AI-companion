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
