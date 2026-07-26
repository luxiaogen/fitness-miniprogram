const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const modalTemplates = [
  'miniprogram/components/ex-picker/index.wxml',
  'miniprogram/components/record-form/index.wxml',
];

test('closed modal components do not leave a full-screen touch layer mounted', () => {
  for (const templatePath of modalTemplates) {
    const template = fs.readFileSync(path.join(projectRoot, templatePath), 'utf8');

    assert.match(template, /<block wx:if="\{\{visible\}\}">/);
    assert.match(template, /class="mask mask--show"/);
    assert.match(template, /class="sheet sheet--show"/);
  }
});
