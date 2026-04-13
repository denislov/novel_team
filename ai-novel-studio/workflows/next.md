<purpose>
检测当前小说项目状态，并基于全局建议直接自动推荐并触发下一阶段工作流。
</purpose>

<process>

<step name="init">
通过系统工具注入项目全貌上下文，提取建议命令：
```bash
node bin/ans-tools.cjs init progress --raw
```
若返回报错或者 `project_exists` 为 false，提示并退出。
若存在 `MISSING` 状态记录或结构不全，也提示并退出。
</step>

<step name="show_and_execute">
解析 JSON 中的推断结果：

```markdown
## ANS Next

**项目：** [title]
**作品形态：** [story_format]
**当前卷：** [current_arc]
**当前章节：** 第 [current_chapter] 章

▶ **Next step:** `/ans:[recommended_command] [recommended_args]`
[recommended_reason]
```

打印完这条信息后，**直接执行** (Execute) 该指令。
比如，遇到 `write-chapter 5`，则直接作为子命令呼叫。
如果建议的是手动干预，则将信息透传给用户。
</step>
</process>

<success_criteria>
- [x] 读取 `ans-tools.cjs` 标准接入。
- [x] 正确打印当前状态并将控制流重定向给目标子命令。
</success_criteria>
