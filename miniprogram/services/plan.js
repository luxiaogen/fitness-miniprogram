// services/plan.js - 训练计划服务：模板查询 / 应用管理 / 一键填入记录
//
// 双模设计（与 services/cloud.js 对齐）：
// - 云端模式：已应用的计划读写 users 集合（user 云函数），跨设备同步；
// - 本地模式：存 wx.Storage，未配置云环境时也可完整演示。
// 云端失败会明确报错，绝不静默写回本地，避免两份不一致的数据。
const { PLANS } = require('../data/plans');
const cloud = require('./cloud');
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

// ---- 当前应用的计划 ----
function localCurrent() {
  try { return wx.getStorageSync(STORAGE_KEY) || null; } catch (e) { return null; }
}

// 读取当前应用的计划：{ planId, appliedAt } | null
async function current() {
  if (cloud.cloudConfigured()) {
    const res = await cloud.request('user', { action: 'getPlan' });
    return res.plan || null;
  }
  return localCurrent();
}

async function apply(planId) {
  const plan = getById(planId);
  if (!plan) return null;
  const cur = { planId, appliedAt: Date.now() };
  if (cloud.cloudConfigured()) {
    await cloud.request('user', { action: 'setPlan', plan: cur });
  } else {
    wx.setStorageSync(STORAGE_KEY, cur);
  }
  store.bumpPlans();
  return cur;
}

async function cancel() {
  if (cloud.cloudConfigured()) {
    await cloud.request('user', { action: 'setPlan', plan: null });
  } else {
    wx.removeStorageSync(STORAGE_KEY);
  }
  store.bumpPlans();
}

async function currentPlan() {
  const cur = await current();
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
  await recordService.createMany(day.exercises.map(ex => ({
      date,
      exId: ex.exId,
      sets: ex.sets,
      reps: ex.reps,
      weight: 0,
      duration: ex.sets * 2,
      note: ex.note ? `${day.name} · ${ex.note}` : day.name,
    })));
  return day.exercises.length;
}

module.exports = { list, getById, current, apply, cancel, currentPlan, fillDayToRecords };
