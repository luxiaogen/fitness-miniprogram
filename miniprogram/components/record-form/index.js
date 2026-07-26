// components/record-form - 训练参数配置弹层（组数/次数/重量/时长/备注）
const { getById } = require('../../services/exercise');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    exId: { type: String, value: '' },
  },
  data: {
    exercise: null,
    sets: 4,
    reps: 12,
    weight: 0,
    duration: 8,
    note: '',
  },
  observers: {
    'visible, exId': function (visible, exId) {
      if (visible && exId) {
        this.setData({
          exercise: getById(exId),
          sets: 4, reps: 12, weight: 0, duration: 8, note: '',
        });
      }
    },
  },
  methods: {
    step(e) {
      const { field, delta } = e.currentTarget.dataset;
      const next = Math.max(1, this.data[field] + Number(delta));
      this.setData({
        [field]: next,
        // 组数变化时同步估算时长（每组约 2 分钟），用户可再手动改
        ...(field === 'sets' ? { duration: next * 2 } : {}),
      });
    },
    onNumberInput(e) {
      const { field } = e.currentTarget.dataset;
      const v = Number(e.detail.value);
      this.setData({ [field]: isNaN(v) ? 0 : Math.max(0, v) });
    },
    onNoteInput(e) { this.setData({ note: e.detail.value }); },
    onClose() { this.triggerEvent('close'); },
    onConfirm() {
      const { exId, sets, reps, weight, duration, note } = this.data;
      this.triggerEvent('confirm', {
        exId, sets, reps, weight, duration: duration || sets * 2, note: note.trim(),
      });
    },
    noop() {},
  },
});
