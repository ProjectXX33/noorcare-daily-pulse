const debugSticky = () => {
  // Find the sticky element
  const stickyElement = document.querySelector('header[class*="sticky"]');

  if (!stickyElement) {
    console.warn('debugSticky: Could not find the sticky header element.');
    return;
  }

  console.log('debugSticky: Found sticky element:', stickyElement);

  let parent = stickyElement.parentElement;
  let culprits = [];

  while (parent && parent.tagName !== 'BODY') {
    const styles = window.getComputedStyle(parent);
    const overflow = styles.getPropertyValue('overflow');
    const overflowX = styles.getPropertyValue('overflow-x');
    const overflowY = styles.getPropertyValue('overflow-y');

    if (overflow !== 'visible' || overflowX !== 'visible' || overflowY !== 'visible') {
      culprits.push({
        element: parent,
        overflow,
        overflowX,
        overflowY,
      });
    }
    parent = parent.parentElement;
  }

  if (culprits.length > 0) {
    console.error('debugSticky: Found parent elements with conflicting "overflow" properties. This is likely why "position: sticky" is not working.');
    console.table(culprits.map(c => ({
      'Tag': c.element.tagName,
      'ID': c.element.id,
      'Classes': c.element.className,
      'Overflow': c.overflow,
      'Overflow-X': c.overflowX,
      'Overflow-Y': c.overflowY,
    })));
     console.log("debugSticky: To fix this, find the identified element(s) and remove or override the `overflow` property. An `overflow` value other than `visible` on a parent element will prevent `position: sticky` from working correctly on its children.");
  } else {
    console.log('debugSticky: No parent elements with conflicting "overflow" properties were found. The issue might be related to something else, like missing `top` property, or not having enough content to scroll.');
  }
};

export { debugSticky as default }; 