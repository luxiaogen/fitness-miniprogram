// pages/calendar - 锻炼日历：月视图标记 + 当日详情
const recordService = require('../../services/record');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');
const { WEEK_CN, dstr, todayStr, dateLabel } = require('../../utils/date');
const { showError } = require('../../utils/notify');
const { isValidDate } = require('../../utils/validation');

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
  },

  onLoad() {
    const today = todayStr();
    const now = new Date(`${today}T00:00:00`);
    this.setData({ year: now.getFullYear(), month: now.getMonth(), selDate: today });
  },

  onShow() {
    const storedDate = store.get('selectedDate');
    const selectedDate = isValidDate(storedDate) && storedDate <= todayStr() ? storedDate : todayStr();
    if (selectedDate !== storedDate) store.set('selectedDate', selectedDate);
    const selected = new Date(`${selectedDate}T00:00:00`);
    this.setData({
      year: selected.getFullYear(),
      month: selected.getMonth(),
      selDate: selectedDate,
    });
    this.buildMonth(selected.getFullYear(), selected.getMonth());
    this.loadDayDetail(selectedDate);
  },

  // 拉取当月全部记录 -> 按日期分组 -> 渲染 42 格
  async buildMonth(year = this.data.year, month = this.data.month) {
    const requestId = (this._monthRequestId || 0) + 1;
    this._monthRequestId = requestId;
    try {
      const start = dstr(new Date(year, month, 1));
      const end = dstr(new Date(year, month + 1, 0));
      const records = await recordService.listRange(start, end);
      const dayMap = {};
      records.forEach(r => { dayMap[r.date] = true; });

      const today = todayStr();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysPrev = new Date(year, month, 0).getDate();
      const cells = [];
      for (let i = 0; i < 42; i++) {
        let ds, day, dim = false;
        if (i < firstDay) {
          day = daysPrev - firstDay + 1 + i;
          ds = dstr(new Date(year, month - 1, day));
          dim = true;
        } else if (i >= firstDay + daysInMonth) {
          day = i - firstDay - daysInMonth + 1;
          ds = dstr(new Date(year, month + 1, day));
          dim = true;
        } else {
          day = i - firstDay + 1;
          ds = dstr(new Date(year, month, day));
        }
        cells.push({ ds, day, dim, has: !!dayMap[ds], isToday: ds === today, isSel: ds === this.data.selDate });
      }
      if (requestId !== this._monthRequestId) return;
      this.setData({ cells, monthText: `${year} 年 ${month + 1} 月` });
    } catch (e) {
      if (requestId !== this._monthRequestId) return;
      showError(e, '日历加载失败');
    }
  },

  async loadDayDetail(date = this.data.selDate) {
    const requestId = (this._detailRequestId || 0) + 1;
    this._detailRequestId = requestId;
    try {
      const records = await recordService.listByDate(date);
      if (requestId !== this._detailRequestId) return;
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
    this.buildMonth(this.data.year, this.data.month);
    this.loadDayDetail(ds);
  },

  onUnload() {
    this._monthRequestId = (this._monthRequestId || 0) + 1;
    this._detailRequestId = (this._detailRequestId || 0) + 1;
  },
});
