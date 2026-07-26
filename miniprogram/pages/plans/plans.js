// pages/plans - 热门训练计划列表
const planService = require('../../services/plan');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');

withTheme({
  data: {
    plans: [],
    currentPlanId: '',
  },

  onLoad() {
    this.setData({ plans: planService.list() });
  },

  onShow() {
    const cur = planService.current();
    this.setData({ currentPlanId: cur ? cur.planId : '' });
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/plan-detail/plan-detail?id=${e.currentTarget.dataset.id}` });
  },

  onShareAppMessage() {
    return { title: '热门训练计划 · 找到适合你的方案', path: '/pages/plans/plans' };
  },
});
