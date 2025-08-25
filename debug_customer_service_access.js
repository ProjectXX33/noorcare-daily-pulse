// Debug Customer Service Access for Junior CRM Specialist
// Run this in browser console to test access

console.log('🔍 Debugging Customer Service Access...');

// Check current user
const user = JSON.parse(localStorage.getItem('sb-auth-token') || '{}');
console.log('👤 Current user:', user);

// Check user position and role
console.log('📍 User position:', user?.user_metadata?.position);
console.log('🎭 User role:', user?.user_metadata?.role);

// Test customerServiceOnly condition
const position = user?.user_metadata?.position;
const role = user?.user_metadata?.role;

const customerServiceOnly = position !== 'Junior CRM Specialist' && role !== 'customer_retention_manager';
console.log('🔒 customerServiceOnly result:', customerServiceOnly);
console.log('✅ Should see Customer Service Tools:', !customerServiceOnly);

// Test route access
const allowedPositions = ['Junior CRM Specialist'];
const allowedRoles = ['admin', 'customer_retention_manager'];

const hasRouteAccess = allowedPositions.includes(position) || allowedRoles.includes(role);
console.log('🚪 Route access result:', hasRouteAccess);

// Test specific items
console.log('📋 My Orders visible:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');
console.log('📊 Total Orders visible:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');

// Check if sections should be visible
console.log('🔧 Customer Service Tools section should be visible:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');

console.log('🎯 Summary:');
console.log('- User is Junior CRM Specialist:', position === 'Junior CRM Specialist');
console.log('- Should see Customer Service Tools:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');
console.log('- Should see My Orders:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');
console.log('- Should see Total Orders:', position === 'Junior CRM Specialist' || role === 'customer_retention_manager');
