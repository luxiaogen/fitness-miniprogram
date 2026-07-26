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
  const nativeCalls = { navigation: [], background: [] };
  let pageDefinition;

  try {
    clearMiniProgramModules();
    global.wx = {
      getStorageSync: key => (key === 'et_theme' ? 'light' : undefined),
      setNavigationBarColor: options => nativeCalls.navigation.push(options),
      setBackgroundColor: options => nativeCalls.background.push(options),
      setTabBarStyle() {},
      setTabBarItem() {},
    };
    global.Page = options => {
      pageDefinition = options;
      return options;
    };

    const { withTheme } = require('../miniprogram/utils/withTheme');
    withTheme({ data: {} });

    const page = {
      data: {},
      setData(updates) {
        Object.assign(this.data, updates);
      },
    };
    pageDefinition.onLoad.call(page, {});
    pageDefinition.onShow.call(page);

    assert.deepEqual(nativeCalls.navigation.at(-1), {
      frontColor: '#000000',
      backgroundColor: '#F5F6F2',
    });
    assert.deepEqual(nativeCalls.background.at(-1), {
      backgroundColor: '#F5F6F2',
      backgroundColorTop: '#F5F6F2',
      backgroundColorBottom: '#F5F6F2',
    });

    pageDefinition.onUnload.call(page);
  } finally {
    clearMiniProgramModules();
    global.Page = previousPage;
    global.wx = previousWx;
  }
});
