// 云函数 login - 静默登录：返回 openid，首次访问写入 users 集合
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: -1, msg: '无法识别当前用户' };
  const users = db.collection('users');

  const exist = await users.where({ _openid: OPENID }).count();
  if (!exist.total) {
    await users.add({
      data: { _openid: OPENID, createdAt: db.serverDate(), lastActiveAt: db.serverDate() },
    });
  } else {
    await users.where({ _openid: OPENID }).update({ data: { lastActiveAt: db.serverDate() } });
  }

  return { code: 0, data: { openid: OPENID, isNew: !exist.total } };
};
