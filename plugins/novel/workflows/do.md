<purpose>
分析用户的自然语言描述，并路由到最合适的 `/novel:*` 命令。它只负责分发，不直接执行小说创作本身。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="validate">
如果 `$ARGUMENTS` 为空，使用 AskUserQuestion：

```text
你想做什么？直接描述你的写作目标、卡点、想法或需要处理的章节，我来把它路由到合适的 /novel:* 命令。
```

等待回复后继续。
</step>

<step name="check_project">
检查当前目录是否存在根目录结构项目：

```bash
if [[ -f "PROJECT.md" ]]; then
  PROJECT_EXISTS=true
else
  PROJECT_EXISTS=false
fi
```

有些命令要求已存在项目，有些不要求。
</step>

<step name="route">
按顺序匹配 `$ARGUMENTS`，命中第一条即路由：

| 用户意图 | 路由到 | 原因 |
|----------|--------|------|
| “开始写小说”“创建项目”“初始化设定”“搭建小说工程” | `/novel:new-project` | 需要初始化项目骨架 |
| “整理已有资料”“导入旧稿”“接手现有小说”“把当前目录映射成项目” | `/novel:map-base` | 需要把现有资料整理成结构化项目 |
| “研究”“查资料”“考据”“核实年代/制度/术语/历史” | `/novel:research` | 需要独立研究 |
| “规划新卷”“下一卷怎么写”“设计阶段”“卷结构” | `/novel:plan-arc` | 需要阶段级架构规划 |
| “规划接下来几章”“先出10章大纲”“批量大纲” | `/novel:plan-batch` | 需要连续章节大纲 |
| “写第N章”“继续写下一章”“正式创作” | `/novel:write-chapter` | 标准章节流程 |
| “先快速写出来”“试写”“草稿”“先起一版” | `/novel:quick-draft` | 快速产出草稿 |
| “加人物”“看人物档案”“更新人物设定” | `/novel:character` | 人物管理 |
| “润色”“去AI味”“优化文字”“改文风” | `/novel:polish` | 章节润色 |
| “快速润色”“小修一下”“先扫一遍问题” | `/novel:quick-polish` | 快速润色 |
| “审核”“检查逻辑”“看有没有雷点”“复盘章节” | `/novel:review` | 全量审核 |
| “验证一致性”“查时间线”“核人设” | `/novel:verify` | 一致性验证 |
| “批量写”“自动连载”“自动产出几章” | `/novel:autonomous` | 自动批量创作 |
| “我现在到哪了”“看看进度”“当前状态” | `/novel:progress` | 查看现状 |
| “直接带我做下一步”“继续往下走” | `/novel:next` | 自动推进 |
| “不知道用哪个命令”“给我命令总览”“帮助” | `/novel:help` | 查看命令参考 |

**需要已有项目的命令：**
- 除 `/novel:new-project`、`/novel:map-base`、`/novel:help`、`/novel:research` 之外，都默认要求根目录结构项目已存在。

如果命中了一个需要项目的命令，但 `PROJECT_EXISTS=false`，改为输出：

```markdown
当前目录还没有结构化的 novel 项目。

空目录开新书：`/novel:new-project`
已有散落资料要整理：`/novel:map-base`
如果你只是想先查资料，也可以直接用：`/novel:research ...`
```

然后退出，不继续分发。

**歧义处理：**
如果文本可能同时匹配多个命令，例如“我想先看看下一卷，再顺手规划几章”，使用 AskUserQuestion 提供 2-3 个选项，让用户选最贴近的命令。
</step>

<step name="display">
输出路由结果：

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NOVEL ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**输入：** [截断后的用户描述]
**Routing to：** [目标命令]
**Reason：** [一句话理由]
```
</step>

<step name="dispatch">
调用选中的 `/novel:*` 命令，并尽量把 `$ARGUMENTS` 原样传下去。

如果目标命令明确需要章节号或范围，而文本里没有足够信息，就先用 AskUserQuestion 追问一次，再调用目标命令。

完成分发后停止。
</step>

</process>

<success_criteria>
- [ ] 自然语言输入不为空
- [ ] 只分发，不直接做创作工作
- [ ] 能正确区分需要项目和不需要项目的命令
- [ ] 路由前展示判定结果
- [ ] 歧义时追问，不盲猜
</success_criteria>
