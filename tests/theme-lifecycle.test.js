const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function clearMiniProgramModules() {
  const sourceRoot = `${path.join(projectRoot, 'miniprogram')}${path.sep}`;
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.startsWith(sourceRoot)) delete require.cache[modulePath];
  }
}

test('themed pages restore light native chrome after a page switch', () => {
  const previousPage = global.Page;
  const previousWx = global.wx;
  const nativeCalls = { navigation: [], background: [], tabStyle: 0, tabItems: [] };
  const nextTicks = [];
  let pageDefinition;
  let userOnShowRan = false;

  try {
    clearMiniProgramModules();
    global.wx = {
      getStorageSync: key => (key === 'et_theme' ? 'light' : undefined),
      setNavigationBarColor: options => nativeCalls.navigation.push(options),
      setBackgroundColor: options => nativeCalls.background.push(options),
      setTabBarStyle() { nativeCalls.tabStyle += 1; },
      setTabBarItem: options => nativeCalls.tabItems.push(options),
      nextTick: callback => nextTicks.push(callback),
    };
    global.Page = options => {
      pageDefinition = options;
      return options;
    };

    const { withTheme } = require('../miniprogram/utils/withTheme');
    const themeService = require('../miniprogram/services/theme');
    withTheme({
      data: {},
      onShow() {
        userOnShowRan = true;
      },
    });

    const page = {
      data: {},
      setData(updates) {
        Object.assign(this.data, updates);
      },
    };
    pageDefinition.onLoad.call(page, {});
    pageDefinition.onShow.call(page);

    assert.equal(userOnShowRan, true);
    assert.equal(nextTicks.length, 1);
    assert.equal(nativeCalls.navigation.length, 0);
    assert.equal(nativeCalls.background.length, 0);
    assert.equal(nativeCalls.tabStyle, 0);
    assert.equal(nativeCalls.tabItems.length, 0);

    nextTicks.shift()();
    assert.deepEqual(nativeCalls.navigation.at(-1), {
      frontColor: '#000000',
      backgroundColor: '#F5F6F2',
    });
    assert.deepEqual(nativeCalls.background.at(-1), {
      backgroundColor: '#F5F6F2',
      backgroundColorTop: '#F5F6F2',
      backgroundColorBottom: '#F5F6F2',
    });
    assert.equal(nativeCalls.navigation.length, 1);
    assert.equal(nativeCalls.tabStyle, 0);
    assert.equal(nativeCalls.tabItems.length, 0);
    assert.equal(typeof themeService.applyPageChrome, 'function');

    themeService.applyToNative('light');
    assert.equal(nativeCalls.tabStyle, 1);
    assert.equal(nativeCalls.tabItems.length, 5);

    pageDefinition.onUnload.call(page);
  } finally {
    clearMiniProgramModules();
    global.Page = previousPage;
    global.wx = previousWx;
  }
});
