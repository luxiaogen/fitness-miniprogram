const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

function loadRecordsCloudFunction(mockCloud) {
  const entry = path.join(projectRoot, 'cloudfunctions/records/index.js');
  const originalLoad = Module._load;
  delete require.cache[entry];
  Module._load = function load(request, parent, isMain) {
    if (request === 'wx-server-sdk' && parent && parent.filename === entry) return mockCloud;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(entry);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entry];
  }
}

function loadUserCloudFunction(mockCloud) {
  const entry = path.join(projectRoot, 'cloudfunctions/user/index.js');
  const originalLoad = Module._load;
  delete require.cache[entry];
  Module._load = function load(request, parent, isMain) {
    if (request === 'wx-server-sdk' && parent && parent.filename === entry) return mockCloud;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(entry);
  } finally {
    Module._load = originalLoad;
    delete require.cache[entry];
  }
}

// users 集合 mock：记录调用，支持配置已有文档与 update 命中数
function makeUserDbMock({ doc = null, updated = 1 } = {}) {
  const calls = [];
  const db = {
    command: { remove: () => ({ __remove: true }) },
    serverDate: () => ({ serverDate: true }),
    collection: () => ({
      where(query) {
        return {
          field() {
            return {
              limit() {
                return {
                  async get() {
                    calls.push({ op: 'get', query });
                    return { data: doc ? [doc] : [] };
                  },
                };
              },
            };
          },
          async update({ data }) {
            calls.push({ op: 'update', query, data });
            return { stats: { updated } };
          },
        };
      },
      async add({ data }) {
        calls.push({ op: 'add', data });
        return { _id: 'user-1' };
      },
    }),
  };
  return { db, calls };
}

test('user getPlan returns the stored applied plan or null', async () => {
  const { db, calls } = makeUserDbMock({ doc: { appliedPlan: { planId: 'ppl-linear', appliedAt: 123 } } });
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'getPlan' });
  assert.equal(result.code, 0);
  assert.deepEqual(result.data.plan, { planId: 'ppl-linear', appliedAt: 123 });
  assert.equal(calls[0].query._openid, 'test-user');
});

test('user getPlan returns null when no user document exists', async () => {
  const { db } = makeUserDbMock({ doc: null });
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'getPlan' });
  assert.equal(result.code, 0);
  assert.equal(result.data.plan, null);
});

test('user setPlan updates an existing user document', async () => {
  const { db, calls } = makeUserDbMock({ updated: 1 });
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'setPlan', plan: { planId: 'ppl-linear', appliedAt: 123 } });
  assert.equal(result.code, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'update');
  assert.equal(calls[0].query._openid, 'test-user');
  assert.deepEqual(calls[0].data.appliedPlan, { planId: 'ppl-linear', appliedAt: 123 });
});

test('user setPlan creates the user document when it does not exist yet', async () => {
  const { db, calls } = makeUserDbMock({ updated: 0 });
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'setPlan', plan: { planId: 'full-body-beginner', appliedAt: 456 } });
  assert.equal(result.code, 0);
  assert.equal(calls[0].op, 'update');
  assert.equal(calls[1].op, 'add');
  assert.equal(calls[1].data._openid, 'test-user');
  assert.deepEqual(calls[1].data.appliedPlan, { planId: 'full-body-beginner', appliedAt: 456 });
});

test('user setPlan with null clears the applied plan field', async () => {
  const { db, calls } = makeUserDbMock();
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'setPlan', plan: null });
  assert.equal(result.code, 0);
  assert.equal(result.data.plan, null);
  assert.equal(calls[0].op, 'update');
  assert.equal(calls[0].data.appliedPlan.__remove, true);
});

test('user setPlan rejects invalid plan ids before touching the database', async () => {
  const { db, calls } = makeUserDbMock();
  const user = loadUserCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });

  const result = await user.main({ action: 'setPlan', plan: { planId: 'bad id!', appliedAt: 1 } });
  assert.equal(result.code, -1);
  assert.match(result.msg, /计划标识无效/);
  assert.equal(calls.length, 0);
});

test('cloud record update preserves ownership and immutable fields', async () => {
  const updates = [];
  const db = {
    command: {},
    serverDate: () => ({ serverDate: true }),
    collection: () => ({
      where(query) {
        return {
          async update({ data }) {
            updates.push({ query, data });
            return { stats: { updated: 1 } };
          },
        };
      },
    }),
    runTransaction: async () => ({}),
  };
  const records = loadRecordsCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });
  const date = require('../miniprogram/utils/date').todayStr();

  const result = await records.main({
    action: 'update',
    id: 'record-1',
    record: { date, exId: '0025', sets: 6, reps: 10, weight: 40, duration: 12, note: 'updated' },
  });

  assert.equal(result.code, 0);
  assert.equal(result.data.sets, 6);
  assert.equal(result.data._id, 'record-1');
  assert.equal(updates.length, 1);
  // 归属与创建时间不可变：update 请求必须按 _openid 过滤且不覆盖这两个字段
  assert.equal(updates[0].query._openid, 'test-user');
  assert.equal(updates[0].query._id, 'record-1');
  assert.equal(updates[0].data._openid, undefined);
  assert.equal(updates[0].data.createdAt, undefined);
});

test('cloud record update rejects foreign or missing records', async () => {
  const db = {
    command: {},
    serverDate: () => ({ serverDate: true }),
    collection: () => ({
      where: () => ({ async update() { return { stats: { updated: 0 } }; } }),
    }),
    runTransaction: async () => ({}),
  };
  const records = loadRecordsCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });
  const date = require('../miniprogram/utils/date').todayStr();

  const result = await records.main({
    action: 'update',
    id: 'foreign-record',
    record: { date, exId: '0025', sets: 4, reps: 12, weight: 0, duration: 8, note: '' },
  });

  assert.equal(result.code, -1);
  assert.match(result.msg, /不存在或无权/);
});

test('cloud record batches use Date values that transactions can persist', async () => {
  const added = [];
  const db = {
    command: {},
    serverDate: () => ({ serverDate: true }),
    collection: () => ({}),
    runTransaction: async callback => callback({
      collection(name) {
        assert.equal(name, 'records');
        return {
          async add({ data }) {
            added.push(data);
            return { _id: `record-${added.length}` };
          },
        };
      },
    }),
  };
  const records = loadRecordsCloudFunction({
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database: () => db,
    getWXContext: () => ({ OPENID: 'test-user' }),
  });
  const date = require('../miniprogram/utils/date').todayStr();

  const result = await records.main({
    action: 'createMany',
    records: [
      { date, exId: '0025', sets: 4, reps: 12, weight: 0, duration: 8, note: '' },
      { date, exId: '0662', sets: 3, reps: 10, weight: 20, duration: 6, note: '' },
    ],
  });

  assert.equal(result.code, 0);
  assert.equal(added.length, 2);
  assert(added.every(record => record.createdAt instanceof Date));
  assert(added[1].createdAt > added[0].createdAt);
});
