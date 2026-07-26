// services/note.js - 动作标注服务
const cloud = require('./cloud');
const store = require('../store/index');
const { normalizeNote, assertId } = require('../utils/validation');

// 某动作的全部标注（按时间倒序）
async function listByExercise(exId) {
  return cloud.request('notes', { action: 'list', exId: assertId(exId, '动作') });
}

// 新增标注
async function create(exId, text) {
  const item = await cloud.request('notes', { action: 'create', ...normalizeNote(exId, text) });
  store.bumpNotes();
  return item;
}

async function remove(id) {
  const res = await cloud.request('notes', { action: 'remove', id: assertId(id, '标注') });
  store.bumpNotes();
  return res;
}

module.exports = { listByExercise, create, remove };
