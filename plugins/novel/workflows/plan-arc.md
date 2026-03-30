<purpose>
新卷/新阶段规划：在现有项目基础上扩展或重构后续故事阶段，更新 ROADMAP、时间线锚点和相关人物安排。适合卷与卷之间的结构升级。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-architect — 规划新卷或新阶段
- novel-researcher — 为新卷背景做补充考据（如需要）
</available_agent_types>

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
if [[ ! -f ".novel/PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  exit 1
fi

if [[ ! -f ".novel/ROADMAP.md" ]]; then
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
mkdir -p .novel/research
SpawnAgent(
  agent: novel-researcher,
  input: {
    topic: RESEARCH_TOPIC,
    mode: "standard",
    project: .novel/PROJECT.md
  },
  output: .novel/research/arc-$(echo "$ARC_NAME" | tr ' ' '-').md
)
```

</research_phase>

<architecture_phase>

## 4. 调用 Architect

### 4.1 加载当前项目

```bash
PROJECT=$(cat .novel/PROJECT.md)
ROADMAP=$(cat .novel/ROADMAP.md)
CHARACTERS=$(cat .novel/CHARACTERS.md)
TIMELINE=$(cat .novel/TIMELINE.md)
STATE=$(cat .novel/STATE.md)
```

### 4.2 构建输入

```xml
<plan_arc_request>
  <arc_name>${ARC_NAME}</arc_name>
  <target_chapters>${CHAPTERS}</target_chapters>
  <arc_goal>${ARC_GOAL}</arc_goal>
  <project>@.novel/PROJECT.md</project>
  <roadmap>@.novel/ROADMAP.md</roadmap>
  <characters>@.novel/CHARACTERS.md</characters>
  <timeline>@.novel/TIMELINE.md</timeline>
  <state>@.novel/STATE.md</state>
  <research>@.novel/research/arc-*.md</research>
</plan_arc_request>
```

### 4.3 调用 Architect

```
SpawnAgent(
  agent: novel-architect,
  input: plan_arc_request,
  output: [
    .novel/PROJECT.md,
    .novel/ROADMAP.md,
    .novel/CHARACTERS.md,
    .novel/TIMELINE.md
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
- .novel/ROADMAP.md
- .novel/TIMELINE.md
- .novel/CHARACTERS.md
- .novel/PROJECT.md（如有世界观扩展）

【建议下一步】
1. 使用 /novel:plan-batch 规划本卷前 5-10 章
2. 或直接 /novel:write-chapter [起始章节]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 规划新卷
/novel:plan-arc 第二卷：北上入局

# 指定章节数和目标
/novel:plan-arc 第二卷：暗流涌动 --chapters=80 --goal="主角正式进入上层博弈，并被迫选边站队"

# 先补做研究再规划
/novel:plan-arc 第三卷：资本围猎 --research="90年代初香港地产金融生态"
```

</examples>
