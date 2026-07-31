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

function setupMiniProgram({ cloudConfigured = false, cloudReady = false, callFunction } = {}) {
  clearMiniProgramModules();
  const storage = new Map();
  const writes = [];
  const app = { globalData: { cloudConfigured, cloudReady } };

  global.getApp = () => app;
  global.wx = {
    getStorageSync(key) {
      return storage.get(key);
    },
    setStorageSync(key, value) {
      writes.push(key);
      storage.set(key, value);
    },
    removeStorageSync(key) {
      storage.delete(key);
    },
    cloud: callFunction ? { callFunction } : undefined,
  };

  return { storage, writes };
}

function makeRecord(date, index) {
  return {
    date,
    exId: index % 2 ? '0025' : '0662',
    sets: 4,
    reps: 12,
    weight: 0,
    duration: 8,
    note: '',
  };
}

test('local records are paginated internally but returned in full to services', async () => {
  const { storage } = setupMiniProgram();
  const { todayStr } = require('../miniprogram/utils/date');
  const date = todayStr();
  storage.set('local_records', Array.from({ length: 205 }, (_, index) => ({
    ...makeRecord(date, index),
    _id: `record-${index}`,
    createdAt: index,
  })));

  const recordService = require('../miniprogram/services/record');
  const records = await recordService.listByDate(date);

  assert.equal(records.length, 205);
  assert.equal(records[0]._id, 'record-0');
  assert.equal(records.at(-1)._id, 'record-204');
});

test('invalid local batches do not leave partially written records', async () => {
  const { storage } = setupMiniProgram();
  const { todayStr } = require('../miniprogram/utils/date');
  const recordService = require('../miniprogram/services/record');
  const date = todayStr();

  await assert.rejects(
    recordService.createMany([makeRecord(date, 0), makeRecord(date, 1), { ...makeRecord(date, 2), sets: 101 }]),
    /组数应为 1-100 的整数/,
  );

  assert.equal((storage.get('local_records') || []).length, 0);
});

test('local records support editing while preserving identity and createdAt', async () => {
  const { storage } = setupMiniProgram();
  const { todayStr } = require('../miniprogram/utils/date');
  const recordService = require('../miniprogram/services/record');
  const date = todayStr();

  const created = await recordService.create(makeRecord(date, 0));
  const updated = await recordService.update(created._id, {
    ...makeRecord(date, 1),
    sets: 8,
    note: 'edited',
  });

  assert.equal(updated._id, created._id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.sets, 8);
  assert.equal(updated.note, 'edited');
  const records = await recordService.listByDate(date);
  assert.equal(records.length, 1);
  assert.equal(records[0].sets, 8);
});

test('local record update rejects unknown ids without touching storage', async () => {
  const { storage } = setupMiniProgram();
  const { todayStr } = require('../miniprogram/utils/date');
  const recordService = require('../miniprogram/services/record');

  await assert.rejects(
    recordService.update('missing-id', makeRecord(todayStr(), 0)),
    /记录不存在/,
  );
  assert.equal((storage.get('local_records') || []).length, 0);
});

test('local mode plan apply/cancel/current round-trips through storage', async () => {
  const { storage } = setupMiniProgram();
  const planService = require('../miniprogram/services/plan');

  assert.equal(await planService.current(), null);

  await planService.apply('ppl-linear');
  const cur = await planService.current();
  assert.equal(cur.planId, 'ppl-linear');
  assert.equal(typeof cur.appliedAt, 'number');
  assert.equal(storage.get('et_current_plan').planId, 'ppl-linear');

  const currentPlan = await planService.currentPlan();
  assert.equal(currentPlan.plan.id, 'ppl-linear');
  assert.equal(currentPlan.plan.days.length, 3);

  await planService.cancel();
  assert.equal(await planService.current(), null);
  assert.equal(storage.get('et_current_plan'), undefined);
});

test('cloud mode plan apply/cancel/current routes to the user cloud function', async () => {
  let plan = null;
  setupMiniProgram({
    cloudConfigured: true,
    cloudReady: true,
    callFunction: async ({ name, data }) => {
      assert.equal(name, 'user');
      if (data.action === 'getPlan') return { result: { code: 0, data: { plan } } };
      if (data.action === 'setPlan') { plan = data.plan; return { result: { code: 0, data: { plan } } }; }
      throw new Error(`unexpected action: ${data.action}`);
    },
  });
  const planService = require('../miniprogram/services/plan');

  assert.equal(await planService.current(), null);
  await planService.apply('ppl-linear');
  assert.equal((await planService.current()).planId, 'ppl-linear');
  await planService.cancel();
  assert.equal(await planService.current(), null);
});

test('cloud mode plan failures surface errors without writing local storage', async () => {
  const { storage } = setupMiniProgram({
    cloudConfigured: true,
    cloudReady: true,
    callFunction: async () => { throw new Error('network down'); },
  });
  const planService = require('../miniprogram/services/plan');

  await assert.rejects(planService.apply('ppl-linear'), /云端服务暂不可用/);
  assert.equal(storage.get('et_current_plan'), undefined);
});

test('plan fill performs one atomic local write for the complete training day', async () => {
  const { storage, writes } = setupMiniProgram();
  const { todayStr } = require('../miniprogram/utils/date');
  const planService = require('../miniprogram/services/plan');

  const count = await planService.fillDayToRecords('full-body-beginner', 0, todayStr());

  assert.equal(count, 5);
  assert.equal(storage.get('local_records').length, 5);
  assert.equal(writes.filter(key => key === 'local_records').length, 1);
});

test('note summaries survive app restarts and paginate beyond one page', async () => {
  const { storage } = setupMiniProgram();
  storage.set('local_notes', Array.from({ length: 205 }, (_, index) => ({
    _id: `note-${index}`,
    exId: `exercise-${index % 51}`,
    text: `note ${index}`,
    createdAt: index,
  })));

  const noteService = require('../miniprogram/services/note');
  const ids = await noteService.listNotedExerciseIds();

  assert.equal(ids.length, 51);
  assert(ids.includes('exercise-0'));
  assert(ids.includes('exercise-50'));
});

test('configured cloud mode preserves semantic cloud errors instead of falling back locally', async () => {
  setupMiniProgram({
    cloudConfigured: true,
    cloudReady: true,
    callFunction: async () => ({ result: { code: -1, msg: '日期格式无效' } }),
  });
  const cloud = require('../miniprogram/services/cloud');

  await assert.rejects(
    cloud.request('records', { action: 'list', date: 'invalid' }),
    /日期格式无效/,
  );
});
