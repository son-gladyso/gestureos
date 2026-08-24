(function (global) {
  'use strict';

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function isValidLandmarks(lm) {
    if (!Array.isArray(lm) || lm.length < 21) return false;
    const wrist = lm[0];
    const thumb = lm[4];
    const index = lm[8];
    const middle = lm[12];
    const ring = lm[16];
    const pinky = lm[20];
    return Boolean(
      wrist &&
      thumb &&
      index &&
      middle &&
      ring &&
      pinky &&
      Number.isFinite(wrist.x) &&
      Number.isFinite(wrist.y) &&
      Number.isFinite(thumb.x) &&
      Number.isFinite(thumb.y) &&
      Number.isFinite(index.x) &&
      Number.isFinite(index.y) &&
      Number.isFinite(middle.x) &&
      Number.isFinite(middle.y) &&
      Number.isFinite(ring.x) &&
      Number.isFinite(ring.y) &&
      Number.isFinite(pinky.x) &&
      Number.isFinite(pinky.y)
    );
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  global.GestureHelpers = Object.freeze({
    dist,
    isValidLandmarks,
    clamp,
  });
})(window);
