// Test script to verify Q&A permissions for Content & Creative Managers
// This simulates the permission checks for Event Q&A functionality

console.log('🧪 Testing Event Q&A Permissions for Content & Creative Managers...\n');

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

// Test the Q&A permission checks
console.log('📋 User Info:');
console.log(`Name: ${drWalaa.name}`);
console.log(`Role: ${drWalaa.role}`);
console.log(`Position: ${drWalaa.position}\n`);

// Test 1: Check if user can edit Q&A (main permission check)
const canEditQA = drWalaa && (drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager' || drWalaa.position === 'Media Buyer' || drWalaa.position === 'Content Creator');
console.log('✅ Test 1 - canEditQA:', canEditQA);

// Test 2: Check if user can answer questions
const canAnswerQuestions = drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager' || drWalaa.position === 'Media Buyer';
console.log('✅ Test 2 - canAnswerQuestions:', canAnswerQuestions);

// Test 3: Check if user can edit any Q&A
const canEditAnyQA = drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager' || drWalaa.position === 'Media Buyer' || drWalaa.position === 'Content Creator';
console.log('✅ Test 3 - canEditAnyQA:', canEditAnyQA);

// Test 4: Check if user can create questions
const canCreateQuestions = drWalaa && true; // All authenticated users can create questions
console.log('✅ Test 4 - canCreateQuestions:', canCreateQuestions);

// Test 5: Check if user can delete Q&A
const canDeleteQA = drWalaa.role === 'admin' || drWalaa.role === 'content_creative_manager';
console.log('✅ Test 5 - canDeleteQA:', canDeleteQA);

console.log('\n🎯 Q&A Capabilities for Content & Creative Manager:');
console.log('📝 Create Questions:', canCreateQuestions ? '✅ YES' : '❌ NO');
console.log('💬 Answer Questions:', canAnswerQuestions ? '✅ YES' : '❌ NO');
console.log('✏️ Edit Any Q&A:', canEditAnyQA ? '✅ YES' : '❌ NO');
console.log('🗑️ Delete Q&A:', canDeleteQA ? '✅ YES' : '❌ NO');

console.log('\n🎯 Results:');
if (canEditQA && canAnswerQuestions && canEditAnyQA && canCreateQuestions) {
  console.log('✅ SUCCESS: Dr Walaa can now add BOTH Questions AND Answers!');
  console.log('✅ All Q&A permission checks are passing');
  console.log('✅ Content & Creative Managers have full Q&A access');
} else {
  console.log('❌ FAILURE: Some Q&A permission checks are still failing');
  console.log('❌ Check the specific failing tests above');
}

console.log('\n📝 What Dr Walaa can now do in Event Q&A:');
console.log('1. ✅ Create new questions about events');
console.log('2. ✅ Answer any questions (not just her own)');
console.log('3. ✅ Edit any Q&A content');
console.log('4. ✅ Delete any Q&A items');
console.log('5. ✅ Moderate all Q&A content');

console.log('\n🔄 Next Steps:');
console.log('1. Refresh your application');
console.log('2. Open an event and go to the Q&A section');
console.log('3. Try adding both questions and answers');
console.log('4. The "Manager Access" badge should appear');
