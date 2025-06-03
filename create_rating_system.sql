-- Create employee ratings table
CREATE TABLE IF NOT EXISTS employee_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    rated_by UUID NOT NULL REFERENCES users(id),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create task ratings table
CREATE TABLE IF NOT EXISTS task_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    rated_by UUID NOT NULL REFERENCES users(id),
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_ratings_employee_id ON employee_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_ratings_rated_by ON employee_ratings(rated_by);
CREATE INDEX IF NOT EXISTS idx_employee_ratings_rated_at ON employee_ratings(rated_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_ratings_task_id ON task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_rated_by ON task_ratings(rated_by);
CREATE INDEX IF NOT EXISTS idx_task_ratings_rated_at ON task_ratings(rated_at DESC);

-- Enable Row Level Security
ALTER TABLE employee_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_ratings table
CREATE POLICY employee_ratings_select ON employee_ratings FOR SELECT USING (
    employee_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_insert ON employee_ratings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_update ON employee_ratings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_delete ON employee_ratings FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for task_ratings table
CREATE POLICY task_ratings_select ON task_ratings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id AND (
            t.assigned_to = auth.uid() OR 
            t.created_by = auth.uid() OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY task_ratings_insert ON task_ratings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY task_ratings_update ON task_ratings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY task_ratings_delete ON task_ratings FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Create a function to get average employee rating
CREATE OR REPLACE FUNCTION get_employee_average_rating(employee_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(AVG(rating::decimal), 0)::decimal(3,2)
        FROM employee_ratings 
        WHERE employee_id = employee_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get average task rating
CREATE OR REPLACE FUNCTION get_task_average_rating(task_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(AVG(rating::decimal), 0)::decimal(3,2)
        FROM task_ratings 
        WHERE task_id = task_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get latest employee rating
CREATE OR REPLACE FUNCTION get_latest_employee_rating(employee_uuid UUID)
RETURNS TABLE(
    rating INTEGER,
    comment TEXT,
    rated_by_name TEXT,
    rated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.rating,
        er.comment,
        u.name as rated_by_name,
        er.rated_at
    FROM employee_ratings er
    JOIN users u ON u.id = er.rated_by
    WHERE er.employee_id = employee_uuid
    ORDER BY er.rated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get latest task rating
CREATE OR REPLACE FUNCTION get_latest_task_rating(task_uuid UUID)
RETURNS TABLE(
    rating INTEGER,
    comment TEXT,
    rated_by_name TEXT,
    rated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.rating,
        tr.comment,
        u.name as rated_by_name,
        tr.rated_at
    FROM task_ratings tr
    JOIN users u ON u.id = tr.rated_by
    WHERE tr.task_id = task_uuid
    ORDER BY tr.rated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 