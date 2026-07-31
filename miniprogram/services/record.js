// services/record.js - 训练记录服务
const cloud = require('./cloud');
const store = require('../store/index');
const { assertDate, normalizeRecord, assertId } = require('../utils/validation');

// 查询某天的训练记录
async function listByDate(date) {
  return cloud.listAll('records', { action: 'list', date: assertDate(date) });
}

// 查询日期区间（日历标记 / 统计聚合用）
async function listRange(start, end) {
  return cloud.listAll('records', {
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

async function createMany(records) {
  if (!Array.isArray(records) || !records.length) throw new Error('没有可保存的训练记录');
  const items = await cloud.request('records', {
    action: 'createMany',
    records: records.map(normalizeRecord),
  });
  store.bumpRecords();
  return items;
}

// 更新一条训练记录（保留原 createdAt / _openid）
async function update(id, record) {
  const item = await cloud.request('records', {
    action: 'update',
    id: assertId(id),
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

module.exports = { listByDate, listRange, create, createMany, update, remove };
