<purpose>
查看小说项目进度，汇总当前阶段、章节、规划覆盖、审核覆盖以及最近产物，并给出下一步建议。
</purpose>

<process>

<step name="init">
通过系统工具注入项目全貌上下文，读取为统一上下文 JSON：
```bash
node bin/ans-tools.cjs init progress --raw
```
若返回报错或者 `project_exists` 为 false，告知用户未检测到有效项目（建议 `/ans:new-project` 或 `/ans:map-base`），并终止。
</step>

<step name="report">
利用解析出来的 JSON 数据，向用户输出整洁的 Markdown 进度报告，无需再次调用任何 bash 统计指令。

**Markdown 格式模板：**
```markdown
# [title]

**状态：** [status]
**作品形态：** [story_format]
**规划单位：** [planning_unit]
**当前卷：** [current_arc]
**当前章节：** 第 [current_chapter] 章
**累计字数：** [total_words]

## 整体覆盖度
- 最新大纲落位：第 [latest_outline] 章
- 最新正文产出：第 [latest_chapter] 章
- 最新审核进度：第 [latest_review] 章
- 大纲缓冲 (Buffer)：[outline_buffer] 章
- 待审核差额：[review_gap] 章

## 待办与事件
*(若有相关队列信息或待办数量则在此展示)*

## 下一步建议执行
`/ans:[recommended_command] [recommended_args]`

[recommended_reason]
```
直接利用大语言模型本身的 Markdown 渲染能力将其输出给用户即可。
</step>
</process>

<success_criteria>
- [x] 能通过 `ans-tools.cjs` 标准接入端点获取所有信息。
- [x] 完全杜绝自行书写 bash 来 grep 或计算文件数的黑客行为。
</success_criteria>
