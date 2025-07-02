-- Create Warehouse Management Tables
-- This creates tables for order notes and status history tracking

-- Order Notes Table
CREATE TABLE IF NOT EXISTS order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES order_submissions(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_name VARCHAR(255) NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'status_change', 'cancel_reason', 'warehouse')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Status History Table
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES order_submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by_name VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_by ON order_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_notes
CREATE POLICY "order_notes_admin_all" ON order_notes 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "order_notes_warehouse_all" ON order_notes 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));

CREATE POLICY "order_notes_employee_read" ON order_notes 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

CREATE POLICY "order_notes_user_own" ON order_notes 
FOR ALL USING (created_by = auth.uid());

-- RLS Policies for order_status_history
CREATE POLICY "order_status_history_admin_all" ON order_status_history 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "order_status_history_warehouse_all" ON order_status_history 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warehouse'));

CREATE POLICY "order_status_history_employee_read" ON order_status_history 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

CREATE POLICY "order_status_history_user_own" ON order_status_history 
FOR ALL USING (changed_by = auth.uid());

-- Create trigger to update updated_at timestamp for order_notes
CREATE OR REPLACE FUNCTION update_order_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_order_notes_updated_at
    BEFORE UPDATE ON order_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_order_notes_updated_at();

-- Add sample warehouse user if not exists
DO $$
BEGIN
    -- Add warehouse role to existing employee creation functions
    -- Note: You'll need to create warehouse users manually through the UI
    
    RAISE NOTICE 'Warehouse management tables created successfully!';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '1. Create warehouse users through the admin panel';
    RAISE NOTICE '2. Access the warehouse dashboard at /warehouse-dashboard';
    RAISE NOTICE '3. Manage orders with real-time updates';
END $$; 