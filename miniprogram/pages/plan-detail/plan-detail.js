// pages/plan-detail - 训练计划详情：课表展示 / 应用与取消
const planService = require('../../services/plan');
const { withTheme } = require('../../utils/withTheme');
const { getById } = require('../../services/exercise');
const { showError } = require('../../utils/notify');

withTheme({
  data: {
    plan: null,
    applied: false,
    applying: false,   // 应用/取消请求进行中，防重复点击
  },

  onLoad(options) {
    const plan = planService.getById(options.id);
    if (!plan) {
      wx.showToast({ title: '计划不存在', icon: 'none' });
      return wx.navigateBack();
    }
    // 预解析动作信息，wxml 直接渲染
    const days = plan.days.map(d => ({
      ...d,
      exercises: d.exercises.map(ex => ({ ...ex, exercise: getById(ex.exId) })),
    }));
    this.setData({ plan: { ...plan, days } });
  },

  onShow() {
    this.loadApplied();
  },

  async loadApplied() {
    try {
      const cur = await planService.current();
      if (this._unloaded || !this.data.plan) return;
      this.setData({ applied: !!(cur && cur.planId === this.data.plan.id) });
    } catch (e) {
      if (this._unloaded) return;
      showError(e, '当前计划加载失败');
    }
  },

  onOpenExercise(e) {
    wx.navigateTo({ url: `/packageDetail/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  async onToggleApply() {
    if (!this.data.plan || this.data.applying) return;
    this.setData({ applying: true });
    try {
      if (this.data.applied) {
        await planService.cancel();
        this.setData({ applied: false });
        wx.showToast({ title: '已取消应用', icon: 'none' });
      } else {
        await planService.apply(this.data.plan.id);
        this.setData({ applied: true });
        wx.showToast({ title: '已应用，去记录页填入', icon: 'success' });
      }
    } catch (e) {
      showError(e, '操作失败');
    } finally {
      this.setData({ applying: false });
    }
  },

  onShareAppMessage() {
    return {
      title: `${this.data.plan.name} · 完整课表`,
      path: `/pages/plan-detail/plan-detail?id=${this.data.plan.id}`,
    };
  },

  onUnload() {
    this._unloaded = true;
  },
});
