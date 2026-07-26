# 健身记 · 微信小程序架构方案（MVP）

> 目标：最短时间上线 MVP 并获取用户验证；架构轻量但可扩展，为后续迭代预留空间。
>
> 视觉系统：**[DESIGN.md](./DESIGN.md)**（Volt Gym 暗夜伏特，遵循 google-labs-code/design.md 规范）——所有样式决策以该文档为唯一事实源。

## 0. 技术选型决策

| 决策点 | 方案 | 理由 |
|---|---|---|
| 后端 | **微信云开发**（云函数 + 云数据库 + 云存储） | 免域名备案、免 HTTPS 证书、免服务器运维；自带 openid 静默登录；MVP 上线路径最短 |
| 动作库数据 | **静态打包** `data/exercises.js`（51 动作） | 零网络依赖、列表秒开；数据随版本发布更新，无需建库维护 |
| 缩略图 | 打进主包（51 张 jpg ≈ 330KB） | 列表页必须秒开；远未触及 2MB 主包上限 |
| 演示动画 | **32 色压缩 GIF 放入 packageDetail 分包**（51 个 ≈ 1.91MB） | `image` 组件播放 GIF 是最成熟能力；分包余量很小，仅 Wi-Fi 预下载；动作库继续扩充时应迁移云存储 CDN |
| 状态管理 | 自研 60 行发布/订阅 store | MVP 不引 MobX 等三方依赖；接口稳定，后续可平滑替换 |
| 数据访问 | 显式双模 `services/cloud.js`（未配置云环境时本地 / 已配置时云端） | 未配云环境也能完整演示；配置云环境后绝不静默回退本地，避免数据分叉 |

---

## 1. 前端页面结构

### 页面层级与导航

```
┌─ 主包 · tabBar（5 个一级页面）─────────────────┐
│  pages/library   动作库   （默认首页）          │
│  pages/plans     计划     （热门训练计划列表）  │
│  pages/log       记录     （按日期的训练管理）  │
│  pages/calendar  日历     （月视图历史）        │
│  pages/stats     统计     （周期数据汇总）      │
└────────────────────────────────────────────────┘
        │
        ▼ wx.navigateTo（二级页面，原生返回栈）
  packageDetail/pages/detail   动作详情（GIF/步骤/标注/加入今日训练）
  pages/plan-detail            计划详情（课表/特点/应用为我的方案）
```

### 分包策略

- **主包（约 441KB）**：5 个 tab 页 + 计划详情 + 全部组件/服务/静态数据 + 缩略图，保证启动速度；
- **packageDetail 分包（约 1.85MB）**：详情页 + 51 个压缩 GIF（150px/32色/lossy，动作库扩充后需在此压缩级别内控制总量）——GIF 是体积大头且只在详情页使用，天然适合分包；
- **preloadRule**：仅在 Wi-Fi 下预下载分包，避免进入动作库时消耗约 1.9MB 蜂窝数据；移动网络下按需加载详情页；
- 分包页面可引用主包的组件、JS 模块与图片资源（反向不允许），因此 record-form 等无需迁移；
- **分包余量警示**：分包剩余约 190KB，动作库再扩充时须同比例压低 GIF 压缩参数或迁移云存储。

### 训练计划模块

- **数据**：`data/plans.js` 静态打包 4 个热门计划（三分化线性渐进 / 新手全身 / 上下肢二分化 / 五分化健美），课表动作通过 `exId` 引用动作库，保证演示图与详情可达；
- **应用计划**：`services/plan.js` 将 `{planId, appliedAt}` 存本地（接入云后可迁移 users 集合），`store.planVersion` 广播变更；
- **一键填入**：log 页顶部计划横幅展示当前计划的各训练日，点击将该日全部动作批量写入当前日期记录（`fillDayToRecords` 串行写入，备注合并"训练日 · 动作要点"）。

导航逻辑：

- **library → detail**：点击动作卡片，`navigateTo` 带 `?id=` 参数；
- **detail → log**：「加入今日训练」写入今日记录，toast 确认，用户可自行切到记录 tab；
- **calendar ⇄ log**：通过 `store.selectedDate` 共享选中日期——日历点选某天后再切到记录页，日期已同步；
- 所有 tab 页 `onShow` 时按数据版本号决定是否重新拉取（见 §3），保证跨页数据一致。

### 为什么 detail 不进 tabBar

详情页是任务的「终点页」（看演示、写标注、加训练），保留原生返回手势符合用户心智；同时 tabBar 控制在平台上限 5 项以内。

---

## 2. 组件划分

### 分层与复用策略

| 组件 | 类型 | 复用于 | 拆分依据 |
|---|---|---|---|
| `empty` | 基础组件 | library / log / calendar / stats | 纯展示，4 处复用 |
| `ex-item` | 业务组件 | library 列表 / ex-picker 弹层 | 同一动作的两种尺寸（normal/small） |
| `log-item` | 业务组件 | log 记录列表 / calendar 日详情 | 同一记录的两种模式（可删除/只读紧凑） |
| `ex-picker` | 业务组件 | log 添加动作 | 半屏弹层 + 搜索，独立交互闭环 |
| `record-form` | 业务组件 | log / detail（加入今日训练） | 参数配置表单，两处入口共用 |

**规则**：
- 只被单页使用的不拆（日历网格并入 calendar 页、标注编辑并入 detail 页）——避免过度抽象；
- 组件只通过 `properties` 入参、`triggerEvent` 出参通信，不直接访问 store/service，保持可测试性；
- 页面负责编排（如 log 页串联 `ex-picker → record-form → recordService.create`）。

### 后续扩展预留

- 动作收藏、训练模板等新列表场景可直接复用 `ex-item`；
- 新增「编辑记录」时 `record-form` 增加 `initial` 属性即可，不破坏现有调用方。

---

## 3. 数据流管理

### 方案：单向数据流 + 发布/订阅广播

```
┌──────────┐  调用   ┌───────────────┐  wx.cloud.callFunction
│  页面/组件 │ ─────▶ │ services/*.js │ ──────────────▶ 云函数 ──▶ 云数据库
└──────────┘ ◀───── └───────────────┘ ◀────────────── 统一 {code,data,msg}
     │  setData            │
     │                     ▼ 写操作后
     │              store.bumpRecords() / bumpNotes()
     │                     │
     ▼                     ▼
  视图更新 ◀── onShow 检查版本号，变了才重新拉取（避免无效请求）
```

三条约定：

1. **视图状态**留在页面 `data`，**会话状态**（选中日期、版本号）放 `store`，**持久数据**走 services；
2. 跨页同步依赖「`onShow` + 版本号」而非实时绑定——小程序页面栈模型下最简单可靠的方案；
3. `store` 接口（get/set/subscribe/emit）与实现解耦，数据量增长后可整体替换为 MobX，页面零改动。

### 双模数据访问（MVP 关键策略）

`services/cloud.js` 是唯一的持久化出口：

- 未配置 `CLOUD_ENV` → 使用 `wx.Storage` 本地模拟；
- 配置 `CLOUD_ENV` 后 → 只路由到云函数；初始化、登录或请求失败都会明确报错，绝不改写到本地存储；
- 静默登录仅维护 `users` 集合，不决定数据存储模式，避免临时登录失败产生两份互不一致的数据；
- `records.list` 与 `notes.list` 使用 `{ items, hasMore }` 分页响应，服务层自动拉取完整数据，页面不受单页上限影响。

收益：开发/演示/评审场景无需后端即可跑通全流程；上线只需配置 `env.js` 中的 `CLOUD_ENV`，并能保持本地与云端模式的行为边界清晰。

---

## 4. API 接口设计

### 云函数调用约定

- 入口：`wx.cloud.callFunction({ name, data })`，`data.action` 区分操作；
- 统一返回：`{ code: 0, data: any }` 成功 / `{ code: -1, msg: string }` 失败；
- 身份：`cloud.getWXContext().OPENID`，服务端强制按 `_openid` 过滤（防越权）；
- 服务端做字段校验与长度截断，不信任客户端输入。

### login

| 项 | 内容 |
|---|---|
| 入参 | 无 |
| 返回 | `{ openid, isNew }` |
| 副作用 | 首次写入 `users` 集合，此后更新 `lastActiveAt` |

### records（训练记录）

| action | 入参 | 返回 |
|---|---|---|
| `list` | `{ date }` 或 `{ start, end }`，可选 `{ offset, pageSize }` | `{ items: Record[], hasMore: boolean }`（按 createdAt 升序） |
| `create` | `{ record }` | 新建后的 `Record` |
| `createMany` | `{ records: RecordInput[] }`（≤20 条） | 原子写入后的 `Record[]` |
| `remove` | `{ id }` | `{ removed: number }` |

```ts
interface Record {
  _id: string;
  date: string;      // YYYY-MM-DD
  exId: string;      // 动作库静态数据 id
  sets: number;      // 1-100
  reps: number;      // 1-1000
  weight: number;    // kg，0-10000，0 = 自重
  duration: number;  // 分钟，1-1440
  note: string;      // ≤200 字
  createdAt: Date;
}
```

### notes（动作标注）

| action | 入参 | 返回 |
|---|---|---|
| `list` | `{ exId }`，可选 `{ offset, pageSize }` | `{ items: Note[], hasMore: boolean }`（时间倒序） |
| `summary` | 可选 `{ offset, pageSize }` | `{ items: exId[], hasMore: boolean }` |
| `create` | `{ exId, text }` | 新建后的 `Note`（text ≤120 字） |
| `remove` | `{ id }` | `{ removed: number }` |

### stats（预留，v1.1）

当前由前端聚合；服务层会分页拉取完整周期数据，避免单页查询上限造成静默漏算。训练日期统一按中国标准时间定义。接口预定义：

- `GET stats { period: 'week'|'month' }` → `{ days, totalSets, totalReps, totalDuration, partDistribution: [{label, sets}] }`

数据增长后下沉为 `stats` 云函数，前端仅替换 `services/stats.js` 实现。

---

## 5. 后端服务架构

### 云资源清单

```
cloudfunctions/
├── login/    静默登录，维护 users 集合
├── records/  训练记录 list / create / createMany / remove
└── notes/    动作标注 list / summary / create / remove

云数据库集合（权限：仅创建者可读写）
├── users     { _openid, createdAt, lastActiveAt }
├── records   { _openid, date, exId, sets, reps, weight, duration, note, createdAt }
│             索引建议：(_openid, date, createdAt) 联合索引
└── notes     { _openid, exId, text, createdAt }
              索引建议：(_openid, exId, createdAt) 与 (_openid, createdAt) 联合索引
```

> 演示动画（压缩 GIF）位于 `packageDetail` 分包内，无需云存储；`tools/gifs/` 保留原始素材，`tools/convert_gifs.sh` 为压缩脚本。详情分包目前接近 2 MB，因此仅在 Wi-Fi 下预下载；新增动作前必须复核分包体积，必要时迁移 GIF 到云存储。

### 支撑快速迭代的设计

- **无 schema 迁移负担**：云数据库 schemaless，新增字段（如 `rpe` 主观强度）直接写入，旧数据天然兼容；
- **函数即接口**：新增业务能力 = 新增一个云函数目录，前端 `services/cloud.js` 无需改动；
- **免费额度覆盖 MVP**：云开发基础版足以支撑数千 DAU 的验证期用量；
- **演进路径清晰**：验证通过后，如需复杂查询/多端同步，可将 `services/cloud.js` 的云端分支替换为自建 HTTP API（接口结构已对齐 REST 风格），页面层无感知。

### 上线 checklist

1. 注册小程序 AppID，替换 `project.config.json` 的 `appid`；
2. 开通云开发，把环境 ID 填入 `miniprogram/env.js` 的 `CLOUD_ENV`；
3. 创建 `users / records / notes` 三个集合，权限设为「仅创建者可读写」，并创建上述联合索引；
4. 右键分别部署 `login / records / notes` 三个云函数；
5. 在真机验证：本地模式、云端模式、弱网错误、跨午夜日期、批量填入和主题切换；
6. 根据实际运营主体、联系方式、数据用途、留存期限与用户权利编制隐私政策和审核材料；不要把“无收集”作为默认声明。

---

## 6. 项目结构总览

```
exercise-tracker-miniprogram/
├── project.config.json          # 工程配置（appid / 云函数目录）
├── ARCHITECTURE.md              # 本文档
├── miniprogram/
│   ├── app.js / app.json / app.wxss / env.js / sitemap.json
│   ├── data/exercises.js        # 51 动作静态库（随包发布）
│   ├── data/plans.js            # 4 个热门训练计划模板（随包发布）
│   ├── assets/exercises/        # 51 张缩略图（主包内）
│   ├── images/                  # tabBar 图标
│   ├── packageDetail/           # 详情页分包（preloadRule 预下载）
│   │   ├── pages/detail/        # 动作详情页
│   │   └── assets/gifs/         # 51 个压缩 GIF 演示动画
│   ├── store/index.js           # 发布/订阅 store
│   ├── services/
│   │   ├── cloud.js             # 双模数据访问层 ★
│   │   ├── exercise.js          # 动作库查询
│   │   ├── record.js / note.js  # 记录 / 标注服务
│   │   ├── plan.js              # 训练计划（应用 / 取消 / 一键填入）
│   ├── utils/date.js            # 日期工具
│   ├── components/              # empty / ex-item / log-item / ex-picker / record-form
│   └── pages/                   # library / plans / log / calendar / stats / plan-detail
├── cloudfunctions/              # login / records / notes
└── tools/gifs/                  # 51 个原始 GIF 素材（压缩后进 packageDetail 分包，目录仅备查）
```
