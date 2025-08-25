#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Running database fix for visual feeding data...');

try {
  // This would need to be run against your Supabase database
  // You can run this SQL in your Supabase SQL editor or via CLI
  
  console.log('📝 Please run the following SQL in your Supabase SQL editor:');
  console.log('');
  console.log('-- Fix visual feeding data that contains JSON instead of URLs');
  console.log('UPDATE tasks SET visual_feeding = (CASE WHEN visual_feeding LIKE \'{"success":true%\' THEN (visual_feeding::json->>\'publicUrl\') ELSE visual_feeding END) WHERE visual_feeding IS NOT NULL AND visual_feeding != \'\' AND visual_feeding LIKE \'{"success":true%\';');
  console.log('');
  console.log('-- Also fix attachment_file field');
  console.log('UPDATE tasks SET attachment_file = (CASE WHEN attachment_file LIKE \'{"success":true%\' THEN (attachment_file::json->>\'publicUrl\') ELSE attachment_file END) WHERE attachment_file IS NOT NULL AND attachment_file != \'\' AND attachment_file LIKE \'{"success":true%\';');
  console.log('');
  console.log('✅ Database fix instructions provided!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
