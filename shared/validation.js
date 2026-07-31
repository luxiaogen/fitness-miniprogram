// shared/validation.js - 训练记录字段限制的唯一事实源
//
// 由 scripts/sync-shared.js 同步生成两份副本（勿手改副本）：
//   - miniprogram/utils/validation-shared.js   （小程序端）
//   - cloudfunctions/records/validation-shared.js （云端）
// 修改本文件后运行 `npm run sync` 重新生成；`npm run verify` 会检查副本一致性。

const RECORD_LIMITS = Object.freeze({
  sets: { min: 1, max: 100, label: '组数', integer: true },
  reps: { min: 1, max: 1000, label: '每组次数', integer: true },
  weight: { min: 0, max: 10000, label: '重量', integer: false },
  duration: { min: 1, max: 1440, label: '时长', integer: true },
});

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}必须是有效数字`);
  return number;
}

// 按 limits 校验并归一化数值：integer 字段要求整数，超界抛错
// 消息中的空格与历史客户端格式保持一致（“1-100 的整数”）
function normalizeNumber(value, limits) {
  const number = finiteNumber(value, limits.label);
  if ((limits.integer && !Number.isInteger(number)) || number < limits.min || number > limits.max) {
    const suffix = limits.integer ? ' 的整数' : '';
    throw new Error(`${limits.label}应为 ${limits.min}-${limits.max}${suffix}`);
  }
  return number;
}

module.exports = { RECORD_LIMITS, finiteNumber, normalizeNumber };
