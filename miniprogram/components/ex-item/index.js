// components/ex-item - 动作列表项（动作库列表 / 动作选择弹层复用）
Component({
  properties: {
    exercise: { type: Object, value: {} },
    noted: { type: Boolean, value: false },   // 是否有用户标注（红点提示）
    size: { type: String, value: 'normal' },  // normal | small（弹层内紧凑模式）
  },
  methods: {
    onTap() {
      this.triggerEvent('select', { id: this.data.exercise.id });
    },
  },
});
