# Wishing Tree Codebase Floorplan

This floorplan visualizes the codebase structure and workflow for the Wishing Tree application.

## Overview

The application has two main routes serving different purposes:

```
+---------------------+       +----------------------+
|      /tree          |       |      /phone          |
|   Public Display    |       |   PWA - Submit Form  |
|   + QR Code        |       |   + First-timer tab  |
|   + Leaves list    |       |   + Returnee tab     |
+--------+------------+       +--------+-------------+
         |                           |
         v                           v
+---------------------+       +----------------------+
|  /api/leaves        |       |  /api/phone          |
|  POST/GET submission|       |  POST/GET submit     |
|  /api/tree          |       |  /api/tree (polling) |
+--------+------------+       +--------+-------------+
         |                           |
         v                           v
+---------------------+       +----------------------+
|  Neon Postgres DB   |       |  Neon Postgres DB    |
|  - trees table      |       |  - trees table       |
|  - leaves table     |       |  - leaves table      |
|  - RLS policies     |       |  - RLS policies      |
+-----------------------+       +----------------------+
```

## Core Workflow Flow

```
Submit Aspiration (phone /tree)
       │
       ▼
1. Rate Limit Check (cookie + IP + UA hash)
       │
       ▼
2. AI Moderation (openai ↔ anthropic via AI_PROVIDER)
       │
       ├── If flagged → hidden for review
       └── If clean → publish immediately
       │
       ▼
3. SQL Function: submit_leaf() 
   - Advisory lock for concurrency
   - Dense positioning (1..N among published)
   - Returns: leaf_id, leaf_position
       │
       ▼
4. Background: generateMessageForLeaf()
   - AI message composition
   - Source verification
   - Curated quote fallback
       │
       ▼
5. Real-time Poll: /api/tree?trees=global
   - Client polls every 2-3s
   - New leaves animate on
       │
       └──────► Client animates leaf onto tree SVG
```

## Key Modules and Their Interconnections

### API Routes
- `/api/leaves` - POST submit, GET tree state
- `/api/leaves/[id]/message` - Check AI message readiness
- `/api/phone` - PWA landing + submit
- `/api/phone/me` - Returnee leaves display
- `/api/tree` - Tree state polling
- `/api/studio` - Tree customization (future)
- `/api/admin` - Moderation (future)

### Library Modules
- `src/lib/db.ts` - Pool + withTree/withService GUC helpers
- `src/lib/submit.ts` - Submission pipeline (rate limit → moderate → insert)
- `src/lib/ai/provider.ts` - Provider factory (openai-compatible ↔ anthropic)
- `src/lib/ai/ngrokFree.ts` - NgrokFreeAiProvider class
- `src/lib/rateLimit.ts` - Sliding-window rate limit in Postgres
- `src/lib/auth.ts` - Clerk helpers, rate key generation
- `src/lib/types.ts` - Shared types (TreeRole, AuthContext, Leaf, etc.)
- `src/lib/realtime.ts` - Polling + Ably optional push

### Database Schema (Key Tables)
- `users` - Clerk user info, role, preferences
- `trees` - Tree metadata, RLS isolation
- `leaves` - Aspiration leaves, position, status, AI fields
- `leaf_meta` - IP/UA hashes (24h retention)
- `rate_limits` - Rate limit records (7-day retention)
- `tree_events` - Audit trail of all changes
- `source_verifications` - Source check results

### Data Flow
```
Phone Submit
    │
    ▼
API: /api/phone POST
    │
    ▼
lib: submitAspiration()
    │
    ├─ checkRateLimit(key)
    │   │
    │   └─ DB: rate_limits table
    │
    ├─ moderateAspiration(body, provider)
    │   │
    │   └─ AI: openai or anthropic
    │
    └─ withTree(client) → submit_leaf() SQL function
        │
        ▼
   DB: leaves + tree_events (advisory lock)
        │
        ▼
Response: {leafId, leafPosition, published, messageStatus}
    │
    ▼
Client: Poll /api/tree every 2-3s
    │
    ▼
Animation: Leaf rises from bottom on tree SVG
```

## 3D Tree Models Integration

The `just-a-simple-tree` GitHub repo contains **6 procedural 3.js species** with GLB/sprite exports that can be integrated into the tree display:

### Integration Points

1. **Tree Species Selection** - Each tree can have a different `leaf_shape`:
   - `oval` (default)
   - `maple`
   - `heart`
   - `willow`
   - Plus 3 additional procedural species from the repo

2. **3D Background Layer** - The tree SVG can include:
   - Procedural 3D tree trunk/base as SVG filter/pattern
   - Or import GLB models via three.js in a canvas overlay
   - Particle-based falling leaves animation

3. **Per-Tree Theme Integration** - The `theme` jsonb field in trees table can include:
   ```json
   {
     "sky": "dusk",
     "canopy": "ember", 
     "leafPalette": ["#ffd166", "#ef476f", "#f78c6b"],
     "leafShape": "oval|maple|heart|willow"
   }
   ```

### Recommended Integration

Add a `/api/tree/3d` endpoint that returns tree state optimized for 3D rendering, or integrate the GLB models directly into the tree SVG pattern definitions for a layered effect.

## Known Issues & TODO Status

| Item | Status | Next Step |
|------|--------|-----------|
| Studio UI (`/studio`) | Schema + RLS ready; no React UI | Add React components |
| Admin UI (`/admin`) | No UI; SQL functions implemented | Add admin dashboard |
| 3D Tree Models | `just-a-simple-tree` repo noted | Integrate GLB species |
| Image sharing | Client Canvas planned | Add `/api/share-image` if needed |
| Vitest DB tests | Requires running Postgres | Run against real Neon DB |
| TypeScript strict mode | Some `any` types | Fix per-SDK typing |

## Workflow Checklist

- [x] Database schema with `leaf_position` (renamed from `position`)
- [x] RLS policies per-tree via GUCs
- [x] Clerk auth with role source of truth
- [x] AI moderation with keyword fallback
- [x] Rate limiting: device cookie + hashed IP + UA
- [x] PWA manifest and icons prepared
- [x] README with 12+ env vars and migration checklist
- [ ] 3D tree model integration from `just-a-simple-tree`
- [ ] Floorplan workflow visualization (this document)
- [ ] vitest integration tests with Neon DATABASE_URL
- [ ] `npm run dev` real-time flow verification
- [ ] Vercel deployment with all env vars