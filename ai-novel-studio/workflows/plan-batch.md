<purpose>
批量规划章节 (brainstorm-first)：用户给出范围（与可选目标），由 ans-planner 先 brainstorm 出 **批次蓝图**（每章只到 must_land + hook_type 级别，无完整大纲），用户审核迭代到满意后 commit 阶段再展开成每章完整大纲文件。

这个两阶段设计避免了「一次性生成 10 个完整大纲，发现第 3 章方向就跑偏了」的旧问题 —— 用户在花费 outline 详细推演 token 之前，先看到全批的高层路径并校准方向。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-planner — 批次蓝图 brainstorm + 逐章大纲 commit
- ans-plan-checker — 大纲一致性检查（在 commit 阶段每章完成后触发）
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 初始化引擎与上下文

```bash
INIT=$(node bin/ans-tools.cjs init plan-batch --raw)

if echo "$INIT" | grep -q '"error"'; then
  echo "初始化失败，项目未就绪。"
  exit 1
fi

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_OUTLINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHAPTER-OUTLINE.md"
```

## 2. 解析参数

```bash
RANGE=""
START=""
END=""
GOAL=""
FORCE=false

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*-[0-9]*)
      RANGE="$arg"
      START=$(echo $arg | cut -d'-' -f1)
      END=$(echo $arg | cut -d'-' -f2)
      ;;
    --goal=*)
      GOAL="${arg#*=}"
      ;;
    --force)
      FORCE=true
      ;;
  esac
done

PLAN_CHECK_ENABLED=$(echo "$INIT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.config?.workflow?.plan_check !== false)" 2>/dev/null)

if [[ -z "$RANGE" ]]; then
  echo "缺少必需的范围参数 (e.g. 11-20)"
  AskUserQuestion(
    question="要批量规划哪几章？ (格式: START-END)",
    followUp="请使用带有范围参数的指令重试，例如 /ans:plan-batch 11-20"
  )
  exit 1
fi

mkdir -p chapters/outlines
```

</process>

<brainstorm_phase>

## 3. 头脑风暴：发散批次蓝图

调用 `ans-planner` 的 **brainstorm 模式**：基于 PROJECT.md / ROADMAP.md / TIMELINE.md / CHARACTERS.md / STATE.md，由 planner 一次性提议从第 ${START} 章到第 ${END} 章的高层路径 —— 每章只填到「章节标题 / must_land / hook_type / 出场人物 / 涉及伏笔」级别，**不生成完整大纲文件**。

### 3.1 调用 Planner 的 brainstorm 模式

```bash
ITERATION=1
PROPOSAL=""
ADJUSTMENT_NOTES=""

# 加载本批次范围内是否已有大纲（提示 force 行为）
EXISTING_OUTLINES=""
for CHAPTER in $(seq $START $END); do
  [[ -f "chapters/outlines/outline-${CHAPTER}.md" ]] && EXISTING_OUTLINES="$EXISTING_OUTLINES $CHAPTER"
done
```

```
BRAINSTORM_FILES_TO_READ="PROJECT.md ROADMAP.md TIMELINE.md CHARACTERS.md STATE.md $ANS_WRITING_GUIDE $ANS_OUTLINE_TEMPLATE"
# 如果上一章大纲已存在（即 START - 1），加进来做承接参考
PREV_OUTLINE="chapters/outlines/outline-$((START - 1)).md"
[[ -f "$PREV_OUTLINE" ]] && BRAINSTORM_FILES_TO_READ="$BRAINSTORM_FILES_TO_READ $PREV_OUTLINE"

Task(
  subagent_type: "ans-planner",
  objective: "为第 ${START}-${END} 章 brainstorm 一份批次蓝图（第 ${ITERATION} 轮）",
  files_to_read: [ $BRAINSTORM_FILES_TO_READ ],
  input: batch_brainstorm_input,
  mode: "brainstorm"
)
```

### 3.2 batch_brainstorm_input XML 形态

```xml
<batch_brainstorm_input>
  <iteration>${ITERATION}</iteration>

  <range>
    <start>${START}</start>
    <end>${END}</end>
    <total>$((END - START + 1))</total>
  </range>

  <user_hints>
    <batch_goal>${GOAL}</batch_goal>
    <existing_outlines>${EXISTING_OUTLINES}</existing_outlines>
    <force>${FORCE}</force>
  </user_hints>

  <previous_proposal>
    <!-- 仅在 ITERATION > 1 时填充 -->
    [上一轮 BATCH BRAINSTORM COMPLETE 全文]
  </previous_proposal>

  <adjustment_notes>
    <!-- 仅在 ITERATION > 1 时填充，用户的调整意见 -->
    [用户调整意见原文]
  </adjustment_notes>
</batch_brainstorm_input>
```

### 3.3 Brainstorm 期望输出

planner 在对话中以 `## BATCH BRAINSTORM COMPLETE` 头部返回，结构详见 `agents/ans-planner.md` 的「批次 brainstorm 模式」节。要点：

- 一张表，每章一行：`章节 | 章节标题 | must_land | 钩子类型 | 出场人物 | 本章伏笔回收/新埋`
- 表行数严格等于 `${END} - ${START} + 1`
- 整批读起来要有节奏（不能 10 章都是「冲突升级」）
- **不写任何大纲文件** —— 只返回对话内容

</brainstorm_phase>

<review_iterate_phase>

## 4. 审核与迭代

### 4.1 显示批次蓝图给用户

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 批次蓝图（第 ${ITERATION} 轮，共 $((END - START + 1)) 章）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[planner 返回的 BATCH BRAINSTORM COMPLETE 全文]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 询问审核结论

```
AskUserQuestion(
  header: "审核批次蓝图",
  question: "对以上批次蓝图满意吗？",
  options: [
    "确认通过 —— 让 planner 逐章展开成完整大纲文件",
    "需要调整 —— 我说一下哪里要改",
    "完全推倒重来 —— 我重新给目标",
    "取消"
  ]
)
```

### 4.3 分发处理

- **确认通过**：把当前 PROPOSAL 标记为 `APPROVED_PROPOSAL`，跳出循环进入 §5 commit。
- **需要调整**：
  ```
  AskUserQuestion(
    header: "调整方向",
    question: "请描述哪里不满意、想改成什么。可以指明：第 X 章的 must_land、节奏、出场人物、伏笔安排等。"
  )
  ```
  把回答存进 `ADJUSTMENT_NOTES`，`ITERATION=$((ITERATION+1))`，返回 §3.1 重新 brainstorm。
- **完全推倒重来**：清空 `GOAL`，向用户重新询问；`ITERATION=1`，`PROPOSAL=""`，`ADJUSTMENT_NOTES=""`。
- **取消**：直接退出工作流，不写任何大纲文件。

### 4.4 迭代上限

设 `MAX_ITERATIONS=10`。超出则提示用户暂停。

</review_iterate_phase>

<commit_phase>

## 5. 落地：planner 逐章展开成完整大纲文件

`APPROVED_PROPOSAL` 中每章已经有 must_land + 钩子类型等高层信号。commit 阶段 planner 在 **commit 模式** 下被逐章调用，把已批准的高层信号扩写成 `chapters/outlines/outline-${CHAPTER}.md` 的完整模板内容。

### 5.1 逐章 commit

```bash
for CHAPTER in $(seq $START $END); do
  if [[ -f "chapters/outlines/outline-${CHAPTER}.md" ]] && [[ "$FORCE" == false ]]; then
    echo "章节 ${CHAPTER} 大纲已存在，跳过。使用 --force 覆盖。"
    continue
  fi

  PREV=$((CHAPTER-1))
  PREV_FILE="chapters/outlines/outline-${PREV}.md"

  FILES_TO_READ="PROJECT.md ROADMAP.md TIMELINE.md CHARACTERS.md STATE.md $ANS_WRITING_GUIDE $ANS_OUTLINE_TEMPLATE"
  [[ -f "$PREV_FILE" ]] && FILES_TO_READ="$FILES_TO_READ $PREV_FILE"

  Task(
    subagent_type: "ans-planner",
    objective: "落地第 ${CHAPTER} 章完整大纲（基于已批准批次蓝图中本章的 must_land 与钩子）",
    files_to_read: [ $FILES_TO_READ ],
    input: {
      mode: "commit",
      chapter: CHAPTER,
      approved_proposal: APPROVED_PROPOSAL,
      batch_goal: GOAL
    },
    mode: "commit",
    output: "chapters/outlines/outline-${CHAPTER}.md"
  )

  if [[ ! -f "chapters/outlines/outline-${CHAPTER}.md" ]]; then
    echo "严重错误：认知引擎未按预期输出文件 chapters/outlines/outline-${CHAPTER}.md！"
    exit 1
  fi

  if [[ "$PLAN_CHECK_ENABLED" == "true" ]]; then
    Task(
      subagent_type: "ans-plan-checker",
      objective: "检查第 ${CHAPTER} 章大纲与项目设定及批次蓝图的一致性",
      files_to_read: [
        "PROJECT.md",
        "CHARACTERS.md",
        "TIMELINE.md",
        "ROADMAP.md",
        "STATE.md",
        "chapters/outlines/outline-${CHAPTER}.md"
      ],
      input: { approved_proposal: APPROVED_PROPOSAL }
    )
  fi
done
```

planner 在 commit 模式下必须 **严格使用** APPROVED_PROPOSAL 中本章对应的 must_land、钩子类型、出场人物 —— 这些是已批准合同，不允许在 commit 阶段重新发明。可以扩展该章的场景拆分、对话提示、字数预算等模板字段。

### 5.2 刷新项目状态队列

```bash
node bin/ans-tools.cjs state refresh --latest-completed "已完成第${START}-${END}章大纲" --next-goal "第${START}章写作"
```

</commit_phase>

<output>

## 6. 输出日志

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 批量规划已落地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【范围】第 ${START}-${END} 章（共 $((END - START + 1)) 章）
【目标】${GOAL:-自动推算}

【批准迭代次数】${ITERATION} 轮
【输出文件】
- chapters/outlines/outline-${START}.md ... outline-${END}.md

【建议下一步】
1. 用 /ans:write-chapter ${START} 开始逐章写作
2. 或配合 /ans:autonomous --from=${START} --to=${END}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>
