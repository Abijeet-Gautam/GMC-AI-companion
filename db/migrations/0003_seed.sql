-- Seed: exactly one global tree. Idempotent.
BEGIN;

INSERT INTO trees (slug, name, tagline, is_global, access_mode, theme)
SELECT 'global', 'The Wishing Tree', 'Every leaf is a wish.', true, 'open',
       '{"sky":"dusk","canopy":"ember","leafPalette":["#ffd166","#ef476f","#f78c6b","#ffe08a","#f4a261"],"leafShape":"oval"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM trees WHERE is_global);

COMMIT;
