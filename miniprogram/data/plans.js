// data/plans.js - 热门训练计划模板（随包发布）
//
// 结构说明：
// - exercises[].exId 必须存在于 data/exercises.js（保证可跳转详情、可填入记录）；
// - reps 为填入记录时使用的数值；specText 为展示用的完整规格描述（含金字塔/力竭等表述）；
// - note 为训练要点提示。

const PLANS = [
  {
    id: 'ppl-linear',
    name: '三分化线性渐进计划',
    desc: '推 / 拉 / 腿臀三天循环，每个部位每周可覆盖 1-2 次，配合线性递增重量实现持续渐进超负荷，是增肌期最经典的分化方案之一。',
    audience: '有一定训练基础（3 个月以上）、以增肌为目标的训练者',
    level: '中级',
    daysPerWeek: '3-6 天',
    cycle: '3 天循环（推 → 拉 → 腿臀）',
    tags: ['增肌', '三分化', '线性渐进'],
    features: [
      '线性渐进：每周在相同次数下小幅增加负重，持续制造超负荷',
      '高频覆盖：每个肌群每周可训练 2 次，增肌效率优于传统五分化',
      '力竭延长组：部分动作含力竭后补次，提升代谢压力',
      '灵活排期：练三休一或练六休一均可，按恢复能力调整',
    ],
    days: [
      {
        name: 'Day 1 · 推日',
        focus: '胸 / 三角肌中束 / 三头',
        exercises: [
          { exId: '0025', sets: 4, reps: 12, specText: '4组 × 15次热身（12-10-8）', note: '经典复合动作，主攻整体胸肌。第一组热身，随后可递增重量。' },
          { exId: '0314', sets: 4, reps: 12, specText: '4组 × 12次', note: '针对上胸部刺激。' },
          { exId: '0251', sets: 4, reps: 12, specText: '4组 × 12次（或至力竭）', note: '针对下胸及三头，能力不够可换辅助器械或弹力带退阶。' },
          { exId: '0351', sets: 4, reps: 15, specText: '4组 × 15次', note: '孤立刺激肱三头肌。' },
          { exId: '3541', sets: 3, reps: 10, specText: '3组 × 10次 + 10次力竭', note: '针对三角肌中束（打造宽肩），后半段包含力竭延长组。' },
        ],
      },
      {
        name: 'Day 2 · 拉日',
        focus: '背 / 三角肌后束 / 二头',
        exercises: [
          { exId: '3563', sets: 4, reps: 12, specText: '4组 × 12次（10次力竭 + 5次）', note: '单侧背阔肌刺激，力竭后补 5 次（半程或强迫次数）。' },
          { exId: '2616', sets: 4, reps: 10, specText: '4组 × 12-8次', note: '递增重量，次数随之减少。' },
          { exId: '1360', sets: 4, reps: 10, specText: '4组 × 10次（10次力竭 + 5次）', note: '增加背部厚度，同样包含力竭后的高强度刺激。' },
          { exId: '0861', sets: 4, reps: 13, specText: '4组 × 15-12次', note: '肘关节向外打开，更多针对上背部及三角肌后束。' },
          { exId: '0868', sets: 3, reps: 12, specText: '3组 × 12次', note: '针对肱二头肌的收尾动作。' },
        ],
      },
      {
        name: 'Day 3 · 腿臀日',
        focus: '臀 / 股四头肌 / 腘绳肌',
        exercises: [
          { exId: '1757', sets: 4, reps: 12, specText: '4组 × 12次', note: '提高单侧稳定度，针对臀部及腘绳肌。' },
          { exId: '0099', sets: 4, reps: 10, specText: '4组 × 10次', note: '强烈的单腿下肢训练，对臀和股四刺激极高。' },
          { exId: '0042', sets: 3, reps: 15, specText: '3组 × 15次', note: '躯干更直立，更侧重于股四头肌与核心稳定。' },
          { exId: '0085', sets: 3, reps: 12, specText: '3组 × 12次', note: '针对后侧链（腘绳肌、臀大肌）的经典动作。' },
          { exId: '0489', sets: 3, reps: 8, specText: '3组 × 8次', note: '专注于下背部竖脊肌与臀部的收尾。' },
        ],
      },
    ],
  },

  {
    id: 'full-body-beginner',
    name: '新手全身训练计划',
    desc: '每次训练覆盖全身主要肌群，以复合动作为核心，帮助新手快速建立动作模式与基础力量。每周三练，隔天进行，恢复充分。',
    audience: '训练经验 0-6 个月的新手，或停训后恢复训练的人群',
    level: '入门',
    daysPerWeek: '3 天',
    cycle: '隔天一次（如周一 / 周三 / 周五）',
    tags: ['新手友好', '全身训练', '复合动作'],
    features: [
      '每次仅 5 个动作，40 分钟内完成，易坚持',
      '全部复合动作，单位时间收益最大化',
      '隔天训练保证恢复，降低受伤风险',
      '建议先用空杆/轻重量打磨动作 2-4 周再渐进',
    ],
    days: [
      {
        name: '全身训练日',
        focus: '全身主要肌群',
        exercises: [
          { exId: '0043', sets: 3, reps: 10, specText: '3组 × 10次', note: '下肢力量基石，注意膝盖方向与脚尖一致。' },
          { exId: '0662', sets: 3, reps: 12, specText: '3组 × 12次', note: '做不了标准俯卧撑可先跪姿退阶。' },
          { exId: '0027', sets: 3, reps: 10, specText: '3组 × 10次', note: '保持背部平直，感受背部发力。' },
          { exId: '0405', sets: 3, reps: 10, specText: '3组 × 10次', note: '小重量开始，推起时不要锁死肘关节。' },
          { exId: '0274', sets: 3, reps: 15, specText: '3组 × 15次', note: '卷腹时腰部贴地，颈部放松。' },
        ],
      },
    ],
  },

  {
    id: 'upper-lower',
    name: '上下肢二分化计划',
    desc: '上肢 / 下肢交替训练，每周四练，兼顾训练频率与恢复。比三分化单次容量更低，适合时间相对规律的进阶训练者。',
    audience: '6 个月以上训练经验，希望兼顾力量与围度的训练者',
    level: '中级',
    daysPerWeek: '4 天',
    cycle: '上肢 → 下肢 → 休 → 上肢 → 下肢 → 休 → 休',
    tags: ['增力增肌', '二分化', '每周四练'],
    features: [
      '每个肌群每周稳定训练 2 次，刺激频率合理',
      '单次训练 5 个动作约 50 分钟，工作日可执行',
      '上下肢交替，局部恢复快，适合连续安排',
    ],
    days: [
      {
        name: 'Day 1 · 上肢日',
        focus: '胸 / 背 / 肩 / 手臂',
        exercises: [
          { exId: '0025', sets: 4, reps: 10, specText: '4组 × 10次', note: '主项复合动作，保证动作质量优先于重量。' },
          { exId: '0198', sets: 4, reps: 10, specText: '4组 × 10次', note: '拉向锁骨位置，控制回放。' },
          { exId: '0334', sets: 3, reps: 15, specText: '3组 × 15次', note: '小重量多次数，避免借力。' },
          { exId: '0294', sets: 3, reps: 12, specText: '3组 × 12次', note: '顶峰收缩 1 秒。' },
          { exId: '0241', sets: 3, reps: 12, specText: '3组 × 12次', note: '肘部固定在体侧。' },
        ],
      },
      {
        name: 'Day 2 · 下肢日',
        focus: '腿 / 臀 / 小腿 / 核心',
        exercises: [
          { exId: '0032', sets: 4, reps: 6, specText: '4组 × 6次', note: '大重量低次数主项，腰部始终保持中立。' },
          { exId: '1460', sets: 3, reps: 20, specText: '3组 × 20次', note: '步幅适中，重心垂直起落。' },
          { exId: '1373', sets: 4, reps: 15, specText: '4组 × 15次', note: '顶端停顿 1 秒。' },
          { exId: '0472', sets: 3, reps: 12, specText: '3组 × 12次', note: '避免摆动借力。' },
        ],
      },
    ],
  },

  {
    id: 'bro-split',
    name: '五分化健美计划',
    desc: '每个训练日专注一个肌群，单次容量高、刺激充分，是健身房流传最广的增肌分化方案。适合恢复能力强、追求单部位极致刺激的训练者。',
    audience: '1 年以上训练经验，以形体塑造为主要目标的人群',
    level: '进阶',
    daysPerWeek: '5 天',
    cycle: '胸 → 背 → 肩 → 手臂 → 腿 → 休 → 休',
    tags: ['健美', '五分化', '高容量'],
    features: [
      '单部位高容量集中刺激，泵感与破坏充分',
      '每个肌群一周一练，恢复时间充足',
      '动作组合覆盖多角度，塑造完整肌群形态',
    ],
    days: [
      {
        name: 'Day 1 · 胸日',
        focus: '胸大肌',
        exercises: [
          { exId: '0025', sets: 4, reps: 10, specText: '4组 × 10次', note: '主项，渐进重量。' },
          { exId: '0308', sets: 4, reps: 12, specText: '4组 × 12次', note: '拉伸感优先，勿追求大重量。' },
          { exId: '0251', sets: 3, reps: 12, specText: '3组 × 12次', note: '收尾至接近力竭。' },
        ],
      },
      {
        name: 'Day 2 · 背日',
        focus: '背阔肌 / 上背部',
        exercises: [
          { exId: '0652', sets: 4, reps: 8, specText: '4组 × 8次', note: '做不了可用弹力带辅助。' },
          { exId: '0064', sets: 4, reps: 10, specText: '4组 × 10次', note: '单侧充分拉伸与收缩。' },
          { exId: '0198', sets: 3, reps: 12, specText: '3组 × 12次', note: '控制离心回放。' },
        ],
      },
      {
        name: 'Day 3 · 肩日',
        focus: '三角肌前 / 中 / 后束',
        exercises: [
          { exId: '0405', sets: 4, reps: 10, specText: '4组 × 10次', note: '主项推举。' },
          { exId: '0334', sets: 4, reps: 15, specText: '4组 × 15次', note: '中束黄金动作。' },
          { exId: '0383', sets: 3, reps: 12, specText: '3组 × 12次', note: '后束必修，俯身角度稳定。' },
        ],
      },
      {
        name: 'Day 4 · 手臂日',
        focus: '肱二头肌 / 肱三头肌',
        exercises: [
          { exId: '0031', sets: 4, reps: 10, specText: '4组 × 10次', note: '二头主项。' },
          { exId: '0294', sets: 3, reps: 12, specText: '3组 × 12次', note: '可交替锤式握法。' },
          { exId: '0814', sets: 3, reps: 12, specText: '3组 × 12次', note: '三头围度关键。' },
          { exId: '0241', sets: 3, reps: 15, specText: '3组 × 15次', note: '收尾充血。' },
        ],
      },
      {
        name: 'Day 5 · 腿日',
        focus: '股四头肌 / 腘绳肌 / 小腿',
        exercises: [
          { exId: '0043', sets: 4, reps: 8, specText: '4组 × 8次', note: '腿部主项，充分热身。' },
          { exId: '0085', sets: 3, reps: 10, specText: '3组 × 10次', note: '后侧链刺激。' },
          { exId: '1379', sets: 4, reps: 15, specText: '4组 × 15次', note: '小腿收尾。' },
        ],
      },
    ],
  },
];

module.exports = { PLANS };
