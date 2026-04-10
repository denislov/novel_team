<purpose>
自动连载模式：根据大纲自动产出多章节，仅在遇到设定冲突或需要用户决策时暂停。适合批量创作。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-planner — 章节规划
- novel-writer — 内容产出
- novel-verifier — 质量审核
</available_agent_types>

<codex_execution_policy>
delegation: required_named_agents
public_entrypoint: explicit_public_skills
allow_inline_fallback: false
</codex_execution_policy>

<process>

## 1. 解析参数

```bash
START_CHAPTER=""
END_CHAPTER=""
COUNT=""
BATCH_SIZE=3
PAUSE_ON_ISSUE=true
SKIP_VERIFY=false

for arg in "$ARGUMENTS"; do
  case $arg in
    --from=*)
      START_CHAPTER="${arg#*=}"
      ;;
    --to=*)
      END_CHAPTER="${arg#*=}"
      ;;
    --chapters=*)
      COUNT="${arg#*=}"
      ;;
    --batch=*)
      BATCH_SIZE="${arg#*=}"
      ;;
    --no-pause)
      PAUSE_ON_ISSUE=false
      ;;
    --skip-verify)
      SKIP_VERIFY=true
      ;;
  esac
done

# 从 STATE.md frontmatter 获取当前位置
if [[ -z "$START_CHAPTER" ]]; then
  CURRENT=$(grep -m1 '^current_chapter:' STATE.md 2>/dev/null | grep -oE "[0-9]+")
  [[ -z "$CURRENT" ]] && CURRENT=0
  START_CHAPTER=$((CURRENT + 1))
fi

# 如果用户给了 --chapters=N，在确定 START_CHAPTER 后再算 END_CHAPTER
if [[ -n "$COUNT" && -z "$END_CHAPTER" ]]; then
  END_CHAPTER=$((START_CHAPTER + COUNT - 1))
fi

# 默认创作5章
if [[ -z "$END_CHAPTER" ]]; then
  END_CHAPTER=$((START_CHAPTER + 4))
fi
```

### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--from=N` | 起始章节 | 下一章 |
| `--to=N` | 结束章节 | 起+4 |
| `--chapters=N` | 章节数量 | 5 |
| `--batch=N` | 每批章节数（暂停点） | 3 |
| `--no-pause` | 问题时不暂停 | false |
| `--skip-verify` | 跳过审核 | false |

</process>

<initialization>

## 2. 初始化检查

```bash
# 检查项目
if [[ ! -f "PROJECT.md" ]]; then
  echo "错误：未找到项目文件"
  echo "空目录请先运行 /novel:new-project；已有资料请先运行 /novel:map-base"
  exit 1
fi

# 检查 ROADMAP
if [[ ! -f "ROADMAP.md" ]]; then
  echo "警告：未找到 ROADMAP.md，将自动规划章节"
fi

# 显示启动信息
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🤖 自动连载模式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【项目】《[书名]》
【计划】第 ${START_CHAPTER} 章 → 第 ${END_CHAPTER} 章（共 $((END_CHAPTER - START_CHAPTER + 1)) 章）
【批次】每 ${BATCH_SIZE} 章暂停
【审核】$([ "$SKIP_VERIFY" = false ] && echo "启用" || echo "跳过")

【暂停条件】
$([ "$PAUSE_ON_ISSUE" = true ] && echo "• 发现严重问题时暂停" || echo "• 不暂停，继续执行")
• 每批次完成后暂停

【开始时间】[当前时间]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</initialization>

<main_loop>

## 3. 主循环

```bash
CURRENT_CHAPTER=$START_CHAPTER
BATCH_COUNT=0
COMPLETED=0
ISSUES=0

while [[ $CURRENT_CHAPTER -le $END_CHAPTER ]]; do
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " 📝 第 ${CURRENT_CHAPTER} 章"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 步骤1: 规划
  echo "[1/4] 规划中..."
  PLAN_RESULT=$(SpawnAgent novel-planner chapter=$CURRENT_CHAPTER)
  
  if [[ $PLAN_RESULT == *"needs_input"* ]]; then
    echo "⚠️ 需要用户决策"
    # 暂停并询问
  fi
  
  # 步骤2: 写作
  echo "[2/4] 写作中..."
  WRITE_RESULT=$(SpawnAgent novel-writer chapter=$CURRENT_CHAPTER)
  
  # 步骤3: 审核（如果启用）
  if [[ "$SKIP_VERIFY" = false ]]; then
    echo "[3/4] 审核中..."
    VERIFY_RESULT=$(SpawnAgent novel-verifier chapter=$CURRENT_CHAPTER)
    
    if [[ $VERIFY_RESULT == *"failed"* ]]; then
      ISSUES=$((ISSUES + 1))
      
      if [[ "$PAUSE_ON_ISSUE" = true ]]; then
        echo "🔴 审核未通过"
        # 显示问题并询问
        AskUserQuestion(
          header: "审核问题",
          question: "第 ${CURRENT_CHAPTER} 章审核未通过，如何处理？",
          options: ["自动修复", "跳过继续", "暂停等待"]
        )
        
        case $answer in
          "自动修复")
            # 重新调用 writer 修复
            ;;
          "跳过继续")
            # 记录问题，继续下一章
            ;;
          "暂停等待")
            # 退出循环，等待用户
            break
            ;;
        esac
      fi
    fi
  fi
  
  # 步骤4: 更新状态
  echo "[4/4] 更新状态..."
  CHAPTER_WORDS=$(wc -m < "chapters/chapter-${CURRENT_CHAPTER}.md" | tr -d ' ')
  TOTAL_WORDS=$(grep -m1 '^total_words:' STATE.md 2>/dev/null | grep -oE '[0-9]+')
  [[ -z "$TOTAL_WORDS" ]] && TOTAL_WORDS=0
  UPDATED_TOTAL=$((TOTAL_WORDS + CHAPTER_WORDS))
  perl -0pi -e "s/^status:\\s*.*/status: 连载中/m; s/^current_chapter:\\s*\\d+/current_chapter: ${CURRENT_CHAPTER}/m; s/^total_words:\\s*\\d+/total_words: ${UPDATED_TOTAL}/m" STATE.md
  # 需要时再同步正文区块中的“最近完成内容 / 下一目标 / 风险与阻塞”
  
  COMPLETED=$((COMPLETED + 1))
  BATCH_COUNT=$((BATCH_COUNT + 1))
  
  # 批次暂停检查
  if [[ $BATCH_COUNT -ge $BATCH_SIZE ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " 📊 批次完成"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "已完成：${COMPLETED} / $((END_CHAPTER - START_CHAPTER + 1)) 章"
    
    AskUserQuestion(
      header: "批次完成",
      question: "已完成 ${BATCH_COUNT} 章，是否继续？",
      options: ["继续", "查看进度", "停止"]
    )
    
    case $answer in
      "继续")
        BATCH_COUNT=0
        ;;
      "查看进度")
        # 显示详细进度
        ;;
      "停止")
        break
        ;;
    esac
  fi
  
  CURRENT_CHAPTER=$((CURRENT_CHAPTER + 1))
done
```

</main_loop>

<pause_conditions>

## 4. 暂停条件

### 4.1 审核问题

当 verifier 发现严重问题时：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ⚠️ 审核问题 - 第 ${CHAPTER} 章
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【严重问题】
🔴 问题1：时间线冲突
   - 位置：第3段
   - 说明：本章时间与上章不衔接
   
🔴 问题2：人设不一致
   - 位置：第8段
   - 说明：主角行为与设定矛盾

【处理选项】
1. 自动修复 - 让 writer 根据问题修改
2. 跳过继续 - 记录问题，继续下一章
3. 暂停等待 - 停止自动模式，等待处理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 需要新人物

当章节需要未设定的人物：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👤 需要新人物设定
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【场景】第 ${CHAPTER} 章需要一个新人物

【当前信息】
- 身份：[从规划推断]
- 作用：[在本章的作用]
- 与主角关系：[推断的关系]

【需要补充】
- 姓名
- 性格核心
- 外在标签

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.3 伏笔决策

当需要决定伏笔回收：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🎣 伏笔决策
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【检测到待回收伏笔】
- 伏笔：[伏笔内容]
- 埋设章节：第 X 章
- 当前章节：第 Y 章
- 相隔：Z 章

【决策】
是否在本章回收此伏笔？

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.4 剧情分支

当需要用户选择剧情走向：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🌳 剧情分支
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【场景】第 ${CHAPTER} 章有多个可能的剧情走向

【选项】
A. [走向A] - [后果描述]
B. [走向B] - [后果描述]
C. [走向C] - [后果描述]

【建议】根据 ROADMAP，推荐选择 A

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</pause_conditions>

<progress_report>

## 5. 进度报告

### 实时进度

每完成一章显示：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ 第 ${CURRENT} 章完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【进度】${COMPLETED} / ${TOTAL} 章 ($((COMPLETED * 100 / TOTAL))%)
【字数】累计 ${TOTAL_WORDS} 字
【问题】${ISSUES} 个

【本章】
- 字数：${CHAPTER_WORDS}
- 场景：${SCENES}
- 人物：${CHARACTERS}
- 伏笔：${FORESHADOW}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 最终报告

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🏁 自动连载完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【统计】
- 计划章节：第 ${START} - ${END} 章（共 ${TOTAL} 章）
- 完成章节：${COMPLETED} 章
- 跳过章节：${SKIPPED} 章
- 问题章节：${ISSUES} 章
- 总字数：${TOTAL_WORDS} 字

【耗时】
- 开始时间：${START_TIME}
- 结束时间：${END_TIME}
- 总耗时：${DURATION}

【问题汇总】
[如果有问题，列出]

【文件位置】
- 章节：chapters/chapter-{N}.md
- 大纲：chapters/outlines/outline-{N}.md
- 审核：reviews/review-{N}.md

【下一步】
- 继续创作：/novel:autonomous --from=$((END + 1)) --chapters=5
- 批量润色：/novel:polish ${START}-${END}
- 批量审核：/novel:review ${START}-${END}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</progress_report>

<resume>

## 6. 断点续写

支持从上次暂停处继续：

```bash
# 查看当前状态
/novel:autonomous --status

# 继续创作
/novel:autonomous --continue

# 或指定章节
/novel:autonomous --from=25 --chapters=5
```

状态保存在 `STATE.md` 中。

</resume>

<examples>

## 命令示例

```bash
# 自动创作5章（从下一章开始）
/novel:autonomous

# 指定范围
/novel:autonomous --from=10 --to=20

# 指定章节数
/novel:autonomous --chapters=10

# 调整批次大小
/novel:autonomous --batch=5

# 问题时不暂停
/novel:autonomous --no-pause

# 跳过审核（更快但有风险）
/novel:autonomous --skip-verify

# 组合参数
/novel:autonomous --from=50 --chapters=20 --batch=10 --no-pause
```

</examples>

<warnings>

## 注意事项

### 质量控制

- 自动模式可能产出质量不稳定
- 建议定期人工审核
- 批量创作后使用 `/novel:polish` 和 `/novel:review`

### 上下文限制

- 长时间运行可能丢失早期上下文
- 建议每批不超过10章
- 定期检查人物一致性

### 问题积累

- 跳过的问题会积累
- 建议处理完问题再继续
- 定期使用 `/novel:review` 检查

</warnings>
