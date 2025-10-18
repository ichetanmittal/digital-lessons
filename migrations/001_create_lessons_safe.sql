-- Safe migration script that checks for existing objects

-- Create lesson status enum (only if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE lesson_status AS ENUM ('generating', 'generated', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop lessons table if it exists (for clean slate)
DROP TABLE IF EXISTS lessons CASCADE;

-- Create lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  outline TEXT NOT NULL,
  status lesson_status NOT NULL DEFAULT 'generating',
  generated_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable real-time replication
ALTER TABLE lessons REPLICA IDENTITY FULL;

-- Create indexes for performance
CREATE INDEX lessons_status_idx ON lessons(status);
CREATE INDEX lessons_created_at_idx ON lessons(created_at DESC);

-- Enable Row Level Security (allow all operations - no auth required)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Allow all operations policy
CREATE POLICY "Allow all operations" ON lessons
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
