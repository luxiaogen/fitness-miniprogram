// 云函数 notes - 动作标注的查询 / 创建 / 删除（按 openid 隔离）
//
// action = list    { exId } + 分页参数 -> { items, hasMore }
// action = summary 分页返回含标注的动作 ID
// action = create  { exId, text }       -> 新建标注
// action = remove  { id }               -> { removed }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const PAGE_SIZE = 100;

function pageArgs(event) {
  const offset = event.offset === undefined ? 0 : Number(event.offset);
  const pageSize = event.pageSize === undefined ? PAGE_SIZE : Number(event.pageSize);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(pageSize) ||
      pageSize < 1 || pageSize > PAGE_SIZE) {
    throw new Error('分页参数无效');
  }
  return { offset, pageSize };
}

exports.main = async (event) => {
  event = event || {};
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: '无法识别当前用户' };
  const coll = db.collection('notes');

  switch (event.action) {
    case 'list': {
      const exId = String(event.exId || '').trim();
      if (!exId) return { code: -1, msg: '缺少 exId' };
      let paging;
      try {
        paging = pageArgs(event);
      } catch (e) {
        return { code: -1, msg: e.message };
      }
      const res = await coll
        .where({ _openid: OPENID, exId })
        .orderBy('createdAt', 'desc')
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

    case 'summary': {
      let paging;
      try {
        paging = pageArgs(event);
      } catch (e) {
        return { code: -1, msg: e.message };
      }
      const res = await coll
        .where({ _openid: OPENID })
        .field({ exId: true })
        .orderBy('createdAt', 'desc')
        .skip(paging.offset)
        .limit(paging.pageSize + 1)
        .get();
      return {
        code: 0,
        data: {
          items: res.data.slice(0, paging.pageSize).map(note => note.exId),
          hasMore: res.data.length > paging.pageSize,
        },
      };
    }

    case 'create': {
      const exId = String(event.exId || '').trim();
      const text = String(event.text || '').trim().slice(0, 120);
      if (!exId || exId.length > 64 || !text) return { code: -1, msg: 'exId 与 text 必填' };
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
      const id = String(event.id || '').trim();
      if (!id) return { code: -1, msg: '缺少 id' };
      const res = await coll.where({ _openid: OPENID, _id: id }).remove();
      return { code: 0, data: { removed: res.stats.removed } };
    }

    default:
      return { code: -1, msg: `未知 action: ${event.action}` };
  }
};
