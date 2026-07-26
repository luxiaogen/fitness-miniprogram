// components/ex-picker - 动作选择弹层（半屏，带搜索）
const exerciseService = require('../../services/exercise');

Component({
  properties: {
    visible: { type: Boolean, value: false },
  },
  data: {
    keyword: '',
    list: exerciseService.EXERCISES,
  },
  observers: {
    visible(v) {
      if (v) this.setData({ keyword: '', list: exerciseService.EXERCISES });
    },
  },
  methods: {
    onSearchInput(e) {
      this.setData({
        keyword: e.detail.value,
        list: exerciseService.query('all', e.detail.value),
      });
    },
    onSelect(e) {
      this.triggerEvent('select', { id: e.detail.id });
    },
    onClose() {
      this.triggerEvent('close');
    },
    noop() {},
  },
});
