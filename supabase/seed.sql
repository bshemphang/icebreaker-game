-- 1. DATABASE TABLES (SCHEMA)

-- Create Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  session_name text,
  status text DEFAULT 'lobby',
  current_turn_team_id uuid
);

-- Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  color_hex text NOT NULL,
  board_position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL, -- 'Move', 'Talk', 'Create'
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 2. SEED DATA (with 30 Prompts)

INSERT INTO prompts (category, content) VALUES
-- MOVE (10)
('Move', 'Everyone on your team must switch seats with someone from another team.'),
('Move', 'Lead the room in a 30-second synchronized stretch.'),
('Move', 'Walk to the other side of the room using only your heels.'),
('Move', 'Mirror the movements of the person to your left for 30 seconds.'),
('Move', 'Form a circle and everyone take two steps inward at the same time.'),
('Move', 'Balance on one leg while the team counts to 15 together.'),
('Move', 'High-five every member of at least two other teams.'),
('Move', 'Mime your favorite hobby until another team guesses it.'),
('Move', 'The team must organize themselves in a line by height without talking.'),
('Move', 'Do a "slow-motion" celebration for 10 seconds.'),

-- TALK (10)
('Talk', 'If your team could solve one global problem with unlimited funding, what would it be?'),
('Talk', 'What is the most innovative thing you have seen in the last week?'),
('Talk', 'Describe a "failure" that actually turned into a great success.'),
('Talk', 'If you could have a 20-minute meeting with any person, living or dead, who would it be?'),
('Talk', 'What is one work-related habit you want to leave behind this year?'),
('Talk', 'What is the most unusual job any member of your team has ever had?'),
('Talk', 'If our company was a movie genre, which one would it be and why?'),
('Talk', 'What is one "future" technology you wish existed right now?'),
('Talk', 'What is the best piece of professional advice you have ever received?'),
('Talk', 'Describe the perfect "innovation workspace" in three words.'),

-- CREATE (10)
('Create', 'Draw a new logo for this session using only your non-dominant hand.'),
('Create', 'Use your phones/objects to create the sound of a rainstorm.'),
('Create', 'Compose a 3-line poem about why innovation is difficult.'),
('Create', 'Build a "human sculpture" that represents the word "Synergy".'),
('Create', 'Design a product that helps people focus in a noisy office using only 5 words.'),
('Create', 'Perform a 10-second "pitch" for a flying car for dogs.'),
('Create', 'Find 3 items in the room and invent a new use for them.'),
('Create', 'Hum a well-known song and have the other teams guess it.'),
('Create', 'Create a secret team handshake and perform it once.'),
('Create', 'Sketch a "map of the future" in 30 seconds.');