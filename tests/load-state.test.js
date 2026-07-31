const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('load-state renders distinct loading, error, and content branches', () => {
  const template = fs.readFileSync(
    path.join(projectRoot, 'miniprogram/components/load-state/index.wxml'),
    'utf8',
  );

  assert.match(template, /wx:if="\{\{loading\}\}"/);
  assert.match(template, /wx:elif="\{\{error\}\}"/);
  assert.match(template, /<slot wx:else \/>/);
  assert.match(template, /class="ls-skeleton"/);
  assert.match(template, /bindtap="onRetry"/);
});

test('data-driven pages register the load-state component', () => {
  for (const page of ['log', 'calendar', 'stats']) {
    const config = JSON.parse(fs.readFileSync(
      path.join(projectRoot, `miniprogram/pages/${page}/${page}.json`),
      'utf8',
    ));
    assert.equal(config.usingComponents['load-state'], '/components/load-state/index');
  }
});
