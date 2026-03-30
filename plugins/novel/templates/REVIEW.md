# REVIEW.md Template

Template for `.novel/reviews/review-[N].md` or other chapter review artifacts — the unified report for consistency, prose quality, and revision guidance.

<template>

```markdown
---
review_type: full/consistency/style
chapter: [章节号或范围]
reviewer: [agent/user]
verdict: pass/revise/block
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# 审核报告 - 第[章节号]章

## 结论

- **结论**：通过/需修改/阻塞
- **一句话总结**：
- **建议下一步**：重写/局部修改/直接进入下一章

## 阻塞问题

| 严重度 | 位置 | 问题 | 为什么是问题 | 修改建议 |
|--------|------|------|--------------|----------|
| 高/中 | 第X段 | | | |
| | | | | |

## 建议优化

| 位置 | 问题类型 | 说明 | 建议 |
|------|----------|------|------|
| 第X段 | 节奏/文笔/人物/设定 | | |
| | | | |

## 一致性检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 人设一致 | 通过/存疑/失败 | |
| 时间线准确 | 通过/存疑/失败 | |
| 金手指限制 | 通过/存疑/失败 | |
| 伏笔安排 | 通过/存疑/失败 | |
| 风格禁忌 | 通过/存疑/失败 | |

## 需要同步更新的文件

- [ ] `STATE.md`
- [ ] `TIMELINE.md`
- [ ] `CHARACTERS.md`
- [ ] `characters/[姓名].md`

## 本章亮点

- 
- 

## 修订后复查清单

- [ ] 已处理所有阻塞问题
- [ ] 已确认章末钩子仍然有效
- [ ] 已回写状态文件
- [ ] 已准备进入下一章
```

</template>

<guidelines>

**定位：**
- `REVIEW.md` 是统一审核接口。
- 无论是逻辑审核、去 AI 味润色，还是全量复盘，都尽量落成这个结构，方便横向对比。

**可以兼容的场景：**
- `review-12.md`
- `review-01-10.md`
- `verification-12.md`
- `edit-report-12.md`

**重点：**
- 先写结论
- 再列问题
- 最后给下一步动作

</guidelines>
