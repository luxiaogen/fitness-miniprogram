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
