// utils/date.js - 日期工具（统一按中国标准时间 UTC+8 处理，与设备时区无关）
//
// 设计约定：
// - 训练日期一律使用中国标准时间（todayStr 基于 UTC+8 偏移）；
// - 日期字符串（YYYY-MM-DD）的解析与运算全部基于 UTC 时刻（parseDate/dstr），
//   不经过设备本地时区，避免跨时区设备上跨午夜日期错位；
// - 云函数端同样遵循此约定（businessToday 使用相同偏移）。
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const pad = n => String(n).padStart(2, '0');
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;

// Training dates use China Standard Time everywhere, including cloud functions.
function todayStr(now = new Date()) {
  return new Date(now.getTime() + CHINA_TIME_OFFSET_MS).toISOString().slice(0, 10);
}

// 把 YYYY-MM-DD 解析为 UTC 时刻：日期算术与设备时区无关
function parseDate(ds) {
  return new Date(`${ds}T00:00:00Z`);
}

// Date（UTC 时刻）格式化为 YYYY-MM-DD
function dstr(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// 日期字符串平移 N 天（支持负数）
function shiftDate(ds, days) {
  const d = parseDate(ds);
  d.setUTCDate(d.getUTCDate() + days);
  return dstr(d);
}

// 星期几（0=周日 … 6=周六）
function dayOfWeek(ds) {
  return parseDate(ds).getUTCDay();
}

// 人性化日期标签：今天 / 昨天 / M月D日 周X
function dateLabel(ds) {
  if (ds === todayStr()) return '今天';
  if (ds === shiftDate(todayStr(), -1)) return '昨天';
  const d = parseDate(ds);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 周${WEEK_CN[d.getUTCDay()]}`;
}

// 本周起止（周一为一周开始）
function weekRange(base = todayStr()) {
  const day = dayOfWeek(base) || 7;
  const start = shiftDate(base, -(day - 1));
  return { start, end: shiftDate(start, 6) };
}

// 本月起止
function monthRange(base = todayStr()) {
  const d = parseDate(base);
  return {
    start: dstr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))),
    end: dstr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))),
  };
}

module.exports = { WEEK_CN, dstr, todayStr, parseDate, shiftDate, dayOfWeek, dateLabel, weekRange, monthRange };
