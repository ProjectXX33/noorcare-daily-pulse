# Database Schema Update Guide
## Enhanced Performance Tracking

### ⚠️ Important: Run This SQL First

The "Failed to update performance records" error occurs because the database table doesn't have the new columns for enhanced performance tracking. You need to run the SQL commands below in your **Supabase SQL Editor**.

---

## 📋 Required SQL Commands

### 1. **Add Enhanced Performance Columns**

```sql
-- Enhanced Performance Tracking Columns
-- Add comprehensive performance metrics to admin_performance_dashboard table

ALTER TABLE admin_performance_dashboard 
ADD COLUMN IF NOT EXISTS total_logins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS app_usage_hours DECIMAL(6,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasks_success_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS check_ins_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_daily_hours DECIMAL(5,2) DEFAULT 0.00;
```

### 2. **Add Column Documentation**

```sql
-- Add comments to document the new columns
COMMENT ON COLUMN admin_performance_dashboard.total_logins 
IS 'Number of unique days the employee logged into the application';

COMMENT ON COLUMN admin_performance_dashboard.app_usage_hours 
IS 'Total hours spent using the application (based on work hours)';

COMMENT ON COLUMN admin_performance_dashboard.tasks_completed 
IS 'Number of tasks completed by the employee in the month';

COMMENT ON COLUMN admin_performance_dashboard.tasks_success_rate 
IS 'Percentage of tasks completed successfully (completed/total * 100)';

COMMENT ON COLUMN admin_performance_dashboard.check_ins_count 
IS 'Total number of check-in sessions performed by the employee';

COMMENT ON COLUMN admin_performance_dashboard.average_daily_hours 
IS 'Average working hours per day (total_work_hours / working_days)';
```

### 3. **Create Performance Indexes**

```sql
-- Create indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_admin_performance_total_logins 
ON admin_performance_dashboard(total_logins);

CREATE INDEX IF NOT EXISTS idx_admin_performance_tasks_completed 
ON admin_performance_dashboard(tasks_completed);

CREATE INDEX IF NOT EXISTS idx_admin_performance_app_usage 
ON admin_performance_dashboard(app_usage_hours);

CREATE INDEX IF NOT EXISTS idx_admin_performance_success_rate 
ON admin_performance_dashboard(tasks_success_rate);
```

### 4. **Verify Schema Changes**

```sql
-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'admin_performance_dashboard' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## 🔧 How to Apply These Changes

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar

### Step 2: Run the SQL Commands
1. Copy the SQL commands from above
2. Paste them into a new SQL query
3. Click **"Run"** to execute

### Step 3: Verify Success
Run this test query to confirm the new columns exist:

```sql
SELECT 
    employee_name,
    total_working_days,
    total_logins,
    app_usage_hours,
    tasks_completed,
    tasks_success_rate,
    check_ins_count,
    average_daily_hours,
    average_performance_score
FROM admin_performance_dashboard 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY average_performance_score DESC
LIMIT 5;
```

---

## 📊 New Column Definitions

| Column Name | Data Type | Default | Description |
|-------------|-----------|---------|-------------|
| `total_logins` | INTEGER | 0 | Number of unique days employee logged in |
| `app_usage_hours` | DECIMAL(6,2) | 0.00 | Total hours spent using the app |
| `tasks_completed` | INTEGER | 0 | Number of completed tasks |
| `tasks_success_rate` | DECIMAL(5,2) | 0.00 | Task completion percentage |
| `check_ins_count` | INTEGER | 0 | Total check-in sessions |
| `average_daily_hours` | DECIMAL(5,2) | 0.00 | Average working hours per day |

---

## 🔄 After Running the SQL

### Expected Results:
1. ✅ **"Failed to update performance records"** error will be fixed
2. ✅ Dashboard will display enhanced metrics
3. ✅ Best Employee feature will work properly
4. ✅ All comprehensive performance data will be tracked

### Test the Changes:
1. Refresh the Performance Dashboard
2. Click **"Re-record All"** to regenerate data with new metrics
3. Verify that all new metrics appear in the UI
4. Check that Best Employee card shows comprehensive data

---

## 🚨 Troubleshooting

### If SQL Commands Fail:

**Error: "Permission denied"**
- Make sure you're logged in as admin/owner in Supabase
- Check that you have schema modification permissions

**Error: "Column already exists"**
- The columns are already added, proceed to test
- Run only the verification query to confirm

**Error: "Table not found"**
- Make sure `admin_performance_dashboard` table exists
- Check that you're in the correct Supabase project

### If Performance Issues Persist:

1. **Clear existing data and regenerate:**
   ```sql
   DELETE FROM admin_performance_dashboard 
   WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
   ```

2. **Use "Re-record All" button** in the dashboard

3. **Check browser console** for detailed error messages

---

## 📈 Benefits After Update

### Enhanced Tracking:
- **App Engagement**: Track how often employees use the system
- **Productivity Metrics**: Monitor task completion rates
- **Work Patterns**: Analyze daily work hour averages
- **Comprehensive Scoring**: Multi-factor performance evaluation

### Better Management:
- **Data-Driven Decisions**: Objective performance metrics
- **Fair Recognition**: Automatic best employee identification
- **Productivity Analysis**: Task completion and success rates
- **Engagement Monitoring**: Login frequency and app usage

---

## 🔒 Security & Permissions

The new columns inherit the existing Row Level Security (RLS) policies from the `admin_performance_dashboard` table:

- **Admins**: Full read/write access to all performance data
- **Employees**: Can view their own performance data only
- **Managers**: Access based on existing role permissions

No additional RLS configuration is needed.

---

**Important**: Run the SQL commands in the exact order provided above for best results. After applying these changes, the enhanced performance dashboard will work properly without any errors. 