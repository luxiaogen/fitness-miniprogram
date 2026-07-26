// pages/stats - 数据统计：本周/本月汇总 + 频次图 + 部位分布
//
// 聚合策略（MVP）：服务层分页拉取周期内记录后在前端聚合，
// 避免单页上限造成漏算；数据继续增长后可下沉为 stats 云函数。
const recordService = require('../../services/record');
const themeService = require('../../services/theme');
const { withTheme } = require('../../utils/withTheme');
const { getById } = require('../../services/exercise');
const { WEEK_CN, dstr, shiftDate, todayStr, weekRange, monthRange } = require('../../utils/date');
const { showError } = require('../../utils/notify');

withTheme({
  data: {
    period: 'week',
    days: 0,
    totalSets: 0,
    totalReps: 0,
    totalDuration: 0,
    weekBars: [],      // 近 7 天 [{ label, sets, heightPct }]
    partBars: [],      // 部位分布 [{ label, sets, widthPct }]
    themePref: 'dark', // 外观设置：light | dark | auto
    themeOptions: [
      { k: 'light', icon: '☀️', label: '浅色' },
      { k: 'dark', icon: '🌙', label: '深色' },
      { k: 'auto', icon: '⚙️', label: '跟随系统' },
    ],
  },

  onShow() {
    this.loadStats();
    this.loadWeekBars();
    this.setData({ themePref: themeService.preference() });
  },

  // 外观三态切换：浅色 / 深色 / 跟随系统
  onThemePrefTap(e) {
    const pref = e.currentTarget.dataset.p;
    themeService.setTheme(pref);
    this.setData({ themePref: pref });
  },

  onPeriodTap(e) {
    const period = e.currentTarget.dataset.p;
    this.setData({ period }, () => this.loadStats());
  },

  async loadStats() {
    const requestId = (this._statsRequestId || 0) + 1;
    this._statsRequestId = requestId;
    try {
      const { start, end } = this.data.period === 'week' ? weekRange() : monthRange();
      const records = await recordService.listRange(start, end);

      const daySet = new Set();
      const partMap = {};
      let totalSets = 0, totalReps = 0, totalDuration = 0;
      records.forEach(r => {
        daySet.add(r.date);
        totalSets += Number(r.sets) || 0;
        totalReps += (Number(r.sets) || 0) * (Number(r.reps) || 0);
        totalDuration += Number(r.duration) || 0;
        const ex = getById(r.exId);
        if (ex) partMap[ex.bodyPartZh] = (partMap[ex.bodyPartZh] || 0) + (Number(r.sets) || 0);
      });

      const parts = Object.entries(partMap).sort((a, b) => b[1] - a[1]);
      const maxPart = parts.length ? parts[0][1] : 1;
      if (requestId !== this._statsRequestId) return;
      this.setData({
        days: daySet.size,
        totalSets,
        totalReps,
        totalDuration,
        partBars: parts.map(([label, sets]) => ({
          label, sets, widthPct: Math.round((sets / maxPart) * 100),
        })),
      });
    } catch (e) {
      if (requestId !== this._statsRequestId) return;
      showError(e, '统计数据加载失败');
    }
  },

  // 近 7 天柱状图（与周期切换无关，固定展示）
  async loadWeekBars() {
    const requestId = (this._weekBarsRequestId || 0) + 1;
    this._weekBarsRequestId = requestId;
    try {
      const start = shiftDate(todayStr(), -6);
      const records = await recordService.listRange(start, todayStr());
      const setsByDay = {};
      records.forEach(r => { setsByDay[r.date] = (setsByDay[r.date] || 0) + (Number(r.sets) || 0); });

      const bars = [];
      for (let i = 6; i >= 0; i--) {
        const ds = shiftDate(todayStr(), -i);
        const d = new Date(ds + 'T00:00:00');
        bars.push({
          label: i === 0 ? '今天' : '周' + WEEK_CN[d.getDay()],
          sets: setsByDay[ds] || 0,
        });
      }
      const max = Math.max(...bars.map(b => b.sets), 1);
      bars.forEach(b => { b.heightPct = Math.max(3, Math.round((b.sets / max) * 100)); });
      if (requestId !== this._weekBarsRequestId) return;
      this.setData({ weekBars: bars });
    } catch (e) {
      if (requestId !== this._weekBarsRequestId) return;
      showError(e, '频次数据加载失败');
    }
  },

  onUnload() {
    this._statsRequestId = (this._statsRequestId || 0) + 1;
    this._weekBarsRequestId = (this._weekBarsRequestId || 0) + 1;
  },
});
