<purpose>
查看小说项目进度，汇总当前卷、当前章节、规划覆盖、审核覆盖和最近产物，并给出下一步建议。目标是让作者在继续创作前快速恢复上下文。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init">
检查项目是否存在：

```bash
if [[ ! -f ".novel/PROJECT.md" ]]; then
  echo "未检测到小说项目。运行 /novel:new-project 开始。"
  exit 0
fi
```

检查核心文件：

```bash
MISSING=()
for f in CHARACTERS.md TIMELINE.md ROADMAP.md STATE.md; do
  [[ -f ".novel/$f" ]] || MISSING+=("$f")
done
```

如果有缺失，输出缺失列表并建议先修复，再退出。
</step>

<step name="load_snapshot">
读取项目快照：

```bash
TITLE=$(grep -m1 '^title:' .novel/PROJECT.md 2>/dev/null | sed 's/^title:[[:space:]]*//')
STATUS=$(grep -m1 '^status:' .novel/STATE.md 2>/dev/null | sed 's/^status:[[:space:]]*//')
CURRENT_ARC=$(grep -m1 '^current_arc:' .novel/STATE.md 2>/dev/null | sed 's/^current_arc:[[:space:]]*//')
CURRENT_CHAPTER=$(grep -m1 '^current_chapter:' .novel/STATE.md 2>/dev/null | grep -oE '[0-9]+')
TOTAL_WORDS=$(grep -m1 '^total_words:' .novel/STATE.md 2>/dev/null | grep -oE '[0-9]+')

[[ -z "$CURRENT_CHAPTER" ]] && CURRENT_CHAPTER=0
[[ -z "$TOTAL_WORDS" ]] && TOTAL_WORDS=0
[[ -z "$STATUS" ]] && STATUS="规划中"
```

统计主要产物数量：

```bash
CHAPTER_COUNT=$(ls .novel/chapters/chapter-*.md 2>/dev/null | wc -l)
OUTLINE_COUNT=$(ls .novel/chapters/outlines/outline-*.md 2>/dev/null | wc -l)
REVIEW_COUNT=$(ls .novel/reviews/review-*.md 2>/dev/null | wc -l)
DRAFT_COUNT=$(ls .novel/chapters/draft/*.md 2>/dev/null | wc -l)
RESEARCH_COUNT=$(find .novel/research -maxdepth 1 -type f 2>/dev/null | wc -l)
CHARACTER_CARD_COUNT=$(find .novel/characters -maxdepth 1 -type f 2>/dev/null | wc -l)
TODO_COUNT=$(rg -c "^- \\[ \\]" .novel/STATE.md 2>/dev/null || echo 0)
```

找最近产物：

```bash
LATEST_CHAPTER_FILE=$(ls -t .novel/chapters/chapter-*.md 2>/dev/null | head -1)
LATEST_REVIEW_FILE=$(ls -t .novel/reviews/review-*.md 2>/dev/null | head -1)
LATEST_RESEARCH_FILE=$(ls -t .novel/research/*.md 2>/dev/null | head -1)
```
</step>

<step name="coverage">
计算两个覆盖指标：

```bash
LATEST_OUTLINE=$(ls .novel/chapters/outlines/outline-*.md 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)
LATEST_CHAPTER=$(ls .novel/chapters/chapter-*.md 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)
LATEST_REVIEW=$(ls .novel/reviews/review-*.md 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)

[[ -z "$LATEST_OUTLINE" ]] && LATEST_OUTLINE=0
[[ -z "$LATEST_CHAPTER" ]] && LATEST_CHAPTER=0
[[ -z "$LATEST_REVIEW" ]] && LATEST_REVIEW=0

OUTLINE_BUFFER=$((LATEST_OUTLINE - CURRENT_CHAPTER))
[[ "$OUTLINE_BUFFER" -lt 0 ]] && OUTLINE_BUFFER=0

REVIEW_GAP=$((LATEST_CHAPTER - LATEST_REVIEW))
[[ "$REVIEW_GAP" -lt 0 ]] && REVIEW_GAP=0
```

再沿用 `/novel:next` 的路由逻辑，计算推荐下一步命令，但不要自动执行。
</step>

<step name="report">
输出类似下面的报告：

```markdown
# [TITLE]

**状态：** [STATUS]
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
`/novel:[command] [args]`

[一句话解释为什么推荐这一步]
```
</step>

</process>

<success_criteria>
- [ ] 能在 `.novel/` 项目中正确汇总进度
- [ ] 能显示规划、写作、审核三层覆盖度
- [ ] 能给出明确的下一步建议
- [ ] 不自动执行下一步，只做汇报
</success_criteria>
