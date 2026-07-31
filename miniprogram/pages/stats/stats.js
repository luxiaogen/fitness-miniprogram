// pages/stats - 数据统计：本周/本月汇总 + 频次图 + 部位分布
//
// 聚合策略（MVP）：服务层分页拉取周期内记录后在前端聚合，
// 避免单页上限造成漏算；数据继续增长后可下沉为 stats 云函数。
// 「周期统计」与「近 7 天频次」窗口有重叠，合并为一次拉取后派生两个视图。
const recordService = require('../../services/record');
const themeService = require('../../services/theme');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');
const { getById } = require('../../services/exercise');
const { shiftDate, todayStr, weekRange, monthRange } = require('../../utils/date');
const { aggregatePeriod, buildWeekBars } = require('../../utils/stats');
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
    loading: false,    // 统计加载中（骨架屏）
    loadError: false,  // 统计加载失败（错误视图 + 重试）
    themePref: 'dark', // 外观设置：light | dark | auto
    themeOptions: [
      { k: 'light', icon: '☀️', label: '浅色' },
      { k: 'dark', icon: '🌙', label: '深色' },
      { k: 'auto', icon: '⚙️', label: '跟随系统' },
    ],
  },

  onShow() {
    // 版本号门控：记录变化才重新聚合，避免切 tab 时重复请求
    if (store.get('recordVersion') !== this._lastRecordVersion) {
      this.loadStats();
    }
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

  // 一次拉取覆盖「周期窗口」与「近 7 天窗口」，分别派生统计数据与频次图
  async loadStats() {
    const requestId = (this._statsRequestId || 0) + 1;
    this._statsRequestId = requestId;
    this.setData({ loading: true, loadError: false });
    try {
      const today = todayStr();
      const period = this.data.period === 'week' ? weekRange() : monthRange();
      const weekStart = shiftDate(today, -6);
      // 周期窗口与近 7 天窗口的并集（今天必在周期内，故结束取周期末即可）
      const fetchStart = period.start < weekStart ? period.start : weekStart;

      const records = await recordService.listRange(fetchStart, period.end);
      const periodRecords = records.filter(r => r.date >= period.start && r.date <= period.end);
      const weekRecords = records.filter(r => r.date >= weekStart && r.date <= today);

      const stats = aggregatePeriod(periodRecords, getById);
      const weekBars = buildWeekBars(weekRecords, today);

      if (requestId !== this._statsRequestId) return;
      // 拉取成功后记录门控状态（失败时保持旧状态，下次 onShow 会重试）
      this._lastRecordVersion = store.get('recordVersion');
      this.setData({ ...stats, weekBars, loading: false });
    } catch (e) {
      if (requestId !== this._statsRequestId) return;
      this.setData({ loading: false, loadError: true });
      showError(e, '统计数据加载失败');
    }
  },

  onRetry() {
    this.loadStats();
  },

  onUnload() {
    this._statsRequestId = (this._statsRequestId || 0) + 1;
  },
});
