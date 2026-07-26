// services/exercise.js - 动作库查询服务（静态数据，随包发布，零网络依赖）
const { EXERCISES } = require('../data/exercises');

const FILTERS = ['all', ...new Set(EXERCISES.map(e => e.bodyPart))];

function getById(id) {
  return EXERCISES.find(e => e.id === id) || null;
}

/**
 * 筛选 + 关键词搜索
 * @param {string} bodyPart 部位分类，'all' 表示全部
 * @param {string} keyword 匹配中文名 / 英文名 / 目标肌群 / 器械
 */
function query(bodyPart = 'all', keyword = '') {
  const kw = keyword.trim().toLowerCase();
  return EXERCISES.filter(e =>
    (bodyPart === 'all' || e.bodyPart === bodyPart) &&
    (!kw ||
      e.nameZh.includes(kw) ||
      e.name.toLowerCase().includes(kw) ||
      e.targetZh.includes(kw) ||
      e.equipmentZh.includes(kw))
  );
}

// 演示 GIF 地址：32 色压缩后存放于 packageDetail 分包（51 个共 ~1.9MB，单分包上限 2MB 内）。
// image 组件播放 GIF 为小程序原生成熟能力，模拟器与真机行为一致；
// 分包仅在 Wi-Fi 下预下载；移动网络按需加载以避免额外流量消耗。
// 后续开通云存储后，仅需把本函数返回值换成 fileID/HTTPS 地址即可平滑切换 CDN。
function gifUrl(exercise) {
  return `/packageDetail/assets/gifs/${exercise.gifFile.split('/')[1]}`;
}

module.exports = { EXERCISES, FILTERS, getById, query, gifUrl };
