<purpose>
独立研究流程：围绕某个历史、专业、地域或时代细节主题进行考据，产出可追溯的研究报告，供项目设定、章节写作和审核复用。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ans-creator subagent types (use exact names):
- ans-researcher — 考据研究与资料整理
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
TOPIC=""
MODE="standard"
OUTPUT_NAME=""

for arg in "$ARGUMENTS"; do
  case $arg in
    --quick)
      MODE="quick"
      ;;
    --deep)
      MODE="deep"
      ;;
    --file=*)
      OUTPUT_NAME="${arg#*=}"
      ;;
    *)
      if [[ -z "$TOPIC" ]]; then
        TOPIC="$arg"
      else
        TOPIC="$TOPIC $arg"
      fi
      ;;
  esac
done
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[主题]` | 研究主题，如 `1980年香港警队`、`清朝会试流程` |
| `--quick` | 快速核实，适合单个细节 |
| `--deep` | 深度研究，适合阶段背景或专业领域 |
| `--file=name` | 自定义输出文件名 |

</process>

<initialization>

## 2. 初始化

### 2.1 处理缺失主题

如果未提供 `TOPIC`，使用 AskUserQuestion 询问：

```
AskUserQuestion(
  header: "研究主题",
  question: "你要研究什么内容？",
  followUp: "建议尽量具体，如“1984年前后香港股市散户交易方式”"
)
```

### 2.2 准备目录与上下文

```bash
mkdir -p research

if [[ -f "PROJECT.md" ]]; then
  PROJECT=$(cat PROJECT.md)
fi

if [[ -z "$OUTPUT_NAME" ]]; then
  OUTPUT_NAME=$(echo "$TOPIC" | tr ' /' '--' | tr -cd '[:alnum:]-_' | sed 's/--*/-/g' | sed 's/^-//; s/-$//')
fi

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_RESEARCH_TEMPLATE="$ANS_SUPPORT_ROOT/templates/RESEARCH.md"
RESEARCH_FILES_TO_READ="$ANS_RESEARCH_TEMPLATE"
if [[ -f "PROJECT.md" ]]; then
  RESEARCH_FILES_TO_READ="PROJECT.md $RESEARCH_FILES_TO_READ"
fi
```

</initialization>

<research_flow>

## 3. 研究执行

### 3.1 构建研究输入

```xml
<research_request>
  <topic>${TOPIC}</topic>
  <mode>${MODE}</mode>
  <project_context>
    ${PROJECT}
  </project_context>
  <output_file>research/${OUTPUT_NAME}.md</output_file>
</research_request>
```

### 3.2 调用 Researcher

```
SpawnAgent(
  agent: ans-researcher,
  files_to_read: [ $RESEARCH_FILES_TO_READ ],
  input: research_request,
  output: research/${OUTPUT_NAME}.md
)
```

### 3.3 研究要求

- 至少交叉验证关键事实
- 区分“可直接采用”与“需要艺术加工”
- 记录来源，便于后续追溯
- 如果有项目上下文，补充“对当前项目的影响”

</research_flow>

<output>

## 4. 输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔎 研究完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【主题】${TOPIC}
【模式】${MODE}
【文件】research/${OUTPUT_NAME}.md

【建议下一步】
1. 将关键结论回写到 PROJECT.md 或 TIMELINE.md
2. 章节写作前优先查看这份研究报告
3. 如仍有存疑点，继续追加细分研究

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 标准研究
/ans:research 1980年香港黑帮社团结构

# 快速核实
/ans:research 80年代香港出租车起步价 --quick

# 深度研究
/ans:research 明朝万历年间京官考成法 --deep

# 指定输出文件
/ans:research 港岛警队等级体系 --file=hk-police-ranks
```

</examples>
