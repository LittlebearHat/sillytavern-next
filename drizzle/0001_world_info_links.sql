ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `character_book` text;--> statement-breakpoint
ALTER TABLE `characters` ADD COLUMN IF NOT EXISTS `world_info_book_id` text;
