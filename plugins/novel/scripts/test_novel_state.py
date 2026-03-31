#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("novel_state.py")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")


class NovelStateTests(unittest.TestCase):
    def run_script(self, root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args, "--root", str(root)],
            text=True,
            capture_output=True,
            check=False,
        )

    def make_project(self, root: Path) -> None:
        write(
            root / "PROJECT.md",
            """
            ---
            title: 九河城
            ---
            # 《九河城》项目设定
            """,
        )
        write(
            root / "ROADMAP.md",
            """
            ---
            current_arc: 第一卷
            ---
            # 第一卷总纲
            """,
        )
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

    def test_stats_prefers_formal_chapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            write(root / "chapters" / "chapter-2.md", "# 第2章\n正文二")
            write(root / "chapters" / "chapter-2-edited.md", "# 第2章修订稿\n不应统计")
            write(root / "chapters" / "outlines" / "outline-3.md", "# 第3章大纲")
            result = self.run_script(root, "stats", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["current_chapter"], 2)
            self.assertEqual(data["latest_outline"], 3)
            self.assertEqual(data["recommended_command"], "write-chapter")
            self.assertEqual(data["recommended_args"], "3")

    def test_refresh_updates_frontmatter_and_queue(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            write(root / "chapters" / "outlines" / "outline-2.md", "---\ntitle: 黑市试探\n---")
            result = self.run_script(root, "refresh")
            self.assertEqual(result.returncode, 0, result.stderr)
            state = (root / "STATE.md").read_text(encoding="utf-8")
            self.assertIn("current_chapter: 1", state)
            self.assertIn("total_words: ", state)
            self.assertIn("| 第2章 | 黑市试探 | 待整理 | 待整理 | 待写作 |", state)

    def test_stats_review_gap_and_first_unreviewed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            write(root / "chapters" / "chapter-2.md", "# 第2章\n正文二")
            write(root / "reviews" / "review-1.md", "# review 1")
            result = self.run_script(root, "stats", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["review_gap"], 1)
            self.assertEqual(data["first_unreviewed"], 2)
            self.assertEqual(data["recommended_command"], "review")
            self.assertEqual(data["recommended_args"], "2")

    def test_stats_field_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            result = self.run_script(root, "stats", "--field", "current_chapter")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), "1")

    def test_write_target_next(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            write(root / "chapters" / "outlines" / "outline-2.md", "# 第2章大纲")
            result = self.run_script(root, "write-target", "--next", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["target_chapter"], 2)
            self.assertTrue(data["outline_exists"])
            self.assertTrue(data["previous_exists"])

    def test_range_target_defaults_for_plan(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            result = self.run_script(root, "range-target", "--kind", "plan", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["start"], 2)
            self.assertEqual(data["end"], 11)
            self.assertTrue(data["defaulted"])

    def test_range_target_defaults_for_review(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            write(root / "chapters" / "chapter-1.md", "# 第1章\n正文一")
            write(root / "chapters" / "chapter-2.md", "# 第2章\n正文二")
            result = self.run_script(root, "range-target", "--kind", "review", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
            data = json.loads(result.stdout)
            self.assertEqual(data["start"], 2)
            self.assertEqual(data["end"], 2)
            self.assertEqual(data["missing_reviews"], [2])

    def test_range_target_rejects_reversed_range(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            result = self.run_script(root, "range-target", "--kind", "plan", "--range", "10-2")
            self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
