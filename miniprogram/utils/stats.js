// utils/stats.js - 统计聚合（纯函数，便于单元测试）
const { WEEK_CN, shiftDate, dayOfWeek } = require('./date');

/**
 * 周期统计：训练天数 / 组数 / 次数 / 时长 / 部位分布
 * @param {Array} records 周期内训练记录
 * @param {(exId: string) => object|null} [resolveExercise] 动作解析器（返回含 bodyPartZh 的对象）
 * @returns {{days: number, totalSets: number, totalReps: number, totalDuration: number, partBars: Array}}
 */
function aggregatePeriod(records, resolveExercise) {
  const daySet = new Set();
  const partMap = {};
  let totalSets = 0, totalReps = 0, totalDuration = 0;
  records.forEach(r => {
    daySet.add(r.date);
    totalSets += Number(r.sets) || 0;
    totalReps += (Number(r.sets) || 0) * (Number(r.reps) || 0);
    totalDuration += Number(r.duration) || 0;
    const ex = resolveExercise && resolveExercise(r.exId);
    if (ex) partMap[ex.bodyPartZh] = (partMap[ex.bodyPartZh] || 0) + (Number(r.sets) || 0);
  });

  const parts = Object.entries(partMap).sort((a, b) => b[1] - a[1]);
  const maxPart = parts.length ? parts[0][1] : 1;
  return {
    days: daySet.size,
    totalSets,
    totalReps,
    totalDuration,
    partBars: parts.map(([label, sets]) => ({
      label, sets, widthPct: Math.round((sets / maxPart) * 100),
    })),
  };
}

/**
 * 近 7 天频次柱状图（今天往前共 7 根柱）
 * @param {Array} records 覆盖窗口内的训练记录（应已按窗口过滤）
 * @param {string} today 今天（YYYY-MM-DD）
 * @returns {Array<{label: string, sets: number, heightPct: number}>}
 */
function buildWeekBars(records, today) {
  const setsByDay = {};
  records.forEach(r => { setsByDay[r.date] = (setsByDay[r.date] || 0) + (Number(r.sets) || 0); });

  const bars = [];
  for (let i = 6; i >= 0; i--) {
    const ds = shiftDate(today, -i);
    bars.push({
      label: i === 0 ? '今天' : '周' + WEEK_CN[dayOfWeek(ds)],
      sets: setsByDay[ds] || 0,
    });
  }
  const max = Math.max(...bars.map(b => b.sets), 1);
  bars.forEach(b => { b.heightPct = Math.max(3, Math.round((b.sets / max) * 100)); });
  return bars;
}

module.exports = { aggregatePeriod, buildWeekBars };
