-- Create applications table for tracking job applications
-- Run this in Supabase SQL Editor

-- Create table only if it doesn't already exist
CREATE TABLE IF NOT EXISTS applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  company text NOT NULL,
  status text DEFAULT 'applied' NOT NULL,
  applied_at timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);

-- RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON applications;
DROP POLICY IF EXISTS "Users can update own applications" ON applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON applications;

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE USING (auth.uid() = user_id);
