const assert = require('node:assert/strict');
const test = require('node:test');

const { aggregatePeriod, buildWeekBars } = require('../miniprogram/utils/stats');

const EXERCISES = {
  '0025': { bodyPartZh: '胸部' },
  '0662': { bodyPartZh: '胸部' },
  '1757': { bodyPartZh: '臀部' },
};
const resolveExercise = id => EXERCISES[id] || null;

test('aggregatePeriod totals days, sets, reps, duration and part distribution', () => {
  const stats = aggregatePeriod([
    { date: '2026-08-01', exId: '0025', sets: 4, reps: 12, duration: 8 },
    { date: '2026-08-01', exId: '1757', sets: 3, reps: 10, duration: 6 },
    { date: '2026-08-02', exId: '0662', sets: 5, reps: 15, duration: 10 },
  ], resolveExercise);

  assert.equal(stats.days, 2);
  assert.equal(stats.totalSets, 12);
  assert.equal(stats.totalReps, 4 * 12 + 3 * 10 + 5 * 15);
  assert.equal(stats.totalDuration, 24);
  // 部位分布按组数降序，宽度以最大值为基准
  assert.deepEqual(stats.partBars, [
    { label: '胸部', sets: 9, widthPct: 100 },
    { label: '臀部', sets: 3, widthPct: 33 },
  ]);
});

test('aggregatePeriod ignores unknown exercises and handles empty input', () => {
  const stats = aggregatePeriod([
    { date: '2026-08-01', exId: 'zzz', sets: 4, reps: 10, duration: 8 },
  ], resolveExercise);
  assert.equal(stats.days, 1);
  assert.equal(stats.totalSets, 4);
  assert.equal(stats.partBars.length, 0);

  const empty = aggregatePeriod([], resolveExercise);
  assert.deepEqual(empty, { days: 0, totalSets: 0, totalReps: 0, totalDuration: 0, partBars: [] });
});

test('buildWeekBars builds 7 bars ending today', () => {
  // 2026-08-01 为周六；2026-07-26 为周日（今天往前第 6 天）
  const bars = buildWeekBars([
    { date: '2026-08-01', sets: 10 },
    { date: '2026-07-26', sets: 5 },
  ], '2026-08-01');

  assert.equal(bars.length, 7);
  assert.equal(bars[0].label, '周日');
  assert.equal(bars[0].sets, 5);
  assert.equal(bars[0].heightPct, 50);
  assert.equal(bars[6].label, '今天');
  assert.equal(bars[6].sets, 10);
  assert.equal(bars[6].heightPct, 100);
  // 空训练日显示 0，并保留最小柱高避免视觉消失
  assert.equal(bars[3].sets, 0);
  assert.equal(bars[3].heightPct, 3);
});

test('buildWeekBars handles all-zero input without dividing by zero', () => {
  const bars = buildWeekBars([], '2026-08-01');
  assert.equal(bars.length, 7);
  assert(bars.every(b => b.sets === 0 && b.heightPct === 3));
});
