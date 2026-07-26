// pages/log - 每日锻炼记录：日期切换 + 训练项管理 + 当前计划快捷填入
const recordService = require('../../services/record');
const planService = require('../../services/plan');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');
const { todayStr, shiftDate, dateLabel } = require('../../utils/date');
const { showError } = require('../../utils/notify');

withTheme({
  data: {
    date: '',
    dateText: '',
    isToday: true,
    records: [],
    totalSets: 0,
    totalDuration: 0,
    pickerVisible: false,
    formVisible: false,
    pickedExId: '',
    currentPlan: null,   // { planId, plan } 当前应用的训练计划
    filling: false,
    formSubmitting: false,
  },

  onLoad() {
    this.setData({ date: store.get('selectedDate') || todayStr() });
  },

  onShow() {
    // 从详情页"加入今日训练"或计划页返回时，版本号已变化，重新拉取
    const date = store.get('selectedDate') || this.data.date || todayStr();
    this.setData({ date });
    this.loadRecords(date);
    this.loadCurrentPlan();
  },

  loadCurrentPlan() {
    this.setData({ currentPlan: planService.currentPlan() });
  },

  async loadRecords(date = this.data.date) {
    const requestId = (this._recordsRequestId || 0) + 1;
    this._recordsRequestId = requestId;
    try {
      const records = await recordService.listByDate(date);
      if (requestId !== this._recordsRequestId) return;
      this.setData({
        date,
        records,
        totalSets: records.reduce((s, r) => s + r.sets, 0),
        totalDuration: records.reduce((s, r) => s + (r.duration || 0), 0),
        dateText: dateLabel(date),
        isToday: date === todayStr(),
      });
    } catch (e) {
      if (requestId !== this._recordsRequestId) return;
      showError(e, '训练记录加载失败');
    }
  },

  // 将当前计划的某个训练日一键填入当前日期
  async onFillPlanDay(e) {
    if (this.data.filling) return;
    if (!this.data.currentPlan) return;
    const dayIndex = Number(e.currentTarget.dataset.index);
    const day = this.data.currentPlan.plan.days[dayIndex];
    if (!day) return;
    this.setData({ filling: true });
    wx.showModal({
      title: `填入「${day.name}」`,
      content: `将把该训练日的 ${day.exercises.length} 个动作追加到 ${dateLabel(this.data.date)}，是否继续？`,
      confirmText: '填入',
      success: async res => {
        if (!res.confirm) {
          this.setData({ filling: false });
          return;
        }
        try {
          const n = await planService.fillDayToRecords(this.data.currentPlan.planId, dayIndex, this.data.date);
          wx.showToast({ title: `已填入 ${n} 个动作`, icon: 'success' });
          await this.loadRecords(this.data.date);
        } catch (e) {
          showError(e, '计划填入失败');
        } finally {
          this.setData({ filling: false });
        }
      },
      fail: () => this.setData({ filling: false }),
    });
  },

  onGoPlan() {
    wx.switchTab({ url: '/pages/plans/plans' });
  },

  onShiftDate(e) {
    const next = shiftDate(this.data.date, Number(e.currentTarget.dataset.d));
    if (next > todayStr()) return wx.showToast({ title: '不能记录未来日期', icon: 'none' });
    this.setData({ date: next });
    store.set('selectedDate', next);
    this.loadRecords(next);
  },

  onDelete(e) {
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条训练记录吗？',
      confirmColor: '#FA5151',
      success: async res => {
        if (!res.confirm) return;
        try {
          await recordService.remove(e.detail.id);
          await this.loadRecords(this.data.date);
        } catch (e) {
          showError(e, '删除记录失败');
        }
      },
    });
  },

  // 添加流程：选择动作 → 配置参数 → 保存
  onOpenPicker() { this.setData({ pickerVisible: true }); },
  onPickerClose() { this.setData({ pickerVisible: false }); },
  onPicked(e) {
    this.setData({ pickerVisible: false, formVisible: true, pickedExId: e.detail.id });
  },
  onFormClose() { this.setData({ formVisible: false }); },
  async onFormConfirm(e) {
    if (this.data.formSubmitting) return;
    this.setData({ formSubmitting: true });
    try {
      await recordService.create({ date: this.data.date, ...e.detail });
      this.setData({ formVisible: false });
      wx.showToast({ title: '已保存', icon: 'success' });
      await this.loadRecords(this.data.date);
    } catch (error) {
      showError(error, '保存记录失败');
    } finally {
      this.setData({ formSubmitting: false });
    }
  },

  onUnload() {
    this._recordsRequestId = (this._recordsRequestId || 0) + 1;
  },
});
