# ANS 配置系统参考

## 概述

ANS 使用项目根目录下的 `config.json` 管理项目级配置。
所有 workflow 和 agent 通过 `ans-tools.cjs config get/set` 读写配置。

## 配置 Schema

```json
{
  "story_format": "long_form | short_story | story_collection",
  "language": "zh-CN",
  "target_words_per_chapter": 3000,
  "chapter_word_ceiling": 4000,
  "review_strictness": "relaxed | standard | strict",
  "batch_size": 3,
  "commit_docs": true,
  "model_profile": "quality | balanced | budget | inherit",
  "workflow": {
    "plan_check": true,
    "consistency_check": true,
    "auto_polish": false,
    "research_before_write": false,
    "skip_verify": false,
    "context_monitor_threshold": 0.40
  }
}
```

## 字段说明

### 顶层字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `story_format` | string | `"long_form"` | 故事格式：`long_form`（长篇连载）、`short_story`（短篇）、`story_collection`（故事集） |
| `language` | string | `"zh-CN"` | 写作语言 |
| `target_words_per_chapter` | number | `3000` | 每章目标字数（中文字符数） |
| `chapter_word_ceiling` | number | target+1000 | 每章字数硬上限，超出触发分割建议 |
| `review_strictness` | string | `"standard"` | 审核严格度：`relaxed`（宽松）、`standard`（标准）、`strict`（严格） |
| `batch_size` | number | `3` | autonomous 模式每批章节数（暂停点） |
| `commit_docs` | boolean | `true` | 是否 git commit 文档变更 |
| `model_profile` | string | `"balanced"` | 模型配置档位 |

### workflow 子字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `plan_check` | boolean | `true` | 大纲写作前是否由 plan-checker 检查 |
| `consistency_check` | boolean | `true` | autonomous 模式是否定期运行跨章节一致性检查 |
| `auto_polish` | boolean | `false` | 写作完成后是否自动润色 |
| `research_before_write` | boolean | `false` | 写作前是否强制进行研究考据 |
| `skip_verify` | boolean | `false` | 是否跳过写作后的审核步骤 |
| `context_monitor_threshold` | number | `0.40` | 上下文监控警告阈值（40% 剩余时警告），设为 `0` 禁用 |

## CLI 用法

```bash
# 查看全部配置
node ans-tools.cjs config get

# 查看单个值
node ans-tools.cjs config get target_words_per_chapter

# 查看嵌套值（点分法）
node ans-tools.cjs config get workflow.plan_check

# 设置值（自动类型推导）
node ans-tools.cjs config set batch_size 5
node ans-tools.cjs config set workflow.auto_polish true
```

## 与 GSD 配置的对比

| GSD 配置 | ANS 等价 | 说明 |
|----------|----------|------|
| `granularity` | `review_strictness` | 精细度 |
| `parallelization` | *(不支持)* | Q2 决定不需要并行 |
| `research` | `workflow.research_before_write` | 研究开关 |
| `plan_checker` | `workflow.plan_check` | 规划检查开关 |
| `verifier` | `workflow.skip_verify` | 审核开关（反义） |
| `branching_strategy` | *(不支持)* | 小说项目不需要分支策略 |
| `context_window` | `workflow.context_monitor_threshold` | 上下文管理 |
