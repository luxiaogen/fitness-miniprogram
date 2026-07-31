// Shared client-side validation and normalization for persisted data.
// 数值限制（RECORD_LIMITS / normalizeNumber）来自 shared/validation.js，
// 与云函数共用同一事实源（生成副本 validation-shared.js，勿手改）。
const { todayStr } = require('./date');
const { RECORD_LIMITS, normalizeNumber } = require('./validation-shared');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  // UTC 解析 + UTC getters：日期合法性判断与设备时区无关
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` === value;
}

function assertDate(value, label = '日期') {
  if (!isValidDate(value)) throw new Error(`${label}格式无效`);
  return value;
}

function normalizeRecord(record = {}) {
  const date = assertDate(String(record.date || ''));
  if (date > todayStr()) throw new Error('不能记录未来日期');
  const exId = String(record.exId || '').trim();
  if (!exId) throw new Error('请选择训练动作');
  if (exId.length > 64) throw new Error('动作标识无效');

  const sets = normalizeNumber(record.sets, RECORD_LIMITS.sets);
  const reps = normalizeNumber(record.reps, RECORD_LIMITS.reps);
  const weight = normalizeNumber(record.weight, RECORD_LIMITS.weight);
  const duration = normalizeNumber(record.duration, RECORD_LIMITS.duration);
  const note = String(record.note || '').trim().slice(0, 200);

  return { date, exId, sets, reps, weight, duration, note };
}

function normalizeNote(exId, text) {
  const normalizedExId = String(exId || '').trim();
  const normalizedText = String(text || '').trim().slice(0, 120);
  if (!normalizedExId || !normalizedText) throw new Error('动作与标注内容不能为空');
  if (normalizedExId.length > 64) throw new Error('动作标识无效');
  return { exId: normalizedExId, text: normalizedText };
}

function assertId(id, label = '记录') {
  const value = String(id || '').trim();
  if (!value) throw new Error(`缺少${label}标识`);
  return value;
}

module.exports = {
  RECORD_LIMITS,
  isValidDate,
  assertDate,
  normalizeRecord,
  normalizeNote,
  assertId,
};
