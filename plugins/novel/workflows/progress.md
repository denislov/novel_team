<purpose>
查看小说项目进度，汇总当前卷、当前章节、规划覆盖、审核覆盖和最近产物，并给出下一步建议。目标是让作者在继续创作前快速恢复上下文。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
Use `node scripts/novel_state.cjs stats` as the source of truth for all project counters and next-step recommendation.
</required_reading>

<process>

<step name="init">
检查项目是否存在：

```bash
if [[ ! -f "PROJECT.md" ]]; then
  echo "未检测到结构化小说项目。空目录请运行 /novel:new-project；已有资料请运行 /novel:map-base。"
  exit 0
fi
```

检查核心文件：

```bash
MISSING=()
for f in CHARACTERS.md TIMELINE.md ROADMAP.md STATE.md; do
  [[ -f "$f" ]] || MISSING+=("$f")
done
```

如果有缺失，输出缺失列表并建议先修复，再退出。
</step>

<step name="load_snapshot">
读取项目快照：

```bash
TITLE=$(node scripts/novel_state.cjs stats --root . --field title)
STATUS=$(node scripts/novel_state.cjs stats --root . --field status)
STORY_FORMAT=$(node scripts/novel_state.cjs stats --root . --field story_format)
PLANNING_UNIT=$(node scripts/novel_state.cjs stats --root . --field planning_unit)
CURRENT_ARC=$(node scripts/novel_state.cjs stats --root . --field current_arc)
CURRENT_CHAPTER=$(node scripts/novel_state.cjs stats --root . --field current_chapter)
TOTAL_WORDS=$(node scripts/novel_state.cjs stats --root . --field total_words)
LATEST_OUTLINE=$(node scripts/novel_state.cjs stats --root . --field latest_outline)
LATEST_CHAPTER=$(node scripts/novel_state.cjs stats --root . --field latest_chapter)
LATEST_REVIEW=$(node scripts/novel_state.cjs stats --root . --field latest_review)
OUTLINE_BUFFER=$(node scripts/novel_state.cjs stats --root . --field outline_buffer)
REVIEW_GAP=$(node scripts/novel_state.cjs stats --root . --field review_gap)
RECOMMENDED_COMMAND=$(node scripts/novel_state.cjs stats --root . --field recommended_command)
RECOMMENDED_ARGS=$(node scripts/novel_state.cjs stats --root . --field recommended_args)
RECOMMENDED_REASON=$(node scripts/novel_state.cjs stats --root . --field recommended_reason)

CHAPTER_COUNT=$(find chapters -maxdepth 1 -type f | grep -E '/chapter-[0-9]+\.md$' | wc -l)
OUTLINE_COUNT=$(find chapters/outlines -maxdepth 1 -type f | grep -E '/outline-[0-9]+\.md$' | wc -l)
REVIEW_COUNT=$(find reviews -maxdepth 1 -type f | grep -E '/review-[0-9]+\.md$' | wc -l)
DRAFT_COUNT=$(find chapters/draft -maxdepth 1 -type f 2>/dev/null | wc -l)
RESEARCH_COUNT=$(find research -maxdepth 1 -type f 2>/dev/null | wc -l)
CHARACTER_CARD_COUNT=$(find characters -maxdepth 1 -type f 2>/dev/null | wc -l)
TODO_COUNT=$(rg -c "^- \\[ \\]" STATE.md 2>/dev/null || echo 0)
LATEST_CHAPTER_FILE=$(find chapters -maxdepth 1 -type f | grep -E '/chapter-[0-9]+\.md$' | sort -V | tail -1)
LATEST_REVIEW_FILE=$(find reviews -maxdepth 1 -type f | grep -E '/review-[0-9]+\.md$' | sort -V | tail -1)
LATEST_RESEARCH_FILE=$(find research -maxdepth 1 -type f 2>/dev/null | sort | tail -1)
```
</step>

<step name="report">
输出类似下面的报告：

```markdown
# [TITLE]

**状态：** [STATUS]
**作品形态：** [STORY_FORMAT]
**规划单位：** [PLANNING_UNIT]
**当前卷：** [CURRENT_ARC]
**当前章节：** 第 [CURRENT_CHAPTER] 章
**累计字数：** [TOTAL_WORDS]

## 产物统计
- 正文章节：[CHAPTER_COUNT]
- 章节大纲：[OUTLINE_COUNT]
- 审核报告：[REVIEW_COUNT]
- 快速草稿：[DRAFT_COUNT]
- 研究资料：[RESEARCH_COUNT]
- 人物卡：[CHARACTER_CARD_COUNT]

## 规划覆盖
- 最新大纲：第 [LATEST_OUTLINE] 章
- 最新正文：第 [LATEST_CHAPTER] 章
- 最新审核：第 [LATEST_REVIEW] 章
- 大纲缓冲：[OUTLINE_BUFFER] 章
- 待审核差额：[REVIEW_GAP] 章

## 最近产物
- 正文：[LATEST_CHAPTER_FILE 或 无]
- 审核：[LATEST_REVIEW_FILE 或 无]
- 研究：[LATEST_RESEARCH_FILE 或 无]

## 待办
- 未完成待办：[TODO_COUNT]

## 下一步建议
`/novel:[RECOMMENDED_COMMAND] [RECOMMENDED_ARGS]`

[RECOMMENDED_REASON]

> 说明：推荐逻辑会结合 `[STORY_FORMAT]` 与 `[PLANNING_UNIT]`。
> 长篇默认按章节/卷推进；短故事与短故事集更偏向故事级推进。
```
</step>

</process>

<success_criteria>
- [ ] 能在根目录结构项目中正确汇总进度
- [ ] 能显示规划、写作、审核三层覆盖度
- [ ] 能给出明确的下一步建议
- [ ] 不自动执行下一步，只做汇报
</success_criteria>
