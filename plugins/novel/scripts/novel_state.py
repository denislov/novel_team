#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path


CORE_FILES = ("PROJECT.md", "CHARACTERS.md", "TIMELINE.md", "ROADMAP.md", "STATE.md")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute and refresh shared Novel project state.")
    sub = parser.add_subparsers(dest="command", required=True)

    stats = sub.add_parser("stats", help="Compute project stats and next-step recommendations.")
    stats.add_argument("--root", default=".", help="Novel project root.")
    stats.add_argument("--json", action="store_true", help="Emit JSON.")
    stats.add_argument("--field", default="", help="Emit only a single field value.")

    write_target = sub.add_parser("write-target", help="Resolve a chapter target for write-chapter.")
    write_target.add_argument("--root", default=".", help="Novel project root.")
    write_target.add_argument("--chapter", default="", help="Explicit chapter number.")
    write_target.add_argument("--next", action="store_true", help="Resolve from current state.")
    write_target.add_argument("--json", action="store_true", help="Emit JSON.")
    write_target.add_argument("--field", default="", help="Emit only a single field value.")

    range_target = sub.add_parser("range-target", help="Resolve a chapter range for plan/review/polish.")
    range_target.add_argument("--root", default=".", help="Novel project root.")
    range_target.add_argument("--kind", required=True, choices=("plan", "review", "polish"), help="Workflow kind.")
    range_target.add_argument("--range", dest="range_text", default="", help="Explicit range like 5 or 5-10.")
    range_target.add_argument("--json", action="store_true", help="Emit JSON.")
    range_target.add_argument("--field", default="", help="Emit only a single field value.")

    refresh = sub.add_parser("refresh", help="Refresh STATE.md from filesystem state.")
    refresh.add_argument("--root", default=".", help="Novel project root.")
    refresh.add_argument("--status", default="", help="Optional status override.")
    refresh.add_argument("--current-arc", default="", help="Optional current arc override.")
    refresh.add_argument("--latest-completed", default="", help="Optional latest completed text override.")
    refresh.add_argument("--next-goal", default="", help="Optional next goal override.")
    refresh.add_argument("--dry-run", action="store_true", help="Preview without writing.")
    return parser.parse_args()


def read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def frontmatter_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def chapter_number_from_name(name: str, prefix: str) -> int | None:
    match = re.search(rf"{re.escape(prefix)}-(\d+)\.md$", name)
    return int(match.group(1)) if match else None


def parse_range_text(range_text: str) -> tuple[int, int]:
    raw = range_text.strip()
    if re.fullmatch(r"\d+", raw):
        value = int(raw)
        if value <= 0:
            raise ValueError("chapter number must be > 0")
        return value, value
    match = re.fullmatch(r"(\d+)-(\d+)", raw)
    if not match:
        raise ValueError(f"invalid range: {range_text}")
    start = int(match.group(1))
    end = int(match.group(2))
    if start <= 0 or end <= 0:
        raise ValueError("range values must be > 0")
    if start > end:
        raise ValueError("range start must be <= end")
    return start, end


def chapter_files(root: Path) -> list[Path]:
    return sorted(path for path in (root / "chapters").glob("chapter-*.md") if re.search(r"chapter-\d+\.md$", path.name))


def outline_files(root: Path) -> list[Path]:
    return sorted(path for path in (root / "chapters" / "outlines").glob("outline-*.md") if re.search(r"outline-\d+\.md$", path.name))


def review_files(root: Path) -> list[Path]:
    return sorted(path for path in (root / "reviews").glob("review-*.md") if re.search(r"review-\d+\.md$", path.name))


def load_project_title(root: Path) -> str:
    path = root / "PROJECT.md"
    if not path.exists():
        return root.name
    text = read_text(path)
    value = frontmatter_value(text, "title")
    if value:
        return value
    match = re.search(r"《(.+?)》", text)
    if match:
        return match.group(1)
    for line in text.splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped
    return root.name


def load_current_arc(root: Path) -> str:
    roadmap = root / "ROADMAP.md"
    if roadmap.exists():
        text = read_text(roadmap)
        value = frontmatter_value(text, "current_arc")
        if value:
            return value
        match = re.search(r"(第[一二三四五六七八九十0-9]+卷|卷[一二三四五六七八九十0-9]+)", text)
        if match:
            return match.group(1)

    state = root / "STATE.md"
    if state.exists():
        value = frontmatter_value(read_text(state), "current_arc")
        if value:
            return value
    return "待整理"


def extract_outline_title(path: Path) -> str:
    text = read_text(path)
    value = frontmatter_value(text, "title")
    if value:
        return value
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return path.stem


def compute_stats(root: Path) -> dict[str, object]:
    if not (root / "PROJECT.md").exists():
        raise FileNotFoundError("PROJECT.md not found")

    chapters = chapter_files(root)
    outlines = outline_files(root)
    reviews = review_files(root)

    chapter_numbers = [chapter_number_from_name(path.name, "chapter") for path in chapters]
    chapter_numbers = [num for num in chapter_numbers if num is not None]
    outline_numbers = [chapter_number_from_name(path.name, "outline") for path in outlines]
    outline_numbers = [num for num in outline_numbers if num is not None]
    review_numbers = [chapter_number_from_name(path.name, "review") for path in reviews]
    review_numbers = [num for num in review_numbers if num is not None]

    latest_chapter = max(chapter_numbers, default=0)
    latest_outline = max(outline_numbers, default=0)
    latest_review = max(review_numbers, default=0)
    total_words = sum(len(read_text(path)) for path in chapters)

    first_unwritten = next((num for num in sorted(outline_numbers) if not (root / "chapters" / f"chapter-{num}.md").exists()), None)
    first_unreviewed = next((num for num in sorted(chapter_numbers) if not (root / "reviews" / f"review-{num}.md").exists()), None)

    next_chapter = latest_chapter + 1 if latest_chapter else 1
    if latest_outline > next_chapter:
        next_chapter = latest_outline + 1

    outline_buffer = max(latest_outline - latest_chapter, 0)
    review_gap = max(latest_chapter - latest_review, 0)

    recommended_command = "progress"
    recommended_args = ""
    recommended_reason = "需要先查看项目状态。"

    if latest_chapter == 0 and latest_outline == 0:
        recommended_command = "plan-batch"
        recommended_args = "1-10"
        recommended_reason = "项目还没有大纲和正文，先建立章节规划。"
    elif first_unwritten is not None:
        recommended_command = "write-chapter"
        recommended_args = str(first_unwritten)
        recommended_reason = "已经有大纲，下一步应把最早未写章节落成正文。"
    elif first_unreviewed is not None:
        recommended_command = "review"
        recommended_args = str(first_unreviewed)
        recommended_reason = "已有正文未审核，先补一致性检查。"
    elif latest_outline < next_chapter:
        recommended_command = "plan-batch"
        recommended_args = f"{next_chapter}-{next_chapter + 4}"
        recommended_reason = "规划缓冲不足，先补后续几章大纲。"
    else:
        recommended_command = "write-chapter"
        recommended_args = str(next_chapter)
        recommended_reason = "下一章已有规划或已到继续写作阶段。"

    queue_rows = []
    for number in sorted(outline_numbers):
        if number <= latest_chapter:
            continue
        outline_path = root / "chapters" / "outlines" / f"outline-{number}.md"
        queue_rows.append(
            {
                "chapter": number,
                "task": extract_outline_title(outline_path),
                "emotion": "待整理",
                "characters": "待整理",
                "status": "待写作",
            }
        )
        if len(queue_rows) >= 3:
            break

    if not queue_rows:
        queue_rows.append(
            {
                "chapter": next_chapter,
                "task": "待规划",
                "emotion": "待整理",
                "characters": "待整理",
                "status": "未开始",
            }
        )

    state_path = root / "STATE.md"
    existing_status = frontmatter_value(read_text(state_path), "status") if state_path.exists() else None
    status = existing_status or ("连载中" if latest_chapter > 0 else "规划中")

    return {
        "title": load_project_title(root),
        "status": status,
        "current_arc": load_current_arc(root),
        "current_chapter": latest_chapter,
        "total_words": total_words,
        "latest_chapter": latest_chapter,
        "latest_outline": latest_outline,
        "latest_review": latest_review,
        "first_unwritten": first_unwritten,
        "first_unreviewed": first_unreviewed,
        "outline_buffer": outline_buffer,
        "review_gap": review_gap,
        "next_chapter": next_chapter,
        "recommended_command": recommended_command,
        "recommended_args": recommended_args,
        "recommended_reason": recommended_reason,
        "queue_rows": queue_rows,
    }


def resolve_write_target(root: Path, chapter_arg: str, use_next: bool) -> dict[str, object]:
    stats = compute_stats(root)
    if chapter_arg and use_next:
        raise ValueError("cannot use --chapter and --next together")

    if chapter_arg:
        if not re.fullmatch(r"\d+", chapter_arg.strip()):
            raise ValueError(f"invalid chapter: {chapter_arg}")
        target_chapter = int(chapter_arg)
    else:
        target_chapter = int(stats["next_chapter"])

    if target_chapter <= 0:
        raise ValueError("target chapter must be > 0")

    previous_chapter = target_chapter - 1 if target_chapter > 1 else 0
    chapter_path = root / "chapters" / f"chapter-{target_chapter}.md"
    outline_path = root / "chapters" / "outlines" / f"outline-{target_chapter}.md"
    draft_path = root / "chapters" / "draft" / f"chapter-{target_chapter}-draft.md"
    review_path = root / "reviews" / f"review-{target_chapter}.md"

    previous_exists = previous_chapter == 0 or (root / "chapters" / f"chapter-{previous_chapter}.md").exists()
    chapter_exists = chapter_path.exists()
    outline_exists = outline_path.exists()
    review_exists = review_path.exists()

    return {
        "target_chapter": target_chapter,
        "previous_chapter": previous_chapter,
        "previous_exists": previous_exists,
        "chapter_exists": chapter_exists,
        "outline_exists": outline_exists,
        "review_exists": review_exists,
        "mode": "rewrite" if chapter_exists else "new",
        "chapter_path": str(chapter_path),
        "outline_path": str(outline_path),
        "draft_path": str(draft_path),
        "review_path": str(review_path),
    }


def resolve_range_target(root: Path, kind: str, range_text: str) -> dict[str, object]:
    stats = compute_stats(root)
    defaulted = False

    if range_text.strip():
        start, end = parse_range_text(range_text)
    else:
        defaulted = True
        if kind == "plan":
            start = int(stats["next_chapter"])
            end = start + 9
        else:
            latest = int(stats["latest_chapter"])
            if latest <= 0:
                start = end = 0
            else:
                start = end = latest

    chapter_numbers = list(range(start, end + 1)) if start > 0 and end > 0 else []
    existing_outlines = [n for n in chapter_numbers if (root / "chapters" / "outlines" / f"outline-{n}.md").exists()]
    existing_chapters = [n for n in chapter_numbers if (root / "chapters" / f"chapter-{n}.md").exists()]
    existing_reviews = [n for n in chapter_numbers if (root / "reviews" / f"review-{n}.md").exists()]
    missing_chapters = [n for n in chapter_numbers if n not in existing_chapters]
    missing_reviews = [n for n in chapter_numbers if n not in existing_reviews]

    return {
        "kind": kind,
        "defaulted": defaulted,
        "start": start,
        "end": end,
        "count": len(chapter_numbers),
        "range_text": "" if not chapter_numbers else (str(start) if start == end else f"{start}-{end}"),
        "chapter_numbers": chapter_numbers,
        "existing_outlines": existing_outlines,
        "existing_chapters": existing_chapters,
        "existing_reviews": existing_reviews,
        "missing_chapters": missing_chapters,
        "missing_reviews": missing_reviews,
    }


def replace_or_append_line(text: str, prefix: str, value: str) -> str:
    pattern = rf"^{re.escape(prefix)}.*$"
    replacement = f"{prefix}{value}"
    if re.search(pattern, text, flags=re.MULTILINE):
        return re.sub(pattern, replacement, text, flags=re.MULTILINE)
    return text.rstrip() + "\n" + replacement + "\n"


def render_queue_table(rows: list[dict[str, object]]) -> str:
    header = [
        "## 接下来 3 章",
        "",
        "| 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |",
        "|------|------|----------|----------|------|",
    ]
    body = [f"| 第{row['chapter']}章 | {row['task']} | {row['emotion']} | {row['characters']} | {row['status']} |" for row in rows]
    return "\n".join(header + body)


def replace_section(text: str, heading: str, section_body: str) -> str:
    pattern = rf"(?ms)^## {re.escape(heading)}\n.*?(?=^## |\Z)"
    replacement = section_body.strip() + "\n\n"
    if re.search(pattern, text):
        return re.sub(pattern, replacement, text)
    return text.rstrip() + "\n\n" + replacement


def refresh_state(root: Path, status_override: str, arc_override: str, latest_completed: str, next_goal: str, dry_run: bool) -> str:
    state_path = root / "STATE.md"
    if not state_path.exists():
        raise FileNotFoundError("STATE.md not found")

    stats = compute_stats(root)
    text = read_text(state_path)
    today = dt.date.today().isoformat()

    status = status_override or str(stats["status"])
    current_arc = arc_override or str(stats["current_arc"])
    latest = latest_completed or (f"已完成第{stats['current_chapter']}章" if stats["current_chapter"] else "新建项目")
    next_target = next_goal or f"第{stats['next_chapter']}章规划或核对"

    text = replace_or_append_line(text, "status: ", status)
    text = replace_or_append_line(text, "current_arc: ", current_arc)
    text = replace_or_append_line(text, "current_chapter: ", str(stats["current_chapter"]))
    text = replace_or_append_line(text, "total_words: ", str(stats["total_words"]))
    text = replace_or_append_line(text, "last_updated: ", today)

    progress_section = "\n".join(
        [
            "## 进度快照",
            "",
            "| 项目 | 当前值 |",
            "|------|--------|",
            f"| 当前卷 | {current_arc} |",
            f"| 当前章节 | 第{stats['current_chapter']}章 |",
            f"| 总字数 | {stats['total_words']} |",
            f"| 最新完成内容 | {latest} |",
            f"| 下一目标 | {next_target} |",
        ]
    )
    text = replace_section(text, "进度快照", progress_section)
    text = replace_section(text, "接下来 3 章", render_queue_table(stats["queue_rows"]))

    if not dry_run:
        state_path.write_text(text, encoding="utf-8")
    return text


def main() -> int:
    args = parse_args()
    root = Path(getattr(args, "root", ".")).expanduser().resolve()

    try:
        if args.command == "stats":
            stats = compute_stats(root)
            if args.field:
                value = stats.get(args.field, "")
                if isinstance(value, (dict, list)):
                    print(json.dumps(value, ensure_ascii=False))
                else:
                    print(value)
            elif args.json:
                print(json.dumps(stats, ensure_ascii=False, indent=2))
            else:
                for key, value in stats.items():
                    if key == "queue_rows":
                        continue
                    print(f"{key}={value}")
                for row in stats["queue_rows"]:
                    print(f"queue=第{row['chapter']}章|{row['task']}|{row['status']}")
            return 0

        if args.command == "write-target":
            result = resolve_write_target(root, args.chapter, args.next)
            if args.field:
                value = result.get(args.field, "")
                if isinstance(value, (dict, list)):
                    print(json.dumps(value, ensure_ascii=False))
                else:
                    print(value)
            elif args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                for key, value in result.items():
                    print(f"{key}={value}")
            return 0

        if args.command == "range-target":
            result = resolve_range_target(root, args.kind, args.range_text)
            if args.field:
                value = result.get(args.field, "")
                if isinstance(value, (dict, list)):
                    print(json.dumps(value, ensure_ascii=False))
                else:
                    print(value)
            elif args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                for key, value in result.items():
                    print(f"{key}={value}")
            return 0

        if args.command == "refresh":
            refreshed = refresh_state(root, args.status, args.current_arc, args.latest_completed, args.next_goal, args.dry_run)
            if args.dry_run:
                print(refreshed)
            else:
                print(f"refreshed {root / 'STATE.md'}")
            return 0
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
