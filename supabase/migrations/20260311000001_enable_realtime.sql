-- Enable real-time for relevant tables
BEGIN;
  -- Enable real-time for participants, stories, and votes
  -- Check if publication exists first (standard for Supabase)
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  ALTER PUBLICATION supabase_realtime ADD TABLE participants;
  ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  ALTER PUBLICATION supabase_realtime ADD TABLE votes;
COMMIT;
