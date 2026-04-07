<purpose>
检测当前小说项目状态，并自动推进到下一条最合理的命令。目标是让作者不用自己记“现在该先规划、先写、还是先审核”。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
Use `node scripts/novel_state.cjs stats` as the source of truth for automatic next-step routing.
</required_reading>

<process>

<step name="detect_project">
先检查当前目录是否已有根目录结构项目：

```bash
if [[ ! -f "PROJECT.md" ]]; then
  echo "未检测到结构化小说项目。空目录请先运行 /novel:new-project；已有资料请先运行 /novel:map-base"
  exit 0
fi
```

再检查核心文件是否完整：

```bash
MISSING=()
for f in CHARACTERS.md TIMELINE.md ROADMAP.md STATE.md; do
  [[ -f "$f" ]] || MISSING+=("$f")
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
用共享状态脚本收集当前状态：

```bash
TITLE=$(node scripts/novel_state.cjs stats --root . --field title)
CURRENT_ARC=$(node scripts/novel_state.cjs stats --root . --field current_arc)
CURRENT_CHAPTER=$(node scripts/novel_state.cjs stats --root . --field current_chapter)
RECOMMENDED_COMMAND=$(node scripts/novel_state.cjs stats --root . --field recommended_command)
RECOMMENDED_ARGS=$(node scripts/novel_state.cjs stats --root . --field recommended_args)
RECOMMENDED_REASON=$(node scripts/novel_state.cjs stats --root . --field recommended_reason)
```
</step>

<step name="show_and_execute">
在自动调用前先输出：

```markdown
## Novel Next

**项目：** [TITLE]
**当前卷：** [CURRENT_ARC]
**当前章节：** 第 [CURRENT_CHAPTER] 章

▶ **Next step:** `/novel:[RECOMMENDED_COMMAND] [RECOMMENDED_ARGS]`
[RECOMMENDED_REASON]
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
