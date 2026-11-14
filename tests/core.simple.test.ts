import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://neondb_owner:npg_nLVm1U7gAiYl@ep-lucky-poetry-bewcmcfc-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

let pool: Pool;

beforeEach(async () => {
  pool = new Pool({ connectionString: DATABASE_URL });
  await pool.query(`
    INSERT INTO trees (slug, name, tagline, is_global, access_mode, theme)
    VALUES ('global', 'The Wishing Tree', 'Every leaf is a wish.', true, 'open',
      '{"sky":"dusk","canopy":"ember","leafPalette":["#ffd166","#ef476f","#f78c6b","#ffe08a","#f4a261"],"leafShape":"oval"}'::jsonb)
    ON CONFLICT (is_global) DO NOTHING;
  `);
});

afterEach(async () => {
  await pool.end();
});

describe('Wishing Tree Core Flow', () => {
  it('allows anonymous submission and returns a leaf with position', async () => {
    const { submitAspiration } = await import('../src/lib/submit');
    const outcome = await submitAspiration({
      treeSlug: 'global',
      body: 'I wish for world peace and understanding.',
      userId: null,
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0 (Test)',
      deviceCookie: null,
      inviteToken: null,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.leafId).toBeDefined();
    expect(outcome.leafPosition).toBeDefined();
    expect(outcome.published).toBe(true);
    expect(outcome.flagged).toBe(false);
    expect(outcome.messageStatus).toBe('pending');
  });
});