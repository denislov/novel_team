<purpose>
批量润色：对已完成章节进行去AI味、增强代入感、优化文字质量。可润色单章或多章。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ans-creator subagent types (use exact names):
- ans-editor — 编辑润色
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
MODE="standard"
COMPARE=false

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*-[0-9]*)
      START=$(echo $arg | cut -d'-' -f1)
      END=$(echo $arg | cut -d'-' -f2)
      CHAPTER_INPUT="$arg"
      CHAPTER_LIST=$(seq $START $END)
      ;;
    [0-9]*)
      CHAPTER_INPUT="$arg"
      CHAPTER_LIST="$arg"
      CHAPTER_NUMBER="$arg"
      ;;
    --quick)
      MODE="quick"
      ;;
    --deep)
      MODE="deep"
      ;;
    --compare)
      COMPARE=true
      ;;
    --in-place)
      MODE="in-place"
      ;;
  esac
done

# 默认：润色最新正式章节
if [[ -z "$CHAPTER_INPUT" ]]; then
  CHAPTER_INPUT=$(node bin/ans-tools.cjs state range-target --kind polish --raw --pick range_text)
fi

if [[ "$CHAPTER_INPUT" == *"-"* ]]; then
  START=$(echo "$CHAPTER_INPUT" | cut -d'-' -f1)
  END=$(echo "$CHAPTER_INPUT" | cut -d'-' -f2)
  CHAPTER_LIST=$(seq $START $END)
else
  CHAPTER_LIST="$CHAPTER_INPUT"
  CHAPTER_NUMBER="$CHAPTER_INPUT"
fi

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_REVIEW_TEMPLATE="$ANS_SUPPORT_ROOT/templates/REVIEW.md"
ANS_CHAPTER_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHAPTER.md"
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `[章节号]` | 润色单章 |
| `[范围]` | 润色范围，如 `1-10` |
| `--quick` | 快速模式，只处理明显问题 |
| `--deep` | 深度模式，全面优化 |
| `--compare` | 显示修改对比 |
| `--in-place` | 直接覆盖原文件 |

</process>

<modes>

## 2. 润色模式

### 标准模式（默认）

- 检测并修复 AI 味问题
- 增强代入感
- 优化句式
- 删除冗余
- 生成修改报告

### 快速模式 (--quick)

- 只处理明显问题
- 不生成详细报告
- 速度更快

### 深度模式 (--deep)

- 全面优化
- 增强五感描写
- 优化人物语言风格
- 调整节奏
- 生成详细报告

### 原地模式 (--in-place)

- 直接覆盖原文件
- 不生成报告
- 慎用

</modes>

<single_polish>

## 3. 单章润色

### 3.1 加载上下文

```bash
PROJECT=$(cat PROJECT.md)
CHARACTERS=$(cat CHARACTERS.md)
CHAPTER=$(cat chapters/chapter-${CHAPTER_NUMBER}.md)
```

### 3.2 调用 Editor

```
SpawnAgent(
  agent: ans-editor,
  files_to_read: [
    "PROJECT.md",
    "CHARACTERS.md",
    "chapters/chapter-${CHAPTER_NUMBER}.md",
    "$ANS_WRITING_GUIDE",
    "$ANS_REVIEW_TEMPLATE",
    "$ANS_CHAPTER_TEMPLATE"
  ],
  input: {
    chapter_number: CHAPTER_NUMBER,
    project: PROJECT,
    characters: CHARACTERS,
    chapter: CHAPTER,
    mode: MODE
  },
  output: [
    reviews/edit-report-${CHAPTER_NUMBER}.md,
    chapters/draft/chapter-${CHAPTER_NUMBER}-polished.md
  ]
)
```

### 3.3 展示润色结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔧 第 ${CHAPTER_NUMBER} 章润色完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【修改统计】
- 原字数：[XXXX] 字
- 修改后：[XXXX] 字
- 修改率：[XX]%

【问题修正】
┌─────────────────┬────────┐
│ 类型            │ 数量   │
├─────────────────┼────────┤
│ AI味问题        │ [N]    │
│ 代入感增强      │ [N]    │
│ 句式优化        │ [N]    │
│ 冗余删减        │ [N]    │
└─────────────────┴────────┘

【质量评分】
- AI味：⭐⭐⭐⭐
- 代入感：⭐⭐⭐⭐
- 节奏：⭐⭐⭐⭐
- 整体：⭐⭐⭐⭐

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3.4 处理结果

```
AskUserQuestion(
  header: "润色结果",
  question: "如何处理润色结果？",
  options: [
    "接受修改",
    "查看对比后决定",
    "保留原稿",
    "查看详细报告"
  ]
)
```

- **接受修改**：用润色版替换原文件
- **查看对比**：显示修改对比
- **保留原稿**：不修改原文件
- **详细报告**：查看完整修改报告

如果接受修改并覆盖正式章节，运行：

```bash
node bin/ans-tools.cjs chapter promote ${CHAPTER_NUMBER} --source polished
```

</single_polish>

<batch_polish>

## 4. 批量润色

当润色范围包含多章时：

### 4.1 逐章润色

```bash
RESULTS=()
for chapter in $CHAPTER_LIST; do
  # 调用 editor，并沿用单章模式的 files_to_read
  result=$(SpawnAgent ans-editor chapter=$chapter mode=$MODE)
  RESULTS+=("$result")
done
```

### 4.2 汇总报告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔧 批量润色报告 - 第 ${START}-${END} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【总体统计】
- 润色章节：${COUNT} 章
- 总修改：${TOTAL_CHANGES} 处
- 平均修改率：${AVG_RATE}%

【分章结果】

| 章节 | 原字数 | 修改后 | 修改率 | 主要问题 |
|------|--------|--------|--------|----------|
| 1 | 3245 | 3312 | 8% | AI味、代入感 |
| 2 | 3187 | 3205 | 5% | 句式 |
| 3 | 3098 | 3156 | 12% | AI味、冗余 |
| ... | ... | ... | ... | ... |

【问题趋势】

AI味问题：
- 平均每章：[N] 处
- 主要类型：重复句式、华丽词汇、说教

代入感问题：
- 平均每章：[N] 处
- 主要类型：五感缺失、可视化不足

【建议】
- 第3章AI味问题较多，建议重点关注
- 整体代入感可进一步强化

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.3 批量处理

```
AskUserQuestion(
  header: "批量润色结果",
  question: "如何处理润色结果？",
  options: [
    "全部接受",
    "逐章确认",
    "全部保留原稿",
    "查看详细报告"
  ]
)
```

</batch_polish>

<compare_mode>

## 5. 对比模式

当使用 `--compare` 时：

### 5.1 显示修改对比

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📝 修改对比 - 第 ${CHAPTER_NUMBER} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【修改 1】AI味问题

原文（第3段）：
> 他感到一阵愤怒涌上心头，这让他感到非常不舒服。

修改后：
> 他攥紧拳头，指甲几乎掐进掌心。这种感觉——他不爽。

【修改 2】代入感增强

原文（第5段）：
> 房间很豪华，他坐在沙发上。

修改后：
> 房间铺着暗红地毯，水晶吊灯从两米高的天花板垂下来。他一屁股陷进真皮沙发里，感觉整个人都在下沉。

【修改 3】句式优化

原文（第8段）：
> 他看了看书，然后站了起来，但是又坐了下去。

修改后：
> 他拿起书，又放下。站起身，又坐回去了。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</compare_mode>

<ai_flavor_focus>

## 6. AI味重点处理

Editor 会重点检测和处理：

### 重复句式
- "他感到..." 重复
- "突然..." 重复
- 相同句式结构

### 华丽空洞
- 过度修饰
- 抽象描写
- 无实质内容

### 机械结构
- "首先...其次...最后..."
- 过于完美的逻辑

### AI式说教
- "这个故事告诉我们..."
- "他深刻地意识到..."
- 人生感悟式总结

### 过度"了"字
- 一段超过5个"了"
- 过多转折词

</ai_flavor_focus>

<immersion_focus>

## 7. 代入感重点增强

### 五感描写
- 视觉：颜色、形状、光影
- 听觉：声音、对话、背景音
- 嗅觉：气味、香臭
- 触觉：温度、质感、疼痛
- 味觉：味道、口感

### 具体化可视化
- 抽象 → 具体
- 模糊 → 清晰
- 概念 → 画面

### 人物语言个性化
- 对照 CHARACTERS.md
- 调整对话风格
- 符合人物身份

</immersion_focus>

<examples>

## 命令示例

```bash
# 润色最新章节
/ans:polish

# 润色指定章节
/ans:polish 5

# 润色范围
/ans:polish 1-10

# 快速润色
/ans:polish 1-20 --quick

# 深度润色
/ans:polish 5 --deep

# 显示对比
/ans:polish 5 --compare

# 原地修改（慎用）
/ans:polish 1-10 --in-place
```

</examples>
