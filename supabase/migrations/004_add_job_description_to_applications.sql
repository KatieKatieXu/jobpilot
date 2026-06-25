-- Add job_description column to applications table
-- Run this in Supabase SQL Editor

ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_description text DEFAULT '';
