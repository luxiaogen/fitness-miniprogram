---
version: alpha
name: Volt Gym（暗夜伏特）
description: 健身记小程序设计系统 —— 深色训练场景 + 荧光绿能量色的数据驱动型视觉识别
colors:
  # 页面基底（surface 层级，由低到高）
  surface: "#0E100E"
  surface-dim: "#0A0C0A"
  surface-container: "#181C17"
  surface-container-high: "#1F241E"
  surface-container-highest: "#272D26"
  # 内容与描边
  on-surface: "#F2F5EF"
  on-surface-variant: "#9BA398"
  on-surface-muted: "#6B7268"
  outline: "#313830"
  outline-variant: "#242A23"
  # 主色：荧光绿（能量/行动/数据）
  primary: "#C8F542"
  on-primary: "#17200A"
  primary-container: "#263207"
  on-primary-container: "#DDFB8A"
  # 辅助色
  secondary: "#B79CFF"
  secondary-container: "#2B2440"
  tertiary: "#FFB86B"
  tertiary-container: "#3A2A17"
  # 语义色
  error: "#FF7A6E"
  error-container: "#3B1B18"
  # 媒体画布（白底 GIF/JPG 的容器）
  media-canvas: "#FFFFFF"
typography:
  display-lg:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
  headline-md:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
  label-sm:
    fontFamily: -apple-system, "PingFang SC", sans-serif
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
  data-lg:
    fontFamily: -apple-system, "DIN Alternate", "PingFang SC", sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.1
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  unit: 4px
  page-gutter: 12px
  card-padding: 14px
  card-gap: 10px
  section-gap: 24px
components:
  card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline-md}"
    rounded: "{rounded.full}"
    height: 48px
  button-primary-pressed:
    backgroundColor: "#B4E13A"
  button-ghost:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
  chip-filter:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
  chip-filter-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  tag-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.sm}"
  tag-secondary:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
  input-field:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
  sheet-bottom:
    backgroundColor: "{colors.surface-container-high}"
    rounded: "{rounded.xl}"
  stat-card:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.primary}"
    typography: "{typography.data-lg}"
    rounded: "{rounded.lg}"
---

# Volt Gym（暗夜伏特）· 健身记设计系统

## Theming（双主题机制）

本设计系统提供 **Dark（暗夜伏特，默认）** 与 **Light（伏特·白）** 两套主题，共用同一 token 结构，用户可在「统计 → 外观」中切换：浅色 / 深色 / 跟随系统（`wx.onThemeChange` 监听，选择持久化于本地）。

- **实现方式**：`app.wxss` 以 `.theme-dark` / `.theme-light` 定义两套 CSS 变量，页面根节点挂 `theme-<name>` class，全部样式经 `var(--token)` 取色；原生部分（导航栏、tabBar 及图标、窗口背景）由 `services/theme.js` 经 `wx.setNavigationBarColor` 等 API 联动刷色。
- **Light 主题 token 映射**（与 Dark 一一对应）：surface `#F5F6F2`（微绿调灰白）、surface-container `#FFFFFF`、on-surface `#1A1E16`、on-surface-variant `#5A6156`、outline-variant `#E7EAE0`。
- **Light 主色深化**：Volt Green 在白底上对比度不足，Light 主题主色深化为 **Volt Deep Green `#558B00`**（白底对比度 4.8:1，WCAG AA 达标），其容器色为 `#E4F5C2` / 文字 `#2E4A00`；图表渐变同步深化为 `#8BC53F → #558B00`。
- **不变量**：白色媒体画布（`#FFFFFF`）在两主题下保持一致；标签三色语义（部位/器械/目标）不变，仅明度适配。
- **层级规则差异**：Dark 主题禁用投影（明度阶梯 + 发丝边框）；Light 主题同样以边框为主表达层级，允许极浅投影（`rgba(0,0,0,0.04)`）但不依赖。

## Brand & Style

Volt Gym 的设计语言服务于一个核心场景：**健身房里的低头一瞥**。训练者双手沾满镁粉、组间休息只有 60 秒——界面必须在弱光环境下瞬间可读，在汗湿的手指下准确响应。

品牌人格是「克制的能量感」：大面积深邃的墨绿黑（Midnight Forest）承载内容，唯一的荧光绿（Volt Green）只出现在最值得行动的地方——主按钮、当日数据、选中态。情绪上追求专业运动装备般的冷峻（Nike Training、Whoop 的深色传统），而非社交产品的热闹明亮。

信息密度为「数据驱动型」：组数、重量、天数是主角，用大字号粗字重呈现；说明性文字退居灰阶。所有静态媒体（动作演示 GIF/缩略图）为白底解剖插画，统一置于白色「媒体画布」卡片中，使其在深色界面中成为有意的视觉焦点，而非刺眼的失误。

## Colors

色彩策略是「深色系层 + 单色强调」。surface 系列通过逐级增亮的墨绿灰建立纵向层级，禁止用投影制造层级（见 Elevation）。

- **Surface (#0E100E):** 页面基底，近黑的墨绿灰，比纯黑更贴合运动品牌的自然感。
- **Surface Container (#181C17 → #272D26):** 卡片与浮层的三个梯级，弹层用最高级，形成「浮起」错觉。
- **Primary Volt Green (#C8F542):** 全界面唯一强调色，仅用于主行动按钮、选中态、关键数据与进度表达。对 surface 对比度 12.6:1，远超 WCAG AAA。
- **Secondary Lavender (#B79CFF):** 器械标签专用，与荧光绿形成冷-暖对位，不承担交互语义。
- **Tertiary Amber (#FFB86B):** 目标肌群标签与计划要点，用于提示性信息。
- **Error (#FF7A6E):** 删除与破坏性操作，低明度红以适应深色底。
- **Media Canvas (#FFFFFF):** 白底媒体内容的专用容器色，是唯一允许的大面积白色。

## Typography

系统字体栈（-apple-system / PingFang SC），以字重与灰度色阶而非字体家族建立层级。数据场景遵循「大、粗、单色」三原则。

- **Display (34px Bold):** 详情页动作名、计划名，每屏至多一处。
- **Headline (22px/17px):** 页面标题与卡片标题，17px SemiBold 是列表主力。
- **Body (15px/14px/13px):** 说明文字主体，14px 为默认阅读尺寸。
- **Label (12px/11px Medium):** 标签、单位、元信息，颜色一律 on-surface-variant。
- **Data (28px Bold):** 统计数字专属，优先使用系统等宽数字（DIN Alternate 回退），单位缩小至 12px 并置于基线右侧。

## Layout

以 4px 为基础单位的间距系统，页面左右安全边距 12px（gutter），卡片内边距 14px，卡片纵向间距 10px，章节间距 24px。

布局模型为「单列卡片流」：移动端单列纵向滚动，不做多列网格（统计指标卡除外，允许 2×2 网格）。弹层（动作选择器、参数表单）从底部升起，高度不超过屏高的 82%，顶部圆角 xl，符合拇指热区操作习惯。

## Elevation & Depth

深色系统中**禁用投影**（shadow 在深底上不可见且显脏）。层级通过三种手段表达：

1. **明度阶梯：** 背景 #0E100E → 卡片 #181C17 → 弹层/悬浮 #1F241E → 最高 #272D26，逐级 +4~6% 明度。
2. **发丝边框：** 卡片使用 1px outline-variant（#242A23）描边，在相邻层级间提供清晰分界。
3. **荧光描边：** 仅当前计划横幅等少数强调容器使用 primary 20% 透明度描边，传达「激活」语义。

## Shapes

形状语言为「圆角的运动感」：卡片 12px 圆角（lg），按钮与筛选 chip 全圆角（full，胶囊形），标签 4px 微圆角（sm）保持信息载体的利落。同一视图内禁止混用两种以上圆角级别。

## Components

### Buttons

Primary 按钮为荧光绿胶囊（48px 高，17px SemiBold 深色文字），每屏至多一个。Pressed 态明度降低 8%（#B4E13A）。次级操作使用 Ghost 按钮（surface-container-high 底 + 荧光绿文字）。破坏性操作（删除）仅使用 error 文字色，不配背景。

### Chips & Tags

筛选 chip 未选中为 surface-container 底 + 灰文字，选中翻转为荧光绿底 + 深色文字。语义标签固定三色：部位=primary-container/荧光绿，器械=secondary/薰衣草紫，目标肌群=tertiary/琥珀色。

### Lists & Cards

列表项（动作/记录/计划）均为 12px 圆角卡片，左图右文。缩略图为白底媒体画布（方形 8px 圆角），在深色卡片中保持原生白底，不做反色处理。右箭头使用 on-surface-muted 的 45° 折线图标。

### Sheets & Inputs

底部弹层使用 surface-container-high 背景，顶部 16px 圆角，含关闭按钮与标题栏。输入框为 surface-container-high 底 + 8px 圆角，聚焦时以 1px 荧光绿描边反馈，无投影。

### Charts

柱状图与条形图使用荧光绿单色渐变（#DDFB8A → #C8F542），网格线省略，数值直接标注于图形上方/右侧。选中日期为荧光绿实心圆，训练标记点为荧光绿 6px 圆点。

## Do's and Don'ts

- Do 每屏只保留一个荧光绿主按钮；其余操作降级为 Ghost 或文字按钮。
- Don't 在深色元素上使用 box-shadow，层级一律交给明度阶梯与描边。
- Do 保持白底媒体（GIF/缩略图）置于白色媒体画布卡片中，不要试图反色或加滤镜。
- Don't 让荧光绿出现在正文文字上（阅读性差的亮色文本），它只属于行动与数据。
- Do 保证所有文本对背景对比度 ≥ 4.5:1（on-surface #F2F5EF 与 on-surface-variant #9BA398 均满足）。
- Don't 在同一视图混用三种以上标签颜色，语义标签严格按部位/器械/目标分配。
