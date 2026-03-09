// Prevenir zoom no celular
document.addEventListener('touchstart', function(event) {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
});

document.addEventListener('gesturestart', function(event) {
  event.preventDefault();
});

document.addEventListener('gesturechange', function(event) {
  event.preventDefault();
});

document.addEventListener('gestureend', function(event) {
  event.preventDefault();
});

// Prevenir double-tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Prevenir pinch zoom
document.addEventListener('touchmove', function(event) {
  if (event.scale !== 1) {
    event.preventDefault();
  }
}, { passive: false });
