<purpose>
人物构建：创建、更新、查看人物档案。确保人物设定完整、立体、一致。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-architect — 人物设计和档案创建
- ans-verifier — 人物一致性检查
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
ACTION=""
CHARACTER_NAME=""

for arg in "$ARGUMENTS"; do
  case $arg in
    --add|--new)
      ACTION="add"
      ;;
    --update)
      ACTION="update"
      ;;
    --view|--show)
      ACTION="view"
      ;;
    --list)
      ACTION="list"
      ;;
    --delete)
      ACTION="delete"
      ;;
    --check)
      ACTION="check"
      ;;
    *)
      if [[ -z "$ACTION" ]]; then
        ACTION="view"
      fi
      CHARACTER_NAME="$arg"
      ;;
  esac
done

# 默认动作
if [[ -z "$ACTION" ]]; then
  ACTION="list"
fi

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_CHARACTERS_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTERS.md"
ANS_CHARACTER_CARD_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTER-CARD.md"
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--add` / `--new` | 添加新人物 |
| `--update` | 更新人物 |
| `--view` / `--show` | 查看人物 |
| `--list` | 列出所有人物 |
| `--delete` | 删除人物 |
| `--check` | 检查人物一致性 |
| `[人物名]` | 指定人物名称 |

</process>

<list_characters>

## 2. 列出人物 (--list)

```bash
# 读取 CHARACTERS.md
cat CHARACTERS.md
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👥 人物列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【主角】
1. [姓名] - [身份] - [性格核心]

【配角】
2. [姓名] - [身份] - [性格核心]
3. [姓名] - [身份] - [性格核心]
...

【反派】
4. [姓名] - [身份] - [性格核心]

【总计】[N] 个人物

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</list_characters>

<add_character>

## 3. 添加人物 (--add) — brainstorm-first

新版只问最少的输入（姓名 + 角色定位 + 可选种子描述），由 ans-architect 在 brainstorm 模式下提议完整人物卡，用户审核迭代到满意后再 commit 落地。这避免了让用户在还没看到人物全貌时就被迫回答 8 个微决定（外貌细节、内在标签、行为准则等）。

### 3.1 收集最小输入

```
AskUserQuestion(
  header: "新人物种子",
  questions: [
    {
      key: "name",
      question: "人物姓名？",
      required: true
    },
    {
      key: "role",
      question: "人物类型？",
      options: ["主角", "配角", "反派", "路人"],
      required: true
    },
    {
      key: "character_seed",
      question: "（可选）一段话描述这个人物。可以包含：身份/背景、性格倾向、与主角的关系、你想让 ta 在故事里做什么。模糊也没关系；越具体则提议越贴预期。"
    }
  ]
)
```

`identity` / `personality_core` / `external_tags` / `internal_tags` / `relation_to_protagonist` / `first_appearance` 全部由 architect 在 brainstorm 阶段提议；不再让用户先回答这些。

### 3.2 头脑风暴 (mode: "brainstorm" + scope: "character")

```bash
ITERATION=1
PROPOSAL=""
ADJUSTMENT_NOTES=""
```

```
BRAINSTORM_FILES_TO_READ="PROJECT.md CHARACTERS.md TIMELINE.md STATE.md $ANS_WRITING_GUIDE $ANS_CHARACTERS_TEMPLATE $ANS_CHARACTER_CARD_TEMPLATE"
[[ -f "ROADMAP.md" ]] && BRAINSTORM_FILES_TO_READ="$BRAINSTORM_FILES_TO_READ ROADMAP.md"
# 如果该姓名的单卡已存在（如先前用 --add 创建过又被删除一半），加进来做参考
[[ -f "characters/${name}.md" ]] && BRAINSTORM_FILES_TO_READ="$BRAINSTORM_FILES_TO_READ characters/${name}.md"

Task(
  subagent_type: "ans-architect",
  objective: "为新人物 ${name} 头脑风暴一份完整人物卡（第 ${ITERATION} 轮）",
  files_to_read: [ $BRAINSTORM_FILES_TO_READ ],
  input: character_brainstorm_input,
  mode: "brainstorm",
  scope: "character"
)
```

### 3.3 character_brainstorm_input XML 形态

```xml
<character_brainstorm_input>
  <iteration>${ITERATION}</iteration>
  <scope>character</scope>

  <name>${name}</name>
  <role>${role}</role>

  <character_seed>
    [用户在 3.1 提供的可选 seed 描述，未做任何加工。空字符串表示用户想让 architect 完全发散]
  </character_seed>

  <previous_proposal>
    <!-- 仅在 ITERATION > 1 时填充 -->
    [上一轮 CHARACTER BRAINSTORM COMPLETE 全文]
  </previous_proposal>

  <adjustment_notes>
    <!-- 仅在 ITERATION > 1 时填充，是用户在 3.5 输入的调整方向 -->
    [用户调整意见原文]
  </adjustment_notes>
</character_brainstorm_input>
```

### 3.4 Brainstorm 期望输出

architect 在对话中以 `## CHARACTER BRAINSTORM COMPLETE` 头部返回，结构详见 `agents/ans-architect.md` 的「人物 brainstorm 模式」节。要点：

- 必须包含 CHARACTER-CARD.md schema 的所有主要字段：表层身份 / 内核真相 / 背景经历 / 行为规则 / 关系网络 / 剧情作用 / 角色弧线 / 红线
- 必须给出 `first_appearance`（章号）—— 基于现有 ROADMAP/STATE 推算合理位置
- 必须输出 `### 思考过程` 解释设计思路
- **不写任何文件**

### 3.5 审核与迭代

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👤 人物卡提议（${name}，第 ${ITERATION} 轮）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[architect 返回的 CHARACTER BRAINSTORM COMPLETE 全文]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
AskUserQuestion(
  header: "审核人物卡",
  question: "对以上人物设定满意吗？",
  options: [
    "确认通过 —— 让 architect 落地为 characters/${name}.md",
    "需要调整 —— 我说一下哪里要改",
    "完全推倒重来 —— 我重新写种子",
    "取消"
  ]
)
```

分发：

- **确认通过** → `APPROVED_PROPOSAL`，进入 §3.6 commit。
- **需要调整** → 让用户描述「哪里不满意、想改成什么」，存入 `ADJUSTMENT_NOTES`，`ITERATION=$((ITERATION+1))`，回到 §3.2。
- **完全推倒重来** → 回到 §3.1 重新询问 `character_seed`（保留 `name` 与 `role`），`ITERATION=1`。
- **取消** → 退出工作流。

设 `MAX_ITERATIONS=10` 上限。

### 3.6 落地 (mode: "commit" + scope: "character")

调用 architect 的 commit 模式，把 `APPROVED_PROPOSAL` 写入：

- `characters/${name}.md`：完整单卡（按 CHARACTER-CARD.md schema）
- `CHARACTERS.md`：在「核心人物」表追加新行；`role == "主角"` 时还需更新主角块；包含 `[详细卡片](characters/${name}.md)` 链接

```
ARCHITECT_FILES_TO_READ="PROJECT.md CHARACTERS.md $ANS_WRITING_GUIDE $ANS_CHARACTERS_TEMPLATE $ANS_CHARACTER_CARD_TEMPLATE"

Task(
  subagent_type: "ans-architect",
  objective: "落地新人物卡：${name}",
  files_to_read: [ $ARCHITECT_FILES_TO_READ ],
  input: {
    mode: "commit",
    scope: "character",
    name: name,
    role: role,
    approved_proposal: APPROVED_PROPOSAL
  },
  mode: "commit",
  scope: "character",
  output: [
    "characters/${name}.md",
    CHARACTERS.md
  ]
)
```

architect commit 模式必须严格按 `APPROVED_PROPOSAL` 落地：所有字段（性格核心、外貌、行为准则、关系网络等）原文使用，不允许在 commit 时再发明新字段。

### 3.7 展示结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👤 人物卡已落地
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【姓名】${name}
【类型】${role}
【批准迭代次数】${ITERATION} 轮

【文件位置】
- characters/${name}.md（详细单卡）
- CHARACTERS.md（总表已更新）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</add_character>

<view_character>

## 4. 查看人物 (--view)

```bash
# 查看指定人物
if [[ -f "characters/${CHARACTER_NAME}.md" ]]; then
  cat characters/${CHARACTER_NAME}.md
else
  echo "未找到人物：${CHARACTER_NAME}"
  echo "使用 /ans:character --list 查看所有人物"
fi
```

### 展示格式

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👤 [人物姓名]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【基础信息】
- 身份：[身份]
- 类型：[主角/配角/反派]
- 首次登场：第 [N] 章

【性格标签】
- 核心：[性格核心]
- 外在：[外在标签]
- 内在：[内在标签]

【行为准则】
- 利益逻辑：[决策逻辑]
- 底线：[不可触碰的底线]
- 策略：[对敌/对友的处理方式]

【成长轨迹】
| 阶段 | 状态 | 关键事件 | 章节 |
|------|------|----------|------|
| 起点 | [初始状态] | - | 1 |
| ... | ... | ... | ... |

【关系网络】
| 人物 | 关系 | 态度 | 演变 |
|------|------|------|------|
| [主角] | [关系] | [态度] | [变化] |
| ... | ... | ... | ... |

【出场记录】
- 第 [N] 章：[章节事件]
- 第 [M] 章：[章节事件]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</view_character>

<update_character>

## 5. 更新人物 (--update)

### 5.1 选择更新内容

```
AskUserQuestion(
  header: "更新人物",
  question: "要更新 [人物名] 的哪些内容？",
  options: [
    "基础信息",
    "性格标签",
    "行为准则",
    "成长轨迹",
    "关系网络",
    "全部内容"
  ],
  multiSelect: true
)
```

### 5.2 根据选择更新

**成长轨迹更新**：
- 添加新阶段
- 记录关键事件
- 更新当前状态

**关系网络更新**：
- 添加新关系
- 更新关系变化
- 记录演变原因

### 5.3 更新档案

```bash
# 更新详细档案
# 更新 CHARACTERS.md 总表
# 记录更新时间
```

</update_character>

<check_consistency>

## 6. 检查一致性 (--check)

检查人物在各章节中的表现是否一致：

### 6.1 委托一致性检查

将人物一致性检查委托给 `ans-verifier`，聚焦于该人物的行为一致性和语言风格一致性。

```
CHECK_FILES="PROJECT.md CHARACTERS.md"
[[ -f "characters/${CHARACTER_NAME}.md" ]] && CHECK_FILES="$CHECK_FILES characters/${CHARACTER_NAME}.md"

Task(
  subagent_type: "ans-verifier",
  objective: "检查人物 ${CHARACTER_NAME} 在各章中的行为一致性",
  files_to_read: [ $CHECK_FILES ],
  input: {
    check_type: "character_consistency",
    character_name: CHARACTER_NAME,
    character_file: "characters/${CHARACTER_NAME}.md",
    chapters_glob: "chapters/chapter-*.md"
  }
)
```

### 6.2 一致性报告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔍 人物一致性检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【[人物名]】

✓ 行为一致性
- 第5章：[行为] - 符合人设
- 第8章：[行为] - 符合人设

⚠️ 可能问题
- 第12章：[行为] - 与"性格核心"有偏差
  - 设定：[性格核心]
  - 实际：[章节中的行为]
  - 建议：[修改建议]

✓ 语言风格一致
- 对话风格符合设定

✓ 能力范围一致
- 未发现超出设定的情况

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</check_consistency>

<delete_character>

## 7. 删除人物 (--delete)

```
AskUserQuestion(
  header: "删除人物",
  question: "确定要删除 [人物名] 吗？",
  options: ["确认删除", "取消"]
)
```

如果确认：
1. 删除 `characters/[姓名].md`
2. 从 `CHARACTERS.md` 移除条目
3. 记录删除日志

**注意**：如果人物已在章节中出场，会警告：
```
⚠️ 警告：[人物名] 已在以下章节出场：
- 第5章
- 第8章
- 第12章

删除可能导致章节内容不一致。
```

</delete_character>

<character_template>

## 8. 人物档案模板

```markdown
---
name: [姓名]
role: [主角/配角/反派/路人]
identity: [身份]
first_appearance: [章节号]
created: [创建日期]
updated: [更新日期]
---

# [姓名]

## 基础信息

- **身份**：[职业/地位]
- **类型**：[主角/配角/反派/路人]
- **首次登场**：第 [N] 章
- **年龄**：[年龄/年龄段]

## 性格标签

### 核心性格
[一句话概括]

### 外在标签
- 外貌：[外貌特征]
- 穿着：[穿着习惯]
- 标志性物件：[标志性物品]

### 内在标签
- 癖好：[特殊癖好]
- 习惯：[行为习惯]
- 小缺点：[小缺点]

## 行为准则

### 利益逻辑
[决策逻辑，如何权衡利弊]

### 底线
[不可触碰的底线]

### 对敌策略
[如何对待敌人]

### 对友态度
[如何对待朋友/盟友]

## 与主角关系

- **关系类型**：[盟友/敌人/中立/复杂]
- **关系描述**：[具体关系]
- **形成原因**：[关系形成的原因]
- **演变计划**：[后续关系变化]

## 自己的算盘

- **目标**：[这个人物想要什么]
- **动机**：[为什么想要]
- **手段**：[准备怎么做]

## 成长轨迹

| 阶段 | 状态 | 关键事件 | 章节 |
|------|------|----------|------|
| 起点 | [初始状态] | - | 1 |
| [阶段名] | [状态] | [事件] | [章节] |
| ... | ... | ... | ... |

## 出场记录

| 章节 | 场景 | 行为 | 状态变化 |
|------|------|------|----------|
| 5 | [场景] | [行为] | [变化] |
| ... | ... | ... | ... |

## 反差细节

[让人物立体的反差]

## 备注

[其他需要记录的信息]
```

</character_template>

<examples>

## 命令示例

```bash
# 列出所有人物
/ans:character --list

# 添加新人物
/ans:character --add

# 查看人物
/ans:character 张三
/ans:character --view 张三

# 更新人物
/ans:character --update 张三

# 检查一致性
/ans:character --check 张三

# 删除人物
/ans:character --delete 张三
```

</examples>
