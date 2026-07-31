// pages/calendar - 锻炼日历：月视图标记 + 当日详情
const recordService = require('../../services/record');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');
const { WEEK_CN, dstr, todayStr, parseDate, dateLabel } = require('../../utils/date');
const { showError } = require('../../utils/notify');
const { isValidDate } = require('../../utils/validation');
const { buildMonthCells } = require('../../utils/calendar');

withTheme({
  data: {
    year: 0,
    month: 0,          // 0-based
    monthText: '',
    weekLabels: WEEK_CN,
    cells: [],         // 42 格：{ ds, day, dim, has, isToday, isSel }
    selDate: '',
    selLabel: '',
    selRecords: [],
    selSets: 0,
    selDuration: 0,
    loading: false,    // 月视图加载中（骨架屏）
    loadError: false,  // 月视图加载失败（错误视图 + 重试）
  },

  onLoad() {
    const today = todayStr();
    const now = parseDate(today);
    this.setData({ year: now.getUTCFullYear(), month: now.getUTCMonth(), selDate: today });
  },

  onShow() {
    const storedDate = store.get('selectedDate');
    const selectedDate = isValidDate(storedDate) && storedDate <= todayStr() ? storedDate : todayStr();
    if (selectedDate !== storedDate) store.set('selectedDate', selectedDate);
    const selected = parseDate(selectedDate);
    const year = selected.getUTCFullYear();
    const month = selected.getUTCMonth();
    this.setData({ year, month, selDate: selectedDate });

    // 版本号门控：月份或记录版本变化才重拉整月；仅选中日变化时从当月缓存刷新详情
    const recordVersion = store.get('recordVersion');
    const monthChanged = year !== this._lastYear || month !== this._lastMonth;
    if (recordVersion !== this._lastRecordVersion || monthChanged) {
      this.buildMonth(year, month, selectedDate);
    } else if (selectedDate !== this._lastSelDate) {
      this.showDayDetail(selectedDate);
    }
  },

  // 拉取当月全部记录 -> 构建 42 格 -> 从同一份数据派生选中日详情（省一次单日请求）
  async buildMonth(year = this.data.year, month = this.data.month, selDate = this.data.selDate) {
    const requestId = (this._monthRequestId || 0) + 1;
    this._monthRequestId = requestId;
    this.setData({ loading: true, loadError: false });
    try {
      const start = dstr(new Date(Date.UTC(year, month, 1)));
      const end = dstr(new Date(Date.UTC(year, month + 1, 0)));
      const records = await recordService.listRange(start, end);
      const dayRecords = {};
      records.forEach(r => { (dayRecords[r.date] = dayRecords[r.date] || []).push(r); });

      if (requestId !== this._monthRequestId) return;
      // 拉取成功后记录门控状态（失败时保持旧状态，下次 onShow 会重试）
      this._lastYear = year;
      this._lastMonth = month;
      this._lastRecordVersion = store.get('recordVersion');
      this._dayRecords = dayRecords;
      this._dayRange = { start, end };
      this.setData({
        cells: buildMonthCells(year, month, dayRecords, selDate, todayStr()),
        monthText: `${year} 年 ${month + 1} 月`,
        loading: false,
      });
      // 选中日在本月范围内才刷新详情；切月后保留上一月的旧详情（与原有行为一致）
      if (selDate >= start && selDate <= end) this.showDayDetail(selDate);
    } catch (e) {
      if (requestId !== this._monthRequestId) return;
      this.setData({ loading: false, loadError: true });
      showError(e, '日历加载失败');
    }
  },

  onRetry() {
    this.buildMonth(this.data.year, this.data.month, this.data.selDate);
  },

  // 选中日详情：优先从当月缓存派生；缓存未覆盖（如选中了非本月日期）才走单日拉取兜底
  showDayDetail(date) {
    const range = this._dayRange;
    if (range && date >= range.start && date <= range.end) {
      const records = this._dayRecords[date] || [];
      this._lastSelDate = date;
      this.setData({
        selDate: date,
        selRecords: records,
        selSets: records.reduce((s, r) => s + r.sets, 0),
        selDuration: records.reduce((s, r) => s + (r.duration || 0), 0),
        selLabel: dateLabel(date),
      });
      return;
    }
    this.loadDayDetail(date);
  },

  async loadDayDetail(date = this.data.selDate) {
    const requestId = (this._detailRequestId || 0) + 1;
    this._detailRequestId = requestId;
    try {
      const records = await recordService.listByDate(date);
      if (requestId !== this._detailRequestId) return;
      this._lastSelDate = date;
      this.setData({
        selDate: date,
        selRecords: records,
        selSets: records.reduce((s, r) => s + r.sets, 0),
        selDuration: records.reduce((s, r) => s + (r.duration || 0), 0),
        selLabel: dateLabel(date),
      });
    } catch (e) {
      if (requestId !== this._detailRequestId) return;
      showError(e, '训练详情加载失败');
    }
  },

  onShiftMonth(e) {
    let { year, month } = this.data;
    month += Number(e.currentTarget.dataset.d);
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    this.setData({ year, month });
    this.buildMonth(year, month);
  },

  onSelectDay(e) {
    const { ds, dim } = e.currentTarget.dataset;
    if (dim) return;
    if (ds > todayStr()) return wx.showToast({ title: '不能查看未来日期', icon: 'none' });
    this.setData({ selDate: ds });
    store.set('selectedDate', ds);   // 与记录页共享选中日期
    // 仅本地更新高亮，无需重新拉取整月
    this.setData({
      cells: this.data.cells.map(c => ({ ...c, isSel: c.ds === ds })),
    });
    this.showDayDetail(ds);
  },

  onUnload() {
    this._monthRequestId = (this._monthRequestId || 0) + 1;
    this._detailRequestId = (this._detailRequestId || 0) + 1;
  },
});
