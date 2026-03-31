<purpose>
人物构建：创建、更新、查看人物档案。确保人物设定完整、立体、一致。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-architect — 人物设计和档案创建
</available_agent_types>

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

## 3. 添加人物 (--add)

### 3.1 收集人物信息

```
AskUserQuestion(
  header: "新人物设定",
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
      key: "identity",
      question: "身份/职业？",
      followUp: "如：商人、警察、学生等"
    },
    {
      key: "personality_core",
      question: "性格核心？",
      followUp: "用一句话概括，如：外表温和内心冷酷"
    },
    {
      key: "external_tags",
      question: "外在标签？",
      followUp: "外貌特征、穿着习惯、标志性物件"
    },
    {
      key: "internal_tags",
      question: "内在标签？",
      followUp: "癖好、习惯、小缺点"
    },
    {
      key: "relation_to_protagonist",
      question: "与主角的关系？",
      options: ["盟友", "敌人", "中立", "复杂", "其他"]
    },
    {
      key: "first_appearance",
      question: "首次登场章节？",
      followUp: "留空则稍后设定"
    }
  ]
)
```

### 3.2 生成人物档案

调用 `novel-architect` 生成详细档案：

```
SpawnAgent(
  agent: novel-architect,
  input: {
    task: "create_character",
    character_info: {
      name: CHARACTER_NAME,
      role: role,
      identity: identity,
      personality_core: personality_core,
      external_tags: external_tags,
      internal_tags: internal_tags,
      relation_to_protagonist: relation_to_protagonist,
      first_appearance: first_appearance
    },
    project: PROJECT,
    existing_characters: CHARACTERS
  },
  output: characters/${CHARACTER_NAME}.md
)
```

### 3.3 更新 CHARACTERS.md

将新人物添加到总表：

```markdown
### [姓名]

**基础信息**
- 身份：[身份]
- 类型：[主角/配角/反派]
- 首次登场：第 [N] 章

**性格标签**
- 核心：[性格核心]
- 外在：[外在标签]
- 内在：[内在标签]

**与主角关系**
- 关系类型：[盟友/敌人/中立]
- 关系描述：[具体描述]

**详细档案**：[characters/姓名.md](characters/姓名.md)
```

### 3.4 展示结果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👤 人物创建完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【姓名】[姓名]
【类型】[主角/配角/反派]
【身份】[身份]

【性格核心】
[性格核心]

【外在标签】
[外在标签]

【内在标签】
[内在标签]

【与主角关系】
[关系类型] - [关系描述]

【首次登场】
第 [N] 章

【文件位置】
characters/[姓名].md

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
  echo "使用 /novel:character --list 查看所有人物"
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

### 6.1 扫描章节

```bash
# 扫描所有章节，提取人物出场记录
for chapter in $(find chapters -maxdepth 1 -type f | grep -E '/chapter-[0-9]+\.md$' | sort -V); do
  # 检查人物是否出场
  # 提取人物行为
  # 对比人设
done
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
/novel:character --list

# 添加新人物
/novel:character --add

# 查看人物
/novel:character 张三
/novel:character --view 张三

# 更新人物
/novel:character --update 张三

# 检查一致性
/novel:character --check 张三

# 删除人物
/novel:character --delete 张三
```

</examples>
