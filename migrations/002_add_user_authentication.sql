-- Add user authentication support to lessons table

-- Add user_id column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS lessons_user_id_idx ON lessons(user_id);
CREATE INDEX IF NOT EXISTS lessons_user_created_idx ON lessons(user_id, created_at DESC);

-- Drop old RLS policy
DROP POLICY IF EXISTS "Allow all operations" ON lessons;

-- Enable Row Level Security with user-based policies
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own lessons
CREATE POLICY "Users can view own lessons" ON lessons
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own lessons
CREATE POLICY "Users can create lessons" ON lessons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own lessons
CREATE POLICY "Users can update own lessons" ON lessons
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own lessons
CREATE POLICY "Users can delete own lessons" ON lessons
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create simple profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
