const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignoredDirectories.has(entry.name)) return [];
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(filePath);
    return [filePath];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = walk(root);
const jsFiles = files.filter(file => file.endsWith('.js'));
const jsonFiles = files.filter(file => file.endsWith('.json'));

for (const file of jsFiles) {
  const result = childProcess.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert(result.status === 0, `${path.relative(root, file)} has invalid JavaScript:\n${result.stderr}`);
}

for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, file)} has invalid JSON: ${error.message}`);
  }
}

const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const privateConfigTemplate = JSON.parse(
  fs.readFileSync(path.join(root, 'project.private.config.example.json'), 'utf8'),
);
assert(!projectConfig.appid, 'project.config.json must not contain a Mini Program AppID');
assert(
  privateConfigTemplate.appid === 'YOUR_MINIPROGRAM_APPID',
  'project.private.config.example.json must contain only the AppID placeholder',
);

const { EXERCISES } = require(path.join(root, 'miniprogram/data/exercises'));
const { PLANS } = require(path.join(root, 'miniprogram/data/plans'));
const exerciseIds = new Set(EXERCISES.map(exercise => exercise.id));

for (const exercise of EXERCISES) {
  assert(fs.existsSync(path.join(root, 'miniprogram', exercise.image)), `Missing image for ${exercise.id}`);
  const gifName = path.basename(exercise.gifFile);
  assert(
    fs.existsSync(path.join(root, 'miniprogram/packageDetail/assets/gifs', gifName)),
    `Missing GIF for ${exercise.id}`,
  );
}

for (const plan of PLANS) {
  for (const day of plan.days) {
    for (const exercise of day.exercises) {
      assert(exerciseIds.has(exercise.exId), `Unknown exercise ${exercise.exId} in ${plan.id}`);
    }
  }
}

console.log(`Verified ${jsFiles.length} JavaScript files, ${jsonFiles.length} JSON files, ${EXERCISES.length} exercises, and ${PLANS.length} plans.`);
