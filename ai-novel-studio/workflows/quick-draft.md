<purpose>
快速草稿模式：跳过规划和审核，直接产出章节内容。适合快速试写、灵感记录、或已有大纲的情况。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-writer — 产出章节正文
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
CHAPTER_NUMBER=""
WORD_COUNT=3000
CONTEXT=""

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*)
      CHAPTER_NUMBER=$arg
      ;;
    --words=*)
      WORD_COUNT="${arg#*=}"
      ;;
    --context=*)
      CONTEXT="${arg#*=}"
      ;;
  esac
done
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `[章节号]` | 要创作的章节号 | 必填 |
| `--words=N` | 目标字数 | 3000 |
| `--context="..."` | 额外上下文/灵感 | 无 |

</process>

<initialization>

## 2. 快速初始化

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ⚡ 快速草稿 - 第 ${CHAPTER_NUMBER} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【模式】快速草稿（无规划、无润色、无审核）
【目标字数】${WORD_COUNT} 字

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 检查必要文件

```bash
# 只检查 PROJECT.md
if [[ ! -f "PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  echo "空目录请先运行 /ans:new-project；已有资料请先运行 /ans:map-base"
  exit 1
fi

# 加载最小上下文
PROJECT=$(cat PROJECT.md)
ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_CHAPTER_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHAPTER.md"
FILES_TO_READ="PROJECT.md $ANS_WRITING_GUIDE $ANS_CHAPTER_TEMPLATE"
[[ -f "CHARACTERS.md" ]] && FILES_TO_READ="$FILES_TO_READ CHARACTERS.md"
[[ -f "TIMELINE.md" ]] && FILES_TO_READ="$FILES_TO_READ TIMELINE.md"
[[ -f "STATE.md" ]] && FILES_TO_READ="$FILES_TO_READ STATE.md"
```

</initialization>

<writing>

## 3. 快速写作

### 3.1 构建输入

```xml
<writer_input>
  <chapter_number>${CHAPTER_NUMBER}</chapter_number>
  <word_target>${WORD_COUNT}</word_target>
  <mode>quick_draft</mode>
  <project>
    @PROJECT.md
  </project>
  <additional_context>
    ${CONTEXT}
  </additional_context>
</writer_input>
```

### 3.2 调用 Writer

```
Task(
  subagent_type: "ans-writer",
  objective: "快速产出第 ${CHAPTER_NUMBER} 章草稿",
  files_to_read: [ $FILES_TO_READ ],
  input: writer_input,
  output: chapters/draft/chapter-${CHAPTER_NUMBER}-quick.md
)
```

### 3.3 Writer 行为调整

在快速草稿模式下，writer：
- 不强制要求大纲
- 自行决定章节内容
- 仍然遵守 PROJECT.md 的禁忌
- 仍然保持基本的人设一致性
- 以 `word_target` 为目标字数
- 默认硬上限为 `word_target + 1000`
- 超出硬上限时，优先断章或顺延，不继续无限扩写

</writing>

<output>

## 4. 输出

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ⚡ 草稿完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【文件】chapters/draft/chapter-${CHAPTER_NUMBER}-quick.md
【字数】[XXXX] 字

【提示】这是快速草稿，建议后续：
1. 使用 /ans:polish 润色
2. 使用 /ans:review 审核
3. 或使用 /ans:write-chapter 重新创作

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<use_cases>

## 适用场景

| 场景 | 说明 |
|------|------|
| 灵感记录 | 有想法想快速记下来 |
| 试写 | 不确定方向，先写出来看看 |
| 有大纲 | 已经有详细大纲，不需要规划 |
| 快速迭代 | 先出草稿，后续再完善 |

## 不适用场景

| 场景 | 建议 |
|------|------|
| 正式创作 | 使用 /ans:write-chapter |
| 需要连贯性 | 使用完整流程 |
| 质量要求高 | 使用完整流程 + 审核 |

</use_cases>

<examples>

## 命令示例

```bash
# 快速创作第5章，3000字
/ans:quick-draft 5

# 快速创作，指定字数
/ans:quick-draft 5 --words=5000

# 带灵感提示
/ans:quick-draft 5 --context="本章主角遇到老朋友，发现对方已经变了"

# 快速记录灵感
/ans:quick-draft 100 --words=1000 --context="结局构想：主角选择放弃一切，回到原点"
```

</examples>
