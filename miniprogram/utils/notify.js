// Consistent user-facing feedback for async page actions.
function showError(error, fallback = '操作失败') {
  console.error('[app]', error);
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  wx.showToast({
    title: message && message.length <= 30 ? message : fallback,
    icon: 'none',
  });
}

module.exports = { showError };
