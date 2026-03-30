# Novel Command Reference

结构化小说工作流命令总览。

## 核心思路

`novel` 工具不是单次写文提示词，而是围绕 `.novel/` 工作区运转：

- `PROJECT.md`：全书契约
- `CHARACTERS.md`：人物总表
- `TIMELINE.md`：时间账
- `ROADMAP.md`：卷结构
- `STATE.md`：当前状态
- `chapters/outlines/`：章节大纲
- `chapters/`：章节正文
- `reviews/`：审核与润色报告
- `research/`：考据资料

## 推荐流程

### 从 0 开始

1. `/novel:new-project`
2. `/novel:plan-arc [卷名]`：需要先规划下一卷时
3. `/novel:plan-batch 1-10`
4. `/novel:write-chapter 1`
5. `/novel:review 1`

### 快速试写

1. `/novel:new-project --quick`
2. `/novel:quick-draft 1`
3. `/novel:quick-polish 1`
4. `/novel:verify 1`

### 长线连载

1. `/novel:plan-arc [卷名]`
2. `/novel:plan-batch START-END`
3. `/novel:autonomous --from=START --to=END`
4. `/novel:review START-END`

## 命令列表

### 项目初始化

`/novel:new-project [--auto] [--from-doc @idea.md] [--skip-research] [--quick]`

- 初始化 `.novel/` 项目骨架
- 创建 `PROJECT.md`、`CHARACTERS.md`、`TIMELINE.md`、`ROADMAP.md`、`STATE.md`

### 新卷规划

`/novel:plan-arc [卷名] [--chapters=N] [--goal="..."] [--research="..."]`

- 规划新卷或新阶段
- 更新 `ROADMAP.md`、`TIMELINE.md`、`CHARACTERS.md`

### 批量章节规划

`/novel:plan-batch START-END [--goal="..."] [--force]`

- 批量生成章节大纲
- 输出 `outline-[N].md` 和批量概要

### 标准章节创作

`/novel:write-chapter [N|--next] [--skip-plan] [--skip-polish] [--skip-verify] [--draft]`

- 完整流程：规划 -> 写作 -> 润色 -> 审核 -> 状态更新

### 快速草稿

`/novel:quick-draft N [--words=3000] [--context="..."]`

- 跳过完整流程，快速产出草稿
- 输出到 `chapters/draft/`

### 人物管理

`/novel:character [--list|--add|--view NAME|--update NAME|--check NAME|--delete NAME]`

- 维护 `CHARACTERS.md`
- 管理 `characters/[NAME].md`

### 研究考据

`/novel:research [topic] [--quick|--deep] [--file=name]`

- 研究历史、行业、年代、风俗、术语等
- 输出到 `research/[topic].md`

### 润色

`/novel:polish [N|START-END] [--quick] [--deep] [--compare] [--in-place]`

- 去 AI 味
- 增强代入感
- 优化节奏和句式

### 快速润色

`/novel:quick-polish [N|START-END] [--compare] [--in-place]`

- `polish --quick` 的快捷入口

### 审核

`/novel:review [N|START-END] [--quick] [--full] [--json]`

- 审核人设、时间线、逻辑、雷点、禁忌
- 输出 `reviews/review-[N].md`

### 验证

`/novel:verify [N|START-END] [--quick] [--json]`

- `review` 的一致性验证别名

### 自动连载

`/novel:autonomous [--from=N] [--to=N|--chapters=N] [--batch=N] [--no-pause] [--skip-verify]`

- 批量规划、写作、审核并在批次点暂停

### 自然语言路由

`/novel:do <你的描述>`

- 用自然语言描述需求
- 自动路由到最合适的 `/novel:*` 命令

### 控制台

`/novel:manager`

- 查看项目全景
- 从一个终端里分发常用写作动作

### 当前进度

`/novel:progress`

- 汇总当前卷、当前章节、规划覆盖和审核覆盖
- 给出推荐下一步，但不自动执行

### 自动推进

`/novel:next`

- 读取当前状态后直接推进到下一条最合理的命令

### 帮助

`/novel:help`

- 显示这份命令参考

## 常用组合

### 先做研究再开写

1. `/novel:research 1980年香港社团结构 --deep`
2. `/novel:new-project`
3. `/novel:plan-batch 1-10`
4. `/novel:write-chapter 1`

### 卷与卷之间切换

1. `/novel:review 当前卷范围`
2. `/novel:plan-arc 下一卷名称`
3. `/novel:plan-batch 下一卷前10章`

### 批量生产后统一回查

1. `/novel:autonomous --from=21 --chapters=5`
2. `/novel:quick-polish 21-25`
3. `/novel:review 21-25 --full`

### 中断后恢复

1. `/novel:progress`
2. `/novel:next`

### 不知道该用哪个命令

1. `/novel:do 我想先规划下一卷，再安排前五章`
2. 或直接 `/novel:manager`

## 文件约定

- 项目文件：`.novel/PROJECT.md`
- 人物总表：`.novel/CHARACTERS.md`
- 时间线：`.novel/TIMELINE.md`
- 路线图：`.novel/ROADMAP.md`
- 当前状态：`.novel/STATE.md`
- 章节大纲：`.novel/chapters/outlines/outline-[N].md`
- 章节正文：`.novel/chapters/chapter-[N].md`
- 人物卡：`.novel/characters/[NAME].md`
- 研究资料：`.novel/research/[topic].md`
- 审核报告：`.novel/reviews/review-[N].md`

## 使用原则

- 长篇创作优先维护 `.novel/` 文件，不要只保留聊天记录。
- 有真实历史或专业细节时，先用 `/novel:research`。
- 需要长期稳定连载时，先规划再写，不要连续裸写正文。
- `quick-*` 命令适合试写，不适合作为唯一正式流程。
- 不确定当前该做什么时，先 `/novel:progress`，想无脑推进就 `/novel:next`。
- 不确定该用哪个命令时，用 `/novel:do`；想集中调度时，用 `/novel:manager`。
