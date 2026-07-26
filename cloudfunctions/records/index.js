// 云函数 records - 训练记录的查询 / 创建 / 删除（按 openid 隔离）
//
// action = list   { date } 或 { start, end }  -> 记录数组
// action = create { record }                  -> 新建记录
// action = remove { id }                      -> { removed }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value;
}

function today() {
  const date = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

exports.main = async (event) => {
  event = event || {};
  const { OPENID } = cloud.getWXContext();
  const coll = db.collection('records');

  switch (event.action) {
    case 'list': {
      const where = { _openid: OPENID };
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
      const res = await coll.where(where).orderBy('createdAt', 'asc').limit(200).get();
      return { code: 0, data: res.data };
    }

    case 'create': {
      const r = event.record || {};
      const date = String(r.date || '');
      const exId = String(r.exId || '').trim();
      if (!isValidDate(date) || date > today()) return { code: -1, msg: '只能记录今天或之前的训练' };
      if (!exId) return { code: -1, msg: 'date 与 exId 必填' };
      // 服务端字段校验，避免脏数据入库
      const doc = {
        _openid: OPENID,
        date,
        exId: exId.slice(0, 64),
        sets: Math.min(100, Math.max(1, Math.floor(finiteNumber(r.sets, 1)))),
        reps: Math.min(1000, Math.max(1, Math.floor(finiteNumber(r.reps, 1)))),
        weight: Math.min(10000, Math.max(0, finiteNumber(r.weight, 0))),
        duration: Math.min(1440, Math.max(1, finiteNumber(r.duration, 1))),
        note: String(r.note || '').slice(0, 200),
        createdAt: db.serverDate(),
      };
      const res = await coll.add({ data: doc });
      return { code: 0, data: { ...doc, _id: res._id } };
    }

    case 'remove': {
      if (!event.id) return { code: -1, msg: '缺少 id' };
      // where _openid 双重校验，防止越权删除他人数据
      const res = await coll.where({ _openid: OPENID, _id: event.id }).remove();
      return { code: 0, data: { removed: res.stats.removed } };
    }

    default:
      return { code: -1, msg: `未知 action: ${event.action}` };
  }
};
