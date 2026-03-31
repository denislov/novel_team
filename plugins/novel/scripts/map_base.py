#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import re
import shutil
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


TEXT_SUFFIXES = {".md", ".markdown", ".txt"}
CORE_FILES = ("PROJECT.md", "CHARACTERS.md", "TIMELINE.md", "ROADMAP.md", "STATE.md")
IGNORED_DIRS = {
    ".git",
    ".agents",
    ".claude-plugin",
    ".codex-plugin",
    "__pycache__",
    ".venv",
    "venv",
    "node_modules",
    "plugins",
}
STRUCTURED_DIRS = {"chapters", "characters", "research", "reviews"}
GENERIC_CHARACTER_NAMES = {
    "人物",
    "人物卡",
    "角色",
    "角色卡",
    "人设",
    "人物设定",
    "角色设定",
    "character",
    "character-card",
}


@dataclass
class Candidate:
    source: Path
    rel: str
    kind: str
    confidence: int
    reason: str
    title: str
    chapter: int | None = None
    entity_name: str | None = None


@dataclass
class PlannedAction:
    source: Path
    destination: Path
    kind: str
    mode: str
    reason: str


CHINESE_NUMERAL_MAP = {
    "零": 0,
    "〇": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
}
CHINESE_UNIT_MAP = {"十": 10, "百": 100, "千": 1000}
TITLE_NOISE_PATTERNS = [
    r"(项目设定|小说设定|作品设定|世界观设定|设定集|设定稿)$",
    r"(时间线整理|时间线总表|故事时间线|时间线)$",
    r"(第一卷卷纲|第二卷卷纲|第三卷卷纲|卷纲|总纲|路线图|roadmap)$",
    r"(人物总表|角色总表|人物关系|角色关系)$",
]
OUTLINE_KEYWORDS = ("大纲", "outline", "章节蓝图", "细纲", "章纲", "分镜", "拍点", "beat")
REVIEW_NAME_KEYWORDS = ("审核", "复盘", "review", "verification", "修订意见", "修改报告", "edit-report")
REVIEW_BODY_KEYWORDS = ("审核结果", "建议修改", "阻塞问题", "一致性检查", "复查清单", "总体评价", "亮点", "问题汇总")
TIMELINE_KEYWORDS = ("timeline", "时间线", "年表", "纪年", "chronology", "事件表")
ROADMAP_KEYWORDS = ("roadmap", "路线图", "卷纲", "阶段规划", "剧情规划", "卷计划", "总纲", "arc", "分卷")
CHARACTER_INDEX_KEYWORDS = ("人物总表", "角色总表", "关系表", "人物关系", "角色关系", "cast")
CHARACTER_CARD_KEYWORDS = ("人物卡", "角色卡", "character-card", "人物设定", "角色设定")
PROJECT_KEYWORDS = ("project", "设定", "世界观", "主线", "金手指", "简介", "梗概", "设定集", "作品设定")
RESEARCH_KEYWORDS = ("research", "考据", "资料", "史料", "术语", "背景研究", "百科", "行业资料")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize scattered novel materials into the Novel root layout.")
    parser.add_argument("--from", dest="source_dir", default=".", help="Directory to scan and normalize in place.")
    parser.add_argument("--merge", action="store_true", help="Allow import into an already structured project.")
    parser.add_argument("--force", action="store_true", help="Overwrite generated targets when needed.")
    parser.add_argument("--dry-run", action="store_true", help="Preview actions without writing files.")
    return parser.parse_args()


def read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def first_heading(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return None


def frontmatter_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def chinese_to_int(raw: str) -> int | None:
    if not raw:
        return None
    if raw.isdigit():
        return int(raw)

    total = 0
    current = 0
    pending = 0
    for ch in raw:
        if ch in CHINESE_NUMERAL_MAP:
            pending = CHINESE_NUMERAL_MAP[ch]
        elif ch in CHINESE_UNIT_MAP:
            unit = CHINESE_UNIT_MAP[ch]
            current += (pending or 1) * unit
            pending = 0
        else:
            return None
    total += current + pending
    return total or None


def extract_chapter_number(text: str, path: Path) -> int | None:
    haystacks = [path.stem, first_heading(text) or "", frontmatter_value(text, "chapter") or ""]
    patterns = [
        r"(?:chapter|chap)[\s_-]*(\d{1,4})",
        r"第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*章",
        r"第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*[回话节]",
        r"卷[一二三四五六七八九十0-9]+\s*第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*章",
        r"^0*([0-9]{1,4})$",
    ]
    for haystack in haystacks:
        for pattern in patterns:
            match = re.search(pattern, haystack, flags=re.IGNORECASE)
            if not match:
                continue
            value = chinese_to_int(match.group(1))
            if value is not None:
                return value
    return None


def normalize_slug(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"[\\/]+", "-", cleaned)
    cleaned = re.sub(r"\s+", "-", cleaned)
    cleaned = re.sub(r"-{2,}", "-", cleaned)
    cleaned = cleaned.strip("-._")
    return cleaned or "untitled"


def infer_title(text: str, path: Path) -> str:
    for key in ("title", "name", "topic"):
        value = frontmatter_value(text, key)
        if value:
            return value
    heading = first_heading(text)
    if heading:
        return heading
    return path.stem


def clean_project_title(title: str) -> str:
    cleaned = title.strip().strip("#").strip()
    cleaned = re.sub(r"^《(.+)》.*$", r"\1", cleaned)
    cleaned = re.sub(r"^[《\"]?(.+?)[》\"]?$", r"\1", cleaned)
    for pattern in TITLE_NOISE_PATTERNS:
        candidate = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip(" -_:：")
        if candidate and candidate != cleaned:
            cleaned = candidate
    return cleaned or title


def strip_frontmatter(text: str) -> str:
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            return parts[2]
    return text


def meaningful_lines(text: str) -> list[str]:
    body = strip_frontmatter(text)
    lines: list[str] = []
    in_code_block = False
    for raw in body.splitlines():
        line = raw.strip()
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block or not line:
            continue
        if line.startswith("#") or line.startswith("|") or line.startswith("<") or line.startswith(">"):
            continue
        if re.fullmatch(r"[-=*]{3,}", line):
            continue
        lines.append(line)
    return lines


def source_excerpt(text: str, max_items: int = 3, max_chars: int = 240) -> str:
    snippets: list[str] = []
    total = 0
    for line in meaningful_lines(text):
        if len(snippets) >= max_items:
            break
        compact = re.sub(r"\s+", " ", line)
        if not compact:
            continue
        if total + len(compact) > max_chars and snippets:
            break
        snippets.append(compact[: max_chars - total].rstrip())
        total += len(snippets[-1])
    if not snippets:
        return "（源文件暂无可直接摘录内容）"
    return "\n".join(f"- {item}" for item in snippets)


def infer_character_name(text: str, path: Path) -> str | None:
    explicit = frontmatter_value(text, "name")
    if explicit:
        return explicit

    title = first_heading(text) or ""
    heading_match = re.search(r"(?:人物卡|角色卡)[:：\s]+(.+)$", title)
    if heading_match:
        return heading_match.group(1).strip()

    stem = path.stem
    stem = re.sub(r"^(人物卡|角色卡|人物设定|角色设定|人设|character-card|character)[-_：:\s]*", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"[-_：:\s]*(人物卡|角色卡|人物设定|角色设定|人设|character-card|character)$", "", stem, flags=re.IGNORECASE)
    stem = stem.strip()
    if not stem or stem in GENERIC_CHARACTER_NAMES:
        return None
    return stem


def guess_protagonist_name(project_sources: list[Candidate], character_card_actions: list[PlannedAction]) -> str | None:
    for source in project_sources:
        text = read_text(source.source)
        for pattern in (
            r"主角[：:\s]+([^\s，。,；;（）()]{2,12})",
            r"主角([^\s，。,；;（）()]{2,12})",
        ):
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
    if character_card_actions:
        return sorted(character_card_actions, key=lambda item: item.destination.name)[0].destination.stem
    return None


def imported_chapter_numbers(actions: list[PlannedAction]) -> list[int]:
    numbers: list[int] = []
    for action in actions:
        if action.kind not in {"chapter", "outline"}:
            continue
        match = re.search(r"-(\d+)\.md$", action.destination.name)
        if match:
            numbers.append(int(match.group(1)))
    return sorted(set(numbers))


def chapter_files_on_disk(source_dir: Path) -> list[Path]:
    return sorted(source_dir.glob("chapters/chapter-*.md"))


def outline_files_on_disk(source_dir: Path) -> list[Path]:
    return sorted(source_dir.glob("chapters/outlines/outline-*.md"))


def character_files_on_disk(source_dir: Path) -> list[Path]:
    return sorted(source_dir.glob("characters/*.md"))


def chapter_numbers_from_paths(paths: list[Path], pattern: str) -> list[int]:
    values: list[int] = []
    for path in paths:
        match = re.search(pattern, path.name)
        if match:
            values.append(int(match.group(1)))
    return sorted(set(values))


def chapter_range_text(numbers: list[int]) -> str:
    if not numbers:
        return "待整理"
    return f"{numbers[0]}-{numbers[-1]}" if len(numbers) > 1 else str(numbers[0])


def contains_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


def collect_texts(items: list[Candidate]) -> list[str]:
    return [read_text(item.source) for item in items]


def first_matching_line(texts: list[str], patterns: tuple[str, ...]) -> str | None:
    for text in texts:
        for line in meaningful_lines(text):
            compact = re.sub(r"\s+", " ", line).strip()
            for pattern in patterns:
                if re.search(pattern, compact, flags=re.IGNORECASE):
                    return compact
    return None


def infer_genre(texts: list[str]) -> str:
    genre_patterns = [
        ("港综同人", (r"港综", r"香港.*(警|黑帮|社团)", r"同人")),
        ("历史", (r"大明", r"大清", r"万历", r"天启", r"嘉靖", r"崇祯", r"历史", r"朝廷", r"古代")),
        ("都市", (r"都市", r"商战", r"黑市", r"地产", r"公司", r"现代", r"股市")),
        ("玄幻", (r"玄幻", r"宗门", r"灵气", r"秘境", r"修行体系")),
        ("仙侠", (r"仙侠", r"修仙", r"飞升", r"仙门", r"灵根")),
        ("科幻", (r"科幻", r"机甲", r"星际", r"未来", r"赛博")),
    ]
    scores: dict[str, int] = {}
    joined = "\n".join(texts)
    for genre, patterns in genre_patterns:
        score = sum(1 for pattern in patterns if re.search(pattern, joined, flags=re.IGNORECASE))
        if score:
            scores[genre] = score
    if not scores:
        return "待整理"
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))[0][0]


def infer_era(texts: list[str]) -> str:
    patterns = (
        r"([12][0-9]{3}年(?:代)?)",
        r"((?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)[^，。,；;]{0,8})",
        r"((?:现代|近未来|未来|民国|清末|明末|古代|架空)[^，。,；;]{0,12})",
    )
    line = first_matching_line(texts, patterns)
    if not line:
        return "待整理"
    for pattern in patterns:
        match = re.search(pattern, line)
        if match:
            return match.group(1)
    return "待整理"


def infer_project_hook(texts: list[str]) -> str:
    line = first_matching_line(texts, (r"主角", r"金手指", r"目标", r"冲突", r"故事"))
    return line or "待整理"


def infer_golden_finger(texts: list[str]) -> str:
    line = first_matching_line(texts, (r"金手指", r"系统", r"能力", r"账簿", r"外挂"))
    if not line:
        return "待整理"
    return line


def infer_main_conflict(texts: list[str]) -> str:
    line = first_matching_line(texts, (r"冲突", r"目标", r"主线", r"对手", r"阻力"))
    return line or "待整理"


def infer_current_arc(texts: list[str]) -> str:
    line = first_matching_line(texts, (r"第[一二三四五六七八九十0-9]+卷", r"卷[一二三四五六七八九十0-9]+"))
    if not line:
        return "待整理"
    match = re.search(r"(第[一二三四五六七八九十0-9]+卷|卷[一二三四五六七八九十0-9]+)", line)
    return match.group(1) if match else "待整理"


def infer_timeline_anchor_lines(texts: list[str], max_items: int = 5) -> list[str]:
    anchors: list[str] = []
    patterns = (
        r"[12][0-9]{3}年",
        r"(?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)",
        r"(?:初春|盛夏|深秋|寒冬|春|夏|秋|冬)",
    )
    for text in texts:
        for line in meaningful_lines(text):
            compact = re.sub(r"\s+", " ", line).strip()
            if any(re.search(pattern, compact) for pattern in patterns):
                if compact not in anchors:
                    anchors.append(compact)
            if len(anchors) >= max_items:
                return anchors
    return anchors


def infer_roadmap_lines(texts: list[str], max_items: int = 5) -> list[str]:
    lines: list[str] = []
    for text in texts:
        for line in meaningful_lines(text):
            compact = re.sub(r"\s+", " ", line).strip()
            if any(keyword in compact for keyword in ("卷", "阶段", "目标", "站稳脚跟", "高潮", "转折", "路线")):
                if compact not in lines:
                    lines.append(compact)
            if len(lines) >= max_items:
                return lines
    return lines


def read_path_with_source_map(path: Path, source_map: dict[Path, Path]) -> str:
    if path.exists():
        return read_text(path)
    if path in source_map:
        return read_text(source_map[path])
    return ""


def extract_card_summary(text: str, fallback_name: str) -> dict[str, str]:
    lines = meaningful_lines(text)
    summary = lines[0] if lines else "待整理"
    role = frontmatter_value(text, "role") or "待整理"
    first_appearance = frontmatter_value(text, "first_appearance") or "待整理"
    identity = "待整理"
    core = "待整理"
    for line in lines:
        if identity == "待整理" and re.search(r"(身份|职业|出身|职业)", line):
            identity = re.sub(r"^[^：:]*[:：]\s*", "", line)
        if core == "待整理" and re.search(r"(性格|核心|标签)", line):
            core = re.sub(r"^[^：:]*[:：]\s*", "", line)
    return {
        "name": frontmatter_value(text, "name") or fallback_name,
        "role": role,
        "identity": identity,
        "core": core,
        "summary": summary,
        "first_appearance": first_appearance,
    }


def infer_relation_to_protagonist(text: str) -> str:
    for pattern in (
        r"(?:与主角关系|关系类型|relation_to_protagonist)[：:]\s*(.+)",
        r"(?:盟友|敌人|中立|复杂关系)",
    ):
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip() if match.groups() else match.group(0).strip()
    return "待整理"


def infer_character_goal(text: str) -> str:
    for line in meaningful_lines(text):
        compact = re.sub(r"\s+", " ", line).strip()
        if re.search(r"(目标|想要|欲望|诉求)", compact):
            return re.sub(r"^[^：:]*[:：]\s*", "", compact)
    return "待整理"


def chapter_number_from_path(path: Path) -> int | None:
    match = re.search(r"-(\d+)\.md$", path.name)
    return int(match.group(1)) if match else None


def extract_story_date(text: str) -> str:
    for key in ("story_date", "date"):
        value = frontmatter_value(text, key)
        if value:
            return value
    line = first_matching_line([text], (r"[12][0-9]{3}年", r"(?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)", r"(?:初春|盛夏|深秋|寒冬|春|夏|秋|冬)"))
    return line or "待整理"


def extract_item_title(text: str, fallback: str) -> str:
    value = frontmatter_value(text, "title")
    if value:
        return value
    heading = first_heading(text)
    if heading:
        return heading
    return fallback


def extract_item_summary(text: str) -> str:
    lines = meaningful_lines(text)
    if not lines:
        return "待整理"
    return re.sub(r"\s+", " ", lines[0]).strip()


def extract_hook_line(text: str) -> str:
    for line in meaningful_lines(text):
        compact = re.sub(r"\s+", " ", line).strip()
        if "钩子" in compact:
            return re.sub(r"^[^：:]*[:：]\s*", "", compact)
    return "待整理"


def collect_card_infos(card_paths: list[Path], source_map: dict[Path, Path]) -> list[dict[str, str]]:
    infos: list[dict[str, str]] = []
    for path in sorted(card_paths, key=lambda item: item.name):
        text = read_path_with_source_map(path, source_map)
        info = extract_card_summary(text, path.stem)
        info["path"] = path.as_posix()
        info["relation_to_protagonist"] = infer_relation_to_protagonist(text)
        info["goal"] = infer_character_goal(text)
        info["status"] = frontmatter_value(text, "status") or "待整理"
        info["text"] = text
        infos.append(info)
    return infos


def collect_character_mentions(chapter_paths: list[Path], source_map: dict[Path, Path], names: list[str]) -> dict[str, list[int]]:
    mentions: dict[str, list[int]] = {name: [] for name in names}
    for path in chapter_paths:
        chapter_number = chapter_number_from_path(path)
        if chapter_number is None:
            continue
        text = read_path_with_source_map(path, source_map)
        for name in names:
            if len(name) >= 2 and name in text:
                mentions[name].append(chapter_number)
    return mentions


def relation_pairs_from_cards(card_infos: list[dict[str, str]]) -> list[tuple[str, str, str]]:
    names = [info["name"] for info in card_infos]
    seen: set[tuple[str, str]] = set()
    rows: list[tuple[str, str, str]] = []
    for info in card_infos:
        text = info["text"]
        for other in names:
            if other == info["name"]:
                continue
            if other in text:
                key = tuple(sorted((info["name"], other)))
                if key in seen:
                    continue
                seen.add(key)
                rows.append((info["name"], other, "人物卡互相提及"))
    return rows


def build_chapter_queue_rows(outline_paths: list[Path], chapter_paths: list[Path], source_map: dict[Path, Path], limit: int = 8) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    outline_map = {chapter_number_from_path(path): path for path in outline_paths if chapter_number_from_path(path) is not None}
    chapter_map = {chapter_number_from_path(path): path for path in chapter_paths if chapter_number_from_path(path) is not None}
    numbers = sorted(set(outline_map) | set(chapter_map))[:limit]
    for number in numbers:
        outline_path = outline_map.get(number)
        chapter_path = chapter_map.get(number)
        text = read_path_with_source_map(outline_path or chapter_path, source_map) if (outline_path or chapter_path) else ""
        rows.append(
            {
                "chapter": f"第{number}章",
                "task": extract_item_summary(text),
                "emotion": "待整理",
                "hook": extract_hook_line(text),
                "status": "已成稿" if chapter_path else "待写作",
            }
        )
    return rows


def build_timeline_rows(chapter_paths: list[Path], source_map: dict[Path, Path], limit: int = 8) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(chapter_paths, key=lambda item: item.name)[:limit]:
        chapter_number = chapter_number_from_path(path)
        if chapter_number is None:
            continue
        text = read_path_with_source_map(path, source_map)
        rows.append(
            {
                "chapter": f"第{chapter_number}章",
                "story_date": extract_story_date(text),
                "event": extract_item_summary(text),
            }
        )
    return rows


def chapter_number_from_label(label: str) -> int | None:
    match = re.search(r"(\d+)", label)
    return int(match.group(1)) if match else None


def classify_file(path: Path, source_dir: Path) -> Candidate:
    text = read_text(path)
    title = infer_title(text, path)
    lowered = f"{path.name.lower()}\n{text.lower()}\n{title.lower()}"
    name_title = f"{path.name.lower()}\n{title.lower()}"
    preview = "\n".join(meaningful_lines(text)[:8]).lower()
    body_signals = f"{name_title}\n{preview}"
    chapter = extract_chapter_number(text, path)

    if "# map-base Report" in text or "map-base completed" in text:
        return Candidate(path, path.relative_to(source_dir).as_posix(), "ignored_generated", 100, "map-base 生成产物", title)

    if chapter is not None and contains_any(f"{name_title}\n{preview}", OUTLINE_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "outline", 95, "检测到章节号且含大纲信号", title, chapter=chapter)

    if contains_any(name_title, REVIEW_NAME_KEYWORDS) or contains_any(preview, REVIEW_BODY_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "review", 85, "检测到审核/复盘信号", title)

    if chapter is not None:
        return Candidate(path, path.relative_to(source_dir).as_posix(), "chapter", 90, "检测到章节号", title, chapter=chapter)

    if path.name in CORE_FILES:
        kind = path.stem.lower()
        return Candidate(path, path.relative_to(source_dir).as_posix(), f"existing_{kind}", 100, "已是标准核心文件", title)

    if contains_any(body_signals, TIMELINE_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "timeline_source", 90, "检测到时间线信号", title)

    if contains_any(body_signals, ROADMAP_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "roadmap_source", 88, "检测到路线图/卷纲信号", title)

    if contains_any(body_signals, CHARACTER_INDEX_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "characters_index", 88, "检测到人物总表/关系表信号", title)

    if contains_any(body_signals, CHARACTER_CARD_KEYWORDS):
        return Candidate(
            path,
            path.relative_to(source_dir).as_posix(),
            "character_card",
            92,
            "检测到人物卡信号",
            title,
            entity_name=infer_character_name(text, path),
        )

    if contains_any(body_signals, ("人物", "角色", "人设", "character", "cast")):
        return Candidate(
            path,
            path.relative_to(source_dir).as_posix(),
            "character_card" if infer_character_name(text, path) else "characters_index",
            70,
            "检测到人物相关信号",
            title,
            entity_name=infer_character_name(text, path),
        )

    if contains_any(body_signals, RESEARCH_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "research", 82, "检测到研究资料信号", title)

    if contains_any(body_signals, PROJECT_KEYWORDS):
        return Candidate(path, path.relative_to(source_dir).as_posix(), "project_source", 75, "检测到项目设定信号", title)

    return Candidate(path, path.relative_to(source_dir).as_posix(), "unknown", 10, "未命中稳定分类规则", title)


def should_skip_dir(path: Path) -> bool:
    return path.name in IGNORED_DIRS or path.name in STRUCTURED_DIRS


def scan_candidates(source_dir: Path) -> list[Candidate]:
    candidates: list[Candidate] = []
    for path in sorted(source_dir.rglob("*")):
        if path.is_dir():
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if any(should_skip_dir(parent) for parent in path.relative_to(source_dir).parents if parent != Path(".")):
            continue
        candidates.append(classify_file(path, source_dir))
    return candidates


def resolve_copy_destination(source_dir: Path, candidate: Candidate, used: set[Path]) -> Path | None:
    if candidate.kind == "chapter":
        return source_dir / "chapters" / f"chapter-{candidate.chapter}.md"
    if candidate.kind == "outline":
        return source_dir / "chapters" / "outlines" / f"outline-{candidate.chapter}.md"
    if candidate.kind == "character_card":
        base = normalize_slug(candidate.entity_name or candidate.source.stem)
        destination = source_dir / "characters" / f"{base}.md"
        counter = 2
        while destination in used:
            destination = source_dir / "characters" / f"{base}-{counter}.md"
            counter += 1
        return destination
    if candidate.kind == "research":
        base = normalize_slug(candidate.source.stem)
        destination = source_dir / "research" / f"{base}.md"
        counter = 2
        while destination in used:
            destination = source_dir / "research" / f"{base}-{counter}.md"
            counter += 1
        return destination
    if candidate.kind == "review":
        base = normalize_slug(candidate.source.stem)
        destination = source_dir / "reviews" / f"{base}.md"
        counter = 2
        while destination in used:
            destination = source_dir / "reviews" / f"{base}-{counter}.md"
            counter += 1
        return destination
    return None


def word_count(path: Path) -> int:
    return len(read_text(path))


def best_candidate(candidates: list[Candidate]) -> Candidate | None:
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: (-item.confidence, len(item.rel), item.rel))[0]


def markdown_sources(items: list[Candidate]) -> str:
    if not items:
        return "- 暂无直接来源，需人工补齐。"
    lines = []
    for item in sorted(items, key=lambda value: value.rel):
        lines.append(f"- `{item.rel}`: {item.reason}")
    return "\n".join(lines)


def build_project_file(
    title: str,
    source_items: list[Candidate],
    roadmap_items: list[Candidate],
    protagonist_name: str | None,
    today: str,
) -> str:
    clean_title = clean_project_title(title)
    texts = collect_texts(source_items)
    conflict_texts = texts + collect_texts(roadmap_items)
    genre = infer_genre(texts)
    era = infer_era(texts)
    hook = infer_project_hook(texts)
    golden_finger = infer_golden_finger(texts)
    conflict = infer_main_conflict(conflict_texts)
    protagonist = protagonist_name or "待整理"
    source_blocks = []
    for item in sorted(source_items, key=lambda value: value.rel)[:5]:
        source_blocks.append(f"### `{item.rel}`\n{source_excerpt(read_text(item.source))}")
    source_section = "\n\n".join(source_blocks) or "暂无明确设定源文件，请人工补齐。"
    return f"""---
title: {clean_title}
genre: {genre}
era: {era}
target_words: 待定
chapter_words: 3000
target_chapters: 待定
status: 导入待整理
created: {today}
updated: {today}
---

# 《{clean_title}》项目设定

## 导入说明

- 本文件由 `map-base.py` 根据已有资料初始化。
- 当前重点是把散落资料归并成可持续创作的结构，不假装已经完成高质量策划。
- 请人工补齐世界观、主线、禁忌、金手指限制和长期路线。

## 已识别来源

{markdown_sources(source_items)}

## 原始资料摘录

{source_section}

## 初步提取

- **主角**：{protagonist}
- **题材**：{genre}
- **时代/世界线**：{era}
- **一句话抓手**：{hook}
- **金手指/核心优势线索**：{golden_finger}
- **主线/核心冲突线索**：{conflict}

## 待整理

- [ ] 补齐一句话卖点
- [ ] 补齐世界观与社会规则
- [ ] 补齐主角成长主线
- [ ] 明确金手指/核心优势及限制
- [ ] 建立全书弧线与卷级规划
"""


def build_characters_file(
    title: str,
    protagonist_name: str | None,
    card_infos: list[dict[str, str]],
    mentions: dict[str, list[int]],
    relation_pairs: list[tuple[str, str, str]],
    source_items: list[Candidate],
    today: str,
) -> str:
    rows = []
    for info in card_infos:
        rel_path = Path(info["path"])
        identity_or_role = info["identity"] if info["identity"] != "待整理" else info["role"]
        first_appearance = info["first_appearance"]
        if first_appearance == "待整理" and mentions.get(info["name"]):
            first_appearance = f"第{mentions[info['name']][0]}章"
        current_status = info["status"]
        if current_status == "待整理" and mentions.get(info["name"]):
            current_status = f"已登场到第{mentions[info['name']][-1]}章"
        rows.append(
            f"| {info['name']} | {identity_or_role} | {info['relation_to_protagonist']} | {info['goal']} | {first_appearance} | {current_status} | `characters/{rel_path.name}` |"
        )
    cards_table = "\n".join(rows) if rows else "| 暂无 | - | - | - |"
    protagonist = protagonist_name or "待整理"
    protagonist_info = next((item for item in card_infos if item["name"] == protagonist), None)
    current_focus_rows = []
    for info in card_infos[:5]:
        latest = mentions.get(info["name"], [])
        latest_text = f"第{latest[-1]}章" if latest else "-"
        current_focus_rows.append(f"| {info['name']} | {info['goal']} | {latest_text} | {info['summary']} |")
    current_focus_table = "\n".join(current_focus_rows) if current_focus_rows else "| 暂无 | - | - | - |"
    relation_rows = []
    for left, right, note in relation_pairs[:8]:
        relation_rows.append(f"| {left} | {right} | 相关 | {note} | 待整理 |")
    relation_table = "\n".join(relation_rows) if relation_rows else "| 暂无 | - | - | - | - |"
    return f"""---
project: {clean_project_title(title)}
updated: {today}
total_characters: {len(card_infos)}
---

# 人物总表

## 导入说明

- 本文件由 `map-base.py` 初始化。
- 已复制的人物单卡请继续补充到 `characters/` 目录。
- 若当前只有零散人物资料，请先把关系、阵营和当前状态整理到这里。

## 已识别来源

{markdown_sources(source_items)}

## 已导入人物卡

| 姓名 | 身份/阵营 | 与主角关系 | 当前目标 | 首次登场 | 当前状态 | 详细卡片 |
|------|-----------|------------|----------|----------|----------|----------|
{cards_table}

## 主角锚点

### {protagonist}

- **身份**：{protagonist_info['identity'] if protagonist_info else '待整理'}
- **当前立场**：待整理
- **性格核心**：{protagonist_info['core'] if protagonist_info else '待整理'}
- **当前目标**：待整理
- **阶段状态**：待整理
- **首次登场**：{protagonist_info['first_appearance'] if protagonist_info else '待整理'}
- **详细卡片**：`characters/{protagonist}.md`

## 已提取人物摘要

{"".join(f'- **{info["name"]}**：{info["summary"]}\n' for info in card_infos) if card_infos else '- 暂无可提取人物摘要\n'}

## 关系矩阵

| 人物A | 人物B | 当前关系 | 冲突/纽带 | 预计变化 |
|-------|-------|----------|-----------|----------|
{relation_table}

## 当前重点人物

| 人物 | 当前戏份任务 | 最近变化 | 下次需要处理的点 |
|------|--------------|----------|------------------|
{current_focus_table}

## 待整理

- [ ] 补齐主角与核心人物
- [ ] 补齐关系矩阵
- [ ] 补齐当前重点人物与状态变化
"""


def build_timeline_file(title: str, source_items: list[Candidate], timeline_rows: list[dict[str, str]], today: str) -> str:
    texts = collect_texts(source_items)
    anchors = infer_timeline_anchor_lines(texts)
    current_story_date = anchors[0] if anchors else infer_era(texts)
    source_blocks = []
    for item in sorted(source_items, key=lambda value: value.rel)[:5]:
        source_blocks.append(f"### `{item.rel}`\n{source_excerpt(read_text(item.source))}")
    source_section = "\n\n".join(source_blocks) or "暂无明确时间线源文件，请人工补齐。"
    return f"""---
project: {clean_project_title(title)}
current_story_date: {current_story_date}
updated: {today}
---

# 时间线

## 导入说明

- 本文件由 `map-base.py` 初始化。
- 现有时间资料已识别，但尚未完全结构化。
- 请先把章节时间、卷跨度和关键历史/世界事件整理成表格。

## 已识别来源

{markdown_sources(source_items)}

## 原始资料摘录

{source_section}

## 初步提取时间锚点

{"".join(f'- {item}\n' for item in anchors) if anchors else '- 待整理'}

## 已导入章节时间线

| 章节 | 故事时间 | 距上一章间隔 | 关键事件 | 人物状态变化 | 需要回写文件 |
|------|----------|--------------|----------|--------------|--------------|
{"".join(f"| {row['chapter']} | {row['story_date']} | 待整理 | {row['event']} | 待整理 | `STATE.md` |\n" for row in timeline_rows) if timeline_rows else "| 暂无 | 待整理 | - | 待整理 | 待整理 | `STATE.md` |\n"}

## 待整理

- [ ] 建立章节时间线
- [ ] 对齐关键事件锚点
- [ ] 标出时间风险与待核实项
"""


def build_roadmap_file(
    title: str,
    source_items: list[Candidate],
    chapter_numbers: list[int],
    chapter_queue_rows: list[dict[str, str]],
    today: str,
) -> str:
    texts = collect_texts(source_items)
    roadmap_lines = infer_roadmap_lines(texts)
    current_arc = infer_current_arc(texts)
    source_blocks = []
    for item in sorted(source_items, key=lambda value: value.rel)[:5]:
        source_blocks.append(f"### `{item.rel}`\n{source_excerpt(read_text(item.source))}")
    source_section = "\n\n".join(source_blocks) or "暂无明确卷纲/路线图源文件，请人工补齐。"
    imported_range = chapter_range_text(chapter_numbers)
    return f"""---
project: {clean_project_title(title)}
target_words: 待定
target_chapters: 待定
current_arc: {current_arc}
updated: {today}
---

# 故事规划

## 导入说明

- 本文件由 `map-base.py` 初始化。
- 当前可能已存在卷纲或阶段规划来源，但尚未合并成统一路线图。

## 已识别来源

{markdown_sources(source_items)}

## 原始资料摘录

{source_section}

## 当前导入覆盖

- 已导入正文章节范围：{imported_range}
- 当前卷/阶段：{current_arc}
- 下一步优先：补齐当前卷目标，再决定后续章节规划

## 初步提取路线信息

{"".join(f'- {item}\n' for item in roadmap_lines) if roadmap_lines else '- 待整理'}

## 当前卷章节队列

| 章节 | 章节任务 | 情绪目标 | 预计钩子 | 状态 |
|------|----------|----------|----------|------|
{"".join(f"| {row['chapter']} | {row['task']} | {row['emotion']} | {row['hook']} | {row['status']} |\n" for row in chapter_queue_rows) if chapter_queue_rows else "| 暂无 | 待整理 | 待整理 | 待整理 | 未开始 |\n"}

## 待整理

- [ ] 明确当前卷与下一卷
- [ ] 补齐章节范围与阶段目标
- [ ] 补齐卷末钩子与长线伏笔
"""


def build_state_file(
    title: str,
    current_arc: str,
    current_chapter: int,
    latest_outline: int,
    upcoming_outline_numbers: list[int],
    total_words: int,
    imported_cards: int,
    upcoming_rows: list[dict[str, str]],
    today: str,
) -> str:
    next_chapter = current_chapter + 1 if current_chapter > 0 else 1
    status = "连载中" if current_chapter > 0 else "导入待整理"
    latest = f"已导入到第{current_chapter}章" if current_chapter > 0 else "完成资料导入"
    next_goal = f"第{next_chapter}章规划或核对"
    if latest_outline > current_chapter:
        next_goal = f"第{current_chapter + 1}章写作或核对"
    rendered_upcoming = [f"| 第{num}章 | 已有大纲待写作 | 待整理 | 待整理 | 待写作 |" for num in upcoming_outline_numbers[:3]]
    upcoming_table = "\n".join(rendered_upcoming) if rendered_upcoming else f"| 第{next_chapter}章 | 待规划 | 待整理 | 待整理 | 未开始 |"
    return f"""---
project: {clean_project_title(title)}
status: {status}
current_arc: {current_arc}
current_chapter: {current_chapter}
total_words: {total_words}
last_updated: {today}
---

# 当前状态

## 进度快照

| 项目 | 当前值 |
|------|--------|
| 当前卷 | {current_arc} |
| 当前章节 | 第{current_chapter}章 |
| 总字数 | {total_words} |
| 最新完成内容 | {latest} |
| 下一目标 | {next_goal} |

## 当前创作焦点

- **本阶段任务**：核对导入资料，补齐核心结构文件
- **当前最重要的矛盾**：统一旧资料与标准项目结构
- **本周/本轮要完成的内容**：检查 `reviews/map-base-report.md`
- **绝对不能忘的设定约束**：先核资料，再继续写新章节

## 人物当前状态

| 人物 | 当前状态 | 最新相关章节 | 下次出场任务 |
|------|----------|--------------|--------------|
| 已导入人物卡 {imported_cards} 份 | 待整理 | - | 补齐总表 |

## 接下来 3 章

| 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |
|------|------|----------|----------|------|
{upcoming_table}

## 待办清单

- [ ] 检查 `reviews/map-base-report.md`
- [ ] 补齐 `PROJECT.md` 的关键信息
- [ ] 补齐 `ROADMAP.md` 与 `TIMELINE.md`
- [ ] 决定下一章的规划与写作范围
"""


def build_report(
    source_dir: Path,
    dry_run: bool,
    candidates: list[Candidate],
    planned: list[PlannedAction],
    generated: list[str],
    skipped: list[str],
    unresolved: list[str],
) -> str:
    classified_rows = []
    for candidate in sorted(candidates, key=lambda item: item.rel):
        classified_rows.append(f"| `{candidate.rel}` | {candidate.kind} | {candidate.reason} |")
    kind_counts = Counter(candidate.kind for candidate in candidates)
    actions = []
    for action in planned:
        actions.append(f"| `{action.source.relative_to(source_dir).as_posix()}` | `{action.destination.relative_to(source_dir).as_posix()}` | {action.kind} | {action.mode} |")
    generated_lines = "\n".join(f"- {item}" for item in generated) or "- 无"
    skipped_lines = "\n".join(f"- {item}" for item in skipped) or "- 无"
    unresolved_lines = "\n".join(f"- {item}" for item in unresolved) or "- 无"
    mode = "dry-run" if dry_run else "write"
    count_lines = "\n".join(f"- `{kind}`: {count}" for kind, count in sorted(kind_counts.items())) or "- 无"
    return f"""# map-base Report

## Summary

- Source directory: `{source_dir}`
- Mode: `{mode}`
- Scanned files: {len(candidates)}
- Planned copy actions: {len(planned)}
- Generated core files: {len(generated)}

## Kind Counts

{count_lines}

## Classification

| Source | Kind | Reason |
|--------|------|--------|
{chr(10).join(classified_rows) if classified_rows else '| 无 | - | - |'}

## Planned Actions

| Source | Destination | Kind | Mode |
|--------|-------------|------|------|
{chr(10).join(actions) if actions else '| 无 | - | - | - |'}

## Generated Core Files

{generated_lines}

## Skipped

{skipped_lines}

## Needs Review

{unresolved_lines}
"""


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_file(path: Path, content: str, force: bool) -> tuple[bool, str]:
    if path.exists() and not force:
        return False, f"skip existing `{path.name}`"
    ensure_parent(path)
    path.write_text(content, encoding="utf-8")
    return True, f"write `{path.name}`"


def main() -> int:
    args = parse_args()
    source_dir = Path(args.source_dir).expanduser().resolve()
    if not source_dir.exists() or not source_dir.is_dir():
        print(f"source directory not found: {source_dir}", file=sys.stderr)
        return 2

    core_count = sum(1 for name in CORE_FILES if (source_dir / name).exists())
    if core_count >= 3 and not args.merge:
        print("检测到当前目录已经接近或已经是结构化项目。")
        print("如果需要继续吸收散落资料，请使用 /novel:map-base --merge")
        return 0

    for folder in ("chapters/draft", "chapters/outlines", "characters", "research", "reviews"):
        (source_dir / folder).mkdir(parents=True, exist_ok=True)

    candidates = scan_candidates(source_dir)
    actionable = [
        item
        for item in candidates
        if item.kind not in {"unknown", "ignored_generated"} and not item.kind.startswith("existing_")
    ]
    if len(actionable) < 1:
        print("未发现足够的已有小说材料，无法执行 map-base。")
        print("空目录或只有很少想法时，直接运行：/novel:new-project")
        print("如果你有核心设定文档，请把文档放进当前目录后再运行：/novel:map-base")
        return 1

    planned: list[PlannedAction] = []
    skipped: list[str] = []
    unresolved: list[str] = []
    used_destinations: set[Path] = set()
    chapter_destinations: dict[Path, Candidate] = {}

    for candidate in sorted(actionable, key=lambda item: (-item.confidence, item.rel)):
        destination = resolve_copy_destination(source_dir, candidate, used_destinations)
        if destination is None:
            continue
        if candidate.kind in {"chapter", "outline"}:
            if destination in chapter_destinations:
                unresolved.append(
                    f"章节冲突：`{candidate.rel}` 与 `{chapter_destinations[destination].rel}` 都映射到 `{destination.relative_to(source_dir).as_posix()}`"
                )
                continue
            chapter_destinations[destination] = candidate
        used_destinations.add(destination)
        planned.append(PlannedAction(candidate.source, destination, candidate.kind, "copy", candidate.reason))

    source_map = {action.destination: action.source for action in planned}

    generated: list[str] = []

    if not args.dry_run:
        for action in planned:
            if action.source.resolve() == action.destination.resolve():
                skipped.append(f"already normalized: `{action.destination.relative_to(source_dir).as_posix()}`")
                continue
            if action.destination.exists() and not args.force:
                skipped.append(f"target exists: `{action.destination.relative_to(source_dir).as_posix()}`")
                continue
            ensure_parent(action.destination)
            shutil.copy2(action.source, action.destination)

    project_sources = [item for item in candidates if item.kind in {"project_source", "existing_project"}]
    timeline_sources = [item for item in candidates if item.kind in {"timeline_source", "existing_timeline"}]
    roadmap_sources = [item for item in candidates if item.kind in {"roadmap_source", "existing_roadmap"}]
    character_indexes = [item for item in candidates if item.kind in {"characters_index", "existing_characters"}]
    character_cards = [item for item in planned if item.kind == "character_card"]

    disk_chapters = chapter_files_on_disk(source_dir)
    disk_outlines = outline_files_on_disk(source_dir)
    disk_cards = character_files_on_disk(source_dir)

    if args.dry_run:
        planned_chapter_paths = [item.destination for item in planned if item.kind == "chapter" and item.destination not in disk_chapters]
        planned_outline_paths = [item.destination for item in planned if item.kind == "outline" and item.destination not in disk_outlines]
        planned_card_paths = [item.destination for item in planned if item.kind == "character_card" and item.destination not in disk_cards]
        all_chapter_paths = sorted(disk_chapters + planned_chapter_paths)
        all_outline_paths = sorted(disk_outlines + planned_outline_paths)
        all_card_paths = sorted(disk_cards + planned_card_paths)
    else:
        all_chapter_paths = disk_chapters
        all_outline_paths = disk_outlines
        all_card_paths = disk_cards

    current_chapter = max(chapter_numbers_from_paths(all_chapter_paths, r"chapter-(\d+)\.md$"), default=0)
    latest_outline = max(chapter_numbers_from_paths(all_outline_paths, r"outline-(\d+)\.md$"), default=0)
    total_words = 0
    if args.dry_run:
        for chapter_file in all_chapter_paths:
            if chapter_file.exists():
                total_words += word_count(chapter_file)
            elif action := next((item for item in planned if item.destination == chapter_file), None):
                total_words += word_count(action.source)
    else:
        for chapter_file in all_chapter_paths:
            total_words += word_count(chapter_file)
    imported_numbers = chapter_numbers_from_paths(all_chapter_paths + all_outline_paths, r"(?:chapter|outline)-(\d+)\.md$")
    imported_card_count = len(all_card_paths)
    upcoming_outline_numbers = [num for num in chapter_numbers_from_paths(all_outline_paths, r"outline-(\d+)\.md$") if num > current_chapter]

    inferred_title = (
        frontmatter_value(read_text(source_dir / "PROJECT.md"), "title")
        if (source_dir / "PROJECT.md").exists()
        else None
    )
    if not inferred_title:
        inferred_title = best_candidate(project_sources).title if project_sources else source_dir.name
    inferred_title = clean_project_title(inferred_title)
    today = dt.date.today().isoformat()
    current_arc = infer_current_arc(collect_texts(roadmap_sources))
    card_infos = collect_card_infos(all_card_paths, source_map)
    protagonist_name = guess_protagonist_name(project_sources, character_cards)
    if not protagonist_name:
        protagonist_name = next((info["name"] for info in card_infos if info["role"] == "主角"), None)
    names = [info["name"] for info in card_infos if len(info["name"]) >= 2]
    mentions = collect_character_mentions(all_chapter_paths, source_map, names)
    relation_pairs = relation_pairs_from_cards(card_infos)
    chapter_queue_rows = build_chapter_queue_rows(all_outline_paths, all_chapter_paths, source_map)
    future_queue_rows = [
        row for row in chapter_queue_rows if (chapter_number_from_label(row["chapter"]) or 0) > current_chapter
    ]
    timeline_rows = build_timeline_rows(all_chapter_paths, source_map)

    core_writes: list[tuple[Path, str]] = []
    if not (source_dir / "PROJECT.md").exists() or args.force:
        core_writes.append((source_dir / "PROJECT.md", build_project_file(inferred_title, project_sources, roadmap_sources, protagonist_name, today)))

    if not (source_dir / "CHARACTERS.md").exists() or args.force:
        core_writes.append(
            (
                source_dir / "CHARACTERS.md",
                build_characters_file(inferred_title, protagonist_name, card_infos, mentions, relation_pairs, character_indexes, today),
            )
        )

    if not (source_dir / "TIMELINE.md").exists() or args.force:
        core_writes.append((source_dir / "TIMELINE.md", build_timeline_file(inferred_title, timeline_sources, timeline_rows, today)))

    if not (source_dir / "ROADMAP.md").exists() or args.force:
        core_writes.append(
            (source_dir / "ROADMAP.md", build_roadmap_file(inferred_title, roadmap_sources, imported_numbers, chapter_queue_rows, today))
        )

    if not (source_dir / "STATE.md").exists() or args.force:
        core_writes.append(
            (
                source_dir / "STATE.md",
                build_state_file(
                    inferred_title,
                    current_arc,
                    current_chapter,
                    latest_outline,
                    upcoming_outline_numbers,
                    total_words,
                    imported_card_count,
                    future_queue_rows,
                    today,
                ),
            )
        )

    for path, content in core_writes:
        if args.dry_run:
            generated.append(f"would generate `{path.name}`")
            continue
        written, message = write_file(path, content, args.force)
        if written:
            generated.append(message)
        else:
            skipped.append(message)

    for candidate in candidates:
        if candidate.kind == "unknown":
            unresolved.append(f"未分类：`{candidate.rel}`")

    report_path = source_dir / "reviews" / "map-base-report.md"
    report = build_report(source_dir, args.dry_run, candidates, planned, generated, skipped, unresolved)
    if args.dry_run:
        print(report)
    else:
        report_path.write_text(report, encoding="utf-8")
        print("map-base completed")
        print(f"source: {source_dir}")
        print(f"report: {report_path}")
        print(f"planned copies: {len(planned)}")
        print(f"generated core files: {len(generated)}")
        if unresolved:
            print(f"needs review: {len(unresolved)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
