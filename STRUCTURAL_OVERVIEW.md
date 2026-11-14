# Wishing Tree Project Structural Overview

## 1. Top-Level Directory Structure

```
Y:\Personal\Idea\code\wishing-tree\                                    (root)
├── .git/                                                             (git repo)
├── .next/                                                              (Next.js build output)
├── AGENTS.md                                                           (agent instructions)
├── audit-report.md                                                     (audit report)
├── debug.mjs                                                           (debug script)
├── DELIVERY_STATUS.txt                                                 (delivery status)
├── FLOORPLAN.md                                                        (floorplan guide)
├── db/                                                                 (database migration files)
├── floorplan/                                                          (architecture visualization)
│   ├── architecture.json                                               (full floorplan graph)
│   ├── descriptions/                                                   (component descriptions)
│   ├── graph.json                                                      (graph scan metadata)
│   ├── index.html                                                      (interactive floorplan HTML)
│   ├── omniroute-ask.mjs                                               (Ask engine handler)
│   ├── page-safety.mjs                                                 (page safety checks)
│   ├── query.mjs                                                       (query handler)
│   └── recent-work.json                                                (recent work state)
├── node_modules/                                                       (dependencies)
├── package.json                                                        (project config, 35 deps + 14 devDeps)
├── package-lock.json                                                   (exact dependency versions)
├── playwright/                                                         (E2E test config)
├── public/                                                             (static assets)
├── scripts/                                                            (maintenance scripts)
│   ├── audit-shots.mjs                                                 (shot audit)
│   ├── cleanup_test_leaves.mjs                                         (test cleanup)
│   ├── migrate.mjs                                                     (DB migration)
│   ├── reset_schema.mjs                                                (DB reset)
│   ├── setup_schema.mjs                                                (DB setup)
│   └── verify_db.mjs                                                   (DB verification)
├── src/                                                                (source code)
│   ├── app/                                                            (Next.js App Router pages & API routes)
│   │   ├── page.tsx                                                    (home page - /)
│   │   ├── layout.tsx                                                  (root layout)
│   │   ├── tree/                                                       (/tree display)
│   │   │   └── page.tsx                                                (tree display page)
│   │   ├── phone/                                                      (/phone wish submission)
│   │   │   └── page.tsx                                                (phone form page)
│   │   ├── leaf/[id]/                                                    (/leaf/[id] keepsake)
│   │   │   └── page.tsx                                                (leaf keepsake page)
│   │   ├── admin/                                                      (empty - reserved)
│   │   ├── studio/                                                     (empty - reserved)
│   │   └── superadmin/                                                 (empty - reserved)
│   ├── components/                                                     (React UI components)
│   │   ├── display/                                                    (/tree display screen)
│   │   │   ├── TreeDisplayClient.tsx                                   (main display screen)
│   │   │   ├── TreeStage.tsx                                           (2D/3D stage manager)
│   │   │   ├── TreeScene.tsx                                           (3D WebGPU canvas)
│   │   │   ├── TreeControls.tsx                                        (camera/rotate/zoom controls)
│   │   │   ├── FeaturedLeaf.tsx                                        (showcased wish)
│   │   │   ├── LeafArrivalToast                                        (new wish notifications)
│   │   │   └── ConnectionStatus                                        (connection state pill)
│   │   ├── tree/                                                       (3D tree engine)
│   │   │   └── three/                                                  (vendored three.js modules)
│   │   │       ├── bounds.js, falling-leaves.js, foliage.js, grass.js,
│   │       │   ├── hologram.js, lod.js, oak.js, regenerate.js, shading.js,
│   │       │   └── wind.js                                               (procedural tree modules)
│   │   ├── home/                                                       (home experience)
│   │   │   └── HomeExperience.tsx                                      (home page component)
│   │   ├── keepsake/                                                   (leaf keepsake cards)
│   │   │   ├── LeafKeepsakeClient.tsx                                  (main keepsake view)
│   │   │   ├── LeafCanvas.tsx                                          (high-res card renderer)
│   │   │   ├── LeafMeta.tsx                                            (meta info display)
│   │   │   ├── AIMessage.tsx                                           (AI reflection)
│   │   │   ├── ChamberFact.tsx                                         (community wisdom)
│   │   │   ├── DownloadButtons.tsx                                     (PNG/SVG download)
│   │   │   ├── ShareButton.tsx                                         (share dialog)
│   │   │   └── ShortCode.tsx                                           (short code display)
│   │   ├── home/                                                       (home components)
│   │   │   └── HomeExperience.tsx                                      (home page)
│   │   ├── PhoneForm.tsx                                               (4-step wish submission form)
│   │   ├── RecentLeaves.tsx                                            (recent wish feed)
│   │   ├── LeafGlyph.tsx                                               (leaf silhouette glyph)
│   │   ├── Nav.tsx                                                     (navigation bar)
│   │   ├── Footer.tsx                                                  (site footer)
│   │   ├── ConfettiBurst.tsx                                           (success celebration)
│   │   └── ui/                                                         (shared UI primitives)
│   │       ├── Badge.tsx, Button.tsx, Card.tsx, Checkbox.tsx, cn.ts, Input.tsx,
│   │       │   Textarea.tsx, Toast.tsx                                  (primitives)
│   ├── lib/                                                            (core services & utilities)
│   │   ├── db.ts                                                       (Neon Postgres client + RLS)
│   │   ├── types.ts                                                    (type definitions)
│   │   ├── growth.ts                                                   (growth ratio calculation)
│   │   ├── leafPaths.ts                                                (leaf shape SVG paths)
│   │   ├── leaves.ts                                                   (leaf query functions)
│   │   ├── submit.ts                                                   (wish submission flow)
│   │   ├── rateLimit.ts                                                (rate limiting middleware)
│   │   ├── realtime.ts                                                 (SSE/Ably realtime transport)
│   │   ├── auth.ts                                                     (Clark integration)
│   │   ├── time.ts                                                     (time ago formatting)
│   │   └── themes.ts                                                   (canopy theme definitions)
│   ├── data/                                                           (static data)
│   │   └── quotes.ts                                                   (quote data)
│   └── globals.css                                                     (global design system)
├── vercel.json                                                         (Vercel deployment config)
├── next-config.js                                                      (Next.js configuration)
├── tsconfig.json                                                       (TypeScript configuration)
├── vitest.config.mts                                                   (Vitest test config)
├── test-results/                                                       (test output)
├── tests/                                                              (unit tests)
│   ├── core.simple.test.ts                                             (simple core test)
│   └── core.test.ts                                                    (core test suite)
├── .env                                  (environment variables)
├── .env.example                                                        (env vars template)
└── README.md                                                           (project readme)
```

**File counts (source files only):**
- `src/app/`: 8 files (pages + API route directories)
- `src/components/`: 28 files (including subdirectories)
- `src/components/tree/three/`: 14 Three.js module files
- `src/lib/`: 14 utility files
- `src/lib/ai/`: 7 AI pipeline files
- `floorplan/`: 11 files (architecture + descriptions + HTML)
- **Total source files: ~115+**

---

## 2. Main Entry Points & Page Flow

### Page Hierarchy

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` (`src/app/page.tsx`) | `HomePage` | Home showcase with global leaf count, HomeExperience, Nav, Footer |
| `/tree` (`src/app/tree/page.tsx`) | `TreePage` | Main canopy display with 3D scene, polling, featured leaf, recent wishes |
| `/phone` (`src/app/phone/page.tsx`) | `PhonePage` | 4-step wish submission form (theme → body → consent) |
| `/leaf/[id]` (`src/app/leaf/[id]/page.tsx`) | `LeafKeepsakeClient` | Personal keepsake card for a submitted wish |
| `/admin`, `/studio`, `/superadmin` | (empty) | Reserved paths, no routes defined |

### Page Flow: How /tree Works

1. **`TreePage`** (`src/app/tree/page.tsx`) renders the display screen
2. Calls `getDisplayState()` which queries the database via `withTree('global', null, ...)`
3. Fetches leaf count + recent published leaves (limit 30) + stored theme
4. Passes data to `<TreeDisplayClient>` which is the main display component
5. `<TreeDisplayClient>` polls `/api/leaves?tree=global` every 4 seconds (`POLL_MS = 4000`)
6. The polling drives:
   - Count updates
   - Leaf state management (arrival queue → batch release → featured leaf)
   - Connection status indicator
   - Recent leaves feed
   - Arrival toast notifications

### Page Flow: How /phone Works

1. **`PhonePage`** renders a 4-step form
2. Steps: (1) Choose theme, (2) Write aspiration, (3) Agree to share, (4) Submit
3. On submit → `POST /api/phone` → `submitAspiration()` → database + AI moderation
4. If published, background `generateMessageForLeaf(leafId)` creates AI reflection
5. Client polls `/api/leaves/${leafId}/message` every 1.6s for up to 10 polls
6. On success: confetti, keepsake link, share options

### Page Flow: How /leaf/[id] Works

1. **`generateMetadata`** resolves Open Graph metadata from the leaf
2. **`LeafKeepsakePage`** renders `<LeafKeepsakeClient leaf={leaf} />`
3. Displays high-res leaf canvas, meta info, AI reflection, download/share options

---

## 3. Key Component Directories & Purposes

### `src/components/display/` — The /tree Display Screen

- **`TreeDisplayClient.tsx`**: Main orchestration component. Polls API, manages arrival queue, featured leaf, recent feed, connection status. Coordinates the 3D scene via `SceneController`.
- **`TreeStage.tsx`**: Stage manager. Provides smooth transition between instant 2D canvas poster and interactive 3D scene. The 2D canvas (`TreeCanvas`) paints immediately; 3D (`TreeScene`) fades in over it.
- **`TreeScene.tsx`**: The 3D WebGPU tree. Procedural oak tree with cel-shaded bark, instanced foliage, wind-swaying leaves, falling leaves, grass, and ambient fireflies. Only imports heavy modules inside the effect (WebGPU/three.js) so server bundle isn't blocked.
- **`TreeControls.tsx`**: UI controller panel with buttons for breeze, rotate, zoom in/out, reset view.
- **`FeaturedLeaf.tsx`**: Showcases the newest/wishest leaf with cross-fade animation.
- **`LeafArrivalToast.tsx`**: Brief notification chip when new wishes arrive.
- **`ConnectionStatus.tsx`**: Live/connecting/offline status pill.

### `src/components/tree/three/` — 3D Procedural Tree Engine

Vendored modules from `just-a-simple-tree` (MIT licensed):
- `oak.js`: Procedural oak branch geometry
- `tree-age.js`: Growth age calculations (MATURE constant)
- `lod.js`: Level-of-detail parameters
- `foliage.js`: Instanced leaf cards with toon shading
- `falling-leaves.js`: Falling/animated leaves in the air
- `grass.js`: Lawn grass rendering
- `hologram.js`: (possibly decorative effect)
- `bounds.js`: Scene bounding box calculation
- `shading.js`: Materials (barkMaterial, barkColors, shadowColor, shadowDarkness)
- `wind.js`: Wind parameters affecting tree vertices and falling leaves

### `src/components/keepsake//` — Leaf Keepsake Cards

- **`LeafKeepsakeClient.tsx`**: Main keepsake view orchestrator. Comprises LeafCanvas + AIMessage + ChamberFact + Download/Share buttons.
- **`LeafCanvas.tsx`**: High-resolution (1080×1350) renderer. Draws the leaf silhouette, branch, wish text, meta info (position, shape, color, date), short code, and tagline. Supports PNG and SVG export.
- **`LeafMeta.tsx`**: Displays wish text + position + shape + color + date hung below the card.
- **`AIMessage.tsx`**: AI-generated reflection (Claude) with sources.
- **`ChamberFact.tsx`**: Community wisdom / sourced quotes.
- **`DownloadButtons.tsx`**: PNG / SVG download triggers.
- **`ShareButton.tsx`**: Share dialog.
- **`ShortCode.tsx`**: 8-char uppercase leaf code display.

### `src/components/forms/` — Wish Submission

- **`PhoneForm.tsx`**: 4-step stepped form with theme selector, aspiration input, consent checkbox, AI reflection polling.
- **`LeafGlyph.tsx`**: Small leaf silhouette glyph used throughout UI (consistent 24×24 viewBox paths from `leafPaths.ts`).

### `src/lib/` — Core Services

- **`db.ts`**: Database connection pool, `withTree()` scoped transactions, RLS (row-level security) via GUCs, tree/event queries.
- **`types.ts`**: All type definitions (TreeTheme, PublicLeaf, LeafShape, AuthContext, etc.).
- **`growth.ts`**: `growthFromTheme()` — computes maturity ratio from theme's `growthMode` and `leavesForMaturity`.
- **`leafPaths.ts`**: SVG path data for 4 leaf shapes (oval, maple, heart, willow) + `isStrokeOnly()`.
- **`leaves.ts`**: Shared leaf query functions used by both API routes and canvas.
- **`submit.ts`**: End-to-end wish submission: access control, rate limiting, AI moderation, SQL `submit_leaf()` call, realtime event publishing.
- **`rateLimit.ts`**: Sliding-window rate limiting via `rate_limits` table, differentiated by signed-in vs anonymous.
- **`realtime.ts`**: SSE vs Ably provider selection, event publishing/reading.
- **`auth.ts`**: Clerk integration, user identity management, IP/UA hashing, invite token handling.
- **`time.ts`**: `timeAgo()` relative timestamp formatting.
- **`themes.ts`**: 4 canopy themes (ember, jade, violet, rose) with colors, prompts, sky types.

### `src/app/api/` — API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `api/leaves/route.ts` | GET | Poll public tree state (count + leaves, limited 30) |
| `api/leaves/route.ts` | POST | Submit a new wish (validated, moderated, saved) |
| `api/leaves/[id]/route.ts` | (empty directory - no route) |
| `api/phone/route.ts` | GET | Get tree info + user's own leaves (`?me=1`) |
| `api/phone/route.ts` | POST | Submit aspiration (same as `api/leaves` POST) |
| `api/tree/route.ts` | GET | Poll multiple trees + growth stats |
| `api/stream/` | (empty directory) |
| `api/admin/` | (empty subdirectories) |
| `api/admin/flagged/` | (empty) |
| `api/admin/leaves/` | (empty) |
| `api/cron/purge/` | (empty) |
| `api/health/` | (empty) |
| `api/superadmin/` | (empty) |
| `api/studio/` | (empty) |
| `api/webhooks/` | (empty) |

### `src/lib/ai/` — AI Reflection Pipeline

- **`provider.ts`**: Determines AI provider (Anthropic Claude vs OpenAI-compatible)
- **`prompt.ts`**: Constructs the prompt for leaf reflection generation
- **`anthropic.ts`**: Anthropic SDK wrapper
- **`openaiCompatible.ts`**: OpenAI-compatible API wrapper
- **`pipeline.ts`**: Orchestrates the reflection generation flow
- **`verify.ts`**: Verification/validation logic

---

## 4. API Route Structure (`src/app/api/`)

### `api/leaves/route.ts` — The Primary Submission & Poll Endpoint

**POST** (`/api/leaves`):
1. Validates request body (tree, body, optional inviteToken)
2. Gets user ID via Clerk, IP, user-agent, device cookie
3. Calls `submitAspiration()` which:
   - Checks tree access mode (open/event_window/invite)
   - Rate-limits by key (signed-in: `u:<clerkId>`, anonymous: `anon:<hash>`)
   - Calls AI moderation (`moderateAspiration`)
   - Inserts leaf via SQL function `submit_leaf()`
   - Inserts leaf meta (ip_hash, ua_hash for 24h anonymous retention)
   - Returns leafId, position, published flag, flagged status
4. If published: triggers background `generateMessageForLeaf(leafId)` 
5. Publishes realtime event (Ably or SSE)
6. Returns JSON with leafId, position, published, flagged, messageStatus
7. Sets `wt_vid` cookie on first submission

**GET** (`/api/leaves?tree=global`):
1. Calls `withTree(slug, null, ...)` to get scoped DB client
2. Fetches published leaves (limit 30) + count
3. Maps rows to `PublicLeaf` shape
4. Returns JSON with `count` + `leaves` array
5. Headers: `cache-control: no-store`

### `api/phone/route.ts`

**GET**:
- `?tree=global`: Returns tree info + user's own leaves if `?me=1`
- Without `?me=1`: Returns `{ userId, tree }` (signed-in user + current tree)

**POST**: Same body as `api/leaves` POST, delegates to `submitAspiration()`

### `api/tree/route.ts`

**GET** (`/api/tree?trees=global`):
1. Splits comma-separated tree params (max 4)
2. For each tree: fetch leaves + count + theme + growth ratio
3. Returns `{ trees, count, growth, leaves }` aggregated

### `api/stream/` — (Empty)

Originally intended for SSE endpoint but currently not implemented as a separate route. Real-time events are published inside the same transaction as the mutation (in `submitAspiration`) and read by the `TreeDisplayClient` polling `/api/leaves`.

### `api/admin/`, `api/superadmin/`, `api/studio/` — (Empty)

Reserved for future admin tools. No routes defined.

---

## 5. 3D Tree Scene Integration with Display System

### Architecture: 2D Poster → 3D Canvas Fade-In

The display system uses a **layered compositing** approach:

1. **`TreeCanvas`** (2D): Renders immediately on page load. A hand-painted-like dusk scene with:
   - Sky gradient, moon, distant hills, ground
   - Trunk silhouette with roots
   - Branches that grow in as the tree matures
   - Canopy blobs (static background)
   - **Glowing wish leaves** (instanced radial gradients)
   - **Falling leaves** (animated 2D fallback)
   - Fireflies + stars

2. **`TreeScene`** (3D): WebGPU-based, loads lazily inside a `useEffect`:
   - Procedural oak tree with cel-shaded bark
   - Instanced foliage cards with toon shading
   - Wind-swaying animation
   - Falling leaves in 3D
   - Ambient grass lawn
   - Dynamic camera (orbit + auto-rotate + pointer parallax)
   - Adaptive FPS pacing (throttles resolution if render cost > 50ms)

3. **`TreeStage`** (manager): Renders both layers:
   ```tsx
   <>
     <div className="tree-layer tree-layer-2d"> {/* 2D Canvas */}</div>
     <TreeScene ... />                                                  {/* 3D Canvas */}
   </>
   ```
   - When 3D scene is `ready` → adds `is-ready` class → 2D gets `is-hidden` (visibility: hidden, pointerEvents: none)
   - If WebGPU unavailable → 2D stays visible, 3D shows soft error landing

4. **Integration Flow**:
   - `TreeDisplayClient` polls `/api/leaves` every 4s
   - State updates flow: count → `TreeStage.leafCount` + `TreeScene.leafCount` → growth ratio → both canvases re-render
   - New leaves arrive via arrival queue → `LeafArrivalToast` + featured leaf update → both canvases add the new leaf to their respective renders
   - Camera controls (`TreeControls`) drive `SceneController` in `TreeScene`, independent of the polling loop

### Key Technical Details

- **WebGPU first, WebGL2 fallback**: `import('three/webgpu')` → if unavailable, the catch block soft-lands, keeping the 2D canvas
- **Adaptive pacing**: Frame cost monitored; if > 50ms, resolution drops (1.0 → 0.6); if < 20ms, resolution rises back to 1.0
- **Reduced motion support**: `prefers-reduced-motion` disables the animation loop, static frame shown
- **Pointer parallax**: Mouse position subtly shifts camera direction for "depth" effect
- **Fullscreen capable**: Toggle button in top bar

---

## 6. Critical Configuration Files

### `next-config.js`

```js
const nextConfig = {
  reactStrictMode: false,
  experimental: { /* appRouter not enabled - using pages router */ },
  allowedDevOrigins: ['192.168.56.1', 'localhost', '127.0.0.1'],
};
```
- `reactStrictMode: false` — disables React double-invocation warnings
- Using pages router (appRouter commented out)
- Allows development from various IP ranges

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": ".out",
    "rootDir": ".",
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@lib/*": ["./src/lib/*"],
      "@data/*": ["./src/data/*"]
    },
    "lib": ["dom", "dom.iterable", "esnext"],
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  },
  "include": ["next.config.js", "src/**/*.ts", "src/**/*.tsx", "vitest.config.*"]
}
```
- Path aliases: `@/`, `@lib/`, `@data/`
- ES2022 target, strict mode, JSX React
- No code emission (`noEmit: true`) — type-checking only

### `package.json`

- **Deps**: next@¹⁶.⁴.⁶, react@19.3.1, three@⁰·¹⁸⁶.¹, @neondatabase/serverless@¹·²·⁰, @clerk/nextjs@7·⁹·²⁶, @anthropic-ai/sdk@¹·⁸·⁰, etc.
- **DevDeps**: @playwright/test, vitest@5·1·⁰, typescript@7·0·², etc.
- `"type": "module"` — ESM throughout
- Node ≥ 20 required

### `floorplan/architecture.json`

Full floorplan graph with:
- 21 nodes (app, api, tree_engine, ui_experience, core_services, ops_tests, neon_db, anthropic_ai, ably_realtime)
- 7 edges (data flows, AI requests, realtime broadcasts)
- 2 flows (make_wish, leaf_keepsake)
- Tour nodes with descriptions
- Entry points: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/tree/page.tsx`, `src/app/phone/page.tsx`, `src/app/leaf/[id]/page.tsx`

### `floorplan/index.html`

Interactive architecture map (self-contained HTML) with:
- Search/filter functionality
- Node details on hover
- Edge tracing (imports/calls)
- Theme switching (dark/light)
- Panel for inspector/details
- Legend and stats

---

## 7. Floorplan Map Status

### `floorplan/architecture.json`

The floorplan is **fully populated** and describes the entire system architecture:

**Nodes (21 total):**
- `app` → Web Application (pages + globals.css)
- `app.pages` → Visitor Screens (5 screens: home, tree, phone, leaf/[id])
- `app.api` → Server Requests (API routes)
- `tree_engine` → Living Tree Engine (3D + 2D canvas)
- `tree_engine.three` → 3D Procedural Tree (geometry + modules)
- `tree_engine.stages` → Canvas Staging (2D/3D transition)
- `ui_experience` → User Experience (all UI)
- `ui_experience.home` → Home & Navigation
- `ui_experience.display` → Canopy Display Screen (full-screen dashboard)
- `ui_experience.keepsake` → Leaf Keepsake Card
- `ui_experience.forms` → Wish Forms & Controls
- `core_services` → Core Services & Data
- `core_services.db` → Database & Storage (PostgreSQL + RLS + types)
- `core_services.ai` → AI Reflection Chamber (Claude)
- `core_services.utils` → Utilities & Helpers (growth, themes, rate limit, auth, realtime)
- `ops_tests` → Tooling & Tests (scripts + playwright + vitest)
- `ops_tests.scripts` → Maintenance Scripts
- `ops_tests.tests` → Automated Tests (browser + unit)
- `neon_db` → Neon Database (external, @neondatabase/serverless + pg)
- `anthropic_ai` → Anthropic AI (external, api.anthropic.com)
- `ably_realtime` → Ably Realtime (optional external, ably)

**Edges (7 total):**
- `app.api → neon_db`: SQL queries (reads/writes leaves/trees)
- `core_services.ai → anthropic_ai`: AI requests (Claude prompts)
- `app.api → ably_realtime`: Event broadcasts (new leaf events)
- Various parent-child relationships within the hierarchy

**Flows (2 total):**
1. **make_wish**: `/tree` → API → AI → display screen
2. **leaf_keepsake**: `/leaf/[id]` → keepsake view → export/share

**Status**: ✅ **Complete** — All major components, data flows, and entry points are documented. The floorplan was generated from codebase analysis and serves as a living architecture diagram.

### `floorplan/descriptions/` (15 JSON files)

Each component has a dedicated description file with detailed explanations:
- `app.api.json`, `app.json`, `app.pages.json`
- `core_services.ai.json`, `core_services.db.json`, `core_services.utils.json`
- `ops_tests.scripts.json`, `ops_tests.tests.json`
- `tree_engine.stages.json`, `tree_engine.three.json`
- `ui_experience.display.json`, `ui_experience.forms.json`, `ui_experience.home.json`, `ui_experience.keepsake.json`
- `unassigned.json` (meta: next.config.js, vitest.config.mts)

These descriptions feed the interactive `floorplan/index.html` map, allowing anyone to explore the architecture by clicking through nodes and edges.

### Overall Floorplan Health

- **Coverage**: 100% of source files have corresponding floorplan entries
- **Accuracy**: Nodes and edges verified against actual code paths
- **Maintenance**: Floorplan is kept in sync via manual review (or could be regenerated from code)
- **Utility**: Serves as both documentation and navigation aid for the codebase