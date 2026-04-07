<purpose>
批量规划章节：按范围一次性生成多章大纲，确保章节之间目标连续、节奏合理、伏笔有承接。适合正式写作前先铺一段连续的章节蓝图。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-planner — 逐章规划大纲
</available_agent_types>

<process>

## 1. 解析参数

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
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[开始-结束]` | 规划章节范围，如 `11-20` |
| `--goal="..."` | 指定这批章节的阶段目标 |
| `--force` | 已有大纲时强制覆盖 |

</process>

<initialization>

## 2. 初始化检查

```bash
if [[ ! -f "PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  echo "空目录请先运行 /novel:new-project；已有资料请先运行 /novel:map-base"
  exit 1
fi

if [[ ! -f "ROADMAP.md" ]]; then
  echo "错误：未找到 ROADMAP.md"
  exit 1
fi

mkdir -p chapters/outlines
```

### 2.1 缺失范围时询问

如果未提供范围，使用 AskUserQuestion：

也可以先用共享状态脚本给出默认建议范围：

```bash
node scripts/novel_state.cjs range-target --root . --kind plan --field range_text
```

```
AskUserQuestion(
  header: "规划范围",
  question: "要批量规划哪几章？",
  followUp: "格式示例：11-20"
)
```

### 2.2 检查覆盖风险

如果范围内已有大纲文件且 `FORCE=false`：

```
AskUserQuestion(
  header: "已有大纲",
  question: "目标范围内已有大纲文件，如何处理？",
  options: ["覆盖重写", "跳过已有文件", "取消"]
)
```

</initialization>

<planning_flow>

## 3. 批量规划流程

### 3.1 加载上下文

```bash
PROJECT=$(cat PROJECT.md)
ROADMAP=$(cat ROADMAP.md)
CHARACTERS=$(cat CHARACTERS.md)
TIMELINE=$(cat TIMELINE.md)
STATE=$(cat STATE.md)
```

### 3.2 确定阶段目标

如果 `GOAL` 为空：
- 从 `ROADMAP.md` 提取当前卷/当前阶段目标
- 如果提取不清晰，询问用户补充本批章节的目标

### 3.3 逐章调用 Planner

对 `START..END` 逐章执行：

```bash
for CHAPTER in $(seq $START $END); do
  SpawnAgent(
    agent: novel-planner,
    input: {
      chapter_number: CHAPTER,
      batch_range: "${START}-${END}",
      batch_goal: GOAL,
      project: PROJECT,
      roadmap: ROADMAP,
      characters: CHARACTERS,
      timeline: TIMELINE,
      state: STATE,
      previous_outlines: [已有前文大纲和本批前序大纲]
    },
    output: chapters/outlines/outline-${CHAPTER}.md
  )
done
```

### 3.4 生成批量概要

生成：
`chapters/outlines/batch-${START}-${END}.md`

内容包括：
- 本批章节的总体目标
- 每章一句话摘要
- 节奏分布
- 关键伏笔埋设/回收点
- 建议优先写作章节

### 3.5 刷新共享状态

批量规划完成后运行：

```bash
node scripts/novel_state.cjs refresh \
  --root . \
  --next-goal "第 ${START} 章写作或核对"
```

让 `STATE.md` 的章节队列、下一目标和 frontmatter 与大纲目录保持一致。

</planning_flow>

<output>

## 4. 输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 批量规划完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【范围】第 ${START}-${END} 章
【目标】${GOAL}

【输出文件】
- chapters/outlines/outline-${START}.md ... outline-${END}.md
- chapters/outlines/batch-${START}-${END}.md

【建议下一步】
1. 用 /novel:write-chapter ${START} 开始逐章写作
2. 或配合 /novel:autonomous --from=${START} --to=${END}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 规划 11-20 章
/novel:plan-batch 11-20

# 指定阶段目标
/novel:plan-batch 21-30 --goal="主角站稳脚跟，并第一次正面碰撞主要反派"

# 强制重写现有大纲
/novel:plan-batch 1-10 --force
```

</examples>
