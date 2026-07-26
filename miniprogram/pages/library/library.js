// pages/library - 动作库：分类筛选 + 关键词搜索
const exerciseService = require('../../services/exercise');
const noteService = require('../../services/note');
const store = require('../../store/index');
const { withTheme } = require('../../utils/withTheme');

const FILTER_LABELS = { all: '全部' };
exerciseService.EXERCISES.forEach(e => { FILTER_LABELS[e.bodyPart] = e.bodyPartZh; });

withTheme({
  data: {
    filters: exerciseService.FILTERS,
    filterLabels: FILTER_LABELS,
    activeFilter: 'all',
    keyword: '',
    list: exerciseService.EXERCISES,
    notedMap: {},      // exId -> 是否有标注（红点提示）
  },

  onLoad() {
    this.refreshList();
  },

  onShow() {
    // 标注在详情页可能变化，返回时按需刷新红点
    if (this._noteVersion !== store.get('noteVersion')) {
      this._noteVersion = store.get('noteVersion');
      this.loadNotedMap();
    }
  },

  async loadNotedMap() {
    // MVP：标注红点只针对已有数据的动作，本地/云端逐个查询代价高，
    // 采用轻量方案：进入详情页时记录看过的标注状态，会话内保持
    this.setData({ notedMap: getApp().globalData.notedMap || {} });
  },

  onFilterTap(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.f });
    this.refreshList();
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.refreshList();
  },

  refreshList() {
    this.setData({
      list: exerciseService.query(this.data.activeFilter, this.data.keyword),
    });
  },

  onSelect(e) {
    wx.navigateTo({ url: `/packageDetail/pages/detail/detail?id=${e.detail.id}` });
  },

  onShareAppMessage() {
    return { title: '健身记 · 38 个经典训练动作库', path: '/pages/library/library' };
  },
});
