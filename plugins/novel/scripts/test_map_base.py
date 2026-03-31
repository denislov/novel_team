#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("map_base.py")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")


class MapBaseTests(unittest.TestCase):
    def run_script(self, workdir: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--from", str(workdir), *args],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_basic_import_generates_root_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(
                root / "设定.md",
                """
                # 九河城项目设定
                主角林渡，在九河城底层起家。
                金手指是能看见交易风险的残缺账簿。
                故事开始于天启三年初春。
                """,
            )
            write(root / "卷一第003章.md", "# 卷一第003章\n林渡第一次看清赌桌上的风险线。")
            write(root / "第三回细纲.md", "# 第三回细纲\n主角试探账簿能力。\n章末钩子：黑市真正的主人出现。")
            write(
                root / "角色设定-林渡.md",
                """
                ---
                name: 林渡
                role: 主角
                first_appearance: 第3章
                ---
                # 角色设定：林渡
                底层少年，心硬，算账快。
                与主角关系：本人
                目标：活下来并拿到入场券。
                """,
            )
            write(root / "故事年表.md", "# 故事年表\n天启三年初春，林渡进入九河城黑市。")
            write(root / "第一卷总纲.md", "# 第一卷总纲\n第一卷目标：活下来并拿到入场券。")

            result = self.run_script(root)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((root / "PROJECT.md").exists())
            self.assertTrue((root / "CHARACTERS.md").exists())
            self.assertTrue((root / "TIMELINE.md").exists())
            self.assertTrue((root / "ROADMAP.md").exists())
            self.assertTrue((root / "STATE.md").exists())
            self.assertTrue((root / "chapters" / "chapter-3.md").exists())
            self.assertTrue((root / "chapters" / "outlines" / "outline-3.md").exists())
            self.assertTrue((root / "characters" / "林渡.md").exists())
            project = (root / "PROJECT.md").read_text(encoding="utf-8")
            state = (root / "STATE.md").read_text(encoding="utf-8")
            roadmap = (root / "ROADMAP.md").read_text(encoding="utf-8")
            self.assertIn("title: 九河城", project)
            self.assertIn("current_chapter: 3", state)
            self.assertIn("current_arc: 第一卷", roadmap)

    def test_merge_uses_existing_chapters_for_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "PROJECT.md", "---\ntitle: 旧城账簿\n---\n# 《旧城账簿》项目设定")
            write(root / "CHARACTERS.md", "# 人物总表")
            write(root / "TIMELINE.md", "# 时间线")
            write(root / "ROADMAP.md", "# 第一卷总纲\n第一卷目标：站稳脚跟。")
            write(root / "chapters" / "chapter-1.md", "# 第1章\n旧章节内容。")
            write(root / "第2章黑市试探.md", "# 第2章\n新导入章节。")

            result = self.run_script(root, "--merge")
            self.assertEqual(result.returncode, 0, result.stderr)
            state = (root / "STATE.md").read_text(encoding="utf-8")
            self.assertIn("current_chapter: 2", state)
            self.assertIn("current_arc: 第一卷", state)
            self.assertTrue((root / "chapters" / "chapter-2.md").exists())

    def test_dry_run_does_not_write_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "notes.md", "# 设定\n主角顾沉，故事发生在现代都市。")
            result = self.run_script(root, "--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((root / "PROJECT.md").exists())
            self.assertIn("would generate `PROJECT.md`", result.stdout)

    def test_generic_filename_can_still_be_classified_from_body(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "notes.md", "# 设定\n主角顾沉，金手指是一枚会预警的硬币。")
            write(root / "chapter.txt", "# 第5回\n顾沉第一次使用硬币。")
            write(root / "outline.txt", "# 第5回细纲\n章末钩子：旧敌现身。")
            result = self.run_script(root, "--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("project_source", result.stdout)
            self.assertIn("chapter", result.stdout)
            self.assertIn("outline", result.stdout)

    def test_map_base_generated_logs_are_not_misclassified_as_reviews(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root / "设定.md", "# 设定\n主角陆停，故事开始于现代。")
            write(root / "dry-run.txt", "# map-base Report\n\n- Source directory: /tmp/demo")
            result = self.run_script(root, "--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("ignored_generated", result.stdout)
            self.assertNotIn("reviews/dry-run.md", result.stdout)


if __name__ == "__main__":
    unittest.main()
