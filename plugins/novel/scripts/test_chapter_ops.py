#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("chapter_ops.py")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")


class ChapterOpsTests(unittest.TestCase):
    def run_script(self, root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args, "--root", str(root)],
            text=True,
            capture_output=True,
            check=False,
        )

    def make_project(self, root: Path) -> None:
        write(root / "PROJECT.md", "---\ntitle: 九河城\n---\n# 《九河城》项目设定")
        write(root / "ROADMAP.md", "---\ncurrent_arc: 第一卷\n---\n# 第一卷总纲")
        write(root / "CHARACTERS.md", "# 人物总表")
        write(root / "TIMELINE.md", "# 时间线")
        write(
            root / "STATE.md",
            """
            ---
            project: 九河城
            status: 规划中
            current_arc: 第一卷
            current_chapter: 0
            total_words: 0
            last_updated: 2026-03-31
            ---

            # 当前状态

            ## 进度快照

            | 项目 | 当前值 |
            |------|--------|
            | 当前卷 | 第一卷 |
            | 当前章节 | 第0章 |
            | 总字数 | 0 |
            | 最新完成内容 | 新建项目 |
            | 下一目标 | 第1章大纲 |

            ## 接下来 3 章

            | 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |
            |------|------|----------|----------|------|
            | 第1章 | 待规划 | 待整理 | 待整理 | 未开始 |
            """,
        )

    def test_use_draft_promotes_formal_and_refreshes_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "draft" / "chapter-1-draft.md", "# 第1章\n正文一")
            result = self.run_script(root, "use-draft", "--chapter", "1")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((root / "chapters" / "chapter-1.md").exists())
            state = (root / "STATE.md").read_text(encoding="utf-8")
            self.assertIn("current_chapter: 1", state)

    def test_apply_polish_backs_up_existing_formal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-2.md", "# 第2章\n旧正文")
            write(root / "chapters" / "draft" / "chapter-2-polished.md", "# 第2章\n新正文")
            result = self.run_script(root, "apply-polish", "--chapter", "2", "--force")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertTrue((root / "chapters" / "chapter-2.md").exists())
            self.assertIn("新正文", (root / "chapters" / "chapter-2.md").read_text(encoding="utf-8"))
            self.assertTrue(data["backup_path"])
            self.assertTrue(Path(data["backup_path"]).exists())

    def test_inspect_reports_available_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "draft" / "chapter-3-draft.md", "# 第3章\n草稿")
            result = self.run_script(root, "inspect", "--chapter", "3", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertTrue(data["draft_exists"])
            self.assertFalse(data["formal_exists"])

    def test_use_draft_without_force_rejects_existing_formal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文")
            write(root / "chapters" / "draft" / "chapter-1-draft.md", "# 第1章\n新正文")
            result = self.run_script(root, "use-draft", "--chapter", "1")
            self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
