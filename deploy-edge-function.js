#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying updated Edge Function with CORS fixes...');

try {
  // Navigate to the project directory
  const projectDir = process.cwd();
  
  // Deploy the send-email-notification function
  console.log('📧 Deploying send-email-notification function...');
  execSync('npx supabase functions deploy send-email-notification', {
    cwd: projectDir,
    stdio: 'inherit'
  });
  
  console.log('✅ Edge Function deployed successfully!');
  console.log('🔧 CORS headers have been updated to handle preflight requests properly.');
  console.log('📝 The function now includes:');
  console.log('   - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  console.log('   - Access-Control-Max-Age: 86400');
  console.log('   - Proper preflight response handling');
  
} catch (error) {
  console.error('❌ Failed to deploy Edge Function:', error.message);
  console.log('💡 Make sure you have:');
  console.log('   1. Supabase CLI installed: npm install -g supabase');
  console.log('   2. Logged in to Supabase: supabase login');
  console.log('   3. Linked your project: supabase link --project-ref YOUR_PROJECT_REF');
  process.exit(1);
}
