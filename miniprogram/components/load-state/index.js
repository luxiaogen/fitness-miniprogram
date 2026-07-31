// components/load-state - 内容区加载态：骨架屏 / 失败重试 / 内容插槽
Component({
  properties: {
    loading: { type: Boolean, value: false },
    error: { type: Boolean, value: false },
    retryText: { type: String, value: '重试' },
  },
  methods: {
    onRetry() {
      this.triggerEvent('retry');
    },
  },
});
