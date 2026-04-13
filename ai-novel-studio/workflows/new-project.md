<purpose>
初始化新小说项目，完成世界观、主角、金手指、主线规划等核心设定。这是最关键的环节——设定做得好，后续创作才能顺畅。一个工作流完成从想法到可创作状态的转变。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
Use `node bin/ans-tools.cjs init new-project` after core files are created so the initial `STATE.md` matches the actual filesystem layout.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-architect — 创建项目设定、人物档案、时间线、路线图
- ans-researcher — 考据历史背景、时代细节、专业知识
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 初始化检查

检查当前目录是否已有项目：

```bash
# 检查项目文件
if [[ -f "PROJECT.md" ]]; then
  echo "项目已存在"
  cat PROJECT.md | head -20
  exit 1
fi

# 如果当前目录已经有较多小说资料，优先建议 map-base 而不是直接新建
EXISTING_SOURCE_COUNT=$(find . -maxdepth 1 -type f \( -name '*.md' -o -name '*.txt' \) ! -name 'README.md' ! -name 'PROJECT.md' ! -name 'CHARACTERS.md' ! -name 'TIMELINE.md' ! -name 'ROADMAP.md' ! -name 'STATE.md' | wc -l)
if [[ "$EXISTING_SOURCE_COUNT" -ge 3 ]]; then
  echo "检测到当前目录已有较多资料文件。"
  echo "如果这些是小说资料，优先运行 /ans:map-base 进行结构化整理。"
  echo "如果你确定要从头新建，再继续执行 /ans:new-project。"
  exit 1
fi

# 创建目录结构
mkdir -p chapters/draft
mkdir -p chapters/outlines
mkdir -p research
mkdir -p reviews
mkdir -p characters
```

目录结构：
```
./
├── PROJECT.md              # 项目设定
├── CHARACTERS.md           # 人物档案总表
├── TIMELINE.md             # 时间线
├── ROADMAP.md              # 故事阶段规划
├── STATE.md                # 当前状态
├── chapters/               # 章节内容
│   ├── draft/              # 草稿
│   └── outlines/           # 章节大纲
├── characters/             # 人物详细卡片
├── research/               # 考据资料
└── reviews/                # 审核报告
```

</process>

<interactive_flow>

## 2. 引导用户填写设定

### 2.1 基本信息

使用 AskUserQuestion 收集：

```
AskUserQuestion(
  header: "基本信息",
  questions: [
    {
      key: "story_format",
      question: "本次要写哪种作品形态？",
      options: ["中长篇小说（2万字以上）", "短故事（6千字-2万字）", "短故事集（多个短故事逐步累积）"],
      followUp: "作品形态会影响路线图结构、默认规划单位和后续建议"
    },
    {
      key: "title",
      question: "书名是什么？",
      followUp: "好的书名能吸引读者，建议：独特、好记、暗示类型"
    },
    {
      key: "genre",
      question: "类型/题材是什么？",
      options: ["都市", "历史", "玄幻", "仙侠", "科幻", "港综同人", "其他"],
      followUp: "不同类型有不同的读者期待和写作规范"
    },
    {
      key: "timeline_start",
      question: "故事从什么时间开始？",
      followUp: "如：1980年、明朝万历年间、2024年等"
    },
    {
      key: "target_words",
      question: "目标字数？",
      options: ["6千-2万字（短故事）", "2万-10万字（中篇/轻长篇）", "10万-50万字（长篇）", "50万字以上（超长篇/连载）"]
    }
  ]
)
```

约定的内部映射：

- 中长篇小说 → `story_format = long_form`
- 短故事 → `story_format = short_story`
- 短故事集 → `story_format = story_collection`

并同步推导：

- `planning_unit = chapter`（long_form）
- `planning_unit = story`（short_story / story_collection）
- `target_length_band = short | medium_long | collection`

### 2.2 主角设定

```
AskUserQuestion(
  header: "主角设定",
  questions: [
    {
      key: "protagonist_name",
      question: "主角姓名？"
    },
    {
      key: "protagonist_identity",
      question: "主角开局身份？",
      followUp: "如：普通大学生、落魄富二代、穿越者等"
    },
    {
      key: "protagonist_personality",
      question: "主角性格核心？",
      options: ["极致利己有底线", "腹黑扮猪吃虎", "热血莽夫", "腹黑算计", "佛系躺平", "其他"],
      followUp: "性格决定行为，行为决定命运"
    },
    {
      key: "protagonist_principle",
      question: "主角的行为准则/底线是什么？",
      followUp: "如：不杀无辜、不跪舔、斩草除根等"
    }
  ]
)
```

### 2.3 金手指设定

```
AskUserQuestion(
  header: "金手指设定",
  questions: [
    {
      key: "golden_finger_type",
      question: "金手指类型？",
      options: ["系统", "空间", "重生记忆", "特殊能力", "无金手指", "其他"]
    },
    {
      key: "golden_finger_function",
      question: "金手指的核心功能是什么？",
      followUp: "金手指能帮主角做什么"
    },
    {
      key: "golden_finger_limit",
      question: "金手指的限制/代价是什么？",
      followUp: "没有限制的金手指会让故事失去张力"
    }
  ]
)
```

### 2.4 风格与禁忌

```
AskUserQuestion(
  header: "风格与禁忌",
  questions: [
    {
      key: "writing_style",
      question: "文风定位？",
      options: ["暴力美学", "有逻辑的爽", "沉稳有张力", "轻松搞笑", "热血燃向", "其他"]
    },
    {
      key: "taboos",
      question: "有哪些禁忌？（可多选）",
      options: [
        "禁止圣母心/无脑莽/降智",
        "禁止机械降神",
        "禁止反派降智",
        "禁止流水账",
        "禁止时间线错乱",
        "禁止主角双标",
        "禁止无脑后宫",
        "禁止配角工具人",
        "禁止AI式说教",
        "禁止设定吃书"
      ],
      multiSelect: true,
      followUp: "这些禁忌将在创作过程中严格执行"
    }
  ]
)
```

### 2.5 简介（可选）

```
AskUserQuestion(
  header: "简介",
  questions: [
    {
      key: "synopsis",
      question: "一句话简介？（可选）",
      followUp: "第一句困境 + 第二句金手指 + 第三句悬念"
    }
  ]
)
```

</interactive_flow>

<research_phase>

## 3. 考据研究（如需要）

如果项目涉及历史背景或专业知识：

```bash
# 判断是否需要考据
if [[ "$genre" == "历史" ]] || [[ "$genre" == "港综同人" ]] || [[ "$timeline_start" =~ ^[0-9]{4} ]]; then
  NEEDS_RESEARCH=true
fi
```

**如果需要考据：**

调用 `ans-researcher` 研究以下内容：

### 3.1 时代背景

- 政治环境：政权、政策、社会氛围
- 经济状况：发展水平、物价、就业
- 社会生活：衣食住行、文化娱乐
- 重要事件：该年代的重要历史事件

### 3.2 专业知识

根据类型研究：
- 港综同人：香港警察系统、黑帮社团、电影产业
- 都市商战：金融操作、公司运作、法律规范
- 历史官场：官制、科举、礼仪

### 3.3 生成考据报告

保存到 `research/background.md`

</research_phase>

<architecture_phase>

## 4. 架构设计

调用 `ans-architect` 生成核心文档：

### 4.1 准备输入

整理用户输入和研究结果，传递给 architect：

```xml
<architect_input>
  <basic_info>
    <story_format>[作品形态]</story_format>
    <planning_unit>[chapter 或 story]</planning_unit>
    <target_length_band>[short / medium_long / collection]</target_length_band>
    <title>[书名]</title>
    <genre>[类型]</genre>
    <timeline_start>[起始时间]</timeline_start>
    <target_words>[目标字数]</target_words>
    <synopsis>[简介]</synopsis>
  </basic_info>
  
  <protagonist>
    <name>[姓名]</name>
    <identity>[身份]</identity>
    <personality>[性格]</personality>
    <principle>[行为准则]</principle>
  </protagonist>
  
  <golden_finger>
    <type>[类型]</type>
    <function>[功能]</function>
    <limit>[限制]</limit>
  </golden_finger>
  
  <style>
    <writing_style>[文风]</writing_style>
    <taboos>[禁忌列表]</taboos>
  </style>
  
  <research>
    @research/background.md
  </research>
</architect_input>
```

### 4.2 调用 Architect

```
Task(
  subagent_type: "ans-architect",
  input: architect_input,
  output: [
    PROJECT.md,
    CHARACTERS.md,
    TIMELINE.md,
    ROADMAP.md
  ]
)
```

### 4.3 Architect 产出

- **PROJECT.md**: 世界观、主角、金手指、主线、禁忌
- **CHARACTERS.md**: 人物档案（初始只有主角）
- **TIMELINE.md**: 时间线锚点
- **ROADMAP.md**: 第一卷规划

</architecture_phase>

<state_initialization>

## 5. 初始化状态文件

按 `templates/STATE.md` 的结构创建 STATE.md，尤其必须保留 frontmatter。创建完成后运行：

```bash
node bin/ans-tools.cjs state refresh
```

然后再根据新建项目的语义补这些字段：

```markdown
---
project: [书名]
status: 规划中
current_arc: 第一卷
current_chapter: 0
total_words: 0
last_updated: YYYY-MM-DD
---

# 当前状态

## 进度快照

| 项目 | 当前值 |
|------|--------|
| 当前卷 | 第一卷 |
| 当前章节 | 第0章 |
| 总字数 | 0 |
| 最新完成内容 | 新建项目 |
| 下一目标 | 第1章大纲 |

## 人物当前状态

| 人物 | 当前状态 | 最新相关章节 | 下次出场任务 |
|------|----------|--------------|--------------|
| [主角名] | 初始状态 | - | 立住人设 |

## 待办清单

- [ ] 完成第1章大纲
- [ ] 完成第1章正文
- [ ] 回写时间线和人物状态
```

说明：
- `progress`、`next`、`manager` 读取 frontmatter
- 作者日常查看主要看正文区块
- 这两层信息都要维护，不能只写其中一层
- 本阶段只要求把 `story_format` / `planning_unit` / `target_length_band` 持久化，不要求立刻彻底重做所有长篇模板行为

</state_initialization>

<confirmation>

## 6. 确认与调整

### 6.1 展示设定摘要

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 项目创建完成：《[书名]》
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【基本信息】
- 类型：[类型]
- 起始时间：[起始时间]
- 目标字数：[目标字数]

【主角】
- 姓名：[姓名]
- 身份：[身份]
- 性格：[性格]

【金手指】
- 类型：[类型]
- 功能：[功能]
- 限制：[限制]

【第一卷规划】
- 章节范围：1-[N]章
- 核心冲突：[冲突]

【禁忌清单】
- [禁忌1]
- [禁忌2]
- ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6.2 询问确认

```
AskUserQuestion(
  header: "确认设定",
  question: "以上设定是否满意？",
  options: [
    "确认，开始创作",
    "需要调整主角设定",
    "需要调整金手指设定",
    "需要调整主线规划",
    "需要调整禁忌清单"
  ]
)
```

### 6.3 根据选择调整

- **确认**：进入下一步
- **调整主角**：返回 2.2，更新 CHARACTERS.md
- **调整金手指**：返回 2.3，更新 PROJECT.md
- **调整主线**：重新调用 architect 更新 ROADMAP.md
- **调整禁忌**：更新 PROJECT.md 的禁忌清单

</confirmation>

<next_steps>

## 7. 下一步

项目创建完成，可以：

1. **开始创作第一章**
   ```
   /ans:write-chapter 1
   ```

2. **完善人物设定**
   ```
   /ans:character --add
   ```

3. **考据更多资料**
   ```
   /ans:research [主题]
   ```

4. **规划更多章节**
   ```
   /ans:plan-batch 1-10
   ```

</next_steps>

<flags>

## 可选参数

- `--auto` : 自动模式，跳过交互，使用默认值
- `--from-doc @file.md` : 从文档读取设定
- `--skip-research` : 跳过考据阶段
- `--quick` : 快速模式，只创建基本设定

</flags>

<error_handling>

## 错误处理

### 项目已存在
```
错误：项目已存在
说明：当前目录已有 PROJECT.md
解决：如果这是空目录，切换到新目录后重试；如果当前目录已有小说资料，请改用 /ans:map-base
```

### 设定不完整
```
警告：设定不完整
说明：缺少必要信息 [具体内容]
解决：将使用默认值，后续可手动编辑 PROJECT.md
```

### 考据失败
```
警告：考据资料获取失败
说明：[具体原因]
解决：可继续创建项目，后续手动补充考据资料
```

</error_handling>

<output>

## 最终输出

```
./
├── PROJECT.md          ✓ 项目设定
├── CHARACTERS.md       ✓ 人物档案
├── TIMELINE.md         ✓ 时间线
├── ROADMAP.md          ✓ 故事规划
├── STATE.md            ✓ 当前状态
├── chapters/           ✓ 章节目录
│   ├── draft/
│   └── outlines/
├── characters/         ✓ 人物卡片目录
├── research/           ✓ 考据目录
│   └── background.md   ✓ 背景考据（如有）
└── reviews/            ✓ 审核目录
```

</output>
