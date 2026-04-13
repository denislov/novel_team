<purpose>
将当前目录中已有的小说资料整理成 Novel 的根目录结构项目。适合接手旧稿、从零散文档迁移、或把已有设定库映射成可持续创作的规范工程。
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
Use the bundled `bin/map_base.cjs` for scanning, classification, normalization, report generation, and baseline core-file synthesis.
</required_reading>

<available_agent_types>
Valid ANS subagent types (use exact names):
- ans-architect — 从已有资料综合生成或补全 PROJECT、ROADMAP、CHARACTERS、TIMELINE、STATE
- ans-researcher — 对导入资料中的真实背景或专业细节补做核实
</available_agent_types>

<process>

## 1. 解析参数

```bash
SOURCE_DIR="."
MERGE=false
FORCE=false
DRY_RUN=false

for arg in "$ARGUMENTS"; do
  case $arg in
    --from=*)
      SOURCE_DIR="${arg#*=}"
      ;;
    --merge)
      MERGE=true
      ;;
    --force)
      FORCE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
  esac
done
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--from=DIR` | 指定要扫描的已有资料目录 |
| `--merge` | 当前目录已存在结构化项目时，按合并模式处理 |
| `--force` | 允许覆盖已存在的标准化目标文件 |
| `--dry-run` | 只输出映射计划，不实际写入 |

</process>

<initialization>

## 2. 初始化检查

### 2.1 检查当前是否已是结构化项目

```bash
CORE_COUNT=0
for f in PROJECT.md CHARACTERS.md TIMELINE.md ROADMAP.md STATE.md; do
  [[ -f "$SOURCE_DIR/$f" ]] && CORE_COUNT=$((CORE_COUNT + 1))
done

if [[ "$CORE_COUNT" -ge 3 && "$MERGE" != true ]]; then
  echo "检测到当前目录已经接近或已经是结构化项目。"
  echo "如果需要继续吸收散落资料，请使用 /ans:map-base --merge"
  exit 0
fi
```

### 2.2 创建标准目录

```bash
mkdir -p "$SOURCE_DIR/chapters/draft"
mkdir -p "$SOURCE_DIR/chapters/outlines"
mkdir -p "$SOURCE_DIR/characters"
mkdir -p "$SOURCE_DIR/research"
mkdir -p "$SOURCE_DIR/reviews"
```

</initialization>

<script_phase>

## 2.3 优先执行脚本

先运行插件内置脚本：

```bash
node bin/map_base.cjs --from="$SOURCE_DIR" $([ "$MERGE" = true ] && echo --merge) $([ "$FORCE" = true ] && echo --force) $([ "$DRY_RUN" = true ] && echo --dry-run)
```

脚本负责：

- 扫描资料文件
- 进行启发式分类
- 复制或规范化到 `chapters/`、`characters/`、`research/`、`reviews/`
- 生成 `reviews/map-base-report.md`
- 在缺失时生成或补齐基础核心文件

如果脚本已经完成绝大部分工作，后续步骤只做校验和少量补写。

</script_phase>

<discovery>

## 3. 扫描与分类已有资料

### 3.1 扫描范围

优先扫描 `SOURCE_DIR` 下现有的 markdown、text 和明显的小说资料文件，忽略：

- `.git/`
- `.claude/`
- `.codex/`
- `.agents/`
- `.claude-plugin/`
- `.codex-plugin/`
- `agents/`
- `commands/`
- `references/`
- `bin/`
- `templates/`
- `workflows/`
- 已标准化目录：`chapters/`、`characters/`、`research/`、`reviews/`

### 3.2 分类规则

按文件名、标题、前几段内容做启发式分类：

| 资料类型 | 识别信号 | 目标位置 |
|----------|----------|----------|
| 项目总设定 | 书名、世界观、主角、金手指、禁忌 | `PROJECT.md` |
| 人物资料 | 人物、人设、角色、关系、人物卡 | `CHARACTERS.md` 或 `characters/*.md` |
| 时间线 | 时间线、年表、纪年、事件顺序 | `TIMELINE.md` |
| 卷纲/路线图 | 卷、大纲、阶段、路线图、章节规划 | `ROADMAP.md` |
| 章节正文 | 第N章、chapter-N、正文稿 | `chapters/chapter-N.md` |
| 章节大纲 | 第N章大纲、outline | `chapters/outlines/outline-N.md` |
| 研究资料 | 考据、设定资料、行业资料、史料 | `research/*.md` |
| 审核/修改记录 | 审核、复盘、修改意见 | `reviews/*.md` |

### 3.3 若无可识别资料

如果没有扫描到足够的小说资料：

```markdown
未发现足够的已有小说材料，无法执行 map-base。

空目录或只有很少想法时，直接运行：`/ans:new-project`
如果你有核心设定文档，请把文档放进当前目录后再运行：`/ans:map-base`
```

然后退出。

</discovery>

<mapping>

## 4. 映射到根目录结构

### 4.1 正文章节

- 能明确识别章节号的文件，标准化为 `chapters/chapter-N.md`
- 能明确识别为章节大纲的文件，标准化为 `chapters/outlines/outline-N.md`
- 只能确认是草稿但无法确认章节号的文件，放到 `chapters/draft/`

### 4.2 人物与研究资料

- 单人物档案 -> `characters/[姓名].md`
- 人物总览或关系表 -> 汇总进 `CHARACTERS.md`
- 研究/考据文档 -> `research/[slug].md`
- 审核/修改记录 -> `reviews/[slug].md`

### 4.3 安全规则

- 默认不覆盖已存在的标准化目标文件
- 只有 `--force` 时才允许覆盖
- 无法安全判断归类的文件，不删除，保留原地并在映射报告里列出
- 如果 `--dry-run=true`，只展示计划，不写入文件

</mapping>

<synthesis>

## 5. 综合生成核心文件

基于已扫描和已归类的资料，调用 `ans-architect` 生成或补全：

- `PROJECT.md`
- `CHARACTERS.md`
- `TIMELINE.md`
- `ROADMAP.md`
- `STATE.md`

### 5.1 Architect 输入

```
Task(
  subagent_type: "ans-architect",
  input: map_base_request,
  output: [
    PROJECT.md,
    CHARACTERS.md,
    TIMELINE.md,
    ROADMAP.md,
    STATE.md
  ]
)
```

### 5.2 STATE 初始化原则

STATE.md 至少要反映：

- 当前已导入到第几章
- 当前卷/阶段
- 已知未回收伏笔
- 需要后续补录的人物/设定
- 下一步建议

</synthesis>

<report>

## 6. 生成映射报告

输出 `reviews/map-base-report.md`，至少包含：

- 扫描到的源文件列表
- 成功归类并标准化的文件
- 无法归类的文件
- 自动推断出的风险
- 建议人工补看的内容

</report>

<output>

## 7. 输出摘要

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🧭 资料映射完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【源目录】${SOURCE_DIR}
【模式】$([ "$DRY_RUN" = true ] && echo "预览" || echo "写入")

【核心文件】
- PROJECT.md
- CHARACTERS.md
- TIMELINE.md
- ROADMAP.md
- STATE.md

【标准目录】
- chapters/
- characters/
- research/
- reviews/

【附加报告】
- reviews/map-base-report.md

【建议下一步】
1. 运行 `/ans:progress` 检查当前状态
2. 运行 `/ans:plan-batch` 补齐接下来几章大纲
3. 或直接运行 `/ans:write-chapter --next`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

</output>

<examples>

## 命令示例

```bash
# 在当前目录整理已有资料
/ans:map-base

# 指定目录来源
/ans:map-base --from=./old-book

# 先看映射计划
/ans:map-base --dry-run

# 已有结构化项目时继续吸收散落资料
/ans:map-base --merge
```

</examples>
