const assert = require('node:assert/strict');
const test = require('node:test');

const { buildMonthCells } = require('../miniprogram/utils/calendar');

// 2026-08-01 为周六（getDay=6），2026-08 有 31 天，2026-07 有 31 天。
const CELLS = buildMonthCells(2026, 7, {}, '2026-08-15', '2026-08-01');

test('builds a 42-cell grid (6 rows x 7 columns)', () => {
  assert.equal(CELLS.length, 42);
});

test('pads leading and trailing days from adjacent months as dimmed cells', () => {
  // 前置 6 格：2026-07-26 ~ 2026-07-31
  assert.equal(CELLS[0].ds, '2026-07-26');
  assert.equal(CELLS[0].day, 26);
  assert.equal(CELLS[0].dim, true);
  assert.equal(CELLS[5].ds, '2026-07-31');
  // 本月主体从第 6 格开始：2026-08-01
  assert.equal(CELLS[6].ds, '2026-08-01');
  assert.equal(CELLS[6].dim, false);
  assert.equal(CELLS[36].ds, '2026-08-31');
  // 后置 5 格：2026-09-01 ~ 2026-09-05
  assert.equal(CELLS[37].ds, '2026-09-01');
  assert.equal(CELLS[37].dim, true);
  assert.equal(CELLS[41].ds, '2026-09-05');
});

test('marks cells with records, today, and the selected date', () => {
  const cells = buildMonthCells(
    2026, 7,
    { '2026-08-15': [{}, {}], '2026-08-01': [{}] },
    '2026-08-15',
    '2026-08-01',
  );
  const byDs = Object.fromEntries(cells.map(c => [c.ds, c]));
  assert.equal(byDs['2026-08-15'].has, true);
  assert.equal(byDs['2026-08-01'].has, true);
  assert.equal(byDs['2026-08-02'].has, false);
  assert.equal(byDs['2026-08-01'].isToday, true);
  assert.equal(byDs['2026-08-15'].isToday, false);
  assert.equal(byDs['2026-08-15'].isSel, true);
  assert.equal(byDs['2026-08-01'].isSel, false);
  // 补位灰格不可能是选中日/今天
  assert.equal(byDs['2026-07-26'].dim, true);
  assert.equal(byDs['2026-07-26'].isSel, false);
});

test('handles January leading cells rolling into the previous December', () => {
  // 2026-01-01 为周四（getDay=4）：前置 4 格为 2025-12-28 ~ 2025-12-31
  const cells = buildMonthCells(2026, 0);
  assert.equal(cells[0].ds, '2025-12-28');
  assert.equal(cells[0].dim, true);
  assert.equal(cells[3].ds, '2025-12-31');
  assert.equal(cells[4].ds, '2026-01-01');
  assert.equal(cells[4].dim, false);
});
