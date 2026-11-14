-- Wishing Tree — initial schema, RLS, and ranking functions
-- Target: Neon Postgres (PG 15+). Single database, shared schema, per-tree rows.
-- Isolation: every request transaction sets three GUCs inside the transaction:
--   app.current_tree (uuid)  — which tree this request may see
--   app.user_id      (text)  — Clerk user id, or '' for anonymous
--   app.role         (text)  — 'anonymous' | 'visitor' | 'owner' | 'moderator' | 'super_admin'
--   app.mode         (text)  — 'request' (normal) | 'service' (webhooks, cron purge)
-- FORCE ROW LEVEL SECURITY is used everywhere so even the table owner is constrained.

BEGIN;

-- ---------- tables ----------

CREATE TABLE users (
  id            text PRIMARY KEY,             -- Clerk user id, e.g. 'user_2abc...'
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL DEFAULT '',
  avatar_url    text,
  role          text NOT NULL DEFAULT 'visitor'
                CHECK (role IN ('visitor','owner','moderator','super_admin')),
  preferences   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- avatar/style prefs: {leafColor, leafShape, theme}
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  tagline           text NOT NULL DEFAULT 'Every leaf is a wish.',
  owner_id          text REFERENCES users(id) ON DELETE SET NULL,
  access_mode       text NOT NULL DEFAULT 'open'
                    CHECK (access_mode IN ('open','event_window','invite')),
  event_starts_at   timestamptz,
  event_ends_at     timestamptz,
  invite_token_hash text,                     -- sha256 hex of the invite token; raw token is shown once at generation
  invite_enabled    boolean NOT NULL DEFAULT false,
  theme             jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_global         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX trees_single_global ON trees (is_global) WHERE is_global;

CREATE TABLE tree_members (
  tree_id    uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner','moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tree_id, user_id)
);

CREATE TYPE leaf_status AS ENUM ('published','hidden','removed');

CREATE TABLE leaves (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id         uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  author_id       text REFERENCES users(id) ON DELETE SET NULL,  -- NULL = anonymous
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 480),
  status          leaf_status NOT NULL DEFAULT 'published',
  position        integer NOT NULL,              -- dense 1..N among published leaves in this tree
  color           text,                          -- #rrggbb, from author preference or tree theme
  leaf_shape      text,                          -- 'oval' | 'maple' | 'heart' | 'willow'
  flagged         boolean NOT NULL DEFAULT false, -- true => queued for admin review (AI fallback path)
  flag_reason     text,
  hide_reason     text,
  ai_message      text,
  ai_sources      jsonb,                         -- [{title,url,source}] verified, or curated when fallback
  ai_commentary   boolean NOT NULL DEFAULT false, -- true when sources are curated + AI text shown as commentary
  message_status  text NOT NULL DEFAULT 'pending'
                  CHECK (message_status IN ('pending','ready','failed','skipped')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz
);
CREATE INDEX leaves_tree_status_position ON leaves (tree_id, status, position);
CREATE INDEX leaves_tree_created         ON leaves (tree_id, created_at DESC);
CREATE INDEX leaves_author               ON leaves (author_id) WHERE author_id IS NOT NULL;
CREATE INDEX leaves_flagged_queue        ON leaves (tree_id) WHERE flagged AND status = 'published';

CREATE TABLE leaf_meta (
  leaf_id    uuid PRIMARY KEY REFERENCES leaves(id) ON DELETE CASCADE,
  ip_hash    text,          -- sha256(ip + salt); purged after 24h
  ua_hash    text,          -- sha256(ua + salt); purged after 24h
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leaf_meta_created ON leaf_meta (created_at);

CREATE TABLE rate_limits (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,          -- user id, or 'anon:<sha256(deviceCookie + ipHash + uaHash)>'
  tree_id    uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  bucket     text NOT NULL,          -- 'submit' | 'api'
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limits_lookup ON rate_limits (key, bucket, created_at DESC);
CREATE INDEX rate_limits_gc     ON rate_limits (created_at);

CREATE TABLE tree_events (
  id         bigserial PRIMARY KEY,
  tree_id    uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  kind       text NOT NULL,  -- 'leaf.created' | 'leaf.updated' | 'leaf.hidden' | 'leaf.removed' | 'leaf.restored' | 'studio.updated'
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tree_events_tree_id ON tree_events (tree_id, id);
CREATE INDEX tree_events_gc      ON tree_events (created_at);

CREATE TABLE source_verifications (
  url_hash   text PRIMARY KEY,       -- sha256 of normalized URL
  ok         boolean NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- ranking functions (atomic, RLS-aware) ----------
-- Positions are dense: 1..N over status='published' leaves per tree.
-- All of these take a per-tree advisory lock so concurrent submits/moderation agree.

CREATE OR REPLACE FUNCTION submit_leaf(
  p_tree uuid, p_author text, p_body text, p_color text, p_leaf_shape text,
  p_flagged boolean, p_flag_reason text, p_publish boolean
) RETURNS TABLE(id uuid, leaf_position integer)
LANGUAGE plpgsql AS
$$
DECLARE
  v_pos integer;
  v_id  uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_tree::text));
  IF p_publish THEN
    SELECT coalesce(max(l.position), 0) + 1 INTO v_pos
      FROM leaves l WHERE l.tree_id = p_tree AND l.status = 'published';
    INSERT INTO leaves (tree_id, author_id, body, status, position, color, leaf_shape, flagged, flag_reason)
    VALUES (p_tree, p_author, p_body, 'published', v_pos, p_color, p_leaf_shape, p_flagged, p_flag_reason)
    RETURNING leaves.id INTO v_id;
    INSERT INTO tree_events (tree_id, kind, payload)
    VALUES (p_tree, 'leaf.created', jsonb_build_object('id', v_id, 'leafPosition', v_pos, 'color', p_color, 'leafShape', p_leaf_shape));
    RETURN QUERY SELECT v_id, v_pos;
  ELSE
    -- AI-held leaf: kept, hidden, and NOT ranked (position 0 = unranked).
    INSERT INTO leaves (tree_id, author_id, body, status, position, color, leaf_shape, flagged, flag_reason, hide_reason)
    VALUES (p_tree, p_author, p_body, 'hidden', 0, p_color, p_leaf_shape, p_flagged, p_flag_reason, 'ai_review')
    RETURNING leaves.id INTO v_id;
    RETURN QUERY SELECT v_id, 0;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION hide_leaf(p_tree uuid, p_leaf uuid, p_reason text) RETURNS integer
LANGUAGE plpgsql AS
$$
DECLARE v_pos integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_tree::text));
  SELECT position INTO v_pos FROM leaves WHERE id = p_leaf AND tree_id = p_tree AND status = 'published';
  IF v_pos IS NULL THEN RETURN NULL; END IF;
  UPDATE leaves SET status = 'hidden', hide_reason = p_reason, updated_at = now() WHERE id = p_leaf;
  UPDATE leaves SET position = position - 1
    WHERE tree_id = p_tree AND status = 'published' AND position > v_pos;
  INSERT INTO tree_events (tree_id, kind, payload)
  VALUES (p_tree, 'leaf.hidden', jsonb_build_object('id', p_leaf, 'oldPosition', v_pos));
  RETURN v_pos;
END
$$;

CREATE OR REPLACE FUNCTION remove_leaf(p_tree uuid, p_leaf uuid, p_reason text) RETURNS integer
LANGUAGE plpgsql AS
$$
DECLARE v_pos integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_tree::text));
  SELECT position INTO v_pos FROM leaves WHERE id = p_leaf AND tree_id = p_tree AND status = 'published';
  IF v_pos IS NULL THEN RETURN NULL; END IF;
  UPDATE leaves SET status = 'removed', hide_reason = p_reason, updated_at = now() WHERE id = p_leaf;
  UPDATE leaves SET position = position - 1
    WHERE tree_id = p_tree AND status = 'published' AND position > v_pos;
  INSERT INTO tree_events (tree_id, kind, payload)
  VALUES (p_tree, 'leaf.removed', jsonb_build_object('id', p_leaf, 'oldPosition', v_pos));
  RETURN v_pos;
END
$$;

CREATE OR REPLACE FUNCTION restore_leaf(p_tree uuid, p_leaf uuid) RETURNS integer
LANGUAGE plpgsql AS
$$
DECLARE v_pos integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_tree::text));
  SELECT coalesce(max(l.position), 0) + 1 INTO v_pos
    FROM leaves l WHERE l.tree_id = p_tree AND l.status = 'published';
  UPDATE leaves SET status = 'published', position = v_pos, hide_reason = NULL, updated_at = now()
    WHERE id = p_leaf AND tree_id = p_tree AND status = 'hidden';
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO tree_events (tree_id, kind, payload)
  VALUES (p_tree, 'leaf.restored', jsonb_build_object('id', p_leaf, 'position', v_pos));
  RETURN v_pos;
END
$$;

COMMIT;