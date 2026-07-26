// utils/withTheme.js - Page 高阶包装：为页面注入主题 class 同步能力
// 用法：把 Page({...}) 替换为 withTheme({...})，wxml 根节点挂 class="page theme-{{theme}}"
const themeService = require('../services/theme');
const store = require('../store/index');

function withTheme(options) {
  const userOnLoad = options.onLoad;
  const userOnShow = options.onShow;
  const userOnUnload = options.onUnload;

  return Page({
    ...options,

    onLoad(query) {
      // 订阅主题变化（store 广播），并在卸载时取消
      this._unsubTheme = store.subscribe('change:theme', name => {
        this.setData({ theme: name });
      });
      this.setData({ theme: themeService.effective() });
      userOnLoad && userOnLoad.call(this, query);
    },

    onShow() {
      // 从设置页返回或系统主题变化后兜底同步
      const t = themeService.effective();
      if (this.data.theme !== t) this.setData({ theme: t });
      userOnShow && userOnShow.call(this);
    },

    onUnload() {
      this._unsubTheme && this._unsubTheme();
      userOnUnload && userOnUnload.call(this);
    },
  });
}

module.exports = { withTheme };
