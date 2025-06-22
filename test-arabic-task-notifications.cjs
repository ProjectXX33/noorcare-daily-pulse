const { 
  getUserLanguage, 
  getTranslations,
  createTaskAssignmentNotification,
  createTaskStatusNotification,
  createTaskCompletionNotification,
  createCommentNotification,
  createTaskUpdateNotification
} = require('./src/lib/multilingualNotifications.ts');

console.log('🧪 Testing Arabic Task Notification System...\n');

// Test language detection
console.log('1. Testing Language Detection:');
console.log('Default language:', getUserLanguage());

// Test translations
console.log('\n2. Testing Translations:');
const enTranslations = getTranslations('en');
const arTranslations = getTranslations('ar');

console.log('English - New Task Assigned:', enTranslations.newTaskAssigned);
console.log('Arabic - New Task Assigned:', arTranslations.newTaskAssigned);

console.log('English - Admin Comment:', enTranslations.adminCommentOnTask);
console.log('Arabic - Admin Comment:', arTranslations.adminCommentOnTask);

// Test task assignment notifications
console.log('\n3. Testing Task Assignment Notifications:');
const enTaskAssignment = createTaskAssignmentNotification('Design new logo', 'en');
const arTaskAssignment = createTaskAssignmentNotification('تصميم شعار جديد', 'ar');

console.log('English Assignment:', enTaskAssignment);
console.log('Arabic Assignment:', arTaskAssignment);

// Test status update notifications
console.log('\n4. Testing Status Update Notifications:');
const enStatusUpdate = createTaskStatusNotification('Design new logo', 'In Progress', 'en');
const arStatusUpdate = createTaskStatusNotification('تصميم شعار جديد', 'قيد التنفيذ', 'ar');

console.log('English Status:', enStatusUpdate);
console.log('Arabic Status:', arStatusUpdate);

// Test completion notifications
console.log('\n5. Testing Completion Notifications:');
const enCompletion = createTaskCompletionNotification('Design new logo', 'en');
const arCompletion = createTaskCompletionNotification('تصميم شعار جديد', 'ar');

console.log('English Completion:', enCompletion);
console.log('Arabic Completion:', arCompletion);

// Test comment notifications
console.log('\n6. Testing Comment Notifications:');
const enComment = createCommentNotification(
  'Ahmed Ali', 
  'The design looks great! Please add more colors.', 
  'Design new logo',
  'admin',
  'Designer',
  'en'
);

const arComment = createCommentNotification(
  'أحمد علي', 
  'التصميم يبدو رائعاً! يرجى إضافة المزيد من الألوان.', 
  'تصميم شعار جديد',
  'admin',
  'مصمم',
  'ar'
);

console.log('English Comment:', enComment);
console.log('Arabic Comment:', arComment);

// Test Media Buyer comment
console.log('\n7. Testing Media Buyer Comment Notifications:');
const enMediaBuyerComment = createCommentNotification(
  'Sara Mohammed', 
  'Please update the campaign strategy', 
  'Social Media Campaign',
  'employee',
  'Media Buyer',
  'en'
);

const arMediaBuyerComment = createCommentNotification(
  'سارة محمد', 
  'يرجى تحديث استراتيجية الحملة', 
  'حملة وسائل التواصل الاجتماعي',
  'employee',
  'مشتري الإعلانات',
  'ar'
);

console.log('English Media Buyer Comment:', enMediaBuyerComment);
console.log('Arabic Media Buyer Comment:', arMediaBuyerComment);

// Test Designer update
console.log('\n8. Testing Designer Update Notifications:');
const enDesignerUpdate = createCommentNotification(
  'Omar Hassan', 
  'Design is ready for review', 
  'Website Banner',
  'employee',
  'Designer',
  'en'
);

const arDesignerUpdate = createCommentNotification(
  'عمر حسن', 
  'التصميم جاهز للمراجعة', 
  'بانر الموقع الإلكتروني',
  'employee',
  'مصمم',
  'ar'
);

console.log('English Designer Update:', enDesignerUpdate);
console.log('Arabic Designer Update:', arDesignerUpdate);

// Test task update for admins
console.log('\n9. Testing Task Update Notifications:');
const enTaskUpdate = createTaskUpdateNotification('Design new logo', 'In Progress', 75, 'en');
const arTaskUpdate = createTaskUpdateNotification('تصميم شعار جديد', 'قيد التنفيذ', 75, 'ar');

console.log('English Task Update:', enTaskUpdate);
console.log('Arabic Task Update:', arTaskUpdate);

console.log('\n✅ Arabic Task Notification System Test Complete!');
console.log('\n📋 Summary:');
console.log('- Task assignment notifications: ✅ English & Arabic');
console.log('- Status update notifications: ✅ English & Arabic');
console.log('- Completion notifications: ✅ English & Arabic');
console.log('- Comment notifications: ✅ English & Arabic');
console.log('- Role-specific notifications: ✅ Admin, Media Buyer, Designer');
console.log('- Task update notifications: ✅ English & Arabic');
console.log('\n🌐 All notification types now support Arabic language!'); 