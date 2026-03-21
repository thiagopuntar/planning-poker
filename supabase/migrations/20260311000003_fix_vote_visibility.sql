-- Fix loading vote card visibility

-- 1. Add last_voted_story_id to participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS last_voted_story_id UUID REFERENCES stories(id) ON DELETE SET NULL;

-- 2. Create trigger to sync last_voted_story_id
CREATE OR REPLACE FUNCTION sync_participant_last_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE participants 
    SET last_voted_story_id = NEW.story_id
    WHERE id = NEW.participant_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE participants 
    SET last_voted_story_id = NULL
    WHERE id = OLD.participant_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vote_change ON votes;
CREATE TRIGGER on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION sync_participant_last_vote();

-- 3. Initial sync
UPDATE participants p
SET last_voted_story_id = (
  SELECT story_id 
  FROM votes v 
  WHERE v.participant_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
);
