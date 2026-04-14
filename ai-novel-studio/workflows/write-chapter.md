<purpose>
章节创作全流程：规划 → 写作 → 润色 → 审核。产出可直接发布的章节内容。这是最常用的核心工作流。
本编排器仅负责解析参数、调度任务、以及推进基于状态机的反馈闭环 (Gap Closure)。所有文本理解、创意推理均交由 Subagents 进行。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid ans-creator subagent types (use exact names):
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
```

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
  FILES="PROJECT.md ROADMAP.md TIMELINE.md CHARACTERS.md STATE.md"
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
FILES="PROJECT.md CHARACTERS.md TIMELINE.md STATE.md chapters/outlines/outline-${CHAPTER_NUMBER}.md"

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
      "chapters/chapter-${CHAPTER_NUMBER}.md"
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
      "TIMELINE.md",
      "STATE.md",
      "chapters/outlines/outline-${CHAPTER_NUMBER}.md",
      "chapters/chapter-${CHAPTER_NUMBER}.md"
    ]
  )
  
  # 拦截 ## VERIFICATION COMPLETE
  echo ">>> Workflow 拦截到审核报告。提取返回 JSON..."
  VERIFY_RESULT=$(node bin/ans-tools.cjs verify extract --report "reviews/review-${CHAPTER_NUMBER}.md")
  GAP_TYPE=$(echo "$VERIFY_RESULT" | grep -o '"gap_type":"[^"]*"' | cut -d'"' -f4)
  
  if [[ "$GAP_TYPE" == "structure" ]]; then
    echo "发现严重结构崩塌，进入 replan 回炉..."
    # 唤醒 Planner
    Task(subagent_type: "ans-planner", objective: "修正第 ${CHAPTER_NUMBER} 章大纲", files_to_read: ["reviews/review-${CHAPTER_NUMBER}.md"])
    # 唤醒 Writer
    Task(subagent_type: "ans-writer", objective: "根据新大纲重写", files_to_read: ["chapters/outlines/outline-${CHAPTER_NUMBER}.md"])
  elif [[ "$GAP_TYPE" == "content" ]] || [[ "$GAP_TYPE" == "consistency_drift" ]]; then
    echo "发现内容/人设漂移，进入 rewrite 回炉..."
    Task(subagent_type: "ans-writer", objective: "根据审核建议重写", files_to_read: ["reviews/review-${CHAPTER_NUMBER}.md"])
  fi
fi
```

</verification_phase>

<state_update>

## 7. 结算与状态更新

一切结束后，通过系统级工具更新中心化进度：

```bash
node bin/ans-tools.cjs state refresh --latest-completed "已完成第${CHAPTER_NUMBER}章" --next-goal "第$((CHAPTER_NUMBER + 1))章规划或核对"
```

</state_update>
