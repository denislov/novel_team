<purpose>
小说项目控制台：在一个终端里查看当前项目全景、识别缺口、推荐下一步，并直接分发到合适的 `/ans:*` 命令。
使用 ans-tools.cjs init manager 获取结构化上下文，替代散碎 grep 拼凑。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="initialize">
通过 ans-tools.cjs 获取完整项目状态（替代 grep 拼凑）：

```bash
INIT=$(node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" init manager 2>/dev/null) || INIT=""

if [[ -z "$INIT" || "$INIT" == *"Error"* ]]; then
  echo "未检测到结构化小说项目。空目录先运行 /ans:new-project；已有资料先运行 /ans:map-base"
  exit 0
fi
```

从 `$INIT` JSON 中提取所有面板数据：
- `title`, `story_format`, `status`, `current_arc`
- `total_chapters`, `total_outlines`, `total_reviews`, `total_words`
- `completed_count`, `total_count`
- `chapter_grid[]` — 每章的 outline/chapter/review 状态
- `recommended_actions[]` — 推荐动作列表
- `all_complete` — 是否全部完成
</step>

<step name="dashboard">
展示结构化状态面板（从 INIT JSON 渲染，替代固定模板）：

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 NOVEL ► MANAGER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

《{title}》  {status} · {current_arc}

【产物总计】大纲 {total_outlines} · 正文 {total_chapters} · 审核 {total_reviews} · 总字数 {total_words}

【章节状态面板】

| #  | 章节            | 大纲 | 正文 | 审核 | 状态   |
|----|-----------------|------|------|------|--------|
```

从 `chapter_grid` 数组渲染每行：
```
| {chapter} | {display_name} | {✓/○/·} | {✓/○/·} | {✓/○/·} | {status_icon} |
```

状态图标映射：
- `complete` → ✓ 完成（绿色）
- `written` → ○ 待审核
- `planned` → ○ 待写作
- `pending` → · 待规划

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【推荐动作】
→ {recommended_actions[0].command} {recommended_actions[0].args}
  ({recommended_actions[0].reason})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</step>

<step name="offer_actions">
使用 AskUserQuestion 提供动作菜单。

**Compound Option 模式（GSD 移植）：** 如果推荐动作明确，第一个选项合并执行：

```
AskUserQuestion(
  header: "请选择动作",
  question: "推荐：{recommended_actions[0].reason}",
  options: [
    "Continue → {recommended_command} {recommended_args}",   // 合并推荐动作
    "Plan → 规划下一批大纲",
    "Write → 写作下一章",
    "Review → 审核待审章节",
    "Polish → 润色章节",
    "Progress → 查看详细进度",
    "Research → 研究考据",
    "Character → 管理人物卡",
    "Validate → 运行一致性检查",
    "Help → 命令帮助",
    "Exit → 退出控制台"
  ]
)
```

**注意：** 菜单选项从 INIT JSON 动态生成。例如：
- 如果 `total_outlines == 0`：移除 Write 选项
- 如果 `all_complete == true`：突出 Polish/Review 选项
- 如果 review_gap > 3：突出 Review 选项
</step>

<step name="handle_action">
按用户选择分发：

| 选择 | 动作 |
|------|------|
| Continue | 调用推荐命令（如 `/ans:write-chapter 19`） |
| Plan | 追问范围 → `/ans:plan-batch {range}` |
| Write | `/ans:write-chapter --next` |
| Review | 自动找最早未审核章节 → `/ans:review {N}` |
| Polish | 追问范围 → `/ans:polish {range}` |
| Progress | `/ans:progress` |
| Research | 追问主题 → `/ans:research` |
| Character | `/ans:character --list` |
| Validate | 运行 `ans-tools.cjs validate consistency` + `validate health`，展示结果 |
| Help | `/ans:help` |
| Exit | 退出 |

执行完一个动作后，重新运行 `ans-tools.cjs init manager` 刷新数据，回到 dashboard。
</step>

</process>

<success_criteria>
- [ ] 通过 init manager 获取结构化数据（不使用 grep）
- [ ] 章节状态面板展示每章的 大纲/正文/审核 三列状态
- [ ] 推荐动作从数据驱动生成（不硬编码）
- [ ] Compound Option 合并推荐动作到第一选项
- [ ] 支持 Validate 选项运行一致性检查
- [ ] 每次动作后刷新面板
</success_criteria>
