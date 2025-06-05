// Mobile Responsiveness and Z-Index Testing Script
// Run this in browser console to test all improvements

(async function testMobileResponsiveness() {
  console.log('🔍 Testing Mobile Responsiveness and Z-Index Fixes...');
  console.log('═'.repeat(60));
  
  // Test 1: Header Z-Index
  console.log('📱 Test 1: Header Z-Index');
  const header = document.querySelector('header');
  if (header) {
    const headerZIndex = window.getComputedStyle(header).zIndex;
    console.log(`✅ Header z-index: ${headerZIndex} (should be 50)`);
    
    if (parseInt(headerZIndex) >= 50) {
      console.log('✅ Header z-index is correct');
    } else {
      console.log('❌ Header z-index needs adjustment');
    }
  } else {
    console.log('⚠️ Header not found');
  }
  
  // Test 2: Viewport Meta Tag
  console.log('\n📱 Test 2: Viewport Meta Tag');
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const content = viewport.getAttribute('content');
    console.log(`✅ Viewport: ${content}`);
    
    if (content.includes('viewport-fit=cover') && content.includes('user-scalable=no')) {
      console.log('✅ Viewport optimized for mobile');
    } else {
      console.log('⚠️ Viewport could be further optimized');
    }
  } else {
    console.log('❌ Viewport meta tag not found');
  }
  
  // Test 3: Mobile Breakpoints
  console.log('\n📱 Test 3: Mobile Breakpoints');
  const screenWidth = window.innerWidth;
  console.log(`Current screen width: ${screenWidth}px`);
  
  if (screenWidth <= 640) {
    console.log('📱 Mobile view (≤640px)');
  } else if (screenWidth <= 768) {
    console.log('📱 Tablet view (≤768px)');
  } else {
    console.log('💻 Desktop view (>768px)');
  }
  
  // Test 4: Responsive Tables
  console.log('\n📊 Test 4: Responsive Tables');
  const tables = document.querySelectorAll('table');
  let responsiveTables = 0;
  
  tables.forEach((table, index) => {
    const tableContainer = table.closest('.overflow-x-auto');
    if (tableContainer) {
      responsiveTables++;
      console.log(`✅ Table ${index + 1}: Has responsive container`);
    } else {
      console.log(`⚠️ Table ${index + 1}: Missing responsive container`);
    }
  });
  
  console.log(`📊 Responsive tables: ${responsiveTables}/${tables.length}`);
  
  // Test 5: Mobile Card Layouts
  console.log('\n📋 Test 5: Mobile Card Layouts');
  const cards = document.querySelectorAll('.card, [class*="card"]');
  let mobileOptimizedCards = 0;
  
  cards.forEach((card, index) => {
    const hasMinWidth = window.getComputedStyle(card).minWidth !== 'auto';
    if (!hasMinWidth || window.getComputedStyle(card).minWidth === '0px') {
      mobileOptimizedCards++;
    }
  });
  
  console.log(`📋 Mobile-optimized cards: ${mobileOptimizedCards}/${cards.length}`);
  
  // Test 6: Button Touch Targets
  console.log('\n👆 Test 6: Button Touch Targets');
  const buttons = document.querySelectorAll('button');
  let accessibleButtons = 0;
  
  buttons.forEach((button, index) => {
    const rect = button.getBoundingClientRect();
    const minSize = 44; // iOS minimum touch target
    
    if (rect.height >= minSize && rect.width >= minSize) {
      accessibleButtons++;
    }
  });
  
  console.log(`👆 Accessible buttons: ${accessibleButtons}/${buttons.length}`);
  
  // Test 7: Sticky Elements
  console.log('\n📌 Test 7: Sticky Elements');
  const stickyElements = document.querySelectorAll('[class*="sticky"]');
  
  stickyElements.forEach((element, index) => {
    const position = window.getComputedStyle(element).position;
    const zIndex = window.getComputedStyle(element).zIndex;
    
    console.log(`📌 Sticky element ${index + 1}: position=${position}, z-index=${zIndex}`);
    
    if (position === 'sticky' && parseInt(zIndex) >= 40) {
      console.log(`✅ Sticky element ${index + 1}: Properly configured`);
    } else {
      console.log(`⚠️ Sticky element ${index + 1}: May need adjustment`);
    }
  });
  
  // Test 8: Form Responsiveness
  console.log('\n📝 Test 8: Form Responsiveness');
  const forms = document.querySelectorAll('form, [class*="form"], [class*="grid"]');
  let responsiveForms = 0;
  
  forms.forEach((form, index) => {
    const hasResponsiveGrid = form.classList.contains('grid-cols-1') || 
                             form.classList.contains('sm:grid-cols-2') ||
                             form.classList.contains('md:grid-cols-3') ||
                             form.classList.contains('lg:grid-cols-4');
    
    if (hasResponsiveGrid) {
      responsiveForms++;
    }
  });
  
  console.log(`📝 Responsive forms: ${responsiveForms}/${forms.length}`);
  
  // Test 9: Navigation Menu
  console.log('\n🧭 Test 9: Navigation Menu');
  const mobileNav = document.querySelector('[class*="md:hidden"]');
  const desktopNav = document.querySelector('[class*="hidden"][class*="md:block"]');
  
  if (mobileNav && desktopNav) {
    console.log('✅ Responsive navigation detected');
  } else if (mobileNav) {
    console.log('⚠️ Mobile navigation found, but desktop navigation may be missing');
  } else {
    console.log('❌ Responsive navigation not detected');
  }
  
  // Test 10: Loading States
  console.log('\n⏳ Test 10: Loading States');
  const loadingElements = document.querySelectorAll('[class*="animate-spin"], [class*="loading"]');
  
  console.log(`⏳ Loading indicators found: ${loadingElements.length}`);
  
  // Test Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  
  const tests = [
    { name: 'Header Z-Index', status: header && parseInt(window.getComputedStyle(header).zIndex) >= 50 },
    { name: 'Viewport Meta', status: viewport && viewport.getAttribute('content').includes('viewport-fit=cover') },
    { name: 'Responsive Tables', status: responsiveTables === tables.length },
    { name: 'Mobile Cards', status: mobileOptimizedCards > 0 },
    { name: 'Touch Targets', status: accessibleButtons / buttons.length > 0.8 },
    { name: 'Sticky Elements', status: stickyElements.length > 0 },
    { name: 'Responsive Forms', status: responsiveForms > 0 },
    { name: 'Navigation Menu', status: mobileNav && desktopNav }
  ];
  
  const passedTests = tests.filter(test => test.status).length;
  const totalTests = tests.length;
  
  tests.forEach(test => {
    console.log(`${test.status ? '✅' : '❌'} ${test.name}`);
  });
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} (${Math.round(passedTests / totalTests * 100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Perfect! All mobile responsiveness tests passed!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('👍 Good! Most tests passed, minor improvements needed.');
  } else {
    console.log('⚠️ Some improvements needed for optimal mobile experience.');
  }
  
  // Device-specific recommendations
  console.log('\n📱 DEVICE-SPECIFIC RECOMMENDATIONS');
  console.log('═'.repeat(60));
  
  if (screenWidth <= 640) {
    console.log('📱 Mobile Device Detected:');
    console.log('• Ensure all interactive elements are at least 44px');
    console.log('• Use single-column layouts');
    console.log('• Hide non-essential content');
    console.log('• Use bottom navigation if needed');
  } else if (screenWidth <= 768) {
    console.log('📱 Tablet Device Detected:');
    console.log('• Use 2-column layouts where appropriate');
    console.log('• Ensure touch targets are accessible');
    console.log('• Consider side navigation');
  } else {
    console.log('💻 Desktop Device Detected:');
    console.log('• Full feature set available');
    console.log('• Multi-column layouts optimal');
    console.log('• Hover states active');
  }
  
  console.log('\n🔧 QUICK FIXES FOR COMMON ISSUES');
  console.log('═'.repeat(60));
  console.log('1. Add overflow-x-auto to table containers');
  console.log('2. Use grid-cols-1 sm:grid-cols-2 for responsive grids');
  console.log('3. Set min-height: 44px for buttons on mobile');
  console.log('4. Use sticky with z-index: 50 for headers');
  console.log('5. Add backdrop-blur for better sticky headers');
  console.log('6. Use text-xs sm:text-sm for responsive text');
  console.log('7. Add safe-area-inset for iOS devices');
  
})();

// Additional utility functions for testing
window.testMobileBreakpoint = function(width) {
  // Temporarily resize window to test breakpoint
  const originalWidth = window.innerWidth;
  
  // This is for testing purposes - in real apps, use browser dev tools
  console.log(`Testing breakpoint: ${width}px`);
  console.log('Use browser dev tools to actually test responsive breakpoints');
  
  if (width <= 640) {
    console.log('📱 Mobile breakpoint');
  } else if (width <= 768) {
    console.log('📱 Tablet breakpoint');
  } else if (width <= 1024) {
    console.log('💻 Desktop breakpoint');
  } else {
    console.log('🖥️ Large desktop breakpoint');
  }
};

window.checkZIndexLayers = function() {
  console.log('🔍 Checking Z-Index Layers...');
  
  const elements = document.querySelectorAll('*');
  const zIndexMap = new Map();
  
  elements.forEach(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    if (zIndex !== 'auto' && zIndex !== '0') {
      const className = el.className || el.tagName.toLowerCase();
      zIndexMap.set(className, parseInt(zIndex));
    }
  });
  
  const sortedZIndex = Array.from(zIndexMap.entries()).sort((a, b) => b[1] - a[1]);
  
  console.log('Z-Index hierarchy (highest to lowest):');
  sortedZIndex.forEach(([element, zIndex]) => {
    console.log(`${zIndex}: ${element}`);
  });
};

console.log('✅ Mobile responsiveness testing script loaded');
console.log('Run testMobileBreakpoint(width) to test specific breakpoints');
console.log('Run checkZIndexLayers() to analyze z-index hierarchy'); 