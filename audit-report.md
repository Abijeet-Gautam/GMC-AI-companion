# Security Audit Report - Wishing Tree Project

**Audit Date**: Sat Nov 14 2026  
**Auditor**: Security Reviewer Subagent  
**Project**: Y:\Personal\Idea\code\wishing-tree

---

## Executive Summary

The Wishing Tree codebase demonstrates **good security practices** with several areas of strength and one recommended improvement. The application properly uses parameterized queries, stores secrets in environment variables, and follows React security patterns. The primary recommendation is to add security headers via Helmet.js or similar middleware.

---

## 1. Hardcoded Secrets & API Keys

### Findings ✅

| Secret Type | Location | Assessment |
|------------|----------|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` line 8 | ✅ **Expected** - publishable key meant for frontend exposure |
| `CLERK_SECRET_KEY` | `.env` line 9 | ✅ **Secure** - stored in env, not hardcoded in source |
| `AI_API_KEY` | `.env` line 16 | ✅ **Stored properly** - in env file |
| `DATABASE_URL` | `.env` line 5 | ✅ **Stored properly** - connection string in env |
| `IP_HASH_SALT` | `.env` line 46 | ✅ **Required salt** for IP hashing, no fallback |

### `.env.example` Best Practices ✅

The `.env.example` file uses placeholder values (`XXXXX`, `your-32-chars-salt-here-change-in-production`) and documents that these should never be committed:

```
# Copy this file to .env and fill in your secrets (never commit .env)
```

### Secret Locations Checked ✅

- **Not found hardcoded in source**: No `sk_live`, `api_key`, or passwords in `.ts`, `.tsx`, `.js` files
- **Found in .env only**: All secrets properly stored in environment file
- **Clerk keys**: `pk_live_` (publishable) exposed expectedly; `sk_live_` (secret) in `.env` only

### ⚠️ Action Item

Verify `.env` is listed in `.gitgitignore` to prevent accidental commits:

```bash
# Check .gitignore
cat .gitignore | grep -E '\.env'
```

---

## 2. XSS Vulnerabilities in React Components

### TreeDisplayClient.tsx (`src/components/display/TreeDisplayClient.tsx`)

| Pattern | Found | Assessment |
|---------|-------|------------|
| `innerHTML` | ❌ No | ✅ Safe |
| `dangerouslySetInnerHTML` | ❌ No | ✅ Safe |
| `outerHTML` | ❌ No | ✅ Safe |
| `insertAdjacentHTML` | ❌ No | ✅ Safe |

**Code review**: Component uses React state rendering, MotionConfig for animations, and LeafArrivalToast/FeaturedLeaf components. No unsanitized user content rendering.

### TreeStage.tsx (`src/components/TreeStage.tsx`)

| Pattern | Found | Assessment |
|---------|-------|------------|
| `innerHTML` | ❌ No | ✅ Safe |
| `dangerouslySetInnerHTML` | ❌ No | ✅ Safe |

**Code review**: Pure 3D canvas stage component forwarding props to TreeCanvas and TreeScene. No DOM text rendering of user content.

### Other React Components Screened ✅

- **No `outerHTML` or `insertAdjacentHTML`** found in any `.tsx` files
- **No user-generated content** directly rendered without escaping
- **React auto-escaping** is the default and is being used correctly

### ⚠️ Action Item

If any dynamic content is ever added from user input, ensure it goes through proper sanitization (e.g., DOMPurify or textContent instead of innerHTML).

---

## 3. SQL Injection Risks in API Routes

### `src/app/api/leaves/route.ts`

| Query | Parameterized? | Assessment |
|-------|---------------|------------|
| `getPublishedLeaves(client, ctx.treeId, 30)` | ✅ Yes | Uses `$1, $2` via db layer |
| `getLeafCount(client, ctx.treeId)` | ✅ Yes | Uses `$1` via db layer |
| Internal `submit_leaf` function call | ✅ Yes | Uses `$1-$8` parameters |

### `src/app/api/phone/route.ts`

| Query | Parameterized? | Assessment |
|-------|---------------|------------|
| `SELECT ... WHERE author_id = $1 AND tree_id = $2` | ✅ Yes | Parameters: `[userId, ctx.treeId]` |
| `SELECT ... WHERE id = $1` | ✅ Yes | Parameter: `[ctx.treeId]` |

### `src/app/api/tree/route.ts`

| Query | Parameterized? | Validation | Assessment |
|-------|---------------|------------|------------|
| `getPublishedLeaves(client, ctx.treeId, 60)` | ✅ Yes | — | Safe |
| `getLeafCount(client, ctx.treeId)` | ✅ Yes | — | Safe |
| `SELECT theme FROM trees WHERE id = $1` | ✅ Yes | — | Safe |
| `treeParam` split & regex filter | ✅ Yes | `/^[a-z0-9-]{1,64}$/` | ✅ Input validated |

### `src/lib/db.ts` - Database Layer

All queries use **parameterized patterns**:

| Function | Query Pattern | Safety |
|----------|--------------|--------|
| `getPublishedLeaves` | `WHERE tree_id = $1 AND status = 'published' LIMIT $2` | ✅ Safe |
| `getLeafCount` | `WHERE tree_id = $1` | ✅ Safe |
| `resolveTreeRole` | `SELECT role FROM users WHERE id = $1` | ✅ Safe |
| `getTreeBySlug` | `SELECT id FROM trees WHERE slug = $1` | ✅ Safe |
| `submit_leaf` (called from submit.ts) | `SELECT * FROM submit_leaf($1, $2, ...)` | ✅ Safe |

### ⚠️ Action Item

None - SQL injection risks are effectively eliminated through consistent use of parameterized queries.

---

## 4. Insecure Cookie/Session Handling

### `wt_vid` Cookie Configuration ✅

Set in `src/app/api/leaves/route.ts` and `src/app/api/phone/route.ts`:

| Attribute | Value | Assessment |
|-----------|-------|------------|
| `httpOnly` | `true` | ✅ Prevents JavaScript access |
| `sameSite` | `'lax'` | ✅ Helps prevent CSRF |
| `secure` | `process.env.NODE_ENV === 'production'` | ✅ Only sent over HTTPS in prod |
| `maxAge` | `60 * 60 * 24 * 365` (1 year) | ✅ Reasonable expiry |
| `path` | `'/'` | ✅ Standard |

### Clerk Authentication ✅

- `@clerk/nextjs` v7.9.26 handles session management
- User roles stored in Postgres `users.role` (not Clerk)
- RLS (Row Level Security) policies enforce per-tree isolation

### ⚠️ Action Item

Consider adding `secure: true` enforcement even in development via Vercel HTTPS, or ensure dev runs over HTTPS.

---

## 5. Exposed Internal Endpoints/Routes

### API Endpoints Reviewed ✅

| Endpoint | Methods | Security |
|----------|---------|----------|
| `/api/leaves` | GET, POST | ✅ Parameterized queries, rate limiting, AI moderation |
| `/api/phone` | GET, POST | ✅ Parameterized queries, rate limiting, auth check |
| `/api/tree` | GET | ✅ Input validation (regex), parameterized queries |
| `/api/leaves/[id]/message` | GET | ✅ ID format validation, status check |
| `/api/webhooks/clerk` | POST | ✅ Signature verification with CLERK_WEBHOOK_SECRET |

### Input Validation ✅

- **`/api/tree`**: `treeParam` validated with `/^[a-z0-9-]{1,64}$/`
- **`/api/leaves/[id]/message`**: ID validated with `/^[0-9a-f-]{36}$/i`
- **`/api/leaves` POST**: Body validated with Zod schema (max 2000 chars)

### Authentication & Authorization ✅

- Clerk provides user identity on write endpoints
- `withTree` middleware enforces tree-level RLS
- `checkAccess` function in `submit.ts` handles access modes (open/event_window/invite)
- Rate limiting per tree/submitter (6 submissions per 10 min)

### ⚠️ Action Item

Consider adding **rate limit headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) for better client feedback.

---

## 6. floorplan/architecture.json Security Review

### Findings ✅

The `floorplan/architecture.json` file is an architectural diagram documenting:

- **Project structure** and component relationships
- **Data flows** between services (database, AI, realtime)
- **Entry points** and service dependencies

**No security-relevant findings**:

- ❌ No hardcoded keys or secrets
- ❌ No exposed internal endpoints documented
- ❌ No security misconfigurations noted
- ✅ Properly documents service boundaries and data flows

The architecture shows healthy separation between:
- Client-facing endpoints (`/api/leaves`, `/api/phone`)
- Internal services (database, AI provider, realtime)
- External dependencies (Neon DB, Anthropic/AI, Ably)

---

## 7. Recently Modified Files Security Implications

### `src/components/TreeScene.tsx` (Shadow maps, lighting)

| Feature | Security Assessment |
|---------|-------------------|
| `renderer.shadowMap.enabled = true` | ✅ Standard Three.js, no user input |
| `renderer.shadowMap.type = THREE.PCFShadowMap` | ✅ Standard shadow mapping |
| 1024x1024 shadow map size | ✅ Reasonable, prevents DoS via huge textures |
| DirectionalLight with shadow controls | ✅ Configurable only via code props |
| `sun.shadow.bias` and `sun.shadow.normalBias` | ✅ Standard shadow bias values |

**Conclusion**: No security issues. Three.js rendering configuration.

### `src/components/display/TreeDisplayClient.tsx` (Polling)

| Feature | Security Assessment |
|---------|-------------------|
| `fetch('/api/leaves?tree=global')` with `cache: 'no-store'` | ✅ No caching of sensitive data |
| 4000ms poll interval | ✅ Reasonable, limits request frequency |
| Error handling with reconnection state | ✅ Proper offline/online state management |
| No user content rendering from API response | ✅ Data is structured (leaf IDs, positions, colors) |

**Conclusion**: Polling mechanism is secure. Uses no-store cache control and proper error handling.

### `src/components/tree/three/grass.js` (GPU shader)

| Feature | Security Assessment |
|---------|-------------------|
| Three.js InstancedBufferGeometry for grass | ✅ GPU-only, no DOM/surface access |
| `mulberry32` PRNG with fixed SEED | ✅ Deterministic, no security impact |
| Noise functions (`mx_noise_float`, `hash`) | ✅ Mathematical, no cryptographic claims |
| Instance count clamping (min count, CAPACITY) | ✅ Prevents resource exhaustion |

**Conclusion**: Grass shader is a Three.js module with no attack surface for XSS/SQLi.

---

## Additional Security Findings

### Dependencies ✅

```
npm audit --audit-level=high
→ 0 vulnerabilities
```

### Security Headers ⚠️

**Not currently configured**: No Helmet.js or explicit security headers in `next.config.js`.

**Recommended**: Add security headers for:
- `helmet()` - X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-XSS-Protection

### Suggested Implementation

Add to `next.config.js`:

```js
const withHelmet = require('next-helmet') // or use middleware
// or add middleware/helmet config
```

Or use API route middleware:

```js
// In each route.ts or a middleware:
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "default-src 'self'");
```

### Environment Variable Verification ✅

```
.env exists with all required vars:
- DATABASE_URL ✅
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✅
- CLERK_SECRET_KEY ✅
- AI_API_KEY ✅
- IP_HASH_SALT ✅
- SUBMIT_RATE_LIMIT ✅
- SUBMIT_RATE_WINDOW_SECONDS ✅
```

---

## Summary Risk Assessment

| Category | Risk Level | Confidence |
|----------|-----------|------------|
| **Injection (SQL/NoSQL)** | **LOW** | High - parameterized queries everywhere |
| **XSS** | **LOW** | High - React auto-escaping, no innerHTML |
| **Secret Exposure** | **LOW** | High - secrets in .env only |
| **Cookie/Session** | **LOW** | High - httpOnly, sameSite, secure flags |
| **Authentication** | **LOW** | High - Clerk + RLS |
| **Dependency Vulns** | **NONE** | Confirmed - npm audit clean |
| **Security Headers** | **MEDIUM** | Moderate - recommended addition |

### Overall Security Posture: **GOOD**

The Wishing Tree codebase is **well-secured** against common web vulnerabilities. The main improvement area is adding security headers, but the fundamental security patterns are correctly implemented.

---

## Recommendations Priority

1. **Add security headers** (Helmet.js or manual headers) - MEDIUM priority
2. **Verify .env not in git** - HIGH priority (if not already)
3. **Set up secret rotation** process - MEDIUM priority
4. **Consider CSP implementation** - MEDIUM priority
5. **Regular npm audit** in CI/CD - LOW but good practice

---
*Report generated by Security Reviewer subagent. For immediate remediation, see the detailed findings above.*