// components/log-item - 单条训练记录（记录页 / 日历日详情复用）
const { getById } = require('../../services/exercise');

Component({
  properties: {
    record: { type: Object, value: {} },
    deletable: { type: Boolean, value: false },  // 可删除（记录页）
    editable: { type: Boolean, value: false },   // 可编辑（记录页）；日历详情为只读
    compact: { type: Boolean, value: false },    // 日历内紧凑模式
  },
  data: { exercise: null },
  observers: {
    record(r) { this.setData({ exercise: getById(r.exId) }); },
  },
  methods: {
    onEdit() {
      this.triggerEvent('edit', { id: this.data.record._id });
    },
    onDelete() {
      this.triggerEvent('delete', { id: this.data.record._id });
    },
  },
});
