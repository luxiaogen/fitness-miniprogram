// utils/date.js - 日期工具
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const pad = n => String(n).padStart(2, '0');
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

function dstr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Training dates use China Standard Time everywhere, including cloud functions.
function todayStr(now = new Date()) {
  return new Date(now.getTime() + CHINA_TIME_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftDate(ds, days) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dstr(d);
}

// 人性化日期标签：今天 / 昨天 / M月D日 周X
function dateLabel(ds) {
  if (ds === todayStr()) return '今天';
  if (ds === shiftDate(todayStr(), -1)) return '昨天';
  const d = new Date(ds + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_CN[d.getDay()]}`;
}

// 本周起止（周一为一周开始）
function weekRange(base = new Date(`${todayStr()}T00:00:00`)) {
  const day = base.getDay() || 7;
  const start = new Date(base);
  start.setDate(base.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dstr(start), end: dstr(end) };
}

// 本月起止
function monthRange(base = new Date(`${todayStr()}T00:00:00`)) {
  return {
    start: dstr(new Date(base.getFullYear(), base.getMonth(), 1)),
    end: dstr(new Date(base.getFullYear(), base.getMonth() + 1, 0)),
  };
}

module.exports = { WEEK_CN, dstr, todayStr, shiftDate, dateLabel, weekRange, monthRange };
