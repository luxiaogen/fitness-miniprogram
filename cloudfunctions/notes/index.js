// 云函数 notes - 动作标注的查询 / 创建 / 删除（按 openid 隔离）
//
// action = list   { exId }       -> 标注数组（时间倒序）
// action = create { exId, text } -> 新建标注
// action = remove { id }         -> { removed }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  event = event || {};
  const { OPENID } = cloud.getWXContext();
  const coll = db.collection('notes');

  switch (event.action) {
    case 'list': {
      const exId = String(event.exId || '').trim();
      if (!exId) return { code: -1, msg: '缺少 exId' };
      const res = await coll
        .where({ _openid: OPENID, exId })
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      return { code: 0, data: res.data };
    }

    case 'create': {
      const exId = String(event.exId || '').trim().slice(0, 64);
      const text = String(event.text || '').trim().slice(0, 120);
      if (!exId || !text) return { code: -1, msg: 'exId 与 text 必填' };
      const doc = {
        _openid: OPENID,
        exId,
        text,
        createdAt: db.serverDate(),
      };
      const res = await coll.add({ data: doc });
      return { code: 0, data: { ...doc, _id: res._id } };
    }

    case 'remove': {
      if (!event.id) return { code: -1, msg: '缺少 id' };
      const res = await coll.where({ _openid: OPENID, _id: event.id }).remove();
      return { code: 0, data: { removed: res.stats.removed } };
    }

    default:
      return { code: -1, msg: `未知 action: ${event.action}` };
  }
};
