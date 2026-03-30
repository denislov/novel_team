<purpose>
小说项目控制台：在一个终端里查看当前项目全景、识别缺口、推荐下一步，并直接分发到合适的 `/novel:*` 命令。适合中长篇连载中的日常调度。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="initialize">
先检查项目是否存在：

```bash
if [[ ! -f ".novel/PROJECT.md" ]]; then
  echo "未检测到小说项目。先运行 /novel:new-project"
  exit 0
fi
```

读取核心文件和产物统计：

```bash
TITLE=$(grep -m1 '^title:' .novel/PROJECT.md 2>/dev/null | sed 's/^title:[[:space:]]*//')
STATUS=$(grep -m1 '^status:' .novel/STATE.md 2>/dev/null | sed 's/^status:[[:space:]]*//')
CURRENT_ARC=$(grep -m1 '^current_arc:' .novel/STATE.md 2>/dev/null | sed 's/^current_arc:[[:space:]]*//')
CURRENT_CHAPTER=$(grep -m1 '^current_chapter:' .novel/STATE.md 2>/dev/null | grep -oE '[0-9]+')
[[ -z "$CURRENT_CHAPTER" ]] && CURRENT_CHAPTER=0

OUTLINE_COUNT=$(ls .novel/chapters/outlines/outline-*.md 2>/dev/null | wc -l)
CHAPTER_COUNT=$(ls .novel/chapters/chapter-*.md 2>/dev/null | wc -l)
REVIEW_COUNT=$(ls .novel/reviews/review-*.md 2>/dev/null | wc -l)
RESEARCH_COUNT=$(find .novel/research -maxdepth 1 -type f 2>/dev/null | wc -l)
CHARACTER_CARD_COUNT=$(find .novel/characters -maxdepth 1 -type f 2>/dev/null | wc -l)
```

再用与 `/novel:progress` 相同的逻辑推导：
- 下一章号
- 大纲缓冲
- 待审核差额
- 推荐下一步命令
</step>

<step name="dashboard">
展示控制台：

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NOVEL ► MANAGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

《[TITLE]》
状态：[STATUS] · 当前卷：[CURRENT_ARC] · 当前章节：第 [CURRENT_CHAPTER] 章

【产物面板】
- 大纲：[OUTLINE_COUNT]
- 正文：[CHAPTER_COUNT]
- 审核：[REVIEW_COUNT]
- 研究：[RESEARCH_COUNT]
- 人物卡：[CHARACTER_CARD_COUNT]

【当前判断】
- 大纲缓冲：[X] 章
- 待审核差额：[Y] 章
- 推荐下一步：`/novel:[command] [args]`

【可执行动作】
1. Continue recommended action
2. Show progress report
3. Plan next batch
4. Write next chapter
5. Review pending chapter
6. Research a topic
7. Manage characters
8. Show command help
9. Exit manager
```

使用 AskUserQuestion 提供以上选项。
</step>

<step name="handle_action">
按用户选择分发：

- `Continue recommended action` -> 调用推荐命令
- `Show progress report` -> `/novel:progress`
- `Plan next batch` -> 若缺少范围先追问，再 `/novel:plan-batch`
- `Write next chapter` -> `/novel:write-chapter --next`
- `Review pending chapter` -> 若能推断到最早未审核章节则直接 `/novel:review N`，否则先追问
- `Research a topic` -> 追问主题后 `/novel:research`
- `Manage characters` -> `/novel:character --list`
- `Show command help` -> `/novel:help`
- `Exit manager` -> 退出

执行完一个动作后，回到 dashboard。
</step>

</process>

<success_criteria>
- [ ] 能显示项目全景而不是只显示单一文件
- [ ] 能给出推荐下一步
- [ ] 能通过动作菜单分发到现有命令
- [ ] 每次动作后能回到控制台
</success_criteria>
