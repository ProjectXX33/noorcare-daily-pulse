-- Create Bug Reports Table
CREATE TABLE bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('ui', 'functionality', 'performance', 'data', 'security', 'general')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed', 'duplicate')),
  reported_by UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  browser_info TEXT,
  page_url VARCHAR(500),
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  screenshots_urls TEXT[], -- Array of image URLs if uploaded
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_priority ON bug_reports(priority);
CREATE INDEX idx_bug_reports_reported_by ON bug_reports(reported_by);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bug_reports_updated_at 
    BEFORE UPDATE ON bug_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy: All employees can create bug reports
CREATE POLICY "Employees can create bug reports" ON bug_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Policy: Employees can view their own bug reports
CREATE POLICY "Employees can view own reports" ON bug_reports
    FOR SELECT USING (auth.uid() = reported_by);

-- Policy: Admins can view all bug reports
CREATE POLICY "Admins can view all reports" ON bug_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can update all bug reports
CREATE POLICY "Admins can update all reports" ON bug_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can delete bug reports
CREATE POLICY "Admins can delete reports" ON bug_reports
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Optional: Create a view for bug report statistics
CREATE VIEW bug_reports_stats AS
SELECT 
    COUNT(*) as total_reports,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_reports,
    COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_reports,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_reports,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_reports,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as reports_last_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as reports_last_month
FROM bug_reports; 