// services/cloud.js - 统一数据访问层
//
// 双模设计（MVP 关键策略）：
// - 云端模式：wx.cloud 可用时，请求路由到云函数，数据存云数据库（按 openid 隔离）；
// - 本地模式：未配置云环境时，使用 wx.Storage 模拟同样的接口与返回结构。
// 上层服务（record/note）只面向本模块编程，不感知后端差异 —— 配好云环境即无缝切换。

const app = getApp();

const cloudReady = () => !!(app && app.globalData && app.globalData.cloudReady);
const cloudConfigured = () => !!(app && app.globalData && app.globalData.cloudConfigured);

class CloudApplicationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CloudApplicationError';
  }
}

/**
 * 调用云函数并解包统一返回结构 { code, data, msg }
 * @param {string} name 云函数名
 * @param {object} data 请求体（含 action）
 */
async function call(name, data) {
  const res = await wx.cloud.callFunction({ name, data });
  const result = res.result || {};
  if (result.code !== 0) throw new CloudApplicationError(result.msg || '云函数返回异常');
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

function paged(items, { offset = 0, pageSize = 100 } = {}) {
  const start = Number(offset);
  const size = Number(pageSize);
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
    throw new Error('分页参数无效');
  }
  const page = items.slice(start, start + size);
  return { items: page, hasMore: start + page.length < items.length };
}

const localImpl = {
  records: {
    async list({ date, start, end, offset, pageSize }) {
      const records = readLocal(LOCAL_KEYS.records)
        .filter(r => date ? r.date === date : (r.date >= start && r.date <= end))
        .sort((a, b) => a.createdAt - b.createdAt);
      return paged(records, { offset, pageSize });
    },
    async create({ record }) {
      const all = readLocal(LOCAL_KEYS.records);
      const item = { ...record, _id: localId(), createdAt: Date.now() };
      all.push(item);
      writeLocal(LOCAL_KEYS.records, all);
      return item;
    },
    async createMany({ records }) {
      if (!Array.isArray(records) || !records.length || records.length > 20) {
        throw new Error('批量训练记录数量无效');
      }
      const all = readLocal(LOCAL_KEYS.records);
      const createdAt = Date.now();
      const items = records.map((record, index) => ({
        ...record,
        _id: localId(),
        createdAt: createdAt + index,
      }));
      writeLocal(LOCAL_KEYS.records, all.concat(items));
      return items;
    },
    async remove({ id }) {
      const all = readLocal(LOCAL_KEYS.records);
      const remaining = all.filter(r => r._id !== id);
      writeLocal(LOCAL_KEYS.records, remaining);
      return { removed: all.length - remaining.length };
    },
  },
  notes: {
    async list({ exId, offset, pageSize }) {
      const notes = readLocal(LOCAL_KEYS.notes)
        .filter(n => n.exId === exId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return paged(notes, { offset, pageSize });
    },
    async summary({ offset, pageSize }) {
      const exIds = readLocal(LOCAL_KEYS.notes)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(note => note.exId);
      return paged(exIds, { offset, pageSize });
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
  if (cloudConfigured()) {
    if (!cloudReady()) throw new Error('云服务初始化失败，请检查环境配置后重试');
    try {
      return await call(resource, payload);
    } catch (e) {
      if (e instanceof CloudApplicationError) throw e;
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

async function listAll(resource, payload, pageSize = 100) {
  const items = [];
  let offset = 0;

  while (true) {
    const page = await request(resource, { ...payload, offset, pageSize });
    if (!page || !Array.isArray(page.items)) throw new Error('分页数据格式异常');
    items.push(...page.items);
    if (!page.hasMore) return items;
    if (!page.items.length) throw new Error('分页数据异常');
    offset += page.items.length;
  }
}

module.exports = { request, listAll, cloudReady, cloudConfigured, CloudApplicationError };
