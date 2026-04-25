<purpose>
新卷/新阶段规划：在现有项目基础上扩展或重构后续故事阶段，更新 ROADMAP、时间线锚点和相关人物安排。适合卷与卷之间的结构升级。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-architect — 规划新卷或新阶段
- ans-researcher — 为新卷背景做补充考据（如需要）
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
ARC_NAME=""
CHAPTERS=""
ARC_GOAL=""
RESEARCH_TOPIC=""

for arg in "$ARGUMENTS"; do
  case $arg in
    --chapters=*)
      CHAPTERS="${arg#*=}"
      ;;
    --goal=*)
      ARC_GOAL="${arg#*=}"
      ;;
    --research=*)
      RESEARCH_TOPIC="${arg#*=}"
      ;;
    *)
      if [[ -z "$ARC_NAME" ]]; then
        ARC_NAME="$arg"
      else
        ARC_NAME="$ARC_NAME $arg"
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
ANS_TIMELINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/TIMELINE.md"
ANS_STATE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/STATE.md"
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[卷名/阶段名]` | 新卷名称或阶段主题 |
| `--chapters=N` | 预计章节数 |
| `--goal="..."` | 本卷核心目标 |
| `--research="..."` | 先补做一份相关研究 |

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

### 2.1 补齐必要信息

如果缺少 `ARC_NAME` 或 `ARC_GOAL`，使用 AskUserQuestion：

```
AskUserQuestion(
  header: "新卷规划",
  questions: [
    {
      key: "arc_name",
      question: "新卷或新阶段叫什么？"
    },
    {
      key: "arc_goal",
      question: "这一卷的核心冲突或阶段目标是什么？"
    },
    {
      key: "chapters",
      question: "预计占多少章？"
    }
  ]
)
```

</initialization>

<research_phase>

## 3. 补充研究（可选）

如果设置了 `RESEARCH_TOPIC`：

```bash
ARC_SLUG=$(echo "${ARC_NAME:-arc}" | tr ' /' '--' | tr -cd '[:alnum:]-_' | sed 's/--*/-/g' | sed 's/^-//; s/-$//')
mkdir -p research
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
    project: PROJECT.md
  },
  output: research/arc-${ARC_SLUG}.md
)
```

</research_phase>

<architecture_phase>

## 4. 调用 Architect

### 4.1 加载当前项目

```bash
PROJECT=$(cat PROJECT.md)
ROADMAP=$(cat ROADMAP.md)
CHARACTERS=$(cat CHARACTERS.md)
TIMELINE=$(cat TIMELINE.md)
STATE=$(cat STATE.md)
```

### 4.2 构建输入

```xml
<plan_arc_request>
  <arc_name>${ARC_NAME}</arc_name>
  <target_chapters>${CHAPTERS}</target_chapters>
  <arc_goal>${ARC_GOAL}</arc_goal>
  <project>@PROJECT.md</project>
  <roadmap>@ROADMAP.md</roadmap>
  <characters>@CHARACTERS.md</characters>
  <timeline>@TIMELINE.md</timeline>
  <state>@STATE.md</state>
  <research>research/arc-*.md (glob)</research>
</plan_arc_request>
```

### 4.3 调用 Architect

**注意：Architect 将直接覆写 PROJECT.md / ROADMAP.md / CHARACTERS.md / TIMELINE.md。**
工作流应在调用前通过 `ans-tools.cjs` 备份当前版本，或提醒用户在调用前手动备份。

```
ARCHITECT_FILES_TO_READ="PROJECT.md ROADMAP.md CHARACTERS.md TIMELINE.md STATE.md $ANS_WRITING_GUIDE $ANS_PROJECT_TEMPLATE $ANS_ROADMAP_TEMPLATE $ANS_CHARACTERS_TEMPLATE $ANS_TIMELINE_TEMPLATE $ANS_STATE_TEMPLATE"
[[ -f "research/arc-${ARC_SLUG}.md" ]] && ARCHITECT_FILES_TO_READ="$ARCHITECT_FILES_TO_READ research/arc-${ARC_SLUG}.md"

Task(
  subagent_type: "ans-architect",
  objective: "规划新卷：${ARC_NAME}",
  files_to_read: [ $ARCHITECT_FILES_TO_READ ],
  input: plan_arc_request,
  output: [
    PROJECT.md,
    ROADMAP.md,
    CHARACTERS.md,
    TIMELINE.md
  ]
)
```

### 4.4 更新 STATE

必要时更新 `STATE.md` 中的：
- 当前或下一卷目标
- 接下来 3 章
- 风险与阻塞

</architecture_phase>

<output>

## 5. 输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🗺️ 新卷规划完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【卷名】${ARC_NAME}
【预计章节】${CHAPTERS}
【核心目标】${ARC_GOAL}

【更新文件】
- ROADMAP.md
- TIMELINE.md
- CHARACTERS.md
- PROJECT.md（如有世界观扩展）

【建议下一步】
1. 使用 /ans:plan-batch 规划本卷前 5-10 章
2. 或直接 /ans:write-chapter [起始章节]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 规划新卷
/ans:plan-arc 第二卷：北上入局

# 指定章节数和目标
/ans:plan-arc 第二卷：暗流涌动 --chapters=80 --goal="主角正式进入上层博弈，并被迫选边站队"

# 先补做研究再规划
/ans:plan-arc 第三卷：资本围猎 --research="90年代初香港地产金融生态"
```

</examples>
