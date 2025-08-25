// Simple test script to verify Content Creative API
// Run this in the browser console to test the API directly

console.log('🧪 Testing Content Creative API...');

// Test team members
async function testTeamMembers() {
  try {
    console.log('🔍 Testing getContentCreativeTeamMembers...');
    const { getContentCreativeTeamMembers } = await import('./src/lib/contentCreativeApi.ts');
    const members = await getContentCreativeTeamMembers();
    console.log('✅ Team members result:', members);
    return members;
  } catch (error) {
    console.error('❌ Team members error:', error);
    return null;
  }
}

// Test stats
async function testStats() {
  try {
    console.log('🔍 Testing getContentCreativeStats...');
    const { getContentCreativeStats } = await import('./src/lib/contentCreativeApi.ts');
    const stats = await getContentCreativeStats();
    console.log('✅ Stats result:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Stats error:', error);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API tests...');
  
  const members = await testTeamMembers();
  const stats = await testStats();
  
  console.log('📊 Final Results:');
  console.log('Team Members:', members);
  console.log('Stats:', stats);
}

// Run the tests
runTests();
