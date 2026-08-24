import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadBrowserIife(filePath, globalName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = { window: {}, console };
  vm.runInNewContext(code, context, { filename: filePath });
  return context.window[globalName];
}

function createValidLandmarks() {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  lm[0] = { x: 0.5, y: 0.5 };
  lm[4] = { x: 0.6, y: 0.5 };
  lm[8] = { x: 0.7, y: 0.5 };
  return lm;
}

function testConfig() {
  const configPath = path.join(process.cwd(), 'gesture-config.js');
  const config = loadBrowserIife(configPath, 'GestureConfig');

  assert.ok(config, 'GestureConfig should be defined on window');
  assert.equal(Object.isFrozen(config), true, 'GestureConfig should be frozen');
  assert.equal(config.MAX_RINGS, 20);
  assert.equal(config.MAX_SWORDS, 2000);
  assert.equal(config.MODE_HOLD_THRESHOLD, 0.08);
  assert.equal(config.P_FOV, 500);

  assert.equal(config.EMIT_INTERVAL.tracking, 0.03);
  assert.equal(config.EMIT_INTERVAL.pinch, 0.022);
  assert.equal(config.EMIT_INTERVAL.open, 0.028);
  assert.equal(config.EMIT_INTERVAL.fist, 0.06);
  assert.equal(Object.isFrozen(config.EMIT_INTERVAL), true, 'EMIT_INTERVAL should be frozen');
  assert.equal(typeof config.GENERIC_RUNTIME_ERROR, 'string');
}

function testHelpers() {
  const helpersPath = path.join(process.cwd(), 'gesture-helpers.js');
  const helpers = loadBrowserIife(helpersPath, 'GestureHelpers');

  assert.ok(helpers, 'GestureHelpers should be defined on window');
  assert.equal(typeof helpers.dist, 'function');
  assert.equal(typeof helpers.isValidLandmarks, 'function');
  assert.equal(typeof helpers.clamp, 'function');
  assert.equal(Object.isFrozen(helpers), true, 'GestureHelpers should be frozen');

  assert.equal(helpers.dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(helpers.clamp(5, 0, 10), 5);
  assert.equal(helpers.clamp(-2, 0, 10), 0);
  assert.equal(helpers.clamp(42, 0, 10), 10);

  assert.equal(helpers.isValidLandmarks(createValidLandmarks()), true);
  assert.equal(helpers.isValidLandmarks(null), false);
  assert.equal(helpers.isValidLandmarks([]), false);

  const shortLm = Array.from({ length: 20 }, () => ({ x: 0, y: 0 }));
  assert.equal(helpers.isValidLandmarks(shortLm), false);

  const badLm = createValidLandmarks();
  badLm[8] = { x: Number.NaN, y: 0.5 };
  assert.equal(helpers.isValidLandmarks(badLm), false);

  // lm[12] (middle) missing → must reject
  const missingMiddle = createValidLandmarks();
  missingMiddle[12] = undefined;
  assert.equal(helpers.isValidLandmarks(missingMiddle), false,
    'isValidLandmarks should reject landmarks with missing middle finger (lm[12])');

  // lm[16] (ring) missing → must reject
  const missingRing = createValidLandmarks();
  missingRing[16] = undefined;
  assert.equal(helpers.isValidLandmarks(missingRing), false,
    'isValidLandmarks should reject landmarks with missing ring finger (lm[16])');

  // lm[20] (pinky) missing → must reject
  const missingPinky = createValidLandmarks();
  missingPinky[20] = undefined;
  assert.equal(helpers.isValidLandmarks(missingPinky), false,
    'isValidLandmarks should reject landmarks with missing pinky finger (lm[20])');

  // lm[12] with NaN coordinate → must reject
  const nanMiddle = createValidLandmarks();
  nanMiddle[12] = { x: Number.NaN, y: 0.5 };
  assert.equal(helpers.isValidLandmarks(nanMiddle), false,
    'isValidLandmarks should reject landmarks with NaN in middle finger (lm[12])');

  // lm[20] with NaN coordinate → must reject
  const nanPinky = createValidLandmarks();
  nanPinky[20] = { x: 0.5, y: Number.NaN };
  assert.equal(helpers.isValidLandmarks(nanPinky), false,
    'isValidLandmarks should reject landmarks with NaN in pinky finger (lm[20])');

  // lm[16] with Infinity coordinate → must reject
  const infRing = createValidLandmarks();
  infRing[16] = { x: Infinity, y: 0.5 };
  assert.equal(helpers.isValidLandmarks(infRing), false,
    'isValidLandmarks should reject landmarks with Infinity in ring finger (lm[16])');
}

function createGestureLandmarks() {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  lm[0] = { x: 0.5, y: 0.5 }; // wrist
  lm[4] = { x: 0.4, y: 0.5 }; // thumb tip
  lm[8] = { x: 0.9, y: 0.5 }; // index tip
  lm[12] = { x: 0.88, y: 0.45 }; // middle tip
  lm[16] = { x: 0.86, y: 0.55 }; // ring tip
  lm[20] = { x: 0.84, y: 0.62 }; // pinky tip
  return lm;
}

function testDetector() {
  const detectorPath = path.join(process.cwd(), 'gesture-detector.js');
  const detector = loadBrowserIife(detectorPath, 'GestureDetector');
  assert.ok(detector, 'GestureDetector should be defined on window');
  assert.equal(typeof detector.detectGesture, 'function');
  assert.equal(Object.isFrozen(detector), true, 'GestureDetector should be frozen');

  const open = createGestureLandmarks();
  assert.equal(detector.detectGesture(open), 'open');

  const tracking = createGestureLandmarks();
  tracking[8] = { x: 0.76, y: 0.5 };
  tracking[12] = { x: 0.75, y: 0.5 };
  tracking[16] = { x: 0.74, y: 0.5 };
  tracking[20] = { x: 0.73, y: 0.5 };
  assert.equal(detector.detectGesture(tracking), 'tracking');

  const fist = createGestureLandmarks();
  fist[8] = { x: 0.62, y: 0.5 };
  fist[12] = { x: 0.61, y: 0.5 };
  fist[16] = { x: 0.6, y: 0.5 };
  fist[20] = { x: 0.59, y: 0.5 };
  assert.equal(detector.detectGesture(fist), 'fist');

  const pinch = createGestureLandmarks();
  pinch[4] = { x: 0.55, y: 0.5 };
  pinch[8] = { x: 0.56, y: 0.5 };
  assert.equal(detector.detectGesture(pinch), 'pinch');

  // Edge-case: verify the guard (isValidLandmarks) correctly blocks
  // inputs that would crash detectGesture
  const helpersPath = path.join(process.cwd(), 'gesture-helpers.js');
  const helpers = loadBrowserIife(helpersPath, 'GestureHelpers');

  const incompleteLm = createGestureLandmarks();
  incompleteLm[12] = undefined; // middle finger missing
  assert.equal(helpers.isValidLandmarks(incompleteLm), false,
    'isValidLandmarks must reject landmarks with lm[12]=undefined before detectGesture is called');

  const nanLm = createGestureLandmarks();
  nanLm[16] = { x: NaN, y: NaN };
  assert.equal(helpers.isValidLandmarks(nanLm), false,
    'isValidLandmarks must reject landmarks with NaN coordinates before detectGesture is called');
}

function testPolicies() {
  const policiesPath = path.join(process.cwd(), 'gesture-policies.js');
  const policies = loadBrowserIife(policiesPath, 'GesturePolicies');
  assert.ok(policies, 'GesturePolicies should be defined on window');
  assert.equal(Object.isFrozen(policies), true, 'GesturePolicies should be frozen');

  assert.equal(policies.isLocalHost('localhost'), true);
  assert.equal(policies.isLocalHost('example.com'), false);

  assert.equal(policies.canUseCameraContext(true, 'example.com'), true);
  assert.equal(policies.canUseCameraContext(false, 'localhost'), true);
  assert.equal(policies.canUseCameraContext(false, 'example.com'), false);

  assert.equal(policies.resolveQualityMode('high', 30, false, false), 'low');
  assert.equal(policies.resolveQualityMode('low', 60, false, false), 'high');
  assert.equal(policies.resolveQualityMode('low', 60, true, false), 'low');
  assert.equal(policies.resolveQualityMode('low', 60, false, true), 'low');
  assert.equal(policies.resolveQualityMode('high', 55, false, false), 'high');

  assert.equal(
    policies.getCameraErrorMessage({ name: 'NotAllowedError' }),
    'Camera permission denied. Please allow access and refresh.'
  );
  assert.equal(
    policies.getCameraErrorMessage({ name: 'NotFoundError' }),
    'No camera detected on this device.'
  );
  assert.equal(
    policies.getCameraErrorMessage({ name: 'OverconstrainedError' }),
    'Camera does not support the requested resolution.'
  );
  assert.equal(
    policies.getCameraErrorMessage({ name: 'UnknownError' }),
    'Camera failed. Check permission and device.'
  );
}

try {
  testConfig();
  testHelpers();
  testDetector();
  testPolicies();
  console.log('tests: passed');
} catch (err) {
  console.error(`tests: failed\n${err.stack || err.message}`);
  process.exit(1);
}
