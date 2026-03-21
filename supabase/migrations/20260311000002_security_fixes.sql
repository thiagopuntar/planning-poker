-- Security Fixes Migration

-- 1. Create a helper function to get the current user ID from a custom header
-- We will send the 'x-user-id' header from the client.
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.headers', true)::json->>'x-user-id')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update rooms table to use the current user ID as default
ALTER TABLE rooms ALTER COLUMN created_by SET DEFAULT auth_user_id();
-- Update participants table to use the current user ID as default
ALTER TABLE participants ALTER COLUMN user_id SET DEFAULT auth_user_id();

-- 2. Clean up existing policies
DROP POLICY IF EXISTS "Public read for rooms" ON rooms;
DROP POLICY IF EXISTS "Public read for participants" ON participants;
DROP POLICY IF EXISTS "Public read for stories" ON stories;
DROP POLICY IF EXISTS "Public read for votes" ON votes;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can insert participants" ON participants;
DROP POLICY IF EXISTS "Anyone can update participants" ON participants;
DROP POLICY IF EXISTS "Anyone can delete participants" ON participants;
DROP POLICY IF EXISTS "Anyone can insert stories" ON stories;
DROP POLICY IF EXISTS "Anyone can update stories" ON stories;
DROP POLICY IF EXISTS "Anyone can delete stories" ON stories;
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
DROP POLICY IF EXISTS "Anyone can update votes" ON votes;
DROP POLICY IF EXISTS "Anyone can delete votes" ON votes;

-- 3. Room Policies
-- Anyone can see rooms (or maybe just if you know the ID, which is public select anyway)
CREATE POLICY "Anyone can select rooms" ON rooms FOR SELECT USING (true);
-- Anyone can create a room, but they must set created_by to their x-user-id
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (created_by = auth_user_id());
-- Only the creator can update or delete the room
CREATE POLICY "Only creator can update rooms" ON rooms FOR UPDATE USING (created_by = auth_user_id());
CREATE POLICY "Only creator can delete rooms" ON rooms FOR DELETE USING (created_by = auth_user_id());

-- 4. Participant Policies
-- Everyone in the room can see participants, but we should hide the user_id from others
-- For simplicity, we keep select as true, but we will modify the view or just the client select.
-- Actually, let's hide user_id from everyone except the owner.
-- This requires a separate view or just RLS on columns which Supabase doesn't support well yet.
-- Instead, we'll just allow SELECT for everyone for now, but restrict modifications.
CREATE POLICY "Anyone can select participants" ON participants FOR SELECT USING (true);
-- To join, you must set user_id to your x-user-id
CREATE POLICY "Anyone can join as participant" ON participants FOR INSERT WITH CHECK (user_id = auth_user_id());
-- Only the participant themselves can update their own info or leave
CREATE POLICY "Only self can update participant" ON participants FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY "Only self can delete participant" ON participants FOR DELETE USING (user_id = auth_user_id());

-- 5. Story Policies
-- Everyone in the room can see stories
CREATE POLICY "Anyone can select stories" ON stories FOR SELECT USING (true);
-- Only the room admin can manage stories
CREATE POLICY "Only room admin can insert stories" ON stories FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth_user_id()));
CREATE POLICY "Only room admin can update stories" ON stories FOR UPDATE 
USING (EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth_user_id()));
CREATE POLICY "Only room admin can delete stories" ON stories FOR DELETE 
USING (EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth_user_id()));

-- 6. Vote Policies
-- Voting Privacy:
-- - Anyone can see their own votes anytime.
-- - Others can ONLY see votes if the story status is 'revealed'.
CREATE POLICY "Select votes" ON votes FOR SELECT 
USING (
    (participant_id IN (SELECT id FROM participants WHERE user_id = auth_user_id())) OR
    (EXISTS (SELECT 1 FROM stories WHERE id = story_id AND status = 'revealed'))
);

-- Only a participant can cast/change their own vote
-- Must check that the participant record belongs to the current user
CREATE POLICY "Only self can insert vote" ON votes FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM participants WHERE id = participant_id AND user_id = auth_user_id()));
CREATE POLICY "Only self can update vote" ON votes FOR UPDATE 
USING (EXISTS (SELECT 1 FROM participants WHERE id = participant_id AND user_id = auth_user_id()));
CREATE POLICY "Only self can delete vote" ON votes FOR DELETE 
USING (EXISTS (SELECT 1 FROM participants WHERE id = participant_id AND user_id = auth_user_id()));
