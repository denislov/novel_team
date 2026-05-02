<purpose>
章节创作全流程：规划 → 写作 → 润色 → 审核。产出可直接发布的章节内容。这是最常用的核心工作流。
本编排器仅负责解析参数、调度任务、以及推进基于状态机的反馈闭环 (Gap Closure)。所有文本理解、创意推理均交由 Subagents 进行。
</purpose>

<required_reading>
Read the command-level execution_context before starting.
Load support-bundle references and templates only when this workflow or its delegated agents need them.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-planner — 创建章节大纲
- ans-plan-checker — 检查大纲一致性
- ans-writer — 产出章节正文
- ans-editor — 润色优化文字
- ans-verifier — 一致性与质量审核
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 引擎初始化

```bash
INIT=$(node bin/ans-tools.cjs init write-chapter)

if echo "$INIT" | grep -q '"error"'; then
  echo "初始化失败，项目未就绪。"
  exit 1
fi

PLAN_CHECK_ENABLED=$(echo "$INIT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.config?.workflow?.plan_check !== false)" 2>/dev/null)
ANS_SUPPORT_ROOT="$HOME/.claude/ai-novel-studio"
ANS_WRITING_GUIDE="$ANS_SUPPORT_ROOT/references/writing-guide.md"
ANS_COMMON_PITFALLS="$ANS_SUPPORT_ROOT/references/common-pitfalls.md"
ANS_OUTLINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHAPTER-OUTLINE.md"
ANS_CHAPTER_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHAPTER.md"
ANS_CHARACTER_CARD_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTER-CARD.md"
ANS_REVIEW_TEMPLATE="$ANS_SUPPORT_ROOT/templates/REVIEW.md"
ANS_STATE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/STATE.md"
ANS_TIMELINE_TEMPLATE="$ANS_SUPPORT_ROOT/templates/TIMELINE.md"
```

> **Centralized files_to_read**: `INIT` 的 JSON 包含 `files_to_read.<role>` 字段（roles: `planner` / `plan_checker` / `writer` / `editor` / `verifier` / `architect_character_update`），由 `bin/lib/init.cjs:buildWriteChapterFilesToRead()` 单点维护。下面各 Task() 的 `files_to_read:` 数组可以用以下方式从中提取，避免每个工作流自己维护一份脆弱的拼接逻辑：
>
> ```bash
> PLANNER_FILES=$(echo "$INIT" | node -e "
>   const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
>   console.log(d.files_to_read.planner.join(' '));
> ")
> # 然后 Task(... files_to_read: [ $PLANNER_FILES ] )
> ```
>
> 当前下面的 Task() 调用仍保留显式的 inline 文件列表作为 fallback —— 这两套是同步的，先保留 inline 形式确保兼容，后续 workflow 可以渐进迁移到完全消费 `INIT.files_to_read`。如果 inline 列表与 `init.cjs` 的中央列表漂移了，以 `init.cjs` 为准。

## 2. 解析运行参数

```bash
CHAPTER_NUMBER=""
SKIP_PLAN=false
SKIP_POLISH=false
SKIP_VERIFY=false
DRAFT_MODE=false
USE_NEXT=false

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*) CHAPTER_NUMBER=$arg ;;
    --skip-plan) SKIP_PLAN=true ;;
    --skip-polish) SKIP_POLISH=true ;;
    --skip-verify) SKIP_VERIFY=true ;;
    --draft)
      DRAFT_MODE=true
      SKIP_POLISH=true
      SKIP_VERIFY=true
      ;;
    --next) USE_NEXT=true ;;
  esac
done

if [[ "$USE_NEXT" == true ]] || [[ -z "$CHAPTER_NUMBER" ]]; then
  CHAPTER_NUMBER=$(echo "$INIT" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).next_chapter || 1)" 2>/dev/null)
fi

mkdir -p chapters/outlines chapters/draft reviews
```

</process>

<planning_phase>

## 3. 规划阶段 (Planning)

如果 `SKIP_PLAN == false` 且大纲不存在，则启动挂起规划推演。

如果 `chapters/outlines/outline-${CHAPTER_NUMBER}.md` 已经存在，则默认跳过规划以避免覆盖（除非进入纠偏循环）。

```bash
if [[ "$SKIP_PLAN" == "false" ]] && [[ ! -f "chapters/outlines/outline-${CHAPTER_NUMBER}.md" ]]; then
  PREV=$((CHAPTER_NUMBER-1))
  FILES="PROJECT.md ROADMAP.md TIMELINE.md CHARACTERS.md STATE.md $ANS_WRITING_GUIDE $ANS_OUTLINE_TEMPLATE"
  [[ -f "chapters/outlines/outline-${PREV}.md" ]] && FILES="$FILES chapters/outlines/outline-${PREV}.md"

  Task(
    subagent_type: "ans-planner",
    objective: "规划第 ${CHAPTER_NUMBER} 章大纲",
    files_to_read: [ $FILES ]
  )
  
  # Agent 返回后，检查产物
  if [[ ! -f "chapters/outlines/outline-${CHAPTER_NUMBER}.md" ]]; then
    echo "错误：大纲生成失败。"
    AskUserQuestion("规划任务失败，是否重试？")
  fi

  if [[ "$PLAN_CHECK_ENABLED" == "true" ]]; then
    Task(
      subagent_type: "ans-plan-checker",
      objective: "检查第 ${CHAPTER_NUMBER} 章大纲的一致性",
      files_to_read: [
        "PROJECT.md",
        "CHARACTERS.md",
        "TIMELINE.md",
        "ROADMAP.md",
        "STATE.md",
        "chapters/outlines/outline-${CHAPTER_NUMBER}.md"
      ]
    )
  fi
fi
```

</planning_phase>

<writing_phase>

## 4. 核心写作阶段 (Writing)

编排器将挂起自身，将写作预算和必要的上下文交给纯认知执行引擎 `ans-writer`。

```bash
PREV1=$((CHAPTER_NUMBER-1))
PREV2=$((CHAPTER_NUMBER-2))
FILES="PROJECT.md CHARACTERS.md TIMELINE.md STATE.md chapters/outlines/outline-${CHAPTER_NUMBER}.md $ANS_WRITING_GUIDE $ANS_CHAPTER_TEMPLATE"

[[ -f "chapters/chapter-${PREV1}.md" ]] && FILES="$FILES chapters/chapter-${PREV1}.md"
[[ -f "chapters/chapter-${PREV2}.md" ]] && FILES="$FILES chapters/chapter-${PREV2}.md"

Task(
  subagent_type: "ans-writer",
  objective: "完成第 ${CHAPTER_NUMBER} 章正文",
  files_to_read: [ $FILES ]
)

# 等待解析 ## WRITING COMPLETE
if [[ ! -f "chapters/chapter-${CHAPTER_NUMBER}.md" ]]; then
  echo "错误：正文产出失败。"
  exit 1
fi
```

### 4.2 字数闸门核查

```bash
node bin/ans-tools.cjs chapter budget ${CHAPTER_NUMBER} --source formal

# 如果超出预算，ans-tools 将拦截。后续可在这里实现自主裁切与重新规划。
```

</writing_phase>

<polish_phase>

## 5. 润色阶段 (Polish/Edit)

如果 `SKIP_POLISH == false`：

编排器召唤 `ans-editor` 进行句子级修缮。若它未返回任何重大修改，则使用原稿。

```bash
if [[ "$SKIP_POLISH" == "false" ]]; then
  Task(
    subagent_type: "ans-editor",
    objective: "润色第 ${CHAPTER_NUMBER} 章草稿",
    files_to_read: [
      "PROJECT.md",
      "CHARACTERS.md",
      "chapters/chapter-${CHAPTER_NUMBER}.md",
      "$ANS_WRITING_GUIDE",
      "$ANS_REVIEW_TEMPLATE",
      "$ANS_CHAPTER_TEMPLATE"
    ]
  )
  
  # 若 editor 给出了 polished 候选版本则覆盖
  if [[ -f "chapters/draft/chapter-${CHAPTER_NUMBER}-polished.md" ]]; then
    mv "chapters/draft/chapter-${CHAPTER_NUMBER}-polished.md" "chapters/chapter-${CHAPTER_NUMBER}.md"
  fi
fi
```

</polish_phase>

<verification_phase>

## 6. 审核与纠偏合拢 (Gap Closure)

如果 `SKIP_VERIFY == false`：

调用深层验证引擎 `ans-verifier` 对产出内容进行全面审计，读取它的结构化返回，并触发 Gap Closure。

```bash
if [[ "$SKIP_VERIFY" == "false" ]]; then
  Task(
    subagent_type: "ans-verifier",
    objective: "审核第 ${CHAPTER_NUMBER} 章",
    files_to_read: [
      "PROJECT.md",
      "CHARACTERS.md",
      "TIMELINE.md",
      "STATE.md",
      "chapters/outlines/outline-${CHAPTER_NUMBER}.md",
      "chapters/chapter-${CHAPTER_NUMBER}.md",
      "$ANS_COMMON_PITFALLS",
      "$ANS_REVIEW_TEMPLATE",
      "$ANS_STATE_TEMPLATE",
      "$ANS_TIMELINE_TEMPLATE"
    ],
    output: "reviews/review-${CHAPTER_NUMBER}.md"
  )
  
  # 拦截 ## VERIFICATION COMPLETE
  echo ">>> Workflow 拦截到审核报告。提取返回 JSON..."
  VERIFY_RESULT=$(node bin/ans-tools.cjs verify extract --report "reviews/review-${CHAPTER_NUMBER}.md")
  GAP_TYPE=$(echo "$VERIFY_RESULT" | grep -o '"gap_type":"[^"]*"' | cut -d'"' -f4)
  
  if [[ "$GAP_TYPE" == "structure" ]]; then
    echo "发现严重结构崩塌，进入 replan 回炉..."
    # 唤醒 Planner
    Task(
      subagent_type: "ans-planner",
      objective: "修正第 ${CHAPTER_NUMBER} 章大纲",
      files_to_read: [
        "PROJECT.md",
        "ROADMAP.md",
        "TIMELINE.md",
        "CHARACTERS.md",
        "STATE.md",
        "reviews/review-${CHAPTER_NUMBER}.md",
        "$ANS_WRITING_GUIDE",
        "$ANS_OUTLINE_TEMPLATE"
      ]
    )
    # 唤醒 Writer
    Task(
      subagent_type: "ans-writer",
      objective: "根据新大纲重写",
      files_to_read: [
        "PROJECT.md",
        "CHARACTERS.md",
        "TIMELINE.md",
        "STATE.md",
        "chapters/outlines/outline-${CHAPTER_NUMBER}.md",
        "reviews/review-${CHAPTER_NUMBER}.md",
        "$ANS_WRITING_GUIDE",
        "$ANS_CHAPTER_TEMPLATE"
      ]
    )
  elif [[ "$GAP_TYPE" == "content" ]] || [[ "$GAP_TYPE" == "consistency_drift" ]]; then
    echo "发现内容/人设漂移，进入 rewrite 回炉..."
    Task(
      subagent_type: "ans-writer",
      objective: "根据审核建议重写",
      files_to_read: [
        "PROJECT.md",
        "CHARACTERS.md",
        "TIMELINE.md",
        "STATE.md",
        "chapters/outlines/outline-${CHAPTER_NUMBER}.md",
        "chapters/chapter-${CHAPTER_NUMBER}.md",
        "reviews/review-${CHAPTER_NUMBER}.md",
        "$ANS_WRITING_GUIDE",
        "$ANS_CHAPTER_TEMPLATE"
      ]
    )
  fi

  # Re-verify after gap closure
  echo ">>> Re-verifying after gap closure..."
  Task(
    subagent_type: "ans-verifier",
    objective: "重新审核第 ${CHAPTER_NUMBER} 章（差距闭合后）",
    files_to_read: [
      "PROJECT.md",
      "CHARACTERS.md",
      "TIMELINE.md",
      "STATE.md",
      "chapters/outlines/outline-${CHAPTER_NUMBER}.md",
      "chapters/chapter-${CHAPTER_NUMBER}.md",
      "$ANS_COMMON_PITFALLS",
      "$ANS_REVIEW_TEMPLATE",
      "$ANS_STATE_TEMPLATE",
      "$ANS_TIMELINE_TEMPLATE"
    ],
    output: "reviews/review-${CHAPTER_NUMBER}.md"
  )
fi
```

</verification_phase>

<character_update_phase>

## 6.5 后审核信号路由 (needs_character_update / needs_state_update)

审核完成后，从最新的 `reviews/review-${CHAPTER_NUMBER}.md` 中重新提取结构化判定，把 `needs_character_update` 与 `needs_state_update` 两个布尔信号路由给后续阶段。这是 verifier 与编排器之间的合同：

| 信号 | 由 verifier 在哪里说 | 编排器接通到 |
|------|----------------------|--------------|
| `needs_character_update: true` | JSON flag + 报告正文「## 人物状态变化」表 | architect (mode: character_card_update) |
| `needs_state_update: true` | JSON flag + 报告 `summary` 字段 | `state refresh --latest-completed "$VERIFIER_SUMMARY"` (用 verifier 写的 summary 作为 STATE.md 的 latest_completed 字段，而不是泛化的「已完成第N章」模板) |

```bash
NEEDS_CHAR_UPDATE=""
NEEDS_STATE_UPDATE=""
VERIFIER_SUMMARY=""

if [[ "$SKIP_VERIFY" == "false" ]]; then
  FINAL_VERIFY=$(node bin/ans-tools.cjs verify extract --report "reviews/review-${CHAPTER_NUMBER}.md")
  NEEDS_CHAR_UPDATE=$(echo "$FINAL_VERIFY" | grep -o '"needs_character_update":\s*true' || true)
  NEEDS_STATE_UPDATE=$(echo "$FINAL_VERIFY" | grep -o '"needs_state_update":\s*true' || true)
  VERIFIER_SUMMARY=$(echo "$FINAL_VERIFY" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    process.stdout.write(d.summary || '');
  " 2>/dev/null || true)

  if [[ -n "$NEEDS_CHAR_UPDATE" ]]; then
    echo ">>> Verifier 标记 needs_character_update=true，唤醒 architect 进入单卡更新模式..."
    Task(
      subagent_type: "ans-architect",
      objective: "根据第 ${CHAPTER_NUMBER} 章审核结果同步更新涉及人物的 characters/<姓名>.md 单卡",
      files_to_read: [
        "PROJECT.md",
        "CHARACTERS.md",
        "STATE.md",
        "chapters/chapter-${CHAPTER_NUMBER}.md",
        "reviews/review-${CHAPTER_NUMBER}.md",
        "$ANS_CHARACTER_CARD_TEMPLATE"
      ],
      mode: "character_card_update"
    )
    # architect 应基于 review 的「人物状态变化」表逐人物更新或新建 characters/<姓名>.md。
    # 它不修改 CHARACTERS.md 总表 —— 总表的同步由后续 state refresh 处理。
  fi
fi
```

注意：在 `<process>` 节顶部的变量声明里需要确保 `ANS_CHARACTER_CARD_TEMPLATE="$ANS_SUPPORT_ROOT/templates/CHARACTER-CARD.md"` 已经被 export，与 `ANS_WRITING_GUIDE`、`ANS_CHAPTER_TEMPLATE` 等模板变量并列。

</character_update_phase>

<state_update>

## 7. 结算与状态更新

### 7.1 规范化章节产物

在状态更新之前，先把正式章节文件规范化为干净 schema —— 删除 writer/editor 可能漏写的 `## 章节元数据 / ## 创作备注 / ## 自检清单` 等元数据尾段，把 frontmatter 收口到 `bin/lib/schemas.cjs` 的 CHAPTER_FRONTMATTER 字段集合。`chapter normalize` 是幂等的，已经合规的文件会得到 `no_op: true` 不会重写：

```bash
node bin/ans-tools.cjs chapter normalize ${CHAPTER_NUMBER} --source formal
```

### 7.2 刷新中心化状态

如果 verifier 在 6.5 阶段标记了 `needs_state_update: true`，使用它写的 `summary` 作为 STATE.md 的 `latest_completed` —— 这比泛化的「已完成第N章」模板信息量更大。否则退回模板：

```bash
if [[ -n "$NEEDS_STATE_UPDATE" && -n "$VERIFIER_SUMMARY" ]]; then
  node bin/ans-tools.cjs state refresh \
    --latest-completed "$VERIFIER_SUMMARY" \
    --next-goal "第$((CHAPTER_NUMBER + 1))章规划或核对"
else
  node bin/ans-tools.cjs state refresh \
    --latest-completed "已完成第${CHAPTER_NUMBER}章" \
    --next-goal "第$((CHAPTER_NUMBER + 1))章规划或核对"
fi
```

</state_update>
