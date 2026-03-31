# CHAPTER.md Template

Template for `chapters/chapter-[N].md` — the working or publishable chapter manuscript.

<template>

```markdown
---
chapter: [章节号]
title: [章节标题]
arc: [卷名/阶段]
pov: [视角人物]
story_date: [故事时间]
status: draft/polished/published
version: v1
words: 0
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# 第[章节号]章 [章节标题]

> 故事时间：[故事时间]
> 承接章节：第[上一章]章

## 正文

[正文从这里开始。]

[要求：]
[1. 开头 200-300 字内尽快让读者进入状态。]
[2. 主场景重点展开，过渡场景简洁处理。]
[3. 每一段要么推动剧情，要么塑造人物。]

## 章末钩子

[用 1-3 段完成章末钩子。发布版可以保留在正文中，定稿后删除这个标题。]

## 创作备注

- **本章推进目标是否完成**：
- **需要回写的设定**：
- **下一章接口**：
```

</template>

<guidelines>

**定位：**
- `CHAPTER.md` 是正文产物，不是分析报告。
- 模板里的“创作备注”只在草稿阶段使用，定稿后可以删掉或转移到 `STATE.md`。

**草稿阶段：**
- 可以保留备注
- 可以保留占位句
- 可以标记待考据内容

**发布前：**
- 删除占位语和提示语
- 检查 frontmatter 的 `status`、`version`、`words`
- 把状态变化同步到 `STATE.md`、`TIMELINE.md`、`CHARACTERS.md`

</guidelines>
