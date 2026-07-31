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
    editingRecord: null,   // 编辑模式：被编辑的记录（含 _id）；null 为新增模式
    currentPlan: null,   // { planId, plan } 当前应用的训练计划
    filling: false,
    formSubmitting: false,
    loading: false,        // 记录列表加载中（骨架屏）
    loadError: false,      // 记录列表加载失败（错误视图 + 重试）
  },

  onLoad() {
    this.setData({ date: store.get('selectedDate') || todayStr() });
  },

  onShow() {
    // 版本号门控：仅当日期或记录版本变化时才重新拉取，避免切 tab 时无效请求
    const date = store.get('selectedDate') || this.data.date || todayStr();
    this.setData({ date });
    this.loadCurrentPlan();
    const recordVersion = store.get('recordVersion');
    if (recordVersion !== this._lastRecordVersion || date !== this._lastDate) {
      this.loadRecords(date);
    }
  },

  async loadCurrentPlan() {
    try {
      const currentPlan = await planService.currentPlan();
      if (this._unloaded) return;
      this.setData({ currentPlan });
    } catch (e) {
      if (this._unloaded) return;
      showError(e, '当前计划加载失败');
    }
  },

  async loadRecords(date = this.data.date) {
    const requestId = (this._recordsRequestId || 0) + 1;
    this._recordsRequestId = requestId;
    this.setData({ loading: true, loadError: false });
    try {
      const records = await recordService.listByDate(date);
      if (requestId !== this._recordsRequestId) return;
      // 拉取成功后记录门控状态（失败时保持旧状态，下次 onShow 会重试）
      this._lastRecordVersion = store.get('recordVersion');
      this._lastDate = date;
      this.setData({
        date,
        records,
        loading: false,
        totalSets: records.reduce((s, r) => s + r.sets, 0),
        totalDuration: records.reduce((s, r) => s + (r.duration || 0), 0),
        dateText: dateLabel(date),
        isToday: date === todayStr(),
      });
    } catch (e) {
      if (requestId !== this._recordsRequestId) return;
      this.setData({ loading: false, loadError: true });
      showError(e, '训练记录加载失败');
    }
  },

  onRetryRecords() {
    this.loadRecords(this.data.date);
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
  onOpenPicker() { this.setData({ pickerVisible: true, editingRecord: null }); },
  onPickerClose() { this.setData({ pickerVisible: false }); },
  onPicked(e) {
    this.setData({ pickerVisible: false, formVisible: true, pickedExId: e.detail.id });
  },
  onFormClose() { this.setData({ formVisible: false, editingRecord: null }); },

  // 编辑流程：预填原记录打开表单，提交时走 update
  onEdit(e) {
    const id = e.detail.id;
    const record = this.data.records.find(r => r._id === id);
    if (!record) return;
    this.setData({
      pickerVisible: false,
      formVisible: true,
      pickedExId: record.exId,
      editingRecord: record,
    });
  },

  async onFormConfirm(e) {
    if (this.data.formSubmitting) return;
    this.setData({ formSubmitting: true });
    try {
      if (e.detail.id) {
        await recordService.update(e.detail.id, { date: this.data.date, ...e.detail });
        wx.showToast({ title: '已更新', icon: 'success' });
      } else {
        await recordService.create({ date: this.data.date, ...e.detail });
        wx.showToast({ title: '已保存', icon: 'success' });
      }
      this.setData({ formVisible: false, editingRecord: null });
      await this.loadRecords(this.data.date);
    } catch (error) {
      showError(error, e.detail.id ? '更新记录失败' : '保存记录失败');
    } finally {
      this.setData({ formSubmitting: false });
    }
  },

  onUnload() {
    this._unloaded = true;
    this._recordsRequestId = (this._recordsRequestId || 0) + 1;
  },
});
