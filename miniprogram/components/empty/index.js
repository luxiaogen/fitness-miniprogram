// components/empty - 空状态占位（记录页 / 日历详情 / 搜索无结果复用）
Component({
  properties: {
    icon: { type: String, value: '🏋️' },
    text: { type: String, value: '暂无数据' },
    sub: { type: String, value: '' },
  },
});
