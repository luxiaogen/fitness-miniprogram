// pages/plans - 热门训练计划列表
const planService = require('../../services/plan');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');
const { showError } = require('../../utils/notify');

withTheme({
  data: {
    plans: [],
    currentPlanId: '',
  },

  onLoad() {
    this.setData({ plans: planService.list() });
  },

  onShow() {
    this.loadCurrentPlanId();
  },

  async loadCurrentPlanId() {
    try {
      const cur = await planService.current();
      if (this._unloaded) return;
      this.setData({ currentPlanId: cur ? cur.planId : '' });
    } catch (e) {
      if (this._unloaded) return;
      showError(e, '当前计划加载失败');
    }
  },

  onOpen(e) {
    wx.navigateTo({ url: `/pages/plan-detail/plan-detail?id=${e.currentTarget.dataset.id}` });
  },

  onShareAppMessage() {
    return { title: '热门训练计划 · 找到适合你的方案', path: '/pages/plans/plans' };
  },

  onUnload() {
    this._unloaded = true;
  },
});
