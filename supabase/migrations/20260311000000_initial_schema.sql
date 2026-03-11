-- Create tables for Planning Poker application

-- 1. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID, -- Can be linked to auth.users if needed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Participants
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID, -- For authenticated users, can be null for guests
    name TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 3. Stories
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'revealed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Votes
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    vote_value TEXT, -- Using TEXT to support values like '?', '☕', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure a participant can only have one vote per story
    UNIQUE(story_id, participant_id)
);

-- Enable Row Level Security (RLS) - Basic Setup
-- You can add more specific policies later based on your auth requirements.
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Sample broad policies (Adjust these as needed for your application)
CREATE POLICY "Public read for rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read for participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public read for stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Public read for votes" ON votes FOR SELECT USING (true);

-- Allow anyone to insert, update, delete for now (for development/testing)
CREATE POLICY "Anyone can insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON rooms FOR DELETE USING (true);

CREATE POLICY "Anyone can insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participants" ON participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete participants" ON participants FOR DELETE USING (true);

CREATE POLICY "Anyone can insert stories" ON stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stories" ON stories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete stories" ON stories FOR DELETE USING (true);

CREATE POLICY "Anyone can insert votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON votes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete votes" ON votes FOR DELETE USING (true);
