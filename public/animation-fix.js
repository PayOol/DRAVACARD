// This script ensures SVG animations continue running during user interaction on mobile devices
document.addEventListener('DOMContentLoaded', function() {
  // Find all SVG elements with animations
  const svgElements = document.querySelectorAll('svg');
  
  // For each SVG element
  svgElements.forEach(svg => {
    // Find all animation elements within the SVG
    const animations = svg.querySelectorAll('animate, animateTransform, animateMotion');
    
    // For each animation element
    animations.forEach(animation => {
      // Set animation to restart when paused
      animation.setAttribute('restart', 'always');
      
      // Ensure animation continues during user interaction
      if (!animation.hasAttribute('calcMode')) {
        animation.setAttribute('calcMode', 'spline');
      }
      
      if (!animation.hasAttribute('keySplines')) {
        animation.setAttribute('keySplines', '0.42 0 0.58 1');
      }
    });
  });
  
  // Prevent touch events from pausing animations
  document.addEventListener('touchstart', function(e) {
    // Don't prevent default as that would break normal touch functionality
    // Instead, find any paused animations and restart them
    const pausedAnimations = document.querySelectorAll('animate[begin="indefinite"], animateTransform[begin="indefinite"], animateMotion[begin="indefinite"]');
    pausedAnimations.forEach(anim => {
      // Restart the animation
      try {
        anim.beginElement();
      } catch (err) {
        // Some browsers may not support this method
        console.log('Could not restart animation:', err);
      }
    });
  }, { passive: true });
});
