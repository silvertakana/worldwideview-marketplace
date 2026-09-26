-- How a plugin's data reaches the globe: bundled with the plugin, streamed
-- from a data engine, or available only from the hosted service.
--
-- Defaults to 'engine' because that is the platform's core model and it
-- works in every tier, including an offline instance running its own engine.
-- The onboarding wizard offers 'bundled' and 'engine' to an offline instance
-- and reserves 'hosted' for a connected one.
ALTER TABLE "Plugin" ADD COLUMN "dataMode" TEXT NOT NULL DEFAULT 'engine';
