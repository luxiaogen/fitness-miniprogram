// store/index.js - 轻量全局状态管理（发布/订阅模式）
//
// 设计说明：
// - MVP 阶段跨页同步主要依赖页面 onShow 重新拉取（小程序经典模式，简单可靠）；
// - store 只承担两类职责：跨页共享的会话状态（当前选中日期等）与数据变更广播；
// - 接口保持稳定（get/set/subscribe/emit），后续可平滑替换为 MobX 而不影响页面代码。

const listeners = {};

const state = {
  selectedDate: '',      // 记录页/日历页共享的当前日期（YYYY-MM-DD）
  recordVersion: 0,      // 记录变更计数器：非 0 变化即触发订阅方刷新
  noteVersion: 0,
  planVersion: 0,       // 训练计划（应用/取消/填入）变更计数器
};

function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

module.exports = {
  init() {
    if (!state.selectedDate) state.selectedDate = todayStr();
  },

  get(key) { return state[key]; },

  set(key, value) {
    state[key] = value;
    this.emit(`change:${key}`, value);
  },

  // 数据变更广播：页面在 onShow 中检查版本号决定是否重新拉取
  bumpRecords() { this.set('recordVersion', state.recordVersion + 1); },
  bumpNotes() { this.set('noteVersion', state.noteVersion + 1); },
  bumpPlans() { this.set('planVersion', state.planVersion + 1); },

  subscribe(event, handler) {
    (listeners[event] = listeners[event] || []).push(handler);
    return () => { listeners[event] = (listeners[event] || []).filter(h => h !== handler); };
  },

  emit(event, payload) {
    (listeners[event] || []).forEach(h => { try { h(payload); } catch (e) { console.error(e); } });
  },

  todayStr,
};
