const assert = require('node:assert/strict');
const test = require('node:test');

const { todayStr } = require('../miniprogram/utils/date');
const { normalizeRecord } = require('../miniprogram/utils/validation');

function validRecord(overrides = {}) {
  return {
    date: todayStr(),
    exId: '0025',
    sets: 4,
    reps: 12,
    weight: 20,
    duration: 8,
    note: '  controlled reps  ',
    ...overrides,
  };
}

test('normalizes valid workout records without losing precision', () => {
  assert.deepEqual(normalizeRecord(validRecord()), {
    date: todayStr(),
    exId: '0025',
    sets: 4,
    reps: 12,
    weight: 20,
    duration: 8,
    note: 'controlled reps',
  });
});

test('rejects records outside the shared client and server limits', () => {
  assert.throws(() => normalizeRecord(validRecord({ sets: 101 })), /组数应为 1-100 的整数/);
  assert.throws(() => normalizeRecord(validRecord({ reps: 1001 })), /每组次数应为 1-1000 的整数/);
  assert.throws(() => normalizeRecord(validRecord({ weight: 10001 })), /重量应为 0-10000/);
  assert.throws(() => normalizeRecord(validRecord({ duration: 0 })), /时长应为 1-1440 的整数/);
  assert.throws(() => normalizeRecord(validRecord({ sets: 1.5 })), /组数应为 1-100 的整数/);
});
