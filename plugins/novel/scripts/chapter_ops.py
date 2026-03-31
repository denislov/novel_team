#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import shutil
import sys
from pathlib import Path


STATE_SCRIPT = Path(__file__).with_name("novel_state.py")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage formal/polished/draft chapter artifacts for Novel.")
    sub = parser.add_subparsers(dest="command", required=True)

    inspect_cmd = sub.add_parser("inspect", help="Inspect available chapter artifacts.")
    inspect_cmd.add_argument("--root", default=".", help="Novel project root.")
    inspect_cmd.add_argument("--chapter", required=True, type=int, help="Chapter number.")
    inspect_cmd.add_argument("--json", action="store_true", help="Emit JSON.")

    use_draft = sub.add_parser("use-draft", help="Promote chapter draft to the formal chapter file.")
    use_draft.add_argument("--root", default=".", help="Novel project root.")
    use_draft.add_argument("--chapter", required=True, type=int, help="Chapter number.")
    use_draft.add_argument("--force", action="store_true", help="Allow overwrite of an existing formal chapter.")
    use_draft.add_argument("--dry-run", action="store_true", help="Preview without writing.")

    use_quick = sub.add_parser("use-quick", help="Promote quick draft to the formal chapter file.")
    use_quick.add_argument("--root", default=".", help="Novel project root.")
    use_quick.add_argument("--chapter", required=True, type=int, help="Chapter number.")
    use_quick.add_argument("--force", action="store_true", help="Allow overwrite of an existing formal chapter.")
    use_quick.add_argument("--dry-run", action="store_true", help="Preview without writing.")

    apply_polish = sub.add_parser("apply-polish", help="Promote polished draft to the formal chapter file with backup.")
    apply_polish.add_argument("--root", default=".", help="Novel project root.")
    apply_polish.add_argument("--chapter", required=True, type=int, help="Chapter number.")
    apply_polish.add_argument("--force", action="store_true", help="Allow overwrite of an existing formal chapter.")
    apply_polish.add_argument("--dry-run", action="store_true", help="Preview without writing.")

    return parser.parse_args()


def artifact_paths(root: Path, chapter: int) -> dict[str, Path]:
    draft_dir = root / "chapters" / "draft"
    return {
        "formal": root / "chapters" / f"chapter-{chapter}.md",
        "draft": draft_dir / f"chapter-{chapter}-draft.md",
        "quick": draft_dir / f"chapter-{chapter}-quick.md",
        "polished": draft_dir / f"chapter-{chapter}-polished.md",
        "review": root / "reviews" / f"review-{chapter}.md",
        "edit_report": root / "reviews" / f"edit-report-{chapter}.md",
    }


def ensure_exists(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} not found: {path}")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def maybe_backup(formal_path: Path, dry_run: bool) -> str | None:
    if not formal_path.exists():
        return None
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = formal_path.parent / "draft" / f"{formal_path.stem}-backup-{stamp}.md"
    if not dry_run:
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(formal_path, backup_path)
    return str(backup_path)


def refresh_state(root: Path, chapter: int, dry_run: bool) -> None:
    args = [
        sys.executable,
        str(STATE_SCRIPT),
        "refresh",
        "--root",
        str(root),
        "--status",
        "连载中",
        "--latest-completed",
        f"已完成第{chapter}章",
        "--next-goal",
        f"第{chapter + 1}章规划或核对",
    ]
    if dry_run:
        args.append("--dry-run")
    result = __import__("subprocess").run(args, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "state refresh failed")


def inspect_chapter(root: Path, chapter: int) -> dict[str, object]:
    paths = artifact_paths(root, chapter)
    return {
        "chapter": chapter,
        "formal_exists": paths["formal"].exists(),
        "draft_exists": paths["draft"].exists(),
        "quick_exists": paths["quick"].exists(),
        "polished_exists": paths["polished"].exists(),
        "review_exists": paths["review"].exists(),
        "edit_report_exists": paths["edit_report"].exists(),
        "paths": {key: str(value) for key, value in paths.items()},
    }


def promote(root: Path, chapter: int, source_key: str, force: bool, dry_run: bool) -> dict[str, object]:
    paths = artifact_paths(root, chapter)
    source_path = paths[source_key]
    formal_path = paths["formal"]
    ensure_exists(source_path, source_key)

    if formal_path.exists() and not force:
        raise RuntimeError(f"formal chapter already exists: {formal_path}")

    backup_path = maybe_backup(formal_path, dry_run) if formal_path.exists() else None
    if not dry_run:
        formal_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, formal_path)
        refresh_state(root, chapter, dry_run=False)

    return {
        "chapter": chapter,
        "source": source_key,
        "source_path": str(source_path),
        "formal_path": str(formal_path),
        "backup_path": backup_path,
        "dry_run": dry_run,
    }


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()

    try:
        if args.command == "inspect":
            data = inspect_chapter(root, args.chapter)
            if args.json:
                print(json.dumps(data, ensure_ascii=False, indent=2))
            else:
                for key, value in data.items():
                    if key == "paths":
                        for path_key, path_value in value.items():
                            print(f"path.{path_key}={path_value}")
                    else:
                        print(f"{key}={value}")
            return 0

        if args.command == "use-draft":
            result = promote(root, args.chapter, "draft", args.force, args.dry_run)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        if args.command == "use-quick":
            result = promote(root, args.chapter, "quick", args.force, args.dry_run)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        if args.command == "apply-polish":
            result = promote(root, args.chapter, "polished", args.force, args.dry_run)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
    except (FileNotFoundError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
