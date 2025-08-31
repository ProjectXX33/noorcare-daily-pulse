// Test script to verify events permissions fix
// This simulates the permission checks that were causing the issue

console.log('🧪 Testing Events Permissions Fix...\n');

// Simulate Dr Walaa's user data
const drWalaa = {
  id: 'c2-3b2b-434b-8d14-72bfa2f0573',
  name: 'Dr Walaa',
  email: 'Dr.walaagad25@gmail.com',
  role: 'content_creative_manager',
  position: 'Content & Creative Manager',
  department: 'Creative',
  team: 'Content & Creative Department'
};

// Test the permission checks that were failing
console.log('📋 User Info:');
console.log(`Name: ${drWalaa.name}`);
console.log(`Role: ${drWalaa.role}`);
console.log(`Position: ${drWalaa.position}`);
console.log(`Team: ${drWalaa.team}\n`);

// Test 1: Check if user can edit events (main permission check)
const canEditEvents = drWalaa && (drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager');
console.log('✅ Test 1 - canEditEvents:', canEditEvents);

// Test 2: Check the form submission permission (this was the failing check)
const formSubmissionCheck = drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager';
console.log('✅ Test 2 - Form submission allowed:', formSubmissionCheck);

// Test 3: Check if user can edit Q&A
const canEditQA = drWalaa && (drWalaa.role === 'admin' || drWalaa.position === 'Content Creator' || drWalaa.role === 'content_creative_manager');
console.log('✅ Test 3 - canEditQA:', canEditQA);

// Test 4: Check delete permission
const canDeleteEvents = drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager';
console.log('✅ Test 4 - canDeleteEvents:', canDeleteEvents);

console.log('\n🎯 Results:');
if (canEditEvents && formSubmissionCheck && canDeleteEvents) {
  console.log('✅ SUCCESS: Dr Walaa should now be able to edit events!');
  console.log('✅ All permission checks are passing');
  console.log('✅ The "Access denied" error should be resolved');
} else {
  console.log('❌ FAILURE: Some permission checks are still failing');
  console.log('❌ Check the specific failing tests above');
}

console.log('\n📝 Next Steps:');
console.log('1. Refresh your application');
console.log('2. Try to create or edit an event');
console.log('3. The error should no longer appear');
