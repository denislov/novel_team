<purpose>
初始化新小说项目，完成世界观、主角、金手指、主线规划等核心设定。这是最关键的环节——设定做得好，后续创作才能顺畅。一个工作流完成从想法到可创作状态的转变。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
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

ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_RESEARCH_TEMPLATE="$ANS_SUPPORT_ROOT/templates/RESEARCH.md"
ANS_PROJECT_TEMPLATE="$ANS_SUPPORT_ROOT/templates/PROJECT.md"
ANS_CHARACTERS_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTERS.md"
ANS_CHARACTER_CARD_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTER-CARD.md"
ANS_TIMELINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/TIMELINE.md"
ANS_ROADMAP_TEMPLATE="$ANS_SUPPORT_ROOT/templates/ROADMAP.md"
ANS_STATE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/STATE.md"
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

## 2. 收集初始输入

新版只问最少的问题 —— 题材、世界观、主角、金手指、主线全部由 `ans-architect` 在 §3 头脑风暴阶段提议，§4 让用户审核迭代。这避免了让用户在还没看到完整规划之前就被迫做出 N 个微决定。

### 2.1 强制输入

```
AskUserQuestion(
  header: "项目起点",
  questions: [
    {
      key: "story_format",
      question: "本次要写哪种作品形态？",
      options: [
        "中长篇小说（按卷推进）",
        "短故事（按章推进）",
        "短故事集（按篇累积）"
      ],
      followUp: "作品形态决定头脑风暴是否需要规划卷结构"
    },
    {
      key: "idea",
      question: "用一段话描述你的想法。包含但不限于：题材、想要写的核心冲突、世界观、主角形象、想带给读者的感觉。模糊也没关系，工作流会基于这段想法做发散思考；越具体则提议会越贴你的预期。"
    }
  ]
)
```

约定的内部映射：

- 中长篇小说 → `story_format = long_form` / `planning_unit = chapter` / `target_length_band = medium_long`
- 短故事 → `story_format = short_story` / `planning_unit = chapter` / `target_length_band = short`
- 短故事集 → `story_format = story_collection` / `planning_unit = story` / `target_length_band = collection`

### 2.2 可选输入（用户可以全留空）

```
AskUserQuestion(
  header: "可选硬目标",
  questions: [
    {
      key: "target_chapters_hint",
      question: "（可选）目标章节数？已有目标就填，否则留空让工作流推算。",
      followUp: "如填 100，那就按 100 章规划；留空则 architect 根据 idea 与 story_format 合理推算"
    },
    {
      key: "target_total_words_hint",
      question: "（可选）目标总字数？已有目标就填，否则留空让工作流推算。",
      followUp: "如填 800000（80 万字），那就按 80 万规划；留空则 architect 根据 idea 与章数推算"
    }
  ]
)
```

如果用户留空，传给 architect 的对应字段就是空字符串 —— architect 必须自己提议合理值；如果填了，architect 必须严格使用而不修改。

</interactive_flow>

<brainstorm_phase>

## 3. 头脑风暴：发散一份完整规划

调用 `ans-architect` 的 **brainstorm 模式**：基于用户的 idea 与 story_format（外加可选 hints），由 architect 自由发散思考一份完整的项目规划方案。

**关键差别（与 §6 commit 模式的区别）：** 此阶段 architect **不写任何文件**。它只在对话中返回一份结构化的 `## BRAINSTORM COMPLETE` 提议，等用户在 §4 审核确认后再落地。

### 3.1 调用 Architect 的 brainstorm 模式

```bash
ITERATION=1
PROPOSAL=""           # 保存上一轮 brainstorm 输出，便于迭代时让 architect 看到
ADJUSTMENT_NOTES=""   # 用户在 §4 给的调整意见，初次为空
```

```
BRAINSTORM_FILES_TO_READ="$ANS_WRITING_GUIDE $ANS_PROJECT_TEMPLATE $ANS_ROADMAP_TEMPLATE $ANS_CHARACTERS_TEMPLATE $ANS_CHARACTER_CARD_TEMPLATE $ANS_TIMELINE_TEMPLATE"
[[ -f "research/background.md" ]] && BRAINSTORM_FILES_TO_READ="$BRAINSTORM_FILES_TO_READ research/background.md"

Task(
  subagent_type: "ans-architect",
  objective: "为新项目头脑风暴一份完整规划方案（第 ${ITERATION} 轮）",
  files_to_read: [ $BRAINSTORM_FILES_TO_READ ],
  input: brainstorm_input,    # 见 3.2
  mode: "brainstorm"
)
```

### 3.2 brainstorm_input XML 形态

```xml
<brainstorm_input>
  <iteration>${ITERATION}</iteration>
  <story_format>[作品形态]</story_format>
  <planning_unit>[chapter 或 story]</planning_unit>
  <target_length_band>[short / medium_long / collection]</target_length_band>

  <user_idea>
    [用户在 2.1 提供的 idea 原文，未做任何加工]
  </user_idea>

  <user_hints>
    <!-- 用户在 2.2 给的可选数字。空字符串表示由 architect 推算。
         如果非空，architect 必须严格使用，不要"四舍五入"或重新设定。 -->
    <target_chapters_hint>${target_chapters_hint}</target_chapters_hint>
    <target_total_words_hint>${target_total_words_hint}</target_total_words_hint>
  </user_hints>

  <previous_proposal>
    <!-- 仅在 ITERATION > 1 时填充，把上一轮 BRAINSTORM COMPLETE 的全文塞进来 -->
    [上一轮 architect 提议的全文]
  </previous_proposal>

  <adjustment_notes>
    <!-- 仅在 ITERATION > 1 时填充，是用户在 §4.2 输入的调整方向 -->
    [用户调整意见原文]
  </adjustment_notes>
</brainstorm_input>
```

### 3.3 Brainstorm 期望输出

architect 在对话中以 `## BRAINSTORM COMPLETE` 头部返回，结构详见 `agents/ans-architect.md` 的「头脑风暴模式」节。要点：

- 所有规划字段都要给出具体值（不能写 `[待定]`）
- 规划数字必须自洽（卷数 × 每卷章数 ≈ 总章数；总章数 × 单章字数 ≈ 总字数）
- 必须输出 `### 思考过程` 段落简短解释为什么这么规划，便于用户判断是否合理
- **不写任何文件** —— 只返回对话内容

</brainstorm_phase>

<review_iterate_phase>

## 4. 审核与迭代

### 4.1 显示提议给用户

直接把 architect 返回的 `## BRAINSTORM COMPLETE` 全文展示给用户。如果界面允许，可以包一个分隔横线让 user 视觉上看到边界：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 项目规划提议（第 ${ITERATION} 轮）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[architect 返回的 BRAINSTORM COMPLETE 全文]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 询问审核结论

```
AskUserQuestion(
  header: "审核项目规划",
  question: "对以上规划满意吗？",
  options: [
    "确认通过 —— 让 architect 落地为文件",
    "需要调整 —— 我说一下哪里要改",
    "完全推倒重来 —— 我重新写 idea",
    "取消创建项目"
  ]
)
```

### 4.3 分发处理

- **确认通过**：把当前 PROPOSAL 标记为 `APPROVED_PROPOSAL`，跳出循环进入 §5 / §6。
- **需要调整**：
  ```
  AskUserQuestion(
    header: "调整方向",
    question: "请描述哪里不满意、想改成什么。可以涉及多个方面（卷数、字数、主角设定、世界观、金手指、风格、禁忌等）。",
    followUp: "下一轮 brainstorm 会同时看到当前提议和你的调整意见，按你说的方向重新发散。"
  )
  ```
  把回答存进 `ADJUSTMENT_NOTES`，`ITERATION=$((ITERATION+1))`，返回 §3.1 重新 brainstorm。
- **完全推倒重来**：返回 §2.1 重新收集 `idea`（其他可选输入保留）；`ITERATION=1`，`PROPOSAL=""`，`ADJUSTMENT_NOTES=""`。
- **取消创建项目**：直接退出工作流，不写任何文件。

### 4.4 迭代上限

设 `MAX_ITERATIONS=10`。如果到第 10 轮仍未通过，工作流主动暂停并提示用户：「已迭代 10 轮，建议先取消并重新理顺 idea，或换一个 architect 模型再试。」避免无限循环。

</review_iterate_phase>

<research_phase>

## 5. 考据研究（如需要）

> 注意：研究阶段在 §4 用户确认通过 **之后** 触发 —— 否则 idea 还在反复迭代时做的考据可能被推翻浪费。

如果项目涉及历史背景或专业知识：

```bash
# 从 APPROVED_PROPOSAL 中读出 architect 提议的 era / genre
PROPOSED_ERA=$(echo "$APPROVED_PROPOSAL" | grep -oP '(?<=Era: ).*' | head -1)
PROPOSED_GENRE=$(echo "$APPROVED_PROPOSAL" | grep -oP '(?<=Genre: ).*' | head -1)

if [[ "$PROPOSED_GENRE" == *"历史"* ]] || [[ "$PROPOSED_GENRE" == *"港综"* ]] || [[ "$PROPOSED_ERA" =~ ^[0-9]{4} ]]; then
  NEEDS_RESEARCH=true
fi
```

**如果需要考据：**

调用 `ans-researcher` 研究以下内容：

### 5.1 时代背景

- 政治环境：政权、政策、社会氛围
- 经济状况：发展水平、物价、就业
- 社会生活：衣食住行、文化娱乐
- 重要事件：该年代的重要历史事件

### 5.2 专业知识

根据类型研究：
- 港综同人：香港警察系统、黑帮社团、电影产业
- 都市商战：金融操作、公司运作、法律规范
- 历史官场：官制、科举、礼仪

### 5.3 生成考据报告

保存到 `research/background.md`

如果委托 `ans-researcher`，其 brief 必须额外包含：
- `files_to_read: [ "$ANS_RESEARCH_TEMPLATE" ]`
- 已批准的提议正文（`APPROVED_PROPOSAL`）作为研究语境

调用 Researcher：

```
RESEARCH_FILES="$ANS_RESEARCH_TEMPLATE"

Task(
  subagent_type: "ans-researcher",
  objective: "考据项目背景：${PROPOSED_GENRE} ${PROPOSED_ERA}",
  files_to_read: [ $RESEARCH_FILES ],
  input: { approved_proposal: APPROVED_PROPOSAL },
  output: "research/background.md"
)
```

</research_phase>

<architecture_phase>

## 6. 落地：把已批准的提议写成文件

调用 `ans-architect` 的 **commit 模式** —— 把 §4 已批准的提议（`APPROVED_PROPOSAL`）原样落到 PROJECT.md / CHARACTERS.md / TIMELINE.md / ROADMAP.md / `characters/<主角>.md` 五个文件。

### 6.1 准备输入

```xml
<architect_input>
  <mode>commit</mode>
  <approved_proposal>
    <!--
      §4 用户确认通过的整份 BRAINSTORM COMPLETE 内容，原样塞入。
      ARCHITECT commit 模式必须严格按这份提议落地：
        - 卷数/章数/字数严格守恒
        - 卷主题、章主题、故事主题原文使用，不能改写或合并
        - 主角姓名/性格/金手指等所有字段都按提议
      如果发现提议本身有内部矛盾（如卷数 × 每卷章数 ≠ 总章数），
      在 `## ARCHITECT COMPLETE` 的「⚠️ 落地警告」段落明确指出，
      但不得擅自改动 —— 应让 workflow 把矛盾返回给用户在新一轮 brainstorm 中修正。
    -->
    [APPROVED_PROPOSAL 全文]
  </approved_proposal>

  <research>
    @research/background.md
  </research>
</architect_input>
```

**Architect commit 落地契约：**

| 提议字段 | 必须落地到的位置 |
|---------|-----------------|
| Title proposal | PROJECT.md frontmatter `title`；STATE.md frontmatter `project` |
| Genre / Era | PROJECT.md frontmatter `genre` / `era` |
| target_total_words | PROJECT.md 与 ROADMAP.md frontmatter 的 `target_words` |
| target_volumes（long_form） | ROADMAP.md frontmatter `target_volumes`；「整体结构」表行数严格等于此数 |
| target_chapters | PROJECT.md 与 ROADMAP.md frontmatter `target_chapters` |
| Volume themes（long_form） | ROADMAP.md「整体结构」表的「阶段目标」「核心冲突」列原文使用提议的逐卷主题 |
| Chapter themes（short_story） | ROADMAP.md「当前卷章节队列」每章一行，主题原文使用 |
| target_stories + Story themes（story_collection） | ROADMAP.md「作品集增长追踪」表行数严格等于篇数；主题原文使用 |
| Protagonist 各字段 | PROJECT.md「主角设定」节 + CHARACTERS.md 总表 + `characters/<主角名>.md` 单卡（按 CHARACTER-CARD schema） |
| Golden Finger 各字段 | PROJECT.md「金手指设定」节 |
| Style / Taboos | PROJECT.md frontmatter `taboos` 列表 + 风格段落 |

### 6.2 调用 Architect

```
ARCHITECT_FILES_TO_READ="$ANS_WRITING_GUIDE $ANS_PROJECT_TEMPLATE $ANS_CHARACTERS_TEMPLATE $ANS_CHARACTER_CARD_TEMPLATE $ANS_TIMELINE_TEMPLATE $ANS_ROADMAP_TEMPLATE"
[[ -f "research/background.md" ]] && ARCHITECT_FILES_TO_READ="$ARCHITECT_FILES_TO_READ research/background.md"

# 从 APPROVED_PROPOSAL 抽出主角姓名作为单卡路径
PROTAGONIST_NAME=$(echo "$APPROVED_PROPOSAL" | grep -oP '(?<=- \*\*Name\*\*: ).*' | head -1 | tr -d ' ')
PROTAGONIST_CARD_PATH="characters/${PROTAGONIST_NAME}.md"

Task(
  subagent_type: "ans-architect",
  input: architect_input,
  files_to_read: [ $ARCHITECT_FILES_TO_READ ],
  mode: "commit",
  output: [
    PROJECT.md,
    CHARACTERS.md,
    TIMELINE.md,
    ROADMAP.md,
    ${PROTAGONIST_CARD_PATH}
  ]
)
```

### 6.3 Architect 产出

- **PROJECT.md**: 世界观、主角、金手指、主线、禁忌
- **CHARACTERS.md**: 人物档案（初始只有主角，包含 `[详细卡片](characters/<主角名>.md)` 链接）
- **characters/${PROTAGONIST_NAME}.md**: 主角单卡（按 `templates/CHARACTER-CARD.md` schema）
- **TIMELINE.md**: 时间线锚点
- **ROADMAP.md**: 全卷规划（行数严格等于提议的 `target_volumes`）

> 主角单卡是 P1 自动化的起点 —— 后续 `/ans:write-chapter` 通过 verifier 的 `needs_character_update` 信号会再叫 architect 进入「单卡更新模式」更新这张卡或为新登场角色补卡。

</architecture_phase>

<state_initialization>

## 7. 初始化状态文件

先读取 `$ANS_STATE_TEMPLATE`，再按其结构创建 `STATE.md`，尤其必须保留 frontmatter。创建完成后运行：

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

## 8. 最终回执

§4 审核阶段用户已经批准了规划，§6 也按已批准提议落地了文件。本节只是把已落地的内容做一次紧凑总结，不再向用户询问 —— 任何调整都应通过后续 `/ans:plan-arc`、`/ans:plan-batch`、`/ans:character --update` 等命令来做。

### 8.1 展示落地摘要

按 `story_format` 分支展示已经写入文件的硬目标和主题分布，便于用户确认与日后查阅。所有数值直接读自 PROJECT.md / ROADMAP.md frontmatter，不要再从内存变量重读 —— 落地后的文件才是单一真相。

#### 8.1a long_form

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 项目已落地：《[书名]》（长篇）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【基本信息】
- 类型：[类型]
- 起始时间：[起始时间]

【硬目标】
- 卷数：${target_volumes} 卷
- 总章节数：${target_chapters} 章
- 总字数:${target_total_words} 字
- 单章预算：${chapter_words} 字（硬上限 ${chapter_word_ceiling}）

【卷主题分布】
${volume_themes}
（每行一卷，与 ROADMAP.md 的「整体结构」表一一对应）

【主角】
- 姓名：[姓名]
- 身份：[身份]
- 性格：[性格]

【金手指】
- 类型：[类型]
- 功能：[功能]
- 限制：[限制]

【禁忌清单】
${taboos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 8.1b short_story

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 项目已落地：《[书名]》（短故事）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【基本信息】
- 类型：[类型]
- 起始时间：[起始时间]

【硬目标】
- 章节数：${target_chapters} 章
- 总字数：${target_total_words} 字

【章节主题分布】
${chapter_themes}
（每行一章，与 ROADMAP.md 的「章节队列」一一对应）

【主角】
- 姓名：[姓名]
- 身份：[身份]
- 性格：[性格]

【金手指】
- 类型：[类型]
- 功能：[功能]

【禁忌清单】
${taboos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 8.1c story_collection

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 项目已落地：《[书名]》（短故事集）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【基本信息】
- 类型：[类型]
- 起始时间：[起始时间]

【硬目标】
- 故事数：${target_stories} 篇
- 本批次总字数：${target_total_words} 字

【故事主题分布】
${story_themes}
（每行一篇故事，与 ROADMAP.md 的「作品集增长追踪」表一一对应）

【主角】
- 姓名：[姓名]
- 身份：[身份]

【禁忌清单】
${taboos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 8.2 不再追问确认

§4 审核循环里用户已经显式批准了规划；§6 commit 阶段已经按规划落地了文件。这一节刻意 **不** 再调用 AskUserQuestion 让用户「再确认一次」 —— 那只会多此一举地把刚刚做完的决策再问一遍。

如果落地后用户发现某个具体方面想改：

- 想改卷规划 / 阶段目标 → `/ans:plan-arc <卷名>`
- 想改章节大纲 → `/ans:plan-batch START-END`
- 想改主角或重要人物 → `/ans:character --update <姓名>`
- 想改风格 / 禁忌 → 直接编辑 `PROJECT.md` frontmatter 的 `taboos` 与正文风格段
- 想推倒重来 → 删除当前目录所有产物，重新执行 `/ans:new-project`

</confirmation>

<next_steps>

## 9. 下一步

项目落地完成，可以：

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
