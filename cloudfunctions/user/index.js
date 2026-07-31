// 云函数 user - 用户资料读写（当前训练计划等），数据存 users 集合
//
// action = getPlan  无入参                              -> { plan: { planId, appliedAt } | null }
// action = setPlan  { plan: { planId, appliedAt } | null } -> { plan: { planId, appliedAt } | null }
//   plan 为 null 时清除已应用的计划（删除 appliedPlan 字段）
// users 文档由 login 云函数创建；此处按 _openid 定位，不存在时自动创建。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const PLAN_ID_RE = /^[a-z0-9-]{1,64}$/;

function normalizePlan(plan) {
  if (plan === null || plan === undefined) return null;
  const planId = String(plan.planId || '').trim();
  const appliedAt = Number(plan.appliedAt);
  if (!PLAN_ID_RE.test(planId)) throw new Error('计划标识无效');
  if (!Number.isFinite(appliedAt) || appliedAt <= 0) throw new Error('计划应用时间无效');
  return { planId, appliedAt };
}

exports.main = async (event) => {
  event = event || {};
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: '无法识别当前用户' };
  const users = db.collection('users');

  switch (event.action) {
    case 'getPlan': {
      const res = await users.where({ _openid: OPENID }).field({ appliedPlan: true }).limit(1).get();
      const doc = res.data && res.data[0];
      return { code: 0, data: { plan: (doc && doc.appliedPlan) || null } };
    }

    case 'setPlan': {
      let plan;
      try {
        plan = normalizePlan(event.plan);
      } catch (e) {
        return { code: -1, msg: e.message };
      }
      if (plan) {
        const res = await users.where({ _openid: OPENID }).update({
          data: { appliedPlan: { planId: plan.planId, appliedAt: plan.appliedAt } },
        });
        if (res.stats.updated === 0) {
          // 用户文档不存在（login 尚未写入），补建
          await users.add({
            data: {
              _openid: OPENID,
              createdAt: db.serverDate(),
              lastActiveAt: db.serverDate(),
              appliedPlan: { planId: plan.planId, appliedAt: plan.appliedAt },
            },
          });
        }
      } else {
        await users.where({ _openid: OPENID }).update({ data: { appliedPlan: _.remove() } });
      }
      return { code: 0, data: { plan } };
    }

    default:
      return { code: -1, msg: `未知 action: ${event.action}` };
  }
};
