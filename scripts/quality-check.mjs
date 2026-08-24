import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import vm from 'node:vm';

const root = process.cwd();
const utf8 = new TextDecoder('utf-8', { fatal: true });

function readUtf8Strict(filePath) {
  const bytes = fs.readFileSync(filePath);
  return utf8.decode(bytes);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function checkSyntax(fileName) {
  const source = readUtf8Strict(path.join(root, fileName));
  new vm.Script(source, { filename: fileName });
}

function run() {
  const indexPath = path.join(root, 'index.html');
  const scriptPath = path.join(root, 'script.js');
  const configPath = path.join(root, 'gesture-config.js');
  const helpersPath = path.join(root, 'gesture-helpers.js');

  const index = readUtf8Strict(indexPath);
  const script = readUtf8Strict(scriptPath);
  readUtf8Strict(configPath);
  readUtf8Strict(helpersPath);

  assert(index.includes('<video id="camera"'), 'index.html: missing #camera element');
  assert(index.includes('<canvas id="fx"'), 'index.html: missing #fx canvas');
  assert(index.includes('id="status"'), 'index.html: missing #status element');
  assert(index.includes('id="gesture"'), 'index.html: missing #gesture element');
  assert(index.includes('id="error-overlay"'), 'index.html: missing #error-overlay element');
  assert(
    index.includes('src="./gesture-detector.js"'),
    'index.html: missing gesture-detector script reference'
  );
  assert(
    index.includes('src="./gesture-policies.js"'),
    'index.html: missing gesture-policies script reference'
  );

  assert(!index.includes('?/text>'), 'index.html: found suspicious token "?/text>"');
  assert(!index.includes('?/div>'), 'index.html: found suspicious token "?/div>"');
  assert(!index.includes('?/p>'), 'index.html: found suspicious token "?/p>"');

  assert(
    script.includes('setStatus('),
    'script.js: expected status update logic is missing'
  );
  assert(
    script.includes('initMediaPipe();'),
    'script.js: expected MediaPipe bootstrap call is missing'
  );

  checkSyntax('script.js');
  checkSyntax('gesture-config.js');
  checkSyntax('gesture-helpers.js');
  checkSyntax('gesture-detector.js');
  checkSyntax('gesture-policies.js');

  console.log('quality-check: passed');
}

try {
  run();
} catch (err) {
  console.error(`quality-check: failed\n${err.message}`);
  process.exit(1);
}
