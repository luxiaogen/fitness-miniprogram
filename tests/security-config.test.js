const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('shared Mini Program configuration does not embed an AppID', () => {
  const sharedConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'));
  const privateTemplate = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'project.private.config.example.json'), 'utf8'),
  );

  assert.equal(sharedConfig.appid, '');
  assert.equal(privateTemplate.appid, 'YOUR_MINIPROGRAM_APPID');
});
