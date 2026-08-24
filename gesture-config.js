(function (global) {
  'use strict';

  const GESTURE_CONFIG = Object.freeze({
    MAX_RINGS: 20,
    MAX_SWORDS: 2000,
    MODE_HOLD_THRESHOLD: 0.08,
    P_FOV: 500,
    EMIT_INTERVAL: Object.freeze({
      tracking: 0.03,
      pinch: 0.022,
      open: 0.028,
      fist: 0.06,
    }),
    COLORS: Object.freeze({
      idle: '0,255,224',
      tracking: '0,255,170',
      pinch: '180,60,255', // Purple for the Galaxy Vortex
      open: '255,50,150', // Cyber Pink for the Lotus
      fist: '0,255,255',
    }),
    STATUS_TEXTS: Object.freeze({
      scanning: 'Scanning hand...',
      paused: 'Paused (tab hidden)',
      online: 'System online',
    }),
    GENERIC_RUNTIME_ERROR: 'Unexpected runtime error. Please refresh and retry.',
  });

  global.GestureConfig = GESTURE_CONFIG;
})(window);
