<purpose>
检测当前小说项目状态，并自动推进到下一条最合理的命令。目标是让作者不用自己记“现在该先规划、先写、还是先审核”。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="detect_project">
先检查当前目录是否已有 `.novel/` 项目结构：

```bash
if [[ ! -f ".novel/PROJECT.md" ]]; then
  echo "未检测到小说项目。请先运行 /novel:new-project"
  exit 0
fi
```

再检查核心文件是否完整：

```bash
MISSING=()
for f in CHARACTERS.md TIMELINE.md ROADMAP.md STATE.md; do
  [[ -f ".novel/$f" ]] || MISSING+=("$f")
done
```

如果 `MISSING` 非空，输出：

```markdown
## Novel Next

项目结构不完整。

缺失文件：
- [缺失文件列表]

先补齐核心文件后再继续。
```

不要自动调用其他命令，直接退出。
</step>

<step name="collect_state">
用轻量方式收集当前状态：

```bash
TITLE=$(grep -m1 '^title:' .novel/PROJECT.md 2>/dev/null | sed 's/^title:[[:space:]]*//' )
CURRENT_ARC=$(grep -m1 '^current_arc:' .novel/STATE.md 2>/dev/null | sed 's/^current_arc:[[:space:]]*//' )
CURRENT_CHAPTER=$(grep -m1 '^current_chapter:' .novel/STATE.md 2>/dev/null | grep -oE '[0-9]+' )
[[ -z "$CURRENT_CHAPTER" ]] && CURRENT_CHAPTER=0

LATEST_CHAPTER=$(ls .novel/chapters/chapter-*.md 2>/dev/null | grep -oE 'chapter-[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1)
LATEST_OUTLINE=$(ls .novel/chapters/outlines/outline-*.md 2>/dev/null | grep -oE 'outline-[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1)
LATEST_REVIEW=$(ls .novel/reviews/review-*.md 2>/dev/null | grep -oE 'review-[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1)

[[ -z "$LATEST_CHAPTER" ]] && LATEST_CHAPTER=0
[[ -z "$LATEST_OUTLINE" ]] && LATEST_OUTLINE=0
[[ -z "$LATEST_REVIEW" ]] && LATEST_REVIEW=0

NEXT_CHAPTER=$(( CURRENT_CHAPTER + 1 ))
[[ "$LATEST_CHAPTER" -gt "$CURRENT_CHAPTER" ]] && NEXT_CHAPTER=$(( LATEST_CHAPTER + 1 ))
```

再找两个关键位置：

1. 第一个“已有大纲但未写正文”的章节
2. 第一个“已有正文但未审核”的章节

```bash
FIRST_UNWRITTEN=""
for n in $(ls .novel/chapters/outlines/outline-*.md 2>/dev/null | grep -oE '[0-9]+' | sort -n); do
  [[ -f ".novel/chapters/chapter-${n}.md" ]] || { FIRST_UNWRITTEN=$n; break; }
done

FIRST_UNREVIEWED=""
for n in $(ls .novel/chapters/chapter-*.md 2>/dev/null | grep -oE '[0-9]+' | sort -n); do
  [[ -f ".novel/reviews/review-${n}.md" ]] || { FIRST_UNREVIEWED=$n; break; }
done
```
</step>

<step name="route">
按以下规则决定下一步：

**Route 1: 尚未开始规划**
- 条件：`LATEST_CHAPTER = 0` 且 `LATEST_OUTLINE = 0`
- 动作：`/novel:plan-batch 1-10`

**Route 2: 已有大纲但还没写**
- 条件：`FIRST_UNWRITTEN` 非空
- 动作：`/novel:write-chapter {FIRST_UNWRITTEN}`

**Route 3: 已写正文但未审核**
- 条件：`FIRST_UNREVIEWED` 非空
- 动作：`/novel:review {FIRST_UNREVIEWED}`

**Route 4: 规划缓冲不足**
- 条件：`LATEST_OUTLINE < NEXT_CHAPTER`
- 动作：`/novel:plan-batch {NEXT_CHAPTER}-$((NEXT_CHAPTER + 4))`

**Route 5: 已有下一章大纲**
- 条件：`LATEST_OUTLINE >= NEXT_CHAPTER`
- 动作：`/novel:write-chapter {NEXT_CHAPTER}`

如果无法命中任何规则，输出：

```markdown
## Novel Next

无法自动判断下一步。

建议先运行 `/novel:progress` 查看当前状态。
```

退出，不调用命令。
</step>

<step name="show_and_execute">
在自动调用前先输出：

```markdown
## Novel Next

**项目：** [TITLE]
**当前卷：** [CURRENT_ARC]
**当前章节：** 第 [CURRENT_CHAPTER] 章

▶ **Next step:** `/novel:[command] [args]`
[一句话说明为什么这是下一步]
```

然后立即通过 SlashCommand 调用目标命令。
不要询问确认。
</step>

</process>

<success_criteria>
- [ ] 项目存在性检查正确
- [ ] 核心状态和章节产物检测正确
- [ ] 下一步命令选择符合路由规则
- [ ] 在可确定时直接调用下一步命令
</success_criteria>
