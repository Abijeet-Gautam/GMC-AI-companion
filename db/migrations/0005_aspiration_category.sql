-- Aspiration category labeling: AI-determined classification of each wish.
ALTER TABLE leaves ADD COLUMN aspiration_category jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN leaves.aspiration_category IS 'AI-determined aspiration categories: {primary, secondary, reason}';