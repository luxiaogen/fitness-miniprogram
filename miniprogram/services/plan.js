// services/plan.js - 训练计划服务：模板查询 / 应用管理 / 一键填入记录
const { PLANS } = require('../data/plans');
const recordService = require('./record');
const store = require('../store/index');

const STORAGE_KEY = 'et_current_plan';

function list() {
  // 列表页摘要（不含 days 明细，减少传输）
  return PLANS.map(({ days, ...summary }) => ({
    ...summary,
    dayCount: days.length,
    exerciseCount: days.reduce((s, d) => s + d.exercises.length, 0),
  }));
}

function getById(id) {
  return PLANS.find(p => p.id === id) || null;
}

// ---- 当前应用的计划（MVP 存本地；接入云后可迁移到 users 集合） ----
function current() {
  try { return wx.getStorageSync(STORAGE_KEY) || null; } catch (e) { return null; }
}

function apply(planId) {
  const plan = getById(planId);
  if (!plan) return null;
  const cur = { planId, appliedAt: Date.now() };
  wx.setStorageSync(STORAGE_KEY, cur);
  store.bumpPlans();
  return cur;
}

function cancel() {
  wx.removeStorageSync(STORAGE_KEY);
  store.bumpPlans();
}

function currentPlan() {
  const cur = current();
  const plan = cur && getById(cur.planId);
  return plan ? { ...cur, plan } : null;
}

/**
 * 把计划某天的全部动作填入指定日期的训练记录
 * @returns {Promise<number>} 成功写入的条数
 */
async function fillDayToRecords(planId, dayIndex, date) {
  const plan = getById(planId);
  const day = plan && plan.days[dayIndex];
  if (!day) return 0;
  // 串行写入，保证云端/本地两种模式下顺序一致；备注合并计划来源与动作要点
  for (const ex of day.exercises) {
    await recordService.create({
      date,
      exId: ex.exId,
      sets: ex.sets,
      reps: ex.reps,
      weight: 0,
      duration: ex.sets * 2,
      note: ex.note ? `${day.name} · ${ex.note}` : day.name,
    });
  }
  return day.exercises.length;
}

module.exports = { list, getById, current, apply, cancel, currentPlan, fillDayToRecords };
