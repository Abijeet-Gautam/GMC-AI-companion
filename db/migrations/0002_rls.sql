-- RLS policies. Run AFTER 0001_init.sql.
-- Model: every app transaction sets GUCs via set_config(..., true). Policies read them.
-- 'service' mode is reserved for webhooks / cron purges and must never be set from
-- user-controlled input.

BEGIN;

-- ===== users =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select_self_or_admin ON users FOR SELECT
  USING (id = app_user() OR app_role() = 'super_admin' OR app_mode() = 'service');
CREATE POLICY users_insert_self_or_service ON users FOR INSERT
  WITH CHECK (id = app_user() OR app_mode() = 'service');
CREATE POLICY users_update_self_or_service ON users FOR UPDATE
  USING (id = app_user() OR app_mode() = 'service')
  WITH CHECK (id = app_user() OR app_mode() = 'service');
-- No DELETE policy: users are never hard-deleted.

-- ===== trees =====
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees FORCE ROW LEVEL SECURITY;

-- Narrow escape hatch: resolve slug -> id before any role is known.
-- Reads trees only; the token hashes on that table are 256-bit sha256,
-- safe to expose, and no other table has a bootstrap policy.
CREATE POLICY trees_bootstrap ON trees FOR SELECT
  USING (app_mode() = 'bootstrap');

-- Read: the tree this request is scoped to, plus super_admin / service for administration.
CREATE POLICY trees_select ON trees FOR SELECT
  USING (id = app_tree() OR app_role() = 'super_admin' OR app_mode() = 'service');
-- Insert: only super_admin (creating event trees) or service (seeding the global tree).
CREATE POLICY trees_insert ON trees FOR INSERT
  WITH CHECK (app_role() = 'super_admin' OR app_mode() = 'service');
-- Update: owner members / super_admin of that tree, or service.
CREATE POLICY trees_update ON trees FOR UPDATE
  USING (id = app_tree() AND app_role() IN ('owner', 'super_admin') OR app_mode() = 'service')
  WITH CHECK (id = app_tree() AND app_role() IN ('owner', 'super_admin') OR app_mode() = 'service');
-- No DELETE: trees are archived, not deleted, in this build.

-- ===== tree_members =====
ALTER TABLE tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_members FORCE ROW LEVEL SECURITY;

CREATE POLICY tree_members_select ON tree_members FOR SELECT
  USING ((tree_id = app_tree() AND (app_role() IN ('owner','moderator','super_admin') OR user_id = app_user()))
         OR app_role() = 'super_admin' OR app_mode() = 'service');
CREATE POLICY tree_members_insert ON tree_members FOR INSERT
  WITH CHECK ((tree_id = app_tree() AND app_role() IN ('owner','super_admin')) OR app_mode() = 'service');
CREATE POLICY tree_members_update ON tree_members FOR UPDATE
  USING ((tree_id = app_tree() AND app_role() IN ('owner','super_admin')) OR app_mode() = 'service')
  WITH CHECK ((tree_id = app_tree() AND app_role() IN ('owner','super_admin')) OR app_mode() = 'service');
CREATE POLICY tree_members_delete ON tree_members FOR DELETE
  USING ((tree_id = app_tree() AND app_role() IN ('owner','super_admin')) OR app_mode() = 'service');

-- ===== leaves =====
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves FORCE ROW LEVEL SECURITY;

-- Read: published leaves of the current tree are public; hidden/removed only to the
-- tree's owner/moderators/super_admin; authors always see their own.
CREATE POLICY leaves_select ON leaves FOR SELECT
  USING (
    tree_id = app_tree() AND (
      status = 'published'
      OR app_role() IN ('owner', 'moderator', 'super_admin')
      OR (author_id IS NOT NULL AND author_id = app_user())
    )
    OR app_mode() = 'service'
  );
-- Insert: anyone (incl. anonymous) may publish into the scoped tree; leaves are born
-- 'published', or 'hidden' exclusively via the AI gate (flagged) — an anonymous client
-- can only ever bury their OWN fresh leaf, which harms nobody.
CREATE POLICY leaves_insert ON leaves FOR INSERT
  WITH CHECK (tree_id = app_tree() AND app_mode() IN ('request', 'service')
              AND (status = 'published' OR (status = 'hidden' AND flagged)));
-- Update: author (own rows, any time before their own delete) or tree staff.
CREATE POLICY leaves_update ON leaves FOR UPDATE
  USING (tree_id = app_tree() AND (
           (author_id IS NOT NULL AND author_id = app_user())
           OR app_role() IN ('owner', 'moderator', 'super_admin')
         ) OR app_mode() = 'service')
  WITH CHECK (tree_id = app_tree() AND (
           (author_id IS NOT NULL AND author_id = app_user())
           OR app_role() IN ('owner', 'moderator', 'super_admin')
         ) OR app_mode() = 'service');
-- No DELETE policy: leaves are soft-deleted (status='removed') and kept permanently.

-- ===== leaf_meta (IP/UA hashes; purged after 24h) =====
ALTER TABLE leaf_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaf_meta FORCE ROW LEVEL SECURITY;

CREATE POLICY leaf_meta_insert ON leaf_meta FOR INSERT
  WITH CHECK (app_mode() IN ('request', 'service'));
-- Only service mode (cron purge, privacy export) may read hashes.
CREATE POLICY leaf_meta_select_service ON leaf_meta FOR SELECT
  USING (app_mode() = 'service');

-- ===== rate_limits (purged after 7 days) =====
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits FORCE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_select ON rate_limits FOR SELECT
  USING (tree_id = app_tree() OR app_mode() = 'service');
CREATE POLICY rate_limits_insert ON rate_limits FOR INSERT
  WITH CHECK (tree_id = app_tree() AND app_mode() IN ('request', 'service'));

-- ===== tree_events (append-only fanout for SSE / realtime) =====
ALTER TABLE tree_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_events FORCE ROW LEVEL SECURITY;

-- Anyone who can read the tree can read its events (payloads carry public leaf data).
CREATE POLICY tree_events_select ON tree_events FOR SELECT
  USING (tree_id = app_tree() OR app_role() = 'super_admin' OR app_mode() = 'service');
CREATE POLICY tree_events_insert ON tree_events FOR INSERT
  WITH CHECK (app_mode() IN ('request', 'service'));

-- ===== source_verifications (shared verification cache) =====
ALTER TABLE source_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_verifications FORCE ROW LEVEL SECURITY;

CREATE POLICY source_verifications_select ON source_verifications FOR SELECT
  USING (true);
CREATE POLICY source_verifications_insert ON source_verifications FOR INSERT
  WITH CHECK (true);

COMMIT;
