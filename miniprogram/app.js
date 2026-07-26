// app.js - 应用入口：主题初始化 + 云环境初始化 + 全局状态挂载
const store = require('./store/index');
const themeService = require('./services/theme');
const { ENV } = require('./env');

App({
  globalData: {
    openid: null,        // 云登录后写入
    cloudConfigured: false,
    cloudReady: false,
    notedMap: {},        // exId -> 是否存在用户标注
  },

  onLaunch() {
    store.init();
    themeService.init();   // 主题：应用生效主题到原生组件，并监听系统主题变化
    this.globalData.cloudConfigured = !!ENV.CLOUD_ENV;
    if (!this.globalData.cloudConfigured) {
      console.warn('[app] 未配置云环境，运行于本地存储模式');
      return;
    }
    if (!wx.cloud) {
      console.error('[app] 当前基础库不支持云开发');
      return;
    }

    try {
      wx.cloud.init({ env: ENV.CLOUD_ENV, traceUser: true });
      this.globalData.cloudReady = true;
      this.silentLogin();
    } catch (e) {
      console.error('[app] 云环境初始化失败', e);
    }
  },

  // 静默登录：仅换取 openid，不打扰用户（MVP 无账号体系）
  async silentLogin() {
    try {
      const res = await wx.cloud.callFunction({ name: 'login', data: {} });
      const result = res.result || {};
      if (result.code !== 0 || !result.data || !result.data.openid) {
        throw new Error(result.msg || '云登录返回异常');
      }
      this.globalData.openid = result.data.openid;
    } catch (e) {
      // Cloud data mode remains active after a login failure. Switching to
      // local storage here would create a second, divergent copy of user data.
      console.warn('[app] 云登录失败，将在后续启动时重试', e);
    }
  },
});
