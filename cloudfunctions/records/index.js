// 云函数 records - 训练记录的查询 / 创建 / 删除（按 openid 隔离）
//
// action = list       { date } 或 { start, end } + 分页参数 -> { items, hasMore }
// action = create     { record }                            -> 新建记录
// action = createMany { records }                           -> 原子批量新增记录
// action = remove     { id }                                -> { removed }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 100;
const MAX_BATCH_SIZE = 20;
const RECORD_LIMITS = {
  sets: { min: 1, max: 100, label: '组数', integer: true },
  reps: { min: 1, max: 1000, label: '每组次数', integer: true },
  weight: { min: 0, max: 10000, label: '重量', integer: false },
  duration: { min: 1, max: 1440, label: '时长', integer: true },
};

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}

function businessToday() {
  // Training dates are defined in China Standard Time, not the cloud runtime's
  // implicit timezone, so late-night writes stay consistent with the client.
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label}必须是有效数字`);
  return number;
}

function normalizeNumber(value, limits) {
  const number = finiteNumber(value, limits.label);
  if ((limits.integer && !Number.isInteger(number)) || number < limits.min || number > limits.max) {
    const suffix = limits.integer ? '的整数' : '';
    throw new Error(`${limits.label}应为 ${limits.min}-${limits.max}${suffix}`);
  }
  return number;
}

function pageArgs(event) {
  const offset = event.offset === undefined ? 0 : Number(event.offset);
  const pageSize = event.pageSize === undefined ? PAGE_SIZE : Number(event.pageSize);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(pageSize) ||
      pageSize < 1 || pageSize > PAGE_SIZE) {
    throw new Error('分页参数无效');
  }
  return { offset, pageSize };
}

function recordDocument(record, openid, createdAt = db.serverDate()) {
  const date = String(record.date || '');
  const exId = String(record.exId || '').trim();
  if (!isValidDate(date)) throw new Error('日期格式无效');
  if (date > businessToday()) throw new Error('只能记录今天或之前的训练');
  if (!exId || exId.length > 64) throw new Error('动作标识无效');

  return {
    _openid: openid,
    date,
    exId,
    sets: normalizeNumber(record.sets, RECORD_LIMITS.sets),
    reps: normalizeNumber(record.reps, RECORD_LIMITS.reps),
    weight: normalizeNumber(record.weight, RECORD_LIMITS.weight),
    duration: normalizeNumber(record.duration, RECORD_LIMITS.duration),
    note: String(record.note || '').trim().slice(0, 200),
    createdAt,
  };
}

exports.main = async (event) => {
  event = event || {};
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: '无法识别当前用户' };
  const coll = db.collection('records');

  switch (event.action) {
    case 'list': {
      const where = { _openid: OPENID };
      let paging;
      try {
        paging = pageArgs(event);
      } catch (e) {
        return { code: -1, msg: e.message };
      }
      if (event.date) {
        if (!isValidDate(String(event.date))) return { code: -1, msg: 'date 格式无效' };
        where.date = event.date;
      } else if (event.start && event.end) {
        if (!isValidDate(String(event.start)) || !isValidDate(String(event.end)) ||
            String(event.start) > String(event.end)) {
          return { code: -1, msg: '日期范围无效' };
        }
        where.date = _.gte(event.start).and(_.lte(event.end));
      } else {
        return { code: -1, msg: '缺少 date 或 start/end 参数' };
      }
      const res = await coll.where(where)
        .orderBy('createdAt', 'asc')
        .skip(paging.offset)
        .limit(paging.pageSize + 1)
        .get();
      return {
        code: 0,
        data: {
          items: res.data.slice(0, paging.pageSize),
          hasMore: res.data.length > paging.pageSize,
        },
      };
    }

    case 'create': {
      let doc;
      try {
        doc = recordDocument(event.record || {}, OPENID);
      } catch (e) {
        return { code: -1, msg: e.message };
      }
      const res = await coll.add({ data: doc });
      return { code: 0, data: { ...doc, _id: res._id } };
    }

    case 'createMany': {
      if (!Array.isArray(event.records) || !event.records.length || event.records.length > MAX_BATCH_SIZE) {
        return { code: -1, msg: `每次最多保存 ${MAX_BATCH_SIZE} 条训练记录` };
      }
      let docs;
      try {
        const batchCreatedAt = Date.now();
        // CloudBase transactions cannot write serverDate() field operations.
        // Use server-generated Date values instead while preserving batch order.
        docs = event.records.map((record, index) =>
          recordDocument(record || {}, OPENID, new Date(batchCreatedAt + index)));
      } catch (e) {
        return { code: -1, msg: e.message };
      }

      const items = await db.runTransaction(async transaction => {
        const created = [];
        for (const doc of docs) {
          const res = await transaction.collection('records').add({ data: doc });
          created.push({ ...doc, _id: res._id });
        }
        return created;
      });
      return { code: 0, data: items };
    }

    case 'remove': {
      const id = String(event.id || '').trim();
      if (!id) return { code: -1, msg: '缺少 id' };
      // where _openid 双重校验，防止越权删除他人数据
      const res = await coll.where({ _openid: OPENID, _id: id }).remove();
      return { code: 0, data: { removed: res.stats.removed } };
    }

    default:
      return { code: -1, msg: `未知 action: ${event.action}` };
  }
};
