(function (global) {
  'use strict';

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function detectGesture(lm) {
    const wrist = lm[0];
    const thumb = lm[4];
    const index = lm[8];
    const middle = lm[12];
    const ring = lm[16];
    const pinky = lm[20];

    if (dist(thumb, index) < 0.058) return 'pinch';

    const dIndex = dist(index, wrist);
    const dMiddle = dist(middle, wrist);
    const dRing = dist(ring, wrist);
    const dPinky = dist(pinky, wrist);
    const avg = (dIndex + dMiddle + dRing + dPinky) / 4;

    if (avg > 0.31) return 'open';
    if (avg < 0.2) return 'fist';
    return 'tracking';
  }

  global.GestureDetector = Object.freeze({
    detectGesture,
  });
})(window);
