-- Update jobs table to have all required columns
-- Run this in Supabase SQL Editor

-- Drop the old minimal table if it exists and recreate with full schema
DROP TABLE IF EXISTS jobs;

CREATE TABLE jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  salary text,
  location text,
  url text,
  job_posting_url text,
  notes text,
  match_score integer,
  company_outlook text,
  compatibility text,
  posted_date text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE USING (auth.uid() = user_id);
