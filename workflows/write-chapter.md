<purpose>
章节创作全流程：规划 → 写作 → 润色 → 审核。产出可直接发布的章节内容。这是最常用的核心工作流。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-planner — 创建章节大纲
- novel-writer — 产出章节正文
- novel-editor — 润色优化文字
- novel-verifier — 一致性审核
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
# 解析章节号
CHAPTER_NUMBER=""
SKIP_PLAN=false
SKIP_POLISH=false
SKIP_VERIFY=false
DRAFT_MODE=false
USE_NEXT=false

# 解析参数
for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*)
      CHAPTER_NUMBER=$arg
      ;;
    --skip-plan)
      SKIP_PLAN=true
      ;;
    --skip-polish)
      SKIP_POLISH=true
      ;;
    --skip-verify)
      SKIP_VERIFY=true
      ;;
    --draft)
      DRAFT_MODE=true
      SKIP_POLISH=true
      SKIP_VERIFY=true
      ;;
    --next)
      USE_NEXT=true
      ;;
  esac
done

# 如果启用了 --next，优先用共享状态脚本获取下一章号
if [[ "$USE_NEXT" == true ]]; then
  CHAPTER_NUMBER=$(node scripts/novel_state.cjs write-target --root . --next --field target_chapter)
fi
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[章节号]` | 要创作的章节号，如 `1`、`23` |
| `--next` | 创作下一章（自动从 STATE.md 获取） |
| `--skip-plan` | 跳过规划，直接写作 |
| `--skip-polish` | 跳过润色 |
| `--skip-verify` | 跳过审核 |
| `--draft` | 草稿模式（跳过润色和审核） |

</process>

<initialization>

## 2. 初始化检查

### 2.1 检查项目状态

```bash
# 检查项目文件
if [[ ! -f "PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  echo "空目录请先运行 /novel:new-project；已有资料请先运行 /novel:map-base"
  exit 1
fi

# 读取项目状态
cat STATE.md
cat PROJECT.md
cat CHARACTERS.md
cat TIMELINE.md

# 读取章节预算（默认目标 3000，硬上限 4000；可在 PROJECT.md frontmatter 覆盖）
CHAPTER_WORD_BUDGET=$(node scripts/novel_state.cjs stats --root . --field chapter_words)
CHAPTER_WORD_CEILING=$(node scripts/novel_state.cjs stats --root . --field chapter_word_ceiling)
```

### 2.2 检查章节状态

```bash
# 检查目标章节是否已存在
if [[ -f "chapters/chapter-${CHAPTER_NUMBER}.md" ]]; then
  echo "警告：第 ${CHAPTER_NUMBER} 章已存在"
  AskUserQuestion(
    header: "章节已存在",
    question: "第 ${CHAPTER_NUMBER} 章已存在，如何处理？",
    options: ["覆盖重写", "追加新版本", "取消"]
  )
fi

# 检查前一章是否存在（第一章除外）
if [[ $CHAPTER_NUMBER -gt 1 ]]; then
  PREV=$((CHAPTER_NUMBER - 1))
  if [[ ! -f "chapters/chapter-${PREV}.md" ]]; then
    echo "错误：第 ${PREV} 章不存在，请先创作前一章"
    exit 1
  fi
fi
```

### 2.3 显示起始信息

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📝 章节创作 - 第 ${CHAPTER_NUMBER} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【项目】《[书名]》
【当前进度】第 [N] 章 / 共 [M] 章
【当前卷】第 [V] 卷：[卷名]
【章节预算】目标 ${CHAPTER_WORD_BUDGET} 字 / 硬上限 ${CHAPTER_WORD_CEILING} 字

【创作模式】
- 规划阶段：$([ "$SKIP_PLAN" = false ] && echo "✓ 启用" || echo "✗ 跳过")
- 润色阶段：$([ "$SKIP_POLISH" = false ] && echo "✓ 启用" || echo "✗ 跳过")
- 审核阶段：$([ "$SKIP_VERIFY" = false ] && echo "✓ 启用" || echo "✗ 跳过")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</initialization>

<planning_phase>

## 3. 规划阶段

**如果 `SKIP_PLAN = false`：**

### 3.1 加载上下文

```bash
# 读取项目设定
PROJECT=$(cat PROJECT.md)
ROADMAP=$(cat ROADMAP.md)
CHARACTERS=$(cat CHARACTERS.md)
TIMELINE=$(cat TIMELINE.md)
STATE=$(cat STATE.md)

# 读取前文大纲（如果存在）
if [[ -f "chapters/outlines/outline-$((CHAPTER_NUMBER - 1)).md" ]]; then
  PREV_OUTLINE=$(cat chapters/outlines/outline-$((CHAPTER_NUMBER - 1)).md)
fi
```

### 3.2 调用 Planner

```
SpawnAgent(
  agent: novel-planner,
  input: {
    chapter_number: CHAPTER_NUMBER,
    chapter_word_budget: CHAPTER_WORD_BUDGET,
    chapter_word_ceiling: CHAPTER_WORD_CEILING,
    project: PROJECT,
    roadmap: ROADMAP,
    characters: CHARACTERS,
    timeline: TIMELINE,
    state: STATE,
    prev_outline: PREV_OUTLINE
  },
  output: chapters/outlines/outline-${CHAPTER_NUMBER}.md
)
```

### 3.3 Planner 产出

- `outline-${CHAPTER_NUMBER}.md`：章节大纲
  - 推进目标
  - `must_land`（本章最低必须落地的唯一核心目标）
  - `can_rollover`（字数不够时顺延到下一章的目标）
  - `split_point`（超预算时优先断章的位置）
  - 场景设计
  - 人物出场
  - 钩子设置
  - 时间线位置
  - 伏笔管理

### 3.4 展示大纲

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 第 ${CHAPTER_NUMBER} 章大纲
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【章节名】[章节名]

【推进目标】
- [目标1]
- [目标2]

【场景设计】
1. 场景一：[场景名] - [核心事件]
2. 场景二：[场景名] - [核心事件]

【出场人物】
- [人物A]：[本章作用]
- [人物B]：[本章作用]

【章末钩子】
[钩子内容]

【时间线】
故事时间：[日期]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.5 确认大纲

```
AskUserQuestion(
  header: "大纲确认",
  question: "以上大纲是否满意？",
  options: [
    "确认，开始写作",
    "需要修改大纲",
    "跳过规划，直接写作"
  ]
)
```

- **确认**：进入写作阶段
- **修改**：让用户描述修改意见，重新生成大纲
- **跳过**：设置 `SKIP_PLAN = true`，进入写作阶段

**如果 `SKIP_PLAN = true`：**
- 直接进入写作阶段
- 写手需要自己在写作前形成构思

</planning_phase>

<writing_phase>

## 4. 写作阶段

### 4.1 加载上下文

```bash
# 读取项目设定
PROJECT=$(cat PROJECT.md)
CHARACTERS=$(cat CHARACTERS.md)
TIMELINE=$(cat TIMELINE.md)
STATE=$(cat STATE.md)

# 读取章节大纲（如果有）
if [[ -f "chapters/outlines/outline-${CHAPTER_NUMBER}.md" ]]; then
  OUTLINE=$(cat chapters/outlines/outline-${CHAPTER_NUMBER}.md)
fi

# 读取前文章节（确保连贯）
PREV_CHAPTERS=""
for i in $(seq $((CHAPTER_NUMBER - 3)) $((CHAPTER_NUMBER - 1))); do
  if [[ $i -gt 0 ]] && [[ -f "chapters/chapter-${i}.md" ]]; then
    PREV_CHAPTERS="${PREV_CHAPTERS}$(cat chapters/chapter-${i}.md)\n\n"
  fi
done
```

### 4.2 调用 Writer

```
SpawnAgent(
  agent: novel-writer,
  input: {
    chapter_number: CHAPTER_NUMBER,
    chapter_word_budget: CHAPTER_WORD_BUDGET,
    chapter_word_ceiling: CHAPTER_WORD_CEILING,
    project: PROJECT,
    characters: CHARACTERS,
    timeline: TIMELINE,
    state: STATE,
    outline: OUTLINE,
    prev_chapters: PREV_CHAPTERS
  },
  output: chapters/draft/chapter-${CHAPTER_NUMBER}-draft.md
)
```

### 4.3 Writer 产出

- `chapter-${CHAPTER_NUMBER}-draft.md`：章节草稿
  - 正文内容（约3000字）
  - `budget_result`：`within_target` / `near_ceiling` / `split_required`
  - `carry_over`：因预算顺延到下章的目标（如果有）
  - 章节元数据
  - 伏笔记录
  - 章末钩子
  - 自检清单

### 4.4 展示草稿摘要

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✍️ 第 ${CHAPTER_NUMBER} 章草稿完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【章节名】[章节名]
【字数】[XXXX] 字
【预算】目标 ${CHAPTER_WORD_BUDGET} / 硬上限 ${CHAPTER_WORD_CEILING}
【预算结果】within_target / near_ceiling / split_required

【自检结果】
- [x] 推进主线
- [x] 人设一致
- [x] 时间线准确
- [x] 钩子到位
- [x] 无雷点

【章末钩子】
[钩子内容]

【埋设伏笔】
- [伏笔1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.5 字数闸门

writer 完成后，必须先用正文实算脚本检查，再决定是否进入润色：

```bash
node scripts/chapter_budget.cjs inspect \
  --root . \
  --chapter ${CHAPTER_NUMBER} \
  --source draft \
  --json

node scripts/chapter_budget.cjs gate \
  --root . \
  --chapter ${CHAPTER_NUMBER} \
  --source draft
```

脚本输出里：
- `prose_chars`：只统计正文可见非空白字符，不含 frontmatter、元数据、审核表格
- `target_words`：本章目标字数
- `hard_ceiling`：本章硬上限
- `budget_status`：`within_target` / `near_ceiling` / `over_ceiling`

处理规则：
- 如果 `prose_chars <= CHAPTER_WORD_BUDGET`：正常进入后续阶段
- 如果 `prose_chars <= CHAPTER_WORD_CEILING` 且 `budget_result != split_required`：允许进入后续阶段，但标记为“接近上限”
- 如果 `prose_chars > CHAPTER_WORD_CEILING`，或 writer 明确返回 `budget_result = split_required`：
  1. 暂停润色和审核
  2. 保留当前章的 `must_land`、章末钩子和必要收束，不再硬塞 `can_rollover`
  3. 重新调用 `novel-planner`，把超出的推进量拆到下一章：
     - 修订 `outline-${CHAPTER_NUMBER}.md`，只保留本章必须落地的部分
     - 生成或更新 `outline-$((CHAPTER_NUMBER + 1)).md`，写入顺延目标和承接钩子
  4. Writer 基于修订后的当前章大纲重写当前章
  5. 当前章回到预算内后，再继续润色和审核

规则：超预算时优先拆章，不优先放宽单章长度。只有卷末高潮或明确标记的例外章节，才允许逼近硬上限。

</writing_phase>

<polish_phase>

## 5. 润色阶段

**如果 `SKIP_POLISH = false`：**

### 5.1 调用 Editor

```
SpawnAgent(
  agent: novel-editor,
  input: {
    chapter_number: CHAPTER_NUMBER,
    project: PROJECT,
    characters: CHARACTERS,
    draft: chapters/draft/chapter-${CHAPTER_NUMBER}-draft.md
  },
  output: [
    reviews/edit-report-${CHAPTER_NUMBER}.md,
    chapters/draft/chapter-${CHAPTER_NUMBER}-polished.md
  ]
)
```

### 5.2 Editor 产出

- `edit-report-${CHAPTER_NUMBER}.md`：修改报告
  - AI味问题修改
  - 代入感增强
  - 句式优化
  - 冗余删减
- `chapter-${CHAPTER_NUMBER}-polished.md`：润色后的候选正式稿

### 5.3 展示润色结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔧 第 ${CHAPTER_NUMBER} 章润色完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【修改统计】
- 原字数：[XXXX] 字
- 修改后：[XXXX] 字
- 修改率：[XX]%

【问题修正】
- AI味问题：[X] 处
- 代入感增强：[X] 处
- 句式优化：[X] 处
- 冗余删减：[X] 处

【质量评分】
- AI味：⭐⭐⭐⭐
- 代入感：⭐⭐⭐⭐
- 整体：⭐⭐⭐⭐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.4 询问接受修改

```
AskUserQuestion(
  header: "润色结果",
  question: "是否接受润色修改？",
  options: [
    "接受全部修改",
    "查看修改报告",
    "保留原稿"
  ]
)
```

- **接受**：使用修订版
- **查看报告**：展示详细修改，再决定
- **保留原稿**：使用草稿版本

接受润色版时，运行：

```bash
node scripts/chapter_budget.cjs gate --root . --chapter ${CHAPTER_NUMBER} --source polished
node scripts/chapter_ops.cjs apply-polish --root . --chapter ${CHAPTER_NUMBER} --force
```

保留草稿版时，运行：

```bash
node scripts/chapter_budget.cjs gate --root . --chapter ${CHAPTER_NUMBER} --source draft
node scripts/chapter_ops.cjs use-draft --root . --chapter ${CHAPTER_NUMBER} --force
```

**如果 `SKIP_POLISH = true`：**
- 直接使用草稿版本
- 运行：

```bash
node scripts/chapter_budget.cjs gate --root . --chapter ${CHAPTER_NUMBER} --source draft
node scripts/chapter_ops.cjs use-draft --root . --chapter ${CHAPTER_NUMBER} --force
```

</polish_phase>

<verification_phase>

## 6. 审核阶段

**如果 `SKIP_VERIFY = false`：**

### 6.1 调用 Verifier

```
SpawnAgent(
  agent: novel-verifier,
  input: {
    chapter_number: CHAPTER_NUMBER,
    project: PROJECT,
    characters: CHARACTERS,
    timeline: TIMELINE,
    state: STATE,
    chapter: chapters/chapter-${CHAPTER_NUMBER}.md,
    prev_chapters: PREV_CHAPTERS
  },
  output: reviews/review-${CHAPTER_NUMBER}.md
)
```

### 6.2 Verifier 产出

- `review-${CHAPTER_NUMBER}.md`：审核报告
  - 人设一致性检查
  - 时间线验证
  - 逻辑检查
  - 雷点检测
  - 禁忌检查

### 6.3 展示审核结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓ 第 ${CHAPTER_NUMBER} 章审核报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【审核结果】

| 检查类别 | 状态 | 问题数 |
|----------|------|--------|
| 人设一致性 | ✓/✗ | N |
| 时间线 | ✓/✗ | N |
| 逻辑闭环 | ✓/✗ | N |
| 雷点检测 | ✓/✗ | N |
| 禁忌检查 | ✓/✗ | N |

【总体评价】通过 / 需修改 / 不通过

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6.4 处理审核结果

**如果审核通过：**
- 进入状态更新阶段

**如果需要修改（有严重问题）：**
```
🔴 严重问题：

### 问题1：[问题标题]
- 位置：第X段
- 原文：[引用]
- 问题：[说明]
- 建议：[修改建议]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AskUserQuestion(
  header: "审核未通过",
  question: "发现严重问题，如何处理？",
  options: [
    "返回修改",
    "查看详情后修改",
    "忽略问题，继续"
  ]
)
```

- **返回修改**：重新调用 Writer 修改问题
- **查看详情**：展示完整审核报告
- **忽略**：记录问题但继续（不推荐）

**如果 `SKIP_VERIFY = true`：**
- 跳过审核，直接进入状态更新

</verification_phase>

<state_update>

## 7. 状态更新

### 7.1 更新 STATE.md

```bash
# 用共享状态脚本统一刷新 STATE.md，避免重写章节时累计字数失真
node scripts/novel_state.cjs refresh \
  --root . \
  --status 连载中 \
  --latest-completed "已完成第 ${CHAPTER_NUMBER} 章" \
  --next-goal "第 $((CHAPTER_NUMBER + 1)) 章规划或核对"
```

然后再补正文区块里更细的内容：
- 当前创作焦点
- 人物当前状态
- 未回收伏笔
- 最近决策

### 7.2 更新时间线

如果章节有新的时间锚点，更新 TIMELINE.md。

### 7.3 更新人物档案

如果章节有人物状态变化或新人物，更新 CHARACTERS.md。

</state_update>

<completion>

## 8. 完成

### 8.1 显示完成信息

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ 第 ${CHAPTER_NUMBER} 章创作完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【文件位置】
- 章节：chapters/chapter-${CHAPTER_NUMBER}.md
- 大纲：chapters/outlines/outline-${CHAPTER_NUMBER}.md
- 审核：reviews/review-${CHAPTER_NUMBER}.md

【创作统计】
- 字数：[XXXX] 字
- 场景数：[N]
- 出场人物：[N] 人
- 新伏笔：[N] 个

【下一步】
- 创作下一章：/novel:write-chapter --next
- 查看章节：cat chapters/chapter-${CHAPTER_NUMBER}.md
- 批量创作：/novel:plan-batch $((CHAPTER_NUMBER + 1))-$((CHAPTER_NUMBER + 10))

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 8.2 提供下一步选项

```
AskUserQuestion(
  header: "下一步",
  question: "接下来想做什么？",
  options: [
    "创作下一章",
    "查看本章内容",
    "查看审核报告",
    "返回修改",
    "完成"
  ]
)
```

</completion>

<flags>

## 命令示例

```bash
# 创作第1章（完整流程）
/novel:write-chapter 1

# 创作下一章
/novel:write-chapter --next

# 跳过规划直接写作
/novel:write-chapter 5 --skip-plan

# 草稿模式（跳过润色和审核）
/novel:write-chapter 10 --draft

# 只跳过润色
/novel:write-chapter 8 --skip-polish

# 只跳过审核
/novel:write-chapter 8 --skip-verify

# 批量创作（配合其他命令）
/novel:plan-batch 11-20
/novel:write-chapter 11 --draft
```

</flags>

<error_handling>

## 错误处理

### 项目不存在
```
错误：未找到项目文件
解决：空目录请先运行 /novel:new-project；已有资料请先运行 /novel:map-base
```

### 前章不存在
```
错误：第 N 章不存在
解决：请先创作前一章，或使用 --skip-plan 跳过连贯性检查
```

### 大纲不满足
```
用户不满意大纲时：
1. 询问具体修改意见
2. 根据意见重新调用 planner
3. 再次展示确认
```

### 审核不通过
```
审核有严重问题时：
1. 展示问题详情
2. 询问处理方式
3. 如需修改，重新调用 writer
```

</error_handling>
