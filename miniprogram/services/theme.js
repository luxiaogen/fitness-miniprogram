// services/theme.js - 主题管理：浅色 / 深色 / 跟随系统（三态）
//
// 工作原理：
// - 视图层：app.wxss 定义 .theme-light / .theme-dark 两套 CSS 变量，
//   页面根节点挂 theme-<name> class，全部样式经 var(--token) 取色；
// - 原生层：导航栏 / tabBar（含图标）/ 窗口背景由本模块统一刷色；
// - 持久化：用户选择存 storage（et_theme），auto 时跟随系统并监听变化。

const store = require('../store/index');

const STORAGE_KEY = 'et_theme';   // 'light' | 'dark' | 'auto'

// 原生部分配色（与 app.wxss 变量保持一致）
const NATIVE = {
  dark: {
    nav: { frontColor: '#ffffff', backgroundColor: '#0E100E' },
    tab: { color: '#6B7268', selectedColor: '#C8F542', backgroundColor: '#141814', borderStyle: 'black' },
    iconSuffix: '',           // tab_xxx.png / tab_xxx_active.png（深色版，即默认图标）
    pageBg: '#0E100E',
  },
  light: {
    nav: { frontColor: '#000000', backgroundColor: '#F5F6F2' },
    tab: { color: '#8A9184', selectedColor: '#558B00', backgroundColor: '#FFFFFF', borderStyle: 'white' },
    iconSuffix: '_light',     // tab_xxx_light.png / tab_xxx_light_active.png
    pageBg: '#F5F6F2',
  },
};

const TABS = ['library', 'plan', 'log', 'calendar', 'stats'];
const VALID_PREFERENCES = ['light', 'dark', 'auto'];

function normalizePreference(value) {
  return VALID_PREFERENCES.includes(value) ? value : 'dark';
}

function preference() {
  try { return normalizePreference(wx.getStorageSync(STORAGE_KEY)); } catch (e) { return 'dark'; }
}

function systemTheme() {
  try {
    return wx.getAppBaseInfo().theme === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

// 当前生效主题（解析 auto）
function effective() {
  const pref = preference();
  return pref === 'auto' ? systemTheme() : pref;
}

function nativeConfig(name) {
  return NATIVE[name] || NATIVE.dark;
}

function applyPageChrome(name) {
  const cfg = nativeConfig(name);
  wx.setNavigationBarColor(cfg.nav);
  wx.setBackgroundColor({ backgroundColor: cfg.pageBg, backgroundColorTop: cfg.pageBg, backgroundColorBottom: cfg.pageBg });
}

function applyTabBar(name) {
  const cfg = nativeConfig(name);
  wx.setTabBarStyle(cfg.tab);
  TABS.forEach((t, i) => {
    wx.setTabBarItem({
      index: i,
      iconPath: `images/tab_${t}${cfg.iconSuffix}.png`,
      selectedIconPath: `images/tab_${t}${cfg.iconSuffix === '' ? '_active' : '_light_active'}.png`,
    });
  });
}

// 把生效主题刷到原生组件（导航栏 / tabBar / 窗口背景）
function applyToNative(name) {
  applyPageChrome(name);
  applyTabBar(name);
}

// 用户切换主题
function setTheme(pref) {
  const normalized = normalizePreference(pref);
  wx.setStorageSync(STORAGE_KEY, normalized);
  const name = normalized === 'auto' ? systemTheme() : normalized;
  applyToNative(name);
  store.emit('change:theme', name);
}

// App 启动时初始化一次（含系统主题变化监听）
function init() {
  applyToNative(effective());
  if (typeof wx.onThemeChange === 'function') {
    wx.onThemeChange(({ theme }) => {
      if (preference() === 'auto') {
        const next = theme === 'dark' ? 'dark' : 'light';
        applyToNative(next);
        store.emit('change:theme', next);
      }
    });
  }
}

module.exports = { preference, effective, setTheme, applyPageChrome, applyToNative, init };
