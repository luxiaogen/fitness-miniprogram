// packageDetail/pages/detail - 动作详情：GIF 演示 / 步骤要领 / 我的标注 / 加入今日训练
// 注意：本页位于分包，引用主包模块的相对路径需上溯三级
const exerciseService = require('../../../services/exercise');
const noteService = require('../../../services/note');
const recordService = require('../../../services/record');
const store = require('../../../store/index');
const { withTheme } = require('../../../utils/withTheme');
const { showError } = require('../../../utils/notify');

withTheme({
  data: {
    exercise: null,
    gif: '',
    notes: [],
    noteText: '',
    formVisible: false,
    saving: false,
  },

  onLoad(options) {
    const exercise = exerciseService.getById(options.id);
    if (!exercise) {
      wx.showToast({ title: '动作不存在', icon: 'none' });
      return wx.navigateBack();
    }
    this.setData({
      exercise,
      gif: exerciseService.gifUrl(exercise),
    });
    this.loadNotes();
  },

  async loadNotes() {
    try {
      const notes = await noteService.listByExercise(this.data.exercise.id);
      // 同步标注状态到全局，动作库列表红点依赖它
      const app = getApp();
      app.globalData.notedMap = app.globalData.notedMap || {};
      app.globalData.notedMap[this.data.exercise.id] = notes.length > 0;
      this.setData({
        notes: notes.map(n => ({ ...n, timeText: this.formatTime(n.createdAt) })),
      });
    } catch (e) {
      showError(e, '标注加载失败');
    }
  },

  formatTime(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  onNoteInput(e) { this.setData({ noteText: e.detail.value }); },

  async onSaveNote() {
    const text = this.data.noteText.trim();
    if (!text) return wx.showToast({ title: '请输入标注内容', icon: 'none' });
    this.setData({ saving: true });
    try {
      await noteService.create(this.data.exercise.id, text);
      this.setData({ noteText: '' });
      await this.loadNotes();
      wx.showToast({ title: '标注已保存', icon: 'success' });
    } catch (e) {
      showError(e, '标注保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  onDeleteNote(e) {
    wx.showModal({
      title: '删除标注',
      content: '确定删除这条标注吗？',
      confirmColor: '#FA5151',
      success: async res => {
        if (!res.confirm) return;
        try {
          await noteService.remove(e.currentTarget.dataset.id);
          await this.loadNotes();
        } catch (e) {
          showError(e, '删除标注失败');
        }
      },
    });
  },

  // 加入今日训练：打开参数配置弹层，确认后落到记录服务
  onAddToday() { this.setData({ formVisible: true }); },
  onFormClose() { this.setData({ formVisible: false }); },
  async onFormConfirm(e) {
    const date = store.todayStr();
    try {
      await recordService.create({ date, ...e.detail });
      store.set('selectedDate', date);
      this.setData({ formVisible: false });
      wx.showToast({ title: '已加入今日训练', icon: 'success' });
    } catch (e) {
      showError(e, '加入训练失败');
    }
  },

  onShareAppMessage() {
    const { exercise } = this.data;
    return {
      title: `${exercise.nameZh} · 动作要领与演示`,
      path: `/packageDetail/pages/detail/detail?id=${exercise.id}`,
    };
  },
});
