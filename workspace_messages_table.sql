-- Create workspace_messages table for real-time chat
CREATE TABLE IF NOT EXISTS workspace_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_position TEXT NOT NULL,
    user_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_messages_created_at ON workspace_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_user_id ON workspace_messages(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE workspace_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read all messages
CREATE POLICY "Allow all authenticated users to read workspace messages" ON workspace_messages
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Create policy to allow users to insert their own messages
CREATE POLICY "Allow users to insert their own workspace messages" ON workspace_messages
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own messages
CREATE POLICY "Allow users to update their own workspace messages" ON workspace_messages
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own messages
CREATE POLICY "Allow users to delete their own workspace messages" ON workspace_messages
    FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on UPDATE
CREATE TRIGGER update_workspace_messages_updated_at_trigger
    BEFORE UPDATE ON workspace_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_messages_updated_at();

-- Update users table to include last_seen column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for last_seen column for better performance
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC); 