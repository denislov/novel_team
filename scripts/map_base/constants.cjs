const TEXT_SUFFIXES = new Set(['.md', '.markdown', '.txt']);
const CORE_FILES = ['PROJECT.md', 'CHARACTERS.md', 'TIMELINE.md', 'ROADMAP.md', 'STATE.md'];
const IGNORED_DIRS = new Set([
  '.git',
  '.claude',
  '.codex',
  '.agents',
  '.claude-plugin',
  '.codex-plugin',
  '.planning',
  '__pycache__',
  '.venv',
  'venv',
  'node_modules',
  'agents',
  'commands',
  'references',
  'scripts',
  'templates',
  'workflows',
]);
const STRUCTURED_DIRS = new Set(['chapters', 'characters', 'research', 'reviews']);
const GENERIC_CHARACTER_NAMES = new Set(['人物', '人物卡', '角色', '角色卡', '人设', '人物设定', '角色设定', 'character', 'character-card']);
const CHINESE_NUMERAL_MAP = new Map([['零', 0], ['〇', 0], ['一', 1], ['二', 2], ['两', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8], ['九', 9]]);
const CHINESE_UNIT_MAP = new Map([['十', 10], ['百', 100], ['千', 1000]]);
const TITLE_NOISE_PATTERNS = [
  /(项目设定|小说设定|作品设定|世界观设定|设定集|设定稿)$/i,
  /(时间线整理|时间线总表|故事时间线|时间线)$/i,
  /(第一卷卷纲|第二卷卷纲|第三卷卷纲|卷纲|总纲|路线图|roadmap)$/i,
  /(人物总表|角色总表|人物关系|角色关系)$/i,
];
const OUTLINE_KEYWORDS = ['大纲', 'outline', '章节蓝图', '细纲', '章纲', '分镜', '拍点', 'beat'];
const REVIEW_NAME_KEYWORDS = ['审核', '复盘', 'review', 'verification', '修订意见', '修改报告', 'edit-report'];
const REVIEW_BODY_KEYWORDS = ['审核结果', '建议修改', '阻塞问题', '一致性检查', '复查清单', '总体评价', '亮点', '问题汇总'];
const TIMELINE_KEYWORDS = ['timeline', '时间线', '年表', '纪年', 'chronology', '事件表'];
const ROADMAP_KEYWORDS = ['roadmap', '路线图', '卷纲', '阶段规划', '剧情规划', '卷计划', '总纲', 'arc', '分卷'];
const CHARACTER_INDEX_KEYWORDS = ['人物总表', '角色总表', '关系表', '人物关系', '角色关系', 'cast'];
const CHARACTER_CARD_KEYWORDS = ['人物卡', '角色卡', 'character-card', '人物设定', '角色设定'];
const PROJECT_KEYWORDS = ['project', '设定', '世界观', '主线', '金手指', '简介', '梗概', '设定集', '作品设定'];
const RESEARCH_KEYWORDS = ['research', '考据', '资料', '史料', '术语', '背景研究', '百科', '行业资料'];

module.exports = {
  CHARACTER_CARD_KEYWORDS,
  CHARACTER_INDEX_KEYWORDS,
  CHINESE_NUMERAL_MAP,
  CHINESE_UNIT_MAP,
  CORE_FILES,
  GENERIC_CHARACTER_NAMES,
  IGNORED_DIRS,
  OUTLINE_KEYWORDS,
  PROJECT_KEYWORDS,
  RESEARCH_KEYWORDS,
  REVIEW_BODY_KEYWORDS,
  REVIEW_NAME_KEYWORDS,
  ROADMAP_KEYWORDS,
  STRUCTURED_DIRS,
  TEXT_SUFFIXES,
  TIMELINE_KEYWORDS,
  TITLE_NOISE_PATTERNS,
};
