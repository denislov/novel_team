<purpose>
自动连载模式：根据大纲自动产出多章节，仅在遇到设定冲突或需要用户决策时暂停。
uses structured init context from ans-tools.cjs and includes gap closure mechanism.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid ans-creator subagent types (use exact names):
- ans-planner — 章节规划
- ans-plan-checker — 大纲一致性检查
- ans-writer — 内容产出
- ans-verifier — 质量审核
- ans-consistency-checker — 跨章节一致性检查
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 初始化：通过 ans-tools.cjs 获取结构化上下文

```bash
# 使用 ans-tools.cjs init 替代散碎 grep——获取完整项目状态 JSON
INIT=$(node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" init autonomous 2>/dev/null) || INIT=""

if [[ -z "$INIT" || "$INIT" == *"Error"* ]]; then
  echo "⚠️ ans-tools.cjs init 失败，回退到基础检查"
  [[ ! -f "PROJECT.md" ]] && echo "错误：PROJECT.md 不存在" && exit 1
fi
```

从 `$INIT` JSON 中提取关键字段：
- `title` — 书名
- `story_format` — 格式类型
- `current_chapter` / `next_chapter` — 章节位置
- `outline_buffer` — 大纲储备量
- `recommended_command` / `recommended_args` — 推荐动作
- `config.workflow.plan_check` — 是否启用大纲检查
- `config.workflow.skip_verify` — 是否跳过审核
- `config.workflow.consistency_check` — 是否启用一致性检查

## 2. 解析参数并确定范围

```bash
START_CHAPTER=""
END_CHAPTER=""
COUNT=""
BATCH_SIZE=3
PAUSE_ON_ISSUE=true
SKIP_VERIFY=false

for arg in "$ARGUMENTS"; do
  case $arg in
    --from=*)   START_CHAPTER="${arg#*=}" ;;
    --to=*)     END_CHAPTER="${arg#*=}" ;;
    --chapters=*) COUNT="${arg#*=}" ;;
    --batch=*)  BATCH_SIZE="${arg#*=}" ;;
    --no-pause) PAUSE_ON_ISSUE=false ;;
    --skip-verify) SKIP_VERIFY=true ;;
  esac
done

# 从 INIT JSON 获取 next_chapter（替代 grep STATE.md）
if [[ -z "$START_CHAPTER" ]]; then
  START_CHAPTER=$(echo "$INIT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.next_chapter||1)" 2>/dev/null || echo "1")
fi

# 从 config 读取 batch_size 默认值
CONFIG_BATCH=$(echo "$INIT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.config?.batch_size||3)" 2>/dev/null)
[[ -n "$CONFIG_BATCH" ]] && [[ "$BATCH_SIZE" == "3" ]] && BATCH_SIZE="$CONFIG_BATCH"

# 从 config 读取 skip_verify
CONFIG_SKIP=$(echo "$INIT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.config?.workflow?.skip_verify||false)" 2>/dev/null)
[[ "$CONFIG_SKIP" == "true" ]] && SKIP_VERIFY=true

if [[ -n "$COUNT" && -z "$END_CHAPTER" ]]; then
  END_CHAPTER=$((START_CHAPTER + COUNT - 1))
fi
[[ -z "$END_CHAPTER" ]] && END_CHAPTER=$((START_CHAPTER + 4))
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--from=N` | 起始章节 | 下一章 |
| `--to=N` | 结束章节 | 起+4 |
| `--chapters=N` | 章节数量 | 5 |
| `--batch=N` | 每批章节数（暂停点） | config.batch_size 或 3 |
| `--no-pause` | 问题时不暂停 | false |
| `--skip-verify` | 跳过审核 | config.workflow.skip_verify |

</process>

<initialization>

## 3. 启动面板

从 INIT JSON 渲染状态面板（替代手动拼接）：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🤖 自动连载模式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【项目】《{title}》 ({story_format})
【状态】{status} · {current_arc}
【已有】{current_chapter} 章 · {total_words} 字
【计划】第 {START_CHAPTER} → 第 {END_CHAPTER} 章
【批次】每 {BATCH_SIZE} 章暂停
【审核】{SKIP_VERIFY ? "跳过" : "启用"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</initialization>

<main_loop>

## 4. 主循环：Plan → Write → Verify → Gap Closure

```
for CURRENT_CHAPTER in START..END:

  ┌──────────────────────────────────────────────┐
  │  Step 1: 获取章节上下文                       │
  │  node ans-tools.cjs init write-chapter $N    │
  └──────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────┐
  │  Step 2: 检查大纲                             │
  │  outline_exists? → 直接写作                    │
  │  no outline?     → SpawnAgent ans-planner   │
  └──────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────┐
  │  Step 3: 写作                                 │
  │  SpawnAgent ans-writer chapter=$N           │
  └──────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────┐
  │  Step 4: 审核 (if !SKIP_VERIFY)              │
  │  SpawnAgent ans-verifier chapter=$N         │
  │                                              │
  │  → status: passed     → 继续                  │
  │  → status: gaps_found → Gap Closure (Step 5) │
  │  → status: human_needed → 暂停询问用户        │
  └──────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────┐
  │  Step 5: Gap Closure（最多 1 次）              │
  │  针对 verifier 发现的具体问题：                 │
  │  → Re-plan（如果是结构问题）                   │
  │  → Re-write（如果是内容问题）                  │
  │  → Re-verify                                 │
  │  → 仍有 gaps? → 标记 human_needed, 询问用户    │
  └──────────────────────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────────────────────┐
  │  Step 6: 更新状态                             │
  │  node ans-tools.cjs state refresh            │
  └──────────────────────────────────────────────┘
```

### Step 1: 获取章节上下文

```bash
CHAPTER_INIT=$(node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" init write-chapter "$CURRENT_CHAPTER" 2>/dev/null)
```

从 `$CHAPTER_INIT` 提取：
- `outline_exists` — 是否有大纲
- `chapter_exists` — 是否已有正文（rewrite 模式）
- `chapter_words` / `chapter_word_ceiling` — 字数预算
- `previous_exists` — 前一章是否存在

### Step 2: 检查/创建大纲

如果 `outline_exists == false`：
- SpawnAgent ans-planner，产出 `chapters/outlines/outline-{N}.md`
- 如果 `config.workflow.plan_check == true`：SpawnAgent ans-plan-checker，验证大纲与 CHARACTERS.md / TIMELINE.md 的一致性

如果 `outline_exists == true`：
- 直接进入写作步骤

### Step 3: 写作

```
SpawnAgent ans-writer:
  - 输入: outline, previous chapter, CHARACTERS.md, TIMELINE.md
  - 产出: chapters/draft/chapter-{N}-draft.md
  - 字数目标: chapter_words（不超过 chapter_word_ceiling）
```

写作完成后执行字数检查：
```bash
node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" chapter budget "$CURRENT_CHAPTER" --source draft
```

如果 `budget_status == over_ceiling`：要求 writer 分割或缩减。

### Step 4: 审核

```
SpawnAgent ans-verifier:
  - 输入: chapter draft, outline, CHARACTERS.md, TIMELINE.md
  - 产出结构化 JSON：
    {
      "status": "passed" | "gaps_found" | "human_needed",
      "must_haves": [
        { "item": "人物一致性", "passed": true },
        { "item": "时间线衔接", "passed": true },
        { "item": "伏笔处理", "passed": false, "gap": "第7章埋下的线索未回应" }
      ],
      "gap_summary": "...",
      "recommended_fix": "..."
    }
```

**路由逻辑：**

| 审核结果 | 动作 |
|----------|------|
| `passed` | promote draft → formal，继续下一章 |
| `gaps_found` | 进入 Step 5 Gap Closure |
| `human_needed` | 暂停，用 AskUserQuestion 展示问题 |

### Step 5: Gap Closure

这是与旧版本最大的区别。旧版本审核失败只能让 writer 重写或跳过。
新版本引入**结构化 Gap Closure**：

1. **分析 gap 类型：**
   - `structural` — 大纲级问题（情节逻辑、时间线）→ 需要 re-plan
   - `content` — 内容级问题（人物行为、对话质量）→ 需要 re-write
   - `consistency` — 跨章节问题（设定矛盾）→ 需要 human_needed

2. **针对性修复（最多 1 次自动重试）：**

```
if gap_type == "structural":
  SpawnAgent ans-planner (修复模式: 只修改大纲中的问题部分)
  SpawnAgent ans-writer (基于修复后的大纲重写)
elif gap_type == "content":
  SpawnAgent ans-writer (修复模式: 只修改正文中的问题段落)
```

3. **Re-verify：**
```
SpawnAgent ans-verifier (chapter=$N)
if still gaps_found or human_needed:
  → 标记问题，询问用户：
    AskUserQuestion(
      header: "Gap Closure 未完全解决",
      question: "第 $N 章仍有以下问题，如何处理？\n{remaining_gaps}",
      options: ["接受当前版本继续", "手动修复后继续", "停止自动模式"]
    )
```

### Step 6: 更新状态

```bash
# Promote draft → formal
node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" chapter promote "$CURRENT_CHAPTER" --source draft --force

# Refresh STATE.md（替代手动 perl 替换）
node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" state refresh
```

</main_loop>

<batch_checkpoint>

## 5. 批次暂停

每 BATCH_SIZE 章后暂停，展示进度：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📊 批次完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【进度】{COMPLETED} / {TOTAL} 章 ({PERCENT}%)
【字数】累计 {TOTAL_WORDS} 字
【问题】{ISSUES} 个 ({GAP_CLOSURES} 次 Gap Closure)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion(
  header: "批次完成",
  question: "已完成 {BATCH_SIZE} 章，是否继续？",
  options: ["继续下一批", "查看详细进度 (运行 /ans:progress)", "停止自动模式"]
)

</batch_checkpoint>

<consistency_checkpoint>

## 6. 跨章节一致性检查点（新增）

当 `config.workflow.consistency_check == true` 时，每 5 章（可配置）运行结构化一致性检查：

```bash
node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" validate consistency
SpawnAgent ans-consistency-checker range="1-$CURRENT_CHAPTER"
```

如果发现人物名不一致、时间线冲突等问题，在下一批次暂停时展示给用户。

</consistency_checkpoint>

<progress_report>

## 7. 进度报告

### 实时进度（每完成一章）

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ 第 {CURRENT} 章完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【进度】{COMPLETED} / {TOTAL} 章
【字数】+{CHAPTER_WORDS} → 累计 {TOTAL_WORDS}
【审核】{VERIFY_STATUS}
【Gap Closure】{GAP_CLOSURE_USED ? "已触发" : "未需要"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 最终报告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🏁 自动连载完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【统计】
- 完成：{COMPLETED} / {TOTAL} 章
- 字数：{TOTAL_WORDS} 字
- Gap Closure：{GAP_CLOSURES} 次
- 未解决问题：{REMAINING_ISSUES} 个

【下一步】
- 继续创作：/ans:autonomous --from={NEXT}
- 批量润色：/ans:polish {START}-{END}
- 查看进度：/ans:progress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</progress_report>

<warnings>

## 注意事项

### 上下文管理
- 自动模式会消耗大量上下文窗口
- 每批次暂停时，orchestrator 可检查 context 使用量
- 如果 context > 60%，建议结束当前 session，下次 /ans:autonomous --continue

### Gap Closure 限制
- 每章最多 1 次自动 Gap Closure，防止无限循环
- consistency 类型的 gap 始终路由到 human_needed
- Gap Closure 不会修改已 promote 的章节

### 质量控制
- 建议 BATCH_SIZE ≤ 5（过大会导致问题积累）
- 定期使用 /ans:review 进行人工审核
- 每卷结束时运行 /ans:validate consistency

</warnings>
