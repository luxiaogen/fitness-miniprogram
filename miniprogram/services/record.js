// services/record.js - 训练记录服务
const cloud = require('./cloud');
const store = require('../store/index');
const { assertDate, normalizeRecord, assertId } = require('../utils/validation');

// 查询某天的训练记录
async function listByDate(date) {
  return cloud.request('records', { action: 'list', date: assertDate(date) });
}

// 查询日期区间（日历标记 / 统计聚合用）
async function listRange(start, end) {
  return cloud.request('records', {
    action: 'list',
    start: assertDate(start, '开始日期'),
    end: assertDate(end, '结束日期'),
  });
}

// 新增一条训练记录
// record: { date, exId, sets, reps, weight, duration, note }
async function create(record) {
  const item = await cloud.request('records', {
    action: 'create',
    record: normalizeRecord(record),
  });
  store.bumpRecords();
  return item;
}

async function remove(id) {
  const res = await cloud.request('records', { action: 'remove', id: assertId(id) });
  store.bumpRecords();
  return res;
}

module.exports = { listByDate, listRange, create, remove };
