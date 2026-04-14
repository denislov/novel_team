<purpose>
质量审核：对已完成章节进行全面检查，确保人设一致、时间线准确、无雷点。可审核单章或多章。
</purpose>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-verifier — 一致性审核
- ans-consistency-checker — 跨章节一致性检查
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
CHAPTER_INPUT=""
CHAPTER_LIST=""
CHAPTER_NUMBER=""
OUTPUT_FORMAT="report"
DEEP=false

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*-[0-9]*)
      # 范围格式：1-10
      START=$(echo $arg | cut -d'-' -f1)
      END=$(echo $arg | cut -d'-' -f2)
      CHAPTER_INPUT="$arg"
      CHAPTER_LIST=$(seq $START $END)
      ;;
    [0-9]*)
      # 单章
      CHAPTER_INPUT="$arg"
      CHAPTER_LIST="$arg"
      CHAPTER_NUMBER="$arg"
      ;;
    --json)
      OUTPUT_FORMAT="json"
      ;;
    --quick)
      OUTPUT_FORMAT="quick"
      ;;
    --full)
      OUTPUT_FORMAT="full"
      ;;
    --deep)
      OUTPUT_FORMAT="full"
      DEEP=true
      ;;
  esac
done

# 默认：审核最新正式章节
if [[ -z "$CHAPTER_INPUT" ]]; then
  CHAPTER_INPUT=$(node bin/ans-tools.cjs state range-target --kind review --raw --pick range_text)
fi

if [[ "$CHAPTER_INPUT" == *"-"* ]]; then
  START=$(echo "$CHAPTER_INPUT" | cut -d'-' -f1)
  END=$(echo "$CHAPTER_INPUT" | cut -d'-' -f2)
  CHAPTER_LIST=$(seq $START $END)
else
  CHAPTER_LIST="$CHAPTER_INPUT"
  CHAPTER_NUMBER="$CHAPTER_INPUT"
fi
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[章节号]` | 审核单章，如 `5` |
| `[范围]` | 审核范围，如 `1-10` |
| `--quick` | 快速模式，只显示结果 |
| `--full` | 完整模式，详细报告（默认） |
| `--deep` | 附加跨章节一致性检查 |
| `--json` | JSON 格式输出 |

</process>

<initialization>

## 2. 加载上下文

```bash
CONTEXT=$(node bin/ans-tools.cjs init review "${CHAPTER_INPUT}" --raw)

if [[ -z "$CHAPTER_NUMBER" ]]; then
  CHAPTER_NUMBER=$(echo "$CONTEXT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.target_chapter||'')" 2>/dev/null)
fi
```

若 `project_exists` 为 false，提示并退出。
利用 `CONTEXT` JSON 中的路径字段（`chapter_path`、`review_path`、`outline_path` 等）读取相关文件内容。

</initialization>

<single_review>

## 3. 单章审核

### 3.1 调用 Verifier

```
Task(
  subagent_type: "ans-verifier",
  input: {
    files_to_read: [
      CONTEXT.chapter_path,
      CONTEXT.outline_path,
      "PROJECT.md",
      "CHARACTERS.md",
      "TIMELINE.md"
    ],
    chapter_number: CHAPTER_NUMBER
  },
  output: reviews/review-${CHAPTER_NUMBER}.md
)
```

### 3.2 审核维度

| 维度 | 检查项 |
|------|--------|
| 人设一致性 | 行为、语言、能力、外貌 |
| 时间线 | 日期衔接、历史事件、年龄 |
| 逻辑闭环 | 因果、金手指限制、世界观 |
| 雷点检测 | 18个常见雷点 |
| 禁忌检查 | PROJECT.md 中的禁忌 |

### 3.3 结果展示

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓ 第 ${CHAPTER_NUMBER} 章审核报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【审核结果】总体评价：通过 ✓

| 检查类别 | 状态 | 问题数 |
|----------|------|--------|
| 人设一致性 | ✓ | 0 |
| 时间线 | ✓ | 0 |
| 逻辑闭环 | ✓ | 0 |
| 雷点检测 | ✓ | 0 |
| 禁忌检查 | ✓ | 0 |

【亮点】
- [亮点1]
- [亮点2]

【建议修改】
- 🟡 [建议1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</single_review>

<batch_review>

## 4. 批量审核

当审核范围包含多章时：

### 4.1 逐章审核

```bash
RESULTS=()
for chapter in $CHAPTER_LIST; do
  # 调用 verifier
  result=$(SpawnAgent ans-verifier chapter=$chapter)
  RESULTS+=("$result")
done
```

### 4.1.1 深度模式附加检查

当 `DEEP == true` 时，额外调用：

```bash
SpawnAgent ans-consistency-checker range="$CHAPTER_INPUT"
```

用于检查跨章节设定漂移、长期伏笔和时间线偏差。

### 4.2 汇总报告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓ 批量审核报告 - 第 ${START}-${END} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【总体统计】
- 审核章节：${COUNT} 章
- 通过：${PASS} 章
- 需修改：${NEEDS_FIX} 章
- 不通过：${FAIL} 章

【分章结果】

| 章节 | 人设 | 时间线 | 逻辑 | 雷点 | 禁忌 | 总评 |
|------|------|--------|------|------|------|------|
| 1 | ✓ | ✓ | ✓ | ✓ | ✓ | 通过 |
| 2 | ✓ | ⚠️ | ✓ | ✓ | ✓ | 需修改 |
| 3 | ✓ | ✓ | ✓ | ✓ | ✓ | 通过 |
| ... | ... | ... | ... | ... | ... | ... |

【问题汇总】

🔴 严重问题（必须修改）
- 第2章：时间线与第1章不衔接
- ...

🟡 建议修改
- 第3章：对话可更口语化
- ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.3 生成详细报告

每章的详细报告保存在：
`reviews/review-${N}.md`

### 4.4 刷新共享状态

批量或单章审核完成后，运行：

```bash
node bin/ans-tools.cjs state refresh
```

保证 `STATE.md` 的下一步建议基于最新审核覆盖。

</batch_review>

<output_formats>

## 5. 输出格式

### 快速模式 (--quick)

```
第5章：✓ 通过
第6章：⚠️ 需修改（1个严重问题）
第7章：✓ 通过
```

### 完整模式 (--full)

显示详细报告（默认）

### JSON 模式 (--json)

```json
{
  "summary": {
    "total": 3,
    "passed": 2,
    "needs_fix": 1,
    "failed": 0
  },
  "chapters": [
    {
      "number": 5,
      "status": "passed",
      "checks": {
        "character": {"status": "pass", "issues": 0},
        "timeline": {"status": "pass", "issues": 0},
        "logic": {"status": "pass", "issues": 0},
        "pitfalls": {"status": "pass", "issues": 0},
        "taboos": {"status": "pass", "issues": 0}
      }
    },
    ...
  ]
}
```

</output_formats>

<special_checks>

## 6. 特殊检查

### 人设一致性检查

对每个出场人物：
- 对照 CHARACTERS.md 中的设定
- 检查行为是否符合"过往经历 + 当前利益 + 性格底色"
- 检查语言风格是否一致
- 检查能力范围是否超出

### 时间线检查

- 本章时间与上章衔接
- 历史事件年份正确
- 人物年龄正确
- 季节天气连贯

### 伏笔检查

- 新埋伏笔是否记录
- 待回收伏笔是否处理
- 伏笔埋设是否自然

</special_checks>

<examples>

## 命令示例

```bash
# 审核最新章节
/ans:review

# 审核指定章节
/ans:review 5

# 审核范围
/ans:review 1-10

# 快速审核
/ans:review 1-20 --quick

# JSON 输出（便于脚本处理）
/ans:review 1-10 --json
```

</examples>
