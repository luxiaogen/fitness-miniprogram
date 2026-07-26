// Shared client-side validation and normalization for persisted data.
const { todayStr } = require('./date');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RECORD_LIMITS = Object.freeze({
  sets: { min: 1, max: 100, label: '组数' },
  reps: { min: 1, max: 1000, label: '每组次数' },
  weight: { min: 0, max: 10000, label: '重量' },
  duration: { min: 1, max: 1440, label: '时长' },
});

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}

function assertDate(value, label = '日期') {
  if (!isValidDate(value)) throw new Error(`${label}格式无效`);
  return value;
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}必须是有效数字`);
  return number;
}

function normalizeInteger(value, limits) {
  const number = finiteNumber(value, limits.label);
  if (!Number.isInteger(number) || number < limits.min || number > limits.max) {
    throw new Error(`${limits.label}应为 ${limits.min}-${limits.max} 的整数`);
  }
  return number;
}

function normalizeDecimal(value, limits) {
  const number = finiteNumber(value, limits.label);
  if (number < limits.min || number > limits.max) {
    throw new Error(`${limits.label}应为 ${limits.min}-${limits.max}`);
  }
  return number;
}

function normalizeRecord(record = {}) {
  const date = assertDate(String(record.date || ''));
  if (date > todayStr()) throw new Error('不能记录未来日期');
  const exId = String(record.exId || '').trim();
  if (!exId) throw new Error('请选择训练动作');
  if (exId.length > 64) throw new Error('动作标识无效');

  const sets = normalizeInteger(record.sets, RECORD_LIMITS.sets);
  const reps = normalizeInteger(record.reps, RECORD_LIMITS.reps);
  const weight = normalizeDecimal(record.weight, RECORD_LIMITS.weight);
  const duration = normalizeInteger(record.duration, RECORD_LIMITS.duration);
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
