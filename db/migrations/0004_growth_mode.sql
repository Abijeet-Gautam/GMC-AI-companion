-- Growth mode: contribution-driven growth settings live in trees.theme JSONB.
-- 'manual' (default) keeps every existing tree at its mature look;
-- 'contributions' grows the tree from a bare sapling as wishes accumulate
-- toward leavesForMaturity.
BEGIN;

UPDATE trees
SET theme = theme
  || CASE WHEN theme ? 'growthMode' THEN '{}'::jsonb ELSE '{"growthMode":"manual"}'::jsonb END
  || CASE WHEN theme ? 'leavesForMaturity' THEN '{}'::jsonb ELSE '{"leavesForMaturity":48}'::jsonb END;

COMMIT;
