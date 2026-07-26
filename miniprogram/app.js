// app.js - 应用入口：主题初始化 + 云环境初始化 + 全局状态挂载
const store = require('./store/index');
const themeService = require('./services/theme');
const { ENV } = require('./env');

App({
  globalData: {
    openid: null,        // 云登录后写入
    cloudReady: false,   // 云环境是否可用（未配置或登录失败时使用本地存储）
    notedMap: {},        // exId -> 是否存在用户标注
  },

  onLaunch() {
    store.init();
    themeService.init();   // 主题：应用生效主题到原生组件，并监听系统主题变化
    if (wx.cloud && ENV.CLOUD_ENV) {
      wx.cloud.init({ env: ENV.CLOUD_ENV, traceUser: true });
      this.globalData.cloudReady = true;
      this.silentLogin();
    } else {
      console.warn('[app] 未配置云环境，运行于本地存储模式');
    }
  },

  // 静默登录：仅换取 openid，不打扰用户（MVP 无账号体系）
  async silentLogin() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login', data: {} });
      this.globalData.openid = res.result.data.openid;
    } catch (e) {
      console.warn('[app] 云登录失败，降级本地模式', e);
      this.globalData.cloudReady = false;
    }
  },
});
