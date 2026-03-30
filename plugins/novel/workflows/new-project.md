<purpose>
初始化新小说项目，完成世界观、主角、金手指、主线规划等核心设定。这是最关键的环节——设定做得好，后续创作才能顺畅。一个工作流完成从想法到可创作状态的转变。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-architect — 创建项目设定、人物档案、时间线、路线图
- novel-researcher — 考据历史背景、时代细节、专业知识
</available_agent_types>

<process>

## 1. 初始化检查

检查当前目录是否已有项目：

```bash
# 检查项目文件
if [[ -f ".novel/PROJECT.md" ]]; then
  echo "项目已存在"
  cat .novel/PROJECT.md | head -20
  exit 1
fi

# 创建目录结构
mkdir -p .novel/chapters/draft
mkdir -p .novel/chapters/outlines
mkdir -p .novel/research
mkdir -p .novel/reviews
mkdir -p .novel/characters
```

目录结构：
```
.novel/
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
      options: ["30-50万字（短篇）", "50-100万字（中篇）", "100-200万字（长篇）", "200万字以上（超长篇）"]
    }
  ]
)
```

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

调用 `novel-researcher` 研究以下内容：

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

保存到 `.novel/research/background.md`

</research_phase>

<architecture_phase>

## 4. 架构设计

调用 `novel-architect` 生成核心文档：

### 4.1 准备输入

整理用户输入和研究结果，传递给 architect：

```xml
<architect_input>
  <basic_info>
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
    @.novel/research/background.md
  </research>
</architect_input>
```

### 4.2 调用 Architect

```
SpawnAgent(
  agent: novel-architect,
  input: architect_input,
  output: [
    .novel/PROJECT.md,
    .novel/CHARACTERS.md,
    .novel/TIMELINE.md,
    .novel/ROADMAP.md
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

创建 STATE.md：

```markdown
# 小说状态

## 基本信息
- 书名：《[书名]》
- 当前章节：第 0 章 / 共 [N] 章
- 当前卷：第一卷
- 总字数：0

## 进度

| 卷 | 章节 | 状态 | 完成日期 |
|----|------|------|----------|
| 第一卷 | 1-[N] | 未开始 | - |

## 伏笔追踪

| 伏笔 | 埋设章节 | 计划回收 | 状态 |
|------|----------|----------|------|
| （暂无） | | | |

## 人物状态

| 人物 | 当前状态 | 最新章节 | 关键变化 |
|------|----------|----------|----------|
| [主角名] | 初始状态 | - | - |

## 时间线位置
当前故事时间：[起始时间]

## 待处理
- [ ] 开始第一章创作

## 创建信息
- 创建时间：[当前日期]
- 最后更新：[当前日期]
```

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
   /novel:write-chapter 1
   ```

2. **完善人物设定**
   ```
   /novel:character --add
   ```

3. **考据更多资料**
   ```
   /novel:research [主题]
   ```

4. **规划更多章节**
   ```
   /novel:plan-batch 1-10
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
说明：当前目录已有 .novel/PROJECT.md
解决：删除 .novel 目录后重试，或切换到新目录
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
.novel/
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
