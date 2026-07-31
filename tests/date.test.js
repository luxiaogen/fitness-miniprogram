const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const { dstr, todayStr, shiftDate, dayOfWeek, dateLabel, weekRange, monthRange } = require('../miniprogram/utils/date');

test('todayStr uses China Standard Time regardless of the runtime timezone', () => {
  // UTC 23:30 = CST 次日 07:30；UTC 15:30 = CST 当日 23:30
  assert.equal(todayStr(new Date('2026-08-01T23:30:00Z')), '2026-08-02');
  assert.equal(todayStr(new Date('2026-08-01T15:30:00Z')), '2026-08-01');
});

test('shiftDate crosses month, year, and leap-year boundaries', () => {
  assert.equal(shiftDate('2026-08-01', 31), '2026-09-01');
  assert.equal(shiftDate('2026-01-31', 1), '2026-02-01');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28'); // 非闰年
  assert.equal(shiftDate('2028-03-01', -1), '2028-02-29'); // 闰年
});

test('weekRange starts on Monday and spans seven days', () => {
  // 2026-08-01 是周六，所在周为 07-27（周一）~ 08-02（周日）
  assert.deepEqual(weekRange('2026-08-01'), { start: '2026-07-27', end: '2026-08-02' });
  // 周一本身即周起点
  assert.deepEqual(weekRange('2026-08-03'), { start: '2026-08-03', end: '2026-08-09' });
});

test('monthRange covers the calendar month including leap February', () => {
  assert.deepEqual(monthRange('2026-08-15'), { start: '2026-08-01', end: '2026-08-31' });
  assert.deepEqual(monthRange('2026-02-10'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(monthRange('2028-02-10'), { start: '2028-02-01', end: '2028-02-29' });
});

test('dateLabel distinguishes today and yesterday', () => {
  const today = todayStr();
  assert.equal(dateLabel(today), '今天');
  assert.equal(dateLabel(shiftDate(today, -1)), '昨天');
});

test('date helpers are independent of the device timezone', () => {
  // 同一组操作分别在 UTC+8 与西半球时区运行，结果必须一致
  const script = `
    const { todayStr, shiftDate, dayOfWeek, dateLabel, weekRange, monthRange } =
      require(${JSON.stringify(path.join(__dirname, '../miniprogram/utils/date'))});
    const out = {
      today: todayStr(new Date('2026-08-01T23:30:00Z')),
      shifted: shiftDate('2026-08-01', 31),
      weekday: dayOfWeek('2026-08-01'),
      label: dateLabel('2026-08-15'),
      week: weekRange('2026-08-01'),
      month: monthRange('2026-08-15'),
    };
    console.log(JSON.stringify(out));
  `;
  const runIn = tz => {
    const res = spawnSync(process.execPath, ['-e', script], {
      env: { ...process.env, TZ: tz },
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, `TZ=${tz} 下运行失败: ${res.stderr}`);
    return JSON.parse(res.stdout);
  };

  const shanghai = runIn('Asia/Shanghai');
  const newYork = runIn('America/New_York');
  assert.deepEqual(newYork, shanghai);
  // 顺便确认 CST 语义：UTC 23:30 已是次日
  assert.equal(shanghai.today, '2026-08-02');
  assert.equal(shanghai.weekday, 6);
});
