// utils/calendar.js - 月历网格构建（纯函数，便于单元测试）
// 日期运算基于 UTC（与 utils/date.js 的 CST 约定一致），不受设备时区影响。
const { dstr } = require('./date');

/**
 * 构建 42 格月历网格（6 行 × 7 列），含上月/下月补位灰格
 * @param {number} year 年份
 * @param {number} month 月份（0-based）
 * @param {Object} dayRecords 日期 -> 记录数组的映射（键为 YYYY-MM-DD，只含存在记录的日期）
 * @param {string} selDate 选中日期（YYYY-MM-DD）
 * @param {string} today 今天（YYYY-MM-DD）
 * @returns {Array<{ds: string, day: number, dim: boolean, has: boolean, isToday: boolean, isSel: boolean}>}
 */
function buildMonthCells(year, month, dayRecords = {}, selDate = '', today = '') {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysPrev = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    let ds, day, dim = false;
    if (i < firstDay) {
      day = daysPrev - firstDay + 1 + i;
      ds = dstr(new Date(Date.UTC(year, month - 1, day)));
      dim = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      ds = dstr(new Date(Date.UTC(year, month + 1, day)));
      dim = true;
    } else {
      day = i - firstDay + 1;
      ds = dstr(new Date(Date.UTC(year, month, day)));
    }
    cells.push({ ds, day, dim, has: !!dayRecords[ds], isToday: ds === today, isSel: ds === selDate });
  }
  return cells;
}

module.exports = { buildMonthCells };
