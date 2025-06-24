-- Add reply_to_id column to workspace_messages if it doesn't exist
ALTER TABLE workspace_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES workspace_messages(id) ON DELETE SET NULL;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES workspace_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read all reactions
CREATE POLICY "Allow all authenticated users to read message reactions" ON message_reactions
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Create policy to allow users to insert their own reactions
CREATE POLICY "Allow users to insert their own reactions" ON message_reactions
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own reactions
CREATE POLICY "Allow users to delete their own reactions" ON message_reactions
    FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id); 