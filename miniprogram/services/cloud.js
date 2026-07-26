// services/cloud.js - 统一数据访问层
//
// 双模设计（MVP 关键策略）：
// - 云端模式：wx.cloud 可用时，请求路由到云函数，数据存云数据库（按 openid 隔离）；
// - 本地模式：未配置云环境时，使用 wx.Storage 模拟同样的接口与返回结构。
// 上层服务（record/note）只面向本模块编程，不感知后端差异 —— 配好云环境即无缝切换。

const app = getApp();

const cloudReady = () => !!(app && app.globalData && app.globalData.cloudReady);

/**
 * 调用云函数并解包统一返回结构 { code, data, msg }
 * @param {string} name 云函数名
 * @param {object} data 请求体（含 action）
 */
async function call(name, data) {
  const res = await wx.cloud.callFunction({ name, data });
  const result = res.result || {};
  if (result.code !== 0) throw new Error(result.msg || '云函数返回异常');
  return result.data;
}

/* ---------------- 本地模式存储实现 ---------------- */
const LOCAL_KEYS = { records: 'local_records', notes: 'local_notes' };

function readLocal(key) {
  try {
    const value = wx.getStorageSync(key);
    return Array.isArray(value) ? value : [];
  } catch (e) {
    console.error(`[cloud] 读取本地数据失败: ${key}`, e);
    throw new Error('本地数据读取失败');
  }
}
function writeLocal(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error(`[cloud] 写入本地数据失败: ${key}`, e);
    throw new Error('本地数据保存失败');
  }
}
function localId() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const localImpl = {
  records: {
    async list({ date, start, end }) {
      return readLocal(LOCAL_KEYS.records)
        .filter(r => date ? r.date === date : (r.date >= start && r.date <= end))
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async create({ record }) {
      const all = readLocal(LOCAL_KEYS.records);
      const item = { ...record, _id: localId(), createdAt: Date.now() };
      all.push(item);
      writeLocal(LOCAL_KEYS.records, all);
      return item;
    },
    async remove({ id }) {
      const all = readLocal(LOCAL_KEYS.records);
      const remaining = all.filter(r => r._id !== id);
      writeLocal(LOCAL_KEYS.records, remaining);
      return { removed: all.length - remaining.length };
    },
  },
  notes: {
    async list({ exId }) {
      return readLocal(LOCAL_KEYS.notes)
        .filter(n => n.exId === exId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 50);
    },
    async create({ exId, text }) {
      const all = readLocal(LOCAL_KEYS.notes);
      const item = { _id: localId(), exId, text, createdAt: Date.now() };
      all.push(item);
      writeLocal(LOCAL_KEYS.notes, all);
      return item;
    },
    async remove({ id }) {
      const all = readLocal(LOCAL_KEYS.notes);
      const remaining = all.filter(n => n._id !== id);
      writeLocal(LOCAL_KEYS.notes, remaining);
      return { removed: all.length - remaining.length };
    },
  },
};

/**
 * 数据访问入口
 * @param {'records'|'notes'} resource
 * @param {object} payload { action: 'list'|'create'|'remove', ... }
 */
async function request(resource, payload) {
  if (cloudReady()) {
    try {
      return await call(resource, payload);
    } catch (e) {
      // Do not silently write to local storage after a cloud failure: that
      // creates two divergent copies of a user's data.
      console.error(`[cloud] ${resource}.${payload.action} 云端请求失败`, e);
      throw new Error('云端服务暂不可用，请稍后重试');
    }
  }
  const fn = localImpl[resource] && localImpl[resource][payload.action];
  if (!fn) throw new Error(`未知操作: ${resource}.${payload.action}`);
  return fn(payload);
}

module.exports = { request, cloudReady };
