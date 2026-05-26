ALTER TABLE presets ADD COLUMN api_type text;--> statement-breakpoint
ALTER TABLE presets ADD COLUMN is_active integer DEFAULT 0;
