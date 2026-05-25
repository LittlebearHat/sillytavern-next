-- 0002_textgen_preset.sql
-- 给 presets 表加 api_type / is_active 列，支持文本补全预设
ALTER TABLE presets ADD COLUMN IF NOT EXISTS api_type text;
ALTER TABLE presets ADD COLUMN IF NOT EXISTS is_active integer DEFAULT 0;
