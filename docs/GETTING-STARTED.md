# AI Novel Studio 使用指南

## 1. 什么是 AI Novel Studio

AI Novel Studio 是一个面向小说创作的结构化工作流工具，不是一次性的写作提示词集合。

它的核心思路是：

- 用一组固定的项目文件保存长期创作上下文
- 用明确的命令或技能推进规划、写作、润色、审核、研究
- 同时支持中长篇小说、单篇短故事、短故事集三种作品形态

如果你希望持续写一个项目，而不是每次都从聊天记录里重新解释设定，AI Novel Studio 适合你。

## 2. 适合谁使用

AI Novel Studio 主要适合以下用户：

- 想从 0 开始搭建一个长期可维护的小说项目
- 已经有零散大纲、设定、旧稿，想整理成统一结构
- 正在写中长篇，希望稳定推进卷、章节、时间线和人物状态
- 想写短故事或短故事集，但不想被长篇模板绑架
- 需要把研究、审核、润色也纳入正式流程

## 3. 安装

建议直接在仓库里使用安装脚本：

```bash
node bin/install.js --all --global
```

常见安装与维护命令：

```bash
node bin/install.js --claude --global
node bin/install.js --codex --global
node bin/install.js --all --global --validate
node bin/install.js --codex --global --repair
node bin/install.js --codex --global --uninstall
```

如果你的环境已经能直接调用 `ans-tool`，也可以使用：

```bash
ans-tool --codex --global --validate
ans-tool --codex --global --repair
```

## 4. 在不同运行时中的入口

AI Novel Studio 同时支持 Codex 和 Claude Code，但入口形式不同。

### Codex

Codex 中建议使用显式的公开技能入口：

- `$ans-new-project`
- `$ans-map-base`
- `$ans-plan-arc`
- `$ans-plan-batch`
- `$ans-write-chapter`
- `$ans-review`
- `$ans-progress`
- `$ans-next`
- `$ans-help`

对 Codex 来说，这些显式的 `$ans-*` 技能是最稳定的使用路径。

### Claude Code

Claude Code 中使用 top-level skills：

- `ans-new-project`
- `ans-map-base`
- `ans-plan-arc`
- `ans-plan-batch`
- `ans-write-chapter`
- `ans-review`
- `ans-progress`
- `ans-next`
- `ans-help`

注意：Claude 与 Codex 现在都使用同名 `ans-*` skill。本文下面的示例如果写成 `$ans-*`，那是 Codex 的调用写法；在 Claude Code 中对应的是同名 `ans-*` skill。

## 5. 标准项目结构

AI Novel Studio 会围绕一个根目录结构项目工作。核心文件如下：

- `PROJECT.md`：全书契约，记录题材、主线、禁忌、作品形态等
- `CHARACTERS.md`：人物总表
- `TIMELINE.md`：时间线
- `ROADMAP.md`：卷结构或故事阶段规划
- `STATE.md`：当前进度、下一步、关键状态
- `chapters/outlines/`：章节或故事单元的大纲
- `chapters/`：章节正文
- `reviews/`：审核、润色、复盘结果
- `research/`：考据与背景研究
- `characters/`：重要人物的详细卡片

这一套结构是 AI Novel Studio 的长期记忆层。日常使用时，优先维护这些文件，而不是把关键信息只留在聊天里。

## 6. 先理解三种作品形态

初始化项目时，AI Novel Studio 会区分三种作品形态：

- `long_form`：中长篇小说，默认保持章节/卷优先推进
- `short_story`：单篇短故事，推荐更轻量的规划与定稿流程
- `story_collection`：短故事集，按故事逐步扩展整体项目

虽然很多命令名仍然沿用 `chapter` 术语，但 AI Novel Studio 会根据 `story_format` 和 `planning_unit` 调整推荐逻辑。

例如：

- 长篇更可能推荐连续章节规划
- 短篇更可能推荐较小范围的规划与快速完成
- 故事集会更偏向“当前故事完成后再推进下一篇”

## 7. 推荐使用流程

### 7.1 从 0 开始创建项目

如果你是从零开始写新作品，推荐流程是：

1. 运行 `ans-new-project` skill；在 Codex 中对应写法是 `$ans-new-project`
2. 根据提示选择作品形态、题材、目标字数、主角设定等
3. 如果是长篇，视需要运行 `$ans-plan-arc`
4. 用 `$ans-plan-batch 1-10` 先铺一批大纲
5. 用 `$ans-write-chapter 1` 开始正式产出
6. 用 `$ans-review 1` 做审核

适用命令示例：

```text
$ans-new-project
$ans-plan-batch 1-10
$ans-write-chapter 1
$ans-review 1
```

### 7.2 接手已有资料

如果当前目录已经有旧稿、设定、人物表、时间线或零散笔记，不要直接新建项目，优先整理：

1. 运行 `$ans-map-base`
2. 检查 `$ans-progress`
3. 必要时先审核已导入内容
4. 再继续规划或写作

示例：

```text
$ans-map-base
$ans-progress
$ans-write-chapter --next
```

### 7.3 长线连载

适合中长篇或持续更新项目：

1. `$ans-plan-arc [卷名]`
2. `$ans-plan-batch START-END`
3. `$ans-write-chapter --next`
4. 周期性运行 `$ans-review START-END`
5. 不确定下一步时先看 `$ans-progress`，想自动推进可用 `$ans-next`

### 7.4 单篇短故事

短故事模式下，不需要过重的长篇脚手架。推荐：

1. `$ans-new-project`
2. 选择短故事模式
3. 用较小范围规划，例如 `$ans-plan-batch 1-1`
4. 用 `$ans-write-chapter 1`
5. 用 `$ans-review 1`

尽管命令表面仍沿用章节命名，但短故事模式下，底层推荐逻辑会更轻量。

### 7.5 短故事集

短故事集模式推荐按“当前故事”逐篇推进：

1. `$ans-new-project`
2. 选择短故事集模式
3. 先规划当前故事，而不是铺太长的章节带
4. 完成当前故事后，再扩展下一篇
5. 用 `$ans-progress` 和 `$ans-next` 查看推荐动作

## 8. 常用命令速查

| 命令 | 用途 |
|------|------|
| `ans-new-project` | 从零初始化一个结构化小说项目 |
| `ans-map-base` | 将已有资料整理进 Novel 标准结构 |
| `ans-plan-arc` | 规划新卷或新阶段 |
| `ans-plan-batch` | 批量生成章节或故事单元大纲 |
| `ans-write-chapter` | 标准创作流程：规划 -> 写作 -> 润色 -> 审核 |
| `ans-quick-draft` | 快速产出草稿 |
| `ans-polish` | 润色正文 |
| `ans-review` | 审核逻辑、人设、时间线、雷点 |
| `ans-research` | 做历史、行业、设定等研究 |
| `ans-progress` | 查看当前项目状态和推荐下一步 |
| `ans-next` | 自动推进到下一条最合理的命令 |
| `ans-help` | 查看命令参考 |

## 9. 什么时候用哪个命令

可以用下面的判断方式：

- **我要开始一个新项目**：用 `new-project`
- **我手里已经有资料**：用 `map-base`
- **我需要先设计下一卷**：用 `plan-arc`
- **我已经知道接下来几章要写什么**：用 `plan-batch`
- **我要正式写正文**：用 `write-chapter`
- **我只想先试写，不走完整流程**：用 `quick-draft`
- **我写完了，要查错和一致性**：用 `review`
- **我不知道当前该做什么**：先用 `progress`
- **我想让工具直接决定下一步**：用 `next`

## 10. Codex 中的执行可靠性说明

如果你在 Codex 中使用 Novel，建议记住两点：

1. 安装成功不等于运行时一定正常委派到命名 agent。
2. 对声明了 `SpawnAgent(...)` 的公开工作流，预期行为是：
   - 按声明使用命名 agent
   - 或在无法保证时直接停止，并提示你先校验安装

当你怀疑 Codex 没有按预期使用 Novel 的命名 agent 时，先执行：

```bash
ans-tool validate --codex --global
node bin/install.js validate --codex --global
ans-tool update --codex --global
```

如果校验失败，先修复安装，再重新运行 `$ans-*` 技能。

## 11. 常见问题

### Q1. 当前目录已经有很多资料，为什么不建议直接 `new-project`？

因为 `new-project` 假设你是从零开始。已有资料更适合先用 `map-base` 做整理和归档，否则容易覆盖或忽略旧内容。

### Q2. 我不确定下一步应该规划、写作还是审核，怎么办？

先运行：

```text
$ans-progress
```

如果你想直接自动推进，再运行：

```text
$ans-next
```

### Q3. 短故事和短故事集为什么还在用 `write-chapter` 这样的命令名？

因为 Novel 复用了统一的命令面，但底层会根据 `story_format` 和 `planning_unit` 调整推荐和产物语义。对用户来说，重点不是命令名是否包含 `chapter`，而是推荐逻辑是否匹配当前作品形态。

### Q4. 我需要先研究再开写吗？

如果涉及真实历史、行业知识、法律、医学、军事、金融等内容，建议先用：

```text
$ans-research [topic]
```

再进入正式写作。

## 12. 最小可行上手路径

如果你只想最快开始使用 Novel，可以直接照下面做：

### 新项目

```text
$ans-new-project
$ans-plan-batch 1-3
$ans-write-chapter 1
$ans-review 1
```

### 旧项目

```text
$ans-map-base
$ans-progress
$ans-write-chapter --next
```

---

如果你只想看命令总表，请使用：

```text
$ans-help
```
