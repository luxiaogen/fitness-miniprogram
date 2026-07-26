// Shared client-side validation and normalization for persisted data.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeRecord(record = {}) {
  const date = assertDate(String(record.date || ''));
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date > today) throw new Error('不能记录未来日期');
  const exId = String(record.exId || '').trim();
  if (!exId) throw new Error('请选择训练动作');

  const sets = Math.max(1, Math.floor(numberOr(record.sets, 1)));
  const reps = Math.max(1, Math.floor(numberOr(record.reps, 1)));
  const weight = Math.max(0, numberOr(record.weight, 0));
  const duration = Math.max(1, numberOr(record.duration, 1));
  const note = String(record.note || '').trim().slice(0, 200);

  return { date, exId, sets, reps, weight, duration, note };
}

function normalizeNote(exId, text) {
  const normalizedExId = String(exId || '').trim();
  const normalizedText = String(text || '').trim().slice(0, 120);
  if (!normalizedExId || !normalizedText) throw new Error('动作与标注内容不能为空');
  return { exId: normalizedExId, text: normalizedText };
}

function assertId(id, label = '记录') {
  const value = String(id || '').trim();
  if (!value) throw new Error(`缺少${label}标识`);
  return value;
}

module.exports = { isValidDate, assertDate, normalizeRecord, normalizeNote, assertId };
