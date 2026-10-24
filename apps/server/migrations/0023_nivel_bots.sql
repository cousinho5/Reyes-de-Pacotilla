-- Bots en las partidas reales (docs/bots.md): nivel de cada bot (novato,
-- normal o taimado; BOT_LEVELS en rules.ts). NULL = normal, como los de antes.
ALTER TABLE houses ADD COLUMN bot_level TEXT;
