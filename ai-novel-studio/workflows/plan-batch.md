<purpose>
批量规划章节：按范围一次性生成多章大纲，确保章节之间目标连续、节奏合理、伏笔有承接。适合正式写作前先铺一段连续的章节蓝图。
本编排器仅负责解析参数、注入状态与上下文，所有大纲推理均由 `ans-planner` Subagent 处理。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid ans-creator subagent types (use exact names):
- ans-planner — 逐章规划大纲专家
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 初始化引擎与上下文

```bash
# 获取全局初始化上下文
INIT=$(node bin/ans-tools.cjs init plan-batch)

if echo "$INIT" | grep -q '"error"'; then
  echo "初始化失败，项目未就绪。"
  exit 1
fi
```

## 2. 解析参数

```bash
RANGE=""
START=""
END=""
GOAL=""
FORCE=false

for arg in "$ARGUMENTS"; do
  case $arg in
    [0-9]*-[0-9]*)
      RANGE="$arg"
      START=$(echo $arg | cut -d'-' -f1)
      END=$(echo $arg | cut -d'-' -f2)
      ;;
    --goal=*)
      GOAL="${arg#*=}"
      ;;
    --force)
      FORCE=true
      ;;
  esac
done

# 如果未提供范围，向用户提问
if [[ -z "$RANGE" ]]; then
  echo "缺少必需的范围参数 (e.g. 11-20)"
  # orchestrator 挂起提问
  AskUserQuestion(
    question="要批量规划哪几章？ (格式: START-END)",
    followUp="请使用带有范围参数的指令重试，例如 /ans:plan-batch 11-20"
  )
  exit 1
fi

mkdir -p chapters/outlines
```

</process>

<planning_flow>

## 3. 编排批量规划流

对于批次内每一章（从 `$START` 到 `$END`），编排器将挂起自身，调用纯认知大脑 `ans-planner` 产出文件。

### 发起规划任务

```bash
for CHAPTER in $(seq $START $END); do
  # 检查是否覆盖
  if [[ -f "chapters/outlines/outline-${CHAPTER}.md" ]] && [[ "$FORCE" == false ]]; then
    echo "章节 ${CHAPTER} 大纲已存在，跳过。使用 --force 覆盖。"
    continue
  fi

  echo "正在编排第 ${CHAPTER} 章的大纲推演任务..."
  
  PREV=$((CHAPTER-1))
  PREV_FILE="chapters/outlines/outline-${PREV}.md"
  
  FILES_TO_READ="PROJECT.md STATE.md ROADMAP.md"
  if [[ -f "$PREV_FILE" ]]; then
    FILES_TO_READ="$FILES_TO_READ $PREV_FILE"
  fi
  
  # 调用认知专家 ans-planner
  Task(
    subagent_type: "ans-planner",
    objective: "规划第 ${CHAPTER} 章大纲",
    batch_goal: "$GOAL",
    files_to_read: [
      $FILES_TO_READ
    ]
  )
  
  # 拦截 ## PLANNING COMPLETE 结构化回复
  # (Task 成功返回后，检查结果是否真的落地)
  if [[ ! -f "chapters/outlines/outline-${CHAPTER}.md" ]]; then
    echo "严重错误：认知引擎未按预期输出文件 chapters/outlines/outline-${CHAPTER}.md！"
    exit 1
  fi
done
```

### 3.4 刷新项目状态队列

批量任务结束后，使用强耦合的状态管理库同步队列：

```bash
# 刷新队列
node bin/ans-tools.cjs state update queue --set "['${START}'-'${END}']"
node bin/ans-tools.cjs state update target_chapter --set "${START}"
```

</planning_flow>

<output>

## 4. 输出日志

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 批量规划完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【范围】第 ${START}-${END} 章
【目标】${GOAL}

【输出文件】
- chapters/outlines/outline-${START}.md ... outline-${END}.md

【建议下一步】
1. 用 /ans:write-chapter ${START} 开始逐章写作
2. 或配合 /ans:autonomous --from=${START} --to=${END}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>
