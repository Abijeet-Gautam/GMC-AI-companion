# Team ownership

The hackathon flow is implemented. Use these boundaries to review, customize and extend it.

| Owner              | Files                                                                            | Focus                                                                              |
| ------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Visitor experience | `src/features/join`, `src/features/leaf`, join/keepsake routes                   | Mobile testing, copy, accessibility, sharing and result polish                     |
| Tree and display   | `src/features/display`, `src/hooks/use-tree.ts`, `src/vendor/just-a-simple-tree` | Procedural 3D, TV sizing, appearance controls, fallback and reconnection           |
| Backend and AI     | `src/server`, API routes                                                         | Configure OpenAI, evaluate sample aspirations, refine moderation, monitor fallback |
| Integration lead   | `src/lib/catalog.ts`, docs, tests, shared UI                                     | Review chamber copy, run checks, Wi-Fi/QR setup, rehearse pitch                    |

Agree changes to `Leaf`, category IDs and API envelopes together. One host laptop owns the event database. Each developer keeps their own ignored `.env.local` and SQLite files. Share code rather than databases or keys.

## Event preparation

1. Configure OpenAI and verify live account/model access. Automated tests use a local provider mock.
2. Review chamber descriptions and mappings with GMC; these are labelled project interpretations.
3. Check the actual portrait screen, browser, QR viewing distance and Wi-Fi.
4. Submit from five real phones and confirm all distinct leaves appear.
5. Rehearse seed/clear, moderation failures, hiding a leaf, and reconnecting.

Optional extensions: multilingual UI, richer particles, staff review queue, authenticated export, and staff pagination beyond 500 records.
