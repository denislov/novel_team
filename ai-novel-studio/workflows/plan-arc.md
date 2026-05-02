<purpose>
新卷/新阶段规划 (brainstorm-first)：用户给出最少的卷种子（卷名或一段想法），由 ans-architect 先做 brainstorm 提议（不写文件），用户审核迭代到满意后再 commit 落地，把已批准的卷规划写入 ROADMAP.md / TIMELINE.md / CHARACTERS.md。

适合卷与卷之间的结构升级。**不会** 主动覆写 PROJECT.md —— 除非用户在 brainstorm 阶段明确表达需要扩展世界观。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-architect — 卷规划 brainstorm + commit
- ans-researcher — 为新卷背景做补充考据（如需要，仅在用户批准后触发）
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
ARC_SEED=""        # 卷种子：可以是卷名，也可以是一段想法
CHAPTERS=""        # 可选：用户给出的目标章节数
RESEARCH_TOPIC=""  # 可选：批准后才触发的研究主题

for arg in "$ARGUMENTS"; do
  case $arg in
    --chapters=*)
      CHAPTERS="${arg#*=}"
      ;;
    --research=*)
      RESEARCH_TOPIC="${arg#*=}"
      ;;
    *)
      if [[ -z "$ARC_SEED" ]]; then
        ARC_SEED="$arg"
      else
        ARC_SEED="$ARC_SEED $arg"
      fi
      ;;
  esac
done

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_RESEARCH_TEMPLATE="$ANS_SUPPORT_ROOT/templates/RESEARCH.md"
ANS_PROJECT_TEMPLATE="$ANS_SUPPORT_ROOT/templates/PROJECT.md"
ANS_ROADMAP_TEMPLATE="$ANS_SUPPORT_ROOT/templates/ROADMAP.md"
ANS_CHARACTERS_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTERS.md"
ANS_CHARACTER_CARD_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTER-CARD.md"
ANS_TIMELINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/TIMELINE.md"
ANS_STATE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/STATE.md"
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[卷种子]` | 卷名 或 卷想法描述 —— 可以是「第二卷：北上入局」这种短题，也可以是「想让主角去香港，介入金融博弈」这种描述 |
| `--chapters=N` | （可选）目标章节数；留空让 architect 推算 |
| `--research="主题"` | （可选）需要补做的研究主题；只在用户批准方案后才触发 |

</process>

<initialization>

## 2. 初始化检查

```bash
if [[ ! -f "PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  echo "空目录请先运行 /ans:new-project；已有资料请先运行 /ans:map-base"
  exit 1
fi

if [[ ! -f "ROADMAP.md" ]]; then
  echo "错误：未找到 ROADMAP.md"
  exit 1
fi
```

### 2.1 补齐卷种子（若未通过命令行给出）

```
if [[ -z "$ARC_SEED" ]]; then
  AskUserQuestion(
    header: "新卷种子",
    question: "想规划下一卷？用一段话描述。包含但不限于：卷名想法、本卷的主要冲突或事件、希望主角走到哪一步、希望出现哪些新角色或新势力。模糊也没关系。",
  )
  # 把回答存入 ARC_SEED
fi
```

`CHAPTERS` 与 `RESEARCH_TOPIC` 不在此询问 —— 章节数可由 architect 推算，研究在批准后才触发。

</initialization>

<brainstorm_phase>

## 3. 头脑风暴：发散一份完整卷规划

调用 `ans-architect` 的 **brainstorm 模式（scope: arc）**：基于用户的 ARC_SEED + 已有 PROJECT.md / ROADMAP.md / CHARACTERS.md / TIMELINE.md / STATE.md 上下文，由 architect 自由发散提议一份完整的卷规划方案。

### 3.1 调用 Architect 的 brainstorm 模式

```bash
ITERATION=1
PROPOSAL=""
ADJUSTMENT_NOTES=""
```

```
BRAINSTORM_FILES_TO_READ="PROJECT.md ROADMAP.md CHARACTERS.md TIMELINE.md STATE.md $ANS_WRITING_GUIDE $ANS_ROADMAP_TEMPLATE"

Task(
  subagent_type: "ans-architect",
  objective: "为新卷头脑风暴一份完整规划方案（第 ${ITERATION} 轮）",
  files_to_read: [ $BRAINSTORM_FILES_TO_READ ],
  input: arc_brainstorm_input,
  mode: "brainstorm",
  scope: "arc"
)
```

### 3.2 arc_brainstorm_input XML 形态

```xml
<arc_brainstorm_input>
  <iteration>${ITERATION}</iteration>
  <scope>arc</scope>

  <arc_seed>
    [用户在 2.1 提供的 ARC_SEED 原文，或命令行直接传入的卷名/主题]
  </arc_seed>

  <user_hints>
    <chapter_count_hint>${CHAPTERS}</chapter_count_hint>
  </user_hints>

  <previous_proposal>
    <!-- 仅在 ITERATION > 1 时填充，把上一轮 ARC BRAINSTORM COMPLETE 的全文塞进来 -->
    [上一轮 architect 提议的全文]
  </previous_proposal>

  <adjustment_notes>
    <!-- 仅在 ITERATION > 1 时填充，是用户在 §4.2 输入的调整方向 -->
    [用户调整意见原文]
  </adjustment_notes>
</arc_brainstorm_input>
```

### 3.3 Brainstorm 期望输出

architect 在对话中以 `## ARC BRAINSTORM COMPLETE` 头部返回，结构详见 `agents/ans-architect.md` 的「卷 brainstorm 模式」节。要点：

- 包含卷名 / 卷定位（立足/扩张/失控/反杀/终局）/ 章节范围（基于现有 ROADMAP 推算下一卷起始章号）
- 包含核心冲突 / 卷末转折 / 卷末钩子 / 关键节点（5-8 个里程碑事件）
- 包含本卷人物弧光（主角 + 核心配角）
- 包含伏笔回收 / 新埋伏笔安排
- 必须输出 `### 思考过程` 解释为什么这么规划
- **不写任何文件** —— 只返回对话内容

</brainstorm_phase>

<review_iterate_phase>

## 4. 审核与迭代

### 4.1 显示提议给用户

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🗺️ 卷规划提议（第 ${ITERATION} 轮）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[architect 返回的 ARC BRAINSTORM COMPLETE 全文]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 询问审核结论

```
AskUserQuestion(
  header: "审核卷规划",
  question: "对以上规划满意吗？",
  options: [
    "确认通过 —— 让 architect 落地为 ROADMAP.md / TIMELINE.md 更新",
    "需要调整 —— 我说一下哪里要改",
    "完全推倒重来 —— 我重新写卷种子",
    "取消"
  ]
)
```

### 4.3 分发处理

- **确认通过**：把当前 PROPOSAL 标记为 `APPROVED_PROPOSAL`，跳出循环进入 §5 / §6。
- **需要调整**：
  ```
  AskUserQuestion(
    header: "调整方向",
    question: "请描述哪里不满意、想改成什么。可以涉及多个方面（章节范围、核心冲突、人物弧光、伏笔安排、卷末钩子等）。"
  )
  ```
  把回答存进 `ADJUSTMENT_NOTES`，`ITERATION=$((ITERATION+1))`，返回 §3.1 重新 brainstorm。
- **完全推倒重来**：返回 §2.1 重新收集 `ARC_SEED`；`ITERATION=1`，`PROPOSAL=""`，`ADJUSTMENT_NOTES=""`。
- **取消**：直接退出工作流，不写任何文件。

### 4.4 迭代上限

设 `MAX_ITERATIONS=10`。如果到第 10 轮仍未通过，工作流主动暂停并提示用户：「已迭代 10 轮，建议先取消并理顺卷种子，或换一个 architect 模型再试。」

</review_iterate_phase>

<research_phase>

## 5. 补充研究（可选，仅在批准后触发）

如果用户在命令行设置了 `--research="主题"`：

```bash
ARC_SLUG=$(echo "${APPROVED_ARC_NAME:-arc}" | tr ' /' '--' | tr -cd '[:alnum:]-_' | sed 's/--*/-/g' | sed 's/^-//; s/-$//')
mkdir -p research

if [[ -n "$RESEARCH_TOPIC" ]]; then
  Task(
    subagent_type: "ans-researcher",
    objective: "补做卷前研究：${RESEARCH_TOPIC}",
    files_to_read: [
      "PROJECT.md",
      "$ANS_RESEARCH_TEMPLATE"
    ],
    input: {
      topic: RESEARCH_TOPIC,
      mode: "standard",
      approved_proposal: APPROVED_PROPOSAL
    },
    output: research/arc-${ARC_SLUG}.md
  )
fi
```

</research_phase>

<architecture_phase>

## 6. 落地：把已批准的卷规划写入文件

调用 `ans-architect` 的 **commit 模式（scope: arc）** —— 把 §4 已批准的提议（`APPROVED_PROPOSAL`）落到：

- **ROADMAP.md**：追加/更新该卷在「整体结构」表的行；扩写「当前卷详细规划」；更新「未来卷预留」（提前到下下卷）
- **TIMELINE.md**：补充该卷的时间锚点
- **CHARACTERS.md**：追加该卷新登场或地位变化的人物条目（仅总表层；单卡留给后续 `/ans:character --add`）
- **PROJECT.md**：仅在用户在 brainstorm 中明确请求世界观扩展时才更新（默认 **不动**）

### 6.1 准备输入

```xml
<architect_input>
  <mode>commit</mode>
  <scope>arc</scope>
  <approved_proposal>
    <!--
      §4 用户确认通过的整份 ARC BRAINSTORM COMPLETE 内容，原样塞入。
      ARCHITECT commit 模式必须严格按这份提议落地：
        - 章节范围严格守恒（不能扩缩）
        - 卷主题、核心冲突、关键节点、人物弧光原文使用
        - 伏笔回收/埋设按提议布置
    -->
    [APPROVED_PROPOSAL 全文]
  </approved_proposal>

  <existing_files>
    <!-- architect 必读这些文件以便正确 merge -->
    @PROJECT.md
    @ROADMAP.md
    @CHARACTERS.md
    @TIMELINE.md
    @STATE.md
  </existing_files>

  <research>
    @research/arc-${ARC_SLUG}.md
  </research>
</architect_input>
```

### 6.2 调用 Architect

```
ARCHITECT_FILES_TO_READ="PROJECT.md ROADMAP.md CHARACTERS.md TIMELINE.md STATE.md $ANS_WRITING_GUIDE $ANS_PROJECT_TEMPLATE $ANS_ROADMAP_TEMPLATE $ANS_CHARACTERS_TEMPLATE $ANS_TIMELINE_TEMPLATE $ANS_STATE_TEMPLATE"
[[ -f "research/arc-${ARC_SLUG}.md" ]] && ARCHITECT_FILES_TO_READ="$ARCHITECT_FILES_TO_READ research/arc-${ARC_SLUG}.md"

Task(
  subagent_type: "ans-architect",
  objective: "落地新卷规划：${APPROVED_ARC_NAME}",
  files_to_read: [ $ARCHITECT_FILES_TO_READ ],
  input: architect_input,
  mode: "commit",
  scope: "arc",
  output: [
    ROADMAP.md,
    TIMELINE.md,
    CHARACTERS.md
  ]
)
```

注意 `output:` **不包含** PROJECT.md —— 默认不动。如果 brainstorm 提议明确要求世界观扩展，commit 阶段应在 `## ARCHITECT COMPLETE` 中明确说明并写入 PROJECT.md。

### 6.3 更新 STATE

```bash
node bin/ans-tools.cjs state refresh \
  --current-arc "${APPROVED_ARC_NAME}" \
  --next-goal "第${APPROVED_ARC_START_CHAPTER}章规划"
```

</architecture_phase>

<output>

## 7. 最终回执

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🗺️ 新卷规划已落地：${APPROVED_ARC_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【卷范围】第 ${APPROVED_ARC_START_CHAPTER}-${APPROVED_ARC_END_CHAPTER} 章
【核心冲突】${APPROVED_ARC_CORE_CONFLICT}
【卷末钩子】${APPROVED_ARC_END_HOOK}

【更新文件】
- ROADMAP.md
- TIMELINE.md
- CHARACTERS.md
- research/arc-${ARC_SLUG}.md（如有研究）

【建议下一步】
1. /ans:plan-batch ${APPROVED_ARC_START_CHAPTER}-$((APPROVED_ARC_START_CHAPTER + 4))  # 先规划本卷开局 5 章
2. /ans:write-chapter ${APPROVED_ARC_START_CHAPTER}                                   # 直接开始写

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 用一句话卷名启动 brainstorm
/ans:plan-arc 第二卷：北上入局

# 卷种子是一段描述
/ans:plan-arc 想让主角去香港介入金融博弈，但要先解决广州的旧账

# 给章数 hint
/ans:plan-arc 第二卷：暗流涌动 --chapters=80

# 在 brainstorm 批准后顺便补做研究
/ans:plan-arc 第三卷：资本围猎 --research="90年代初香港地产金融生态"

# 完全空启，让 workflow 问你
/ans:plan-arc
```

</examples>
