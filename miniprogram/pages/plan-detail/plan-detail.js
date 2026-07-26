// pages/plan-detail - 训练计划详情：课表展示 / 应用与取消
const planService = require('../../services/plan');
const { withTheme } = require('../../utils/withTheme');
const { getById } = require('../../services/exercise');

withTheme({
  data: {
    plan: null,
    applied: false,
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
    const cur = planService.current();
    this.setData({ applied: !!(cur && this.data.plan && cur.planId === this.data.plan.id) });
  },

  onOpenExercise(e) {
    wx.navigateTo({ url: `/packageDetail/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  },

  onToggleApply() {
    if (!this.data.plan) return;
    if (this.data.applied) {
      planService.cancel();
      this.setData({ applied: false });
      wx.showToast({ title: '已取消应用', icon: 'none' });
    } else {
      planService.apply(this.data.plan.id);
      this.setData({ applied: true });
      wx.showToast({ title: '已应用，去记录页填入', icon: 'success' });
    }
  },

  onShareAppMessage() {
    return {
      title: `${this.data.plan.name} · 完整课表`,
      path: `/pages/plan-detail/plan-detail?id=${this.data.plan.id}`,
    };
  },
});
