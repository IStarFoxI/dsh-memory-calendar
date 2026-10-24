#!/usr/bin/env node
/**
 * memory-prototype.mjs — Phase 0 只读时间轴索引器（单文件原型）
 *
 * 不调 LLM、不联网、不复制原文。只做：
 *   scan     读 session.v*.jsonl.zstd，抽 user/assistant 文本，按空闲 gap 切 episode
 *   timeline 按天/周看时间轴
 *   search   在 episode 文本里做子串/词项检索
 *   stats    看索引规模
 *
 * 用法：
 *   node memory-prototype.mjs scan
 *   node memory-prototype.mjs timeline --from 2026-08-01 --granularity day
 *   node memory-prototype.mjs search --query "星维" --limit 10
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

// Node 24 有 zstd；老版本回退 gzip（扩展名跟着变）
const COMPRESS = typeof zlib.zstdCompressSync === 'function'
  ? { ext: '.zst', compress: (b) => zlib.zstdCompressSync(b), decompress: (b) => zlib.zstdDecompressSync(b) }
  : { ext: '.gz', compress: (b) => zlib.gzipSync(b), decompress: (b) => zlib.gunzipSync(b) };

// ── CLI ─────────────────────────────────────────────────────────────

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: 'string' },
    sessions: { type: 'string' },
    workspace: { type: 'string' },
    session: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    granularity: { type: 'string', default: 'day' },
    query: { type: 'string' },
    text: { type: 'string' },
    package: { type: 'string' },
    level: { type: 'string', default: 'day' },
    yes: { type: 'boolean', default: false },
    chars: { type: 'string', default: '4000' },
    deep: { type: 'boolean', default: false },
    limit: { type: 'string', default: '20' },
    gap: { type: 'string', default: '120' },
    help: { type: 'boolean', short: 'h' },
  },
});

const cmd = positionals[0] || 'help';
const workspace = path.resolve(values.workspace || process.cwd());
const root = path.resolve(values.root || path.join(workspace, '.memory-calendar'));
const gapMs = Math.max(1, Number(values.gap) || 120) * 60_000;
const limit = Math.max(1, Number(values.limit) || 20);

function usage() {
  console.log(`memory-prototype — Phase 0 时间轴索引器（只读、无网络、无 LLM）

用法:
  node memory-prototype.mjs scan [--workspace <dir>] [--sessions <dir>] [--root <dir>] [--session <id>] [--gap 120]
  node memory-prototype.mjs package [--session <id>]          # episode -> 对话文本 zstd 包
  node memory-prototype.mjs pending                          # 哪些周期还没生成清单（补做）
  node memory-prototype.mjs aggregate --level day|week|month --yes
  node memory-prototype.mjs read --package <id> [--chars 4000]
  node memory-prototype.mjs tags
  node memory-prototype.mjs doctor [--deep]               # 自检；--deep 逐个解压校验包
  node memory-prototype.mjs timeline [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--granularity day|week] [--root <dir>]
  node memory-prototype.mjs trigger --text "还记得上次说的记忆插件吗"   # 看会不会激活
  node memory-prototype.mjs search --query <text> [--from ...] [--to ...] [--limit 20] [--deep]
  node memory-prototype.mjs stats

默认:
  workspace = 当前目录
  sessions  = ~/.dsh/sessions/--<规范化 workspace>--（找不到则扫 ~/.dsh/sessions）
  root      = <workspace>/.memory-calendar
`);
}

// ── 时间工具（本地时区） ─────────────────────────────────────────────

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function dateKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeKey(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function weekKey(ms) {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const tmp = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp - yearStart) / 86_400_000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad(week)}`;
}

function parseDate(s, endOfDay = false) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`日期格式必须是 YYYY-MM-DD: ${s}`);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return d.getTime();
}

// ── 会话发现与解压 ───────────────────────────────────────────────────

function resolveSessionsRoot() {
  if (values.sessions) return path.resolve(values.sessions);
  // DSH 的 cwd 规范化：去掉冒号，反斜杠换 '-'。C:\Users -> C-Users
  const norm = `--${workspace.replace(/:/g, '').replace(/[\\/]/g, '-')}--`;
  const exact = path.join(os.homedir(), '.dsh', 'sessions', norm);
  if (fs.existsSync(exact)) return exact;

  const base = path.join(os.homedir(), '.dsh', 'sessions');
  if (!fs.existsSync(base)) throw new Error(`找不到会话目录: ${base}`);
  // 回退：找任何包含 session.v*.jsonl.zstd 的工作区目录
  const dirs = fs.readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(base, e.name))
    .filter((d) => {
      try {
        return findSessionFiles(d).length > 0;
      } catch {
        return false;
      }
    });
  if (dirs.length === 0) throw new Error(`会话目录下没有 session.v*.jsonl.zstd: ${base}`);
  return dirs.length === 1 ? dirs[0] : base;
}

function findSessionFiles(dir) {
  // 同一目录可能留着 v0/v1/v2/v3/v4 多个 generation；只取最高版本，避免重复索引
  const byDir = new Map();
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      const m = /^session(?:\.v(\d+))?\.jsonl\.zstd$/.exec(ent.name);
      if (!m) continue;
      const version = m[1] ? Number(m[1]) : 0;
      const cur = byDir.get(d);
      if (!cur || version > cur.version) byDir.set(d, { path: p, version });
    }
  };
  walk(dir);
  return [...byDir.values()].map((x) => x.path).sort();
}

/**
 * 解压多帧 zstd：每帧一个 JSONL 批次。按 magic 扫描逐帧解，
 * 失败或首字节不是 '{' 的当误命中跳过。
 */
function decompressSession(file) {
  const buf = fs.readFileSync(file);
  const parts = [];
  let i = 0;
  let frames = 0;
  let bad = 0;
  while (true) {
    const off = buf.indexOf(ZSTD_MAGIC, i);
    if (off < 0) break;
    frames += 1;
    try {
      const out = zlib.zstdDecompressSync(buf.subarray(off));
      if (out.length > 0 && out[0] === 0x7b) parts.push(out);
      else bad += 1;
    } catch {
      bad += 1;
    }
    i = off + 4;
  }
  return { text: Buffer.concat(parts).toString('utf8'), frames, bad };
}

function parseEvents(text) {
  const events = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* torn tail */ }
  }
  return events;
}

// ── 文本提取与脱敏 ───────────────────────────────────────────────────

const SECRET_PATTERNS = [
  [/sk-[A-Za-z0-9_-]{16,}/g, 'sk-[REDACTED]'],
  [/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]'],
  [/AKIA[0-9A-Z]{16}/g, 'AKIA[REDACTED]'],
  [/ghp_[A-Za-z0-9]{36,}/g, 'ghp_[REDACTED]'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/g, 'xox-[REDACTED]'],
  [/(api[_-]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9._~+\/-]{12,}/gi, '$1=[REDACTED]'],
];

function redact(s) {
  let out = s;
  for (const [re, rep] of SECRET_PATTERNS) out = out.replace(re, rep);
  return out;
}

function textOf(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

function extractMessages(events) {
  const msgs = [];
  for (const ev of events) {
    if (ev.type === 'user/message') {
      const d = ev.data || {};
      if (!d.source || d.source.kind !== 'user') continue; // 跳过 runtime-context / plugin 注入
      const text = textOf(d.content);
      if (text) msgs.push({ seq: ev.seq, time: ev.time, role: 'user', text: redact(text) });
    } else if (ev.type === 'assistant/message') {
      const d = ev.data || {};
      const msg = d.message || {};
      if (!msg.source || msg.source.kind !== 'model') continue;
      const text = textOf(msg.content); // 只要 text，跳过 reasoning
      if (text) msgs.push({ seq: ev.seq, time: ev.time, role: 'assistant', text: redact(text) });
    }
  }
  return msgs.sort((a, b) => a.time - b.time || a.seq - b.seq);
}

// ── Episode 切分 ─────────────────────────────────────────────────────

// 常见虚词/口头词，避免标签被 “这个/然后/就是” 占满
const STOPWORDS = new Set([
  '的', '了', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们', '这', '那',
  '一个', '什么', '怎么', '为什么', '可以', '没有', '就是', '因为', '所以', '但是',
  '然后', '现在', '还是', '已经', '这个', '那个', '自己', '不是', '真的', '东西',
  '时候', '问题', '感觉', '觉得', '知道', '一下', '如果', '可能', '需要', '应该',
  '这样', '那样', '这里', '那里', '今天', '昨天', '明天', '一点', '一些', '还有',
  '以及', '或者', '而且', '不过', '只是', '不会', '不用', '不要', '不能', '有些',
  '很多', '非常', '比较', '特别', '正在', '一直', '总是', '终于', '其实', '当然',
  '也许', '大概', '差不多', '用户', '助手', '模型', '内容', '部分', '方式', '情况',
  '你的', '我的', '他的', '她的', '它的', '一句', '一段', '一种', '一次', '一样',
  '的是', '直接',
  'user', 'assistant', 'system', 'the', 'and', 'for', 'with', 'this', 'that',
  'from', 'have', 'will', 'would', 'should', 'could', 'about', 'there', 'their',
  'what', 'when', 'where', 'which', 'while', 'your', 'you', 'are', 'was', 'were',
  'has', 'had', 'not', 'but', 'all', 'can', 'may', 'its', 'our', 'out', 'one',
  'two', 'how', 'why', 'who', 'use', 'using', 'used', 'awa', 'text', 'true',
  'false', 'null', 'json', 'node', 'string', 'object', 'https', 'http', 'www',
  'com', 'org', 'html', 'users', 'documents', 'desktop', 'appdata', 'programs',
  'local', 'roaming', 'temp', 'windows', 'system32', 'star', 'dimension',
]);

// 不作为子标签的“没必要的”话语/泛词：子标签只留重要内容
const TAG_DENYLIST = new Set([
  // 中文虚词 / 口头词 / 泛名词
  '直接', '文件', '内容', '部分', '方式', '情况', '问题', '东西', '时候', '现在',
  '然后', '就是', '这个', '那个', '可以', '没有', '什么', '怎么', '因为', '所以',
  '但是', '如果', '可能', '需要', '应该', '觉得', '知道', '看看', '一下', '一句',
  '一段', '一种', '一次', '一样', '你的', '我的', '他的', '她的', '它的', '我们',
  '你们', '他们', '自己', '不是', '真的', '其实', '当然', '也许', '大概', '差不多',
  '很多', '非常', '比较', '特别', '正在', '一直', '总是', '终于', '还是', '已经',
  '只是', '不过', '而且', '或者', '以及', '还有', '一些', '一点', '这里', '那里',
  '今天', '昨天', '明天', '用户', '助手', '模型', '的是', '而已', '之类', '这些',
  '那些', '这么', '那么', '为了', '关于', '对于', '通过', '进行', '开始', '最后',
  '目前', '现在', '差不多', '东西', '地方', '事情', '方面', '过程', '结果',
  // 英文泛词 / 代码噪声
  'add', 'plugin', 'bug', 'readme', 'file', 'files', 'path', 'image', 'input',
  'output', 'text', 'page', 'code', 'line', 'call', 'make', 'get', 'set', 'run',
  'use', 'used', 'using', 'true', 'false', 'null', 'json', 'node', 'string',
  'object', 'test', 'check', 'first', 'found', 'let', 'isn', 'like', 'just',
  'now', 'new', 'old', 'good', 'bad', 'one', 'two', 'see', 'look', 'want',
  'need', 'know', 'think', 'say', 'said', 'go', 'going', 'come', 'came',
  'well', 'also', 'then', 'than', 'into', 'over', 'after', 'before', 'because',
  'so', 'if', 'or', 'and', 'but', 'not', 'no', 'yes', 'ok', 'okay', 'hello',
  'hi', 'thanks', 'thank', 'please', 'error', 'warning', 'info', 'debug', 'log',
  'data', 'value', 'name', 'type', 'version', 'default', 'start', 'end',
  'is', 'it', 'me', 'to', 'in', 'on', 'the', 'a', 'an', 'of', 'at', 'by',
  'as', 'be', 'are', 'was', 'were', 'this', 'that', 'these', 'those', 'my',
  'your', 'its', 'our', 'their', 'we', 'you', 'they', 'he', 'she', 'him',
  'her', 'them', 'us', 'i', 'from', 'or', 'if', 'so', 'then', 'than',
  '它是', '不需要', '一条', '不同', '于是', '真正', '出来', '它们', '不可',
  '能够', '地方', '事情', '方面', '过程', '结果', '一条',
]);

/**
 * 规则标签（无模型消耗）：
 * - 日期 / 周
 * - 手动 #tag
 * - Windows 文件路径
 * - 拉丁技术词（zstd / DeepSeek / RAPTOR…）
 * - 中文词：Intl.Segmenter 分词，取出现 ≥2 次的高频词
 */
// 别名：查询/入库时都归一到同一个 canonical tag；后续可移到 meta/tag-aliases.json
const TAG_ALIASES = new Map(Object.entries({
  '记忆压缩': '记忆插件',
  '上下文压缩': '记忆插件',
  'memory plugin': '记忆插件',
  'star dimension': '星维',
  '星维 · star dimension': '星维',
}));

function canonicalTag(tag) {
  const t = String(tag).trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const lower = t.toLowerCase();
  return TAG_ALIASES.get(lower) ?? lower;
}

function isCleanTag(t) {
  if (t.length < 2 || t.length > 24) return false;
  if (!/[\p{L}\p{N}]/u.test(t)) return false;
  if (/[`*_~[\](){}<>|\\/]/u.test(t)) return false;
  if (/[，。！？；：、“”‘’（）【】《》…—]/.test(t)) return false;
  return true;
}

const KNOWN_PHRASES = [
  '记忆插件', '上下文压缩', '无损压缩', '标签系统', '压缩比',
  '星维', '冰元素', '冰锥', '大肥鱼',
];

function extractTags(text, date, week) {
  const byTag = new Map();

  const add = (tag, weight, source, category) => {
    const canonical = canonicalTag(tag);
    if (!isCleanTag(canonical)) return;
    // 手动标签和关键短语优先保留；其它类别先过“没必要的词”黑名单
    if (category !== 'manual' && category !== 'phrase' && TAG_DENYLIST.has(canonical)) return;
    const cur = byTag.get(canonical);
    if (!cur || weight > cur.weight) {
      byTag.set(canonical, { tag: canonical, weight, source, category });
    }
  };

  // 日期/周不再当子标签：它们已经在 bigTag / date / week 字段里，属于元数据
  // 手动 #tag：权重最高
  for (const m of text.matchAll(/#([\p{L}\p{N}_-]{1,24})/gu)) add(m[1], 1.0, 'manual', 'manual');

  // 路径：只取最后一段（文件名/目录名），避免把 C:\Users\... 整条当标签
  for (const m of text.matchAll(/[A-Za-z]:\\[^\s"'<>|]+/g)) {
    const p = m[0].replace(/[.,;:)]+$/, '');
    const base = p.split(/[\\/]/).filter(Boolean).at(-1);
    if (base && base.length <= 40) add(base, 0.6, 'rule', 'path');
  }

  // 已知关键短语：保证中文主题不被 Latin 技术词挤掉
  for (const phrase of KNOWN_PHRASES) {
    if (text.includes(phrase)) add(phrase, 0.8, 'rule', 'phrase');
  }

  // 拉丁词：跳过路径片段（前后是 \ 或 /），跳过停用词
  for (const m of text.matchAll(/(?<![\\/])\b[A-Za-z][A-Za-z0-9_.-]{2,24}\b(?![\\/])/g)) {
    const w = m[0];
    if (!STOPWORDS.has(w.toLowerCase())) add(w, 0.7, 'rule', 'latin');
  }

  // 连续两个大写词：Star Dimension -> 一个标签（但会被别名归一成 星维）
  for (const m of text.matchAll(/\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g)) {
    add(`${m[1]} ${m[2]}`, 0.7, 'rule', 'phrase');
  }

  try {
    const seg = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    const counts = new Map();
    for (const s of seg.segment(text)) {
      if (!s.isWordLike) continue;
      const w = s.segment.trim();
      if (w.length < 2 || w.length > 12) continue;
      if (STOPWORDS.has(w)) continue;
      if (/^\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22);
    for (const [w, c] of top) if (c >= 3) add(w, 0.6, 'rule', 'cjk');
  } catch {
    /* ICU 不可用时只用日期/拉丁词 */
  }

  // 分类配额：避免 Latin 技术词把中文主题挤出 20 个名额
  const quota = { manual: 8, cjk: 10, phrase: 5, latin: 6, path: 3 };
  const picked = [];
  for (const category of ['manual', 'cjk', 'phrase', 'latin', 'path']) {
    const items = [...byTag.values()]
      .filter((x) => x.category === category)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, quota[category] ?? 4);
    picked.push(...items);
  }
  return [...new Map(picked.map((x) => [x.tag, x])).values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);
}

function firstUserLine(messages) {
  const u = messages.find((m) => m.role === 'user');
  const line = (u ? u.text : messages[0]?.text || '').replace(/\s+/g, ' ').trim();
  return line.length > 80 ? `${line.slice(0, 80)}…` : line;
}

function buildEpisodes(messages, sessionId) {
  const episodes = [];
  let cur = null;
  for (const m of messages) {
    if (!cur || m.time - cur.end > gapMs) {
      if (cur) episodes.push(cur);
      cur = { sessionId, start: m.time, end: m.time, messages: [] };
    }
    cur.end = m.time;
    cur.messages.push(m);
  }
  if (cur) episodes.push(cur);

  return episodes.map((ep, i) => {
    const date = dateKey(ep.start);
    const week = weekKey(ep.start);
    const text = ep.messages.map((m) => `[${m.role}] ${m.text}`).join('\n\n');
    const title = firstUserLine(ep.messages);
    const subTags = extractTags(text, date, week);
    return {
      id: `ep-${sessionId.slice(-6)}-${pad(i + 1, 3)}`,
      sessionId,
      start: ep.start,
      end: ep.end,
      date,
      week,
      startTime: timeKey(ep.start),
      endTime: timeKey(ep.end),
      title,
      // 大标签 = 这个压缩包本身；子标签 = 包里的关键词/实体/主题
      bigTag: `${date} ${timeKey(ep.start)} ${title}`.slice(0, 80),
      subTags,
      tags: subTags.map((s) => s.tag), // 兼容旧读者
      messageCount: ep.messages.length,
      chars: text.length,
      // session fork 会复制历史；同内容 episode 用 hash 去重
      hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
      messages: ep.messages,
      text,
    };
  });
}

// ── scan ────────────────────────────────────────────────────────────

function scan() {
  const sessionsRoot = resolveSessionsRoot();
  let files = findSessionFiles(sessionsRoot);
  if (values.session) files = files.filter((f) => f.includes(values.session));
  if (files.length === 0) throw new Error(`没有匹配的 session 文件: ${sessionsRoot}`);

  console.log(`sessions root: ${sessionsRoot}`);
  console.log(`session files: ${files.length}\n`);

  const all = [];
  const manifestSessions = [];

  for (const file of files) {
    const t0 = Date.now();
    const { text, frames, bad } = decompressSession(file);
    const events = parseEvents(text);
    const header = events.find((e) => e.type === 'session');
    const sessionId = header?.id || path.basename(path.dirname(file));
    const msgs = extractMessages(events);
    const eps = buildEpisodes(msgs, sessionId);
    all.push(...eps);
    manifestSessions.push({
      id: sessionId,
      file: path.relative(workspace, file),
      bytes: fs.statSync(file).size,
      frames,
      badFrames: bad,
      events: events.length,
      messages: msgs.length,
      episodes: eps.length,
    });
    console.log(`  ${sessionId}`);
    console.log(`    ${events.length} events / ${msgs.length} msgs / ${eps.length} episodes / ${frames} frames (${Date.now() - t0}ms)`);
  }

  // 合并：--session 只替换该 session 的旧数据；全量扫描则整体替换
  const episodesFile = path.join(root, 'episodes.json');
  const manifestFile = path.join(root, 'manifest.json');
  const scannedIds = new Set(manifestSessions.map((s) => s.id));
  let keptEpisodes = [];
  let keptSessions = [];
  if (values.session && fs.existsSync(episodesFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(episodesFile, 'utf8'));
      keptEpisodes = (prev.episodes || []).filter((e) => !scannedIds.has(e.sessionId));
    } catch { /* 旧索引坏了就当没有 */ }
  }
  if (values.session && fs.existsSync(manifestFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      keptSessions = (prev.sessions || []).filter((s) => !scannedIds.has(s.id));
    } catch { /* ignore */ }
  }

  // 去重：fork/复制的 session 会产生同内容 episode
  const unique = [];
  const seen = new Map();
  let duplicates = 0;
  for (const ep of [...keptEpisodes, ...all]) {
    if (seen.has(ep.hash)) {
      duplicates += 1;
      continue;
    }
    seen.set(ep.hash, ep.id);
    unique.push(ep);
  }
  unique.sort((a, b) => a.start - b.start);
  const mergedSessions = [...keptSessions, ...manifestSessions];

  fs.mkdirSync(root, { recursive: true });
  // 不落 text：它可以从 messages 还原；避免 episodes.json 里同一段文本存两遍
  const serializable = unique.map(({ text, ...rest }) => rest);
  fs.writeFileSync(episodesFile, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    sessionsRoot,
    gapMinutes: gapMs / 60_000,
    duplicatesSkipped: duplicates,
    episodes: serializable,
  }, null, 2));
  fs.writeFileSync(manifestFile, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    workspace,
    sessionsRoot,
    gapMinutes: gapMs / 60_000,
    sessions: mergedSessions,
    totalEpisodes: unique.length,
    duplicateEpisodesSkipped: duplicates,
    totalMessages: unique.reduce((n, e) => n + e.messageCount, 0),
    totalChars: unique.reduce((n, e) => n + e.chars, 0),
  }, null, 2));

  if (duplicates > 0) console.log(`\nskipped ${duplicates} duplicate episodes (session forks)`);
  console.log(`\nwrote ${unique.length} episodes -> ${path.join(root, 'episodes.json')}`);
  console.log(`wrote manifest -> ${path.join(root, 'manifest.json')}`);
}

// ── 读索引 ──────────────────────────────────────────────────────────

function loadIndex() {
  const file = path.join(root, 'episodes.json');
  if (!fs.existsSync(file)) throw new Error(`还没有索引，先跑 scan: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  // 索引里不再重复存 text；读的时候从 messages 还原，省一半空间
  for (const e of data.episodes || []) {
    if (!e.text && Array.isArray(e.messages)) {
      e.text = e.messages.map((m) => `[${m.role}] ${m.text}`).join('\n\n');
    }
  }
  return data;
}

function inRange(ep, from, to) {
  return (!from || ep.start >= from) && (!to || ep.start <= to);
}

// ── timeline ────────────────────────────────────────────────────────

function timeline() {
  const data = loadIndex();
  const from = parseDate(values.from);
  const to = parseDate(values.to, true);
  const granularity = values.granularity === 'week' ? 'week' : 'day';
  const eps = data.episodes.filter((e) => inRange(e, from, to));

  const groups = new Map();
  for (const e of eps) {
    const key = granularity === 'week' ? e.week : e.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  console.log(`timeline (${granularity}) — ${eps.length} episodes\n`);
  for (const [key, list] of [...groups.entries()].sort()) {
    const msgs = list.reduce((n, e) => n + e.messageCount, 0);
    const chars = list.reduce((n, e) => n + e.chars, 0);
    console.log(`${key}  ${pad(list.length, 3)} eps  ${pad(msgs, 4)} msgs  ${pad(chars, 8)} chars  | ${list[0].title}`);
  }
}

// ── 激活：什么时候该查记忆（关键词只做提醒，最终由模型决定） ──────

const ACTIVATION = {
  recall: [
    '还记得', '记得', '之前', '上次', '那天', '以前', '当时', '我们说过',
    '你忘了', '回忆', '想不起来', '找找', '记忆里', '你上次说', '你说过',
  ],
  time: [
    '昨天', '前天', '上周', '上个月', '三个月前', '那天下午', '那天晚上',
    '去年', '年初', '前几天',
  ],
  deep: ['再回忆一下', '仔细找找', '再想想', '好好想想', '深入找', '翻翻记忆'],
  explicit: ['/memory-recall', '/memory-search', '查记忆', '找记忆'],
};

function detectActivation(text) {
  const t = String(text || '').toLowerCase();
  const matched = [];
  const has = (list) => list.filter((kw) => t.includes(kw));

  const deepHits = has(ACTIVATION.deep);
  const explicitHits = has(ACTIVATION.explicit);
  const recallHits = has(ACTIVATION.recall);
  const timeHits = has(ACTIVATION.time);
  matched.push(...deepHits, ...explicitHits, ...recallHits, ...timeHits);

  const deep = deepHits.length > 0 || explicitHits.length > 0;
  const hasRecall = recallHits.length > 0;
  const hasTime = timeHits.length > 0;
  const activate = matched.length > 0;

  let suggested = 'none';
  if (deep) suggested = 'memory_search(deep)';
  else if (hasTime && !hasRecall) suggested = 'memory_timeline';
  else if (activate) suggested = 'memory_search';

  let reason = '未命中';
  if (deepHits.length) reason = '用户明确要求深回忆';
  else if (explicitHits.length) reason = '显式记忆命令';
  else if (hasRecall) reason = '用户提到过去/回忆';
  else if (hasTime) reason = '用户提到时间';

  return {
    activate,
    deep,
    suggested,
    matched: [...new Set(matched)],
    reason,
  };
}

function trigger() {
  const text = values.text || positionals.slice(1).join(' ');
  if (!text.trim()) throw new Error('trigger 需要 --text "用户这句话"');
  console.log(JSON.stringify(detectActivation(text), null, 2));
}

// ── search ──────────────────────────────────────────────────────────

/** 多词查询：除全部出现外，还要求首次出现位置相距不超过 window 字符。 */
function termsNear(text, terms, window = 500) {
  const idxs = terms.map((t) => text.indexOf(t));
  if (idxs.some((i) => i < 0)) return false;
  return Math.max(...idxs) - Math.min(...idxs) <= window;
}

function snippet(text, q, width = 180) {
  const lower = text.toLowerCase();
  const i = lower.indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, width).replace(/\s+/g, ' ');
  const s = Math.max(0, i - 60);
  return `${s > 0 ? '…' : ''}${text.slice(s, s + width).replace(/\s+/g, ' ')}…`;
}

function search() {
  const q = (values.query || '').trim();
  if (!q) throw new Error('search 需要 --query');
  const data = loadIndex();
  const from = parseDate(values.from);
  const to = parseDate(values.to, true);
  const qLower = q.toLowerCase();
  const textTerms = qLower.split(/\s+/).filter(Boolean);
  const tagTerms = textTerms.map(canonicalTag).filter(Boolean);
  // 深回忆：用户明确说“再回忆一下”时才开；会读更多包
  const deep = Boolean(values.deep);
  const effLimit = deep ? Math.max(limit, 40) : limit;

  // IDF：稀有的标签更值钱（"zstd" 比 "记忆" 值钱）
  const N = data.episodes.length || 1;
  const df = new Map();
  for (const t of tagTerms) {
    const n = data.episodes.filter((e) => (e.subTags || []).some((s) => s.tag === t)).length;
    df.set(t, n);
  }
  const idf = (t) => Math.log(1 + N / Math.max(1, df.get(t) || 0));

  const hits = [];
  for (const e of data.episodes) {
    if (!inRange(e, from, to)) continue;
    const text = e.text.toLowerCase();
    const subTags = Array.isArray(e.subTags)
      ? e.subTags
      : (e.tags || []).map((t) => ({ tag: canonicalTag(t), weight: 0.5, source: 'legacy' }));
    const tagHits = tagTerms.map((t) => subTags.find((s) => s.tag === t));
    const allTags = tagHits.every(Boolean);

    // 多词：要么全部命中标签（别名也算），要么在文本里彼此靠近。
    // 深回忆时放宽：分散命中也可进，但打 0.4 折。
    let penalty = 1;
    if (textTerms.length > 1 && !allTags && !termsNear(text, textTerms)) {
      if (!deep) continue;
      penalty = 0.4;
    }

    let score = 0;
    if (text.includes(qLower)) score += 20;
    for (const term of textTerms) {
      let idx = 0;
      let count = 0;
      while ((idx = text.indexOf(term, idx)) >= 0) { count += 1; idx += term.length; }
      score += count;
    }

    // 标签命中：权重 × IDF，比纯文本更可信
    for (let i = 0; i < tagTerms.length; i++) {
      const hit = tagHits[i];
      if (hit) score += 10 * hit.weight * idf(tagTerms[i]);
    }

    const big = (e.bigTag || e.title || '').toLowerCase();
    if (big.includes(qLower)) score += 12;

    score *= penalty;
    if (score > 0) hits.push({ e, score });
  }

  hits.sort((a, b) => b.score - a.score || b.e.end - a.e.end);
  console.log(`search "${q}" — ${hits.length} hits${deep ? ' [deep]' : ''}\n`);
  if (deep) console.log('[deep] 读取更多包，可能消耗额外 token\n');
  for (const { e, score } of hits.slice(0, effLimit)) {
    console.log(`[${Math.round(score)}] ${e.date} ${e.startTime}-${e.endTime}  ${e.id}  (${e.messageCount} msgs, ${e.chars} chars)`);
    console.log(`   ${e.bigTag || e.title}`);
    console.log(`   ${snippet(e.text, q)}`);
    console.log('');
  }
}

// ── package：episode → 对话文本 zstd 包 ─────────────────────────────────

function packageAll() {
  const data = loadIndex();
  const pkgRoot = path.join(root, 'packages');
  const index = [];
  let count = 0;

  for (const ep of data.episodes) {
    if (values.session && !ep.sessionId.includes(values.session)) continue;
    const packageId = `pkg-${ep.date.replace(/-/g, '')}-${ep.startTime.replace(':', '')}-${ep.hash.slice(0, 6)}`;
    const pkg = {
      version: 1,
      packageId,
      sessionId: ep.sessionId,
      timeRange: { start: ep.start, end: ep.end },
      seqRange: {
        start: ep.messages[0]?.seq ?? null,
        end: ep.messages.at(-1)?.seq ?? null,
      },
      messages: ep.messages,
      bigTag: ep.bigTag,
      subTags: ep.subTags,
      tags: ep.tags,
      meta: {
        messageCount: ep.messageCount,
        chars: ep.chars,
        hash: ep.hash,
        createdAt: new Date().toISOString(),
        createdBy: 'auto',
      },
    };
    const buf = COMPRESS.compress(Buffer.from(JSON.stringify(pkg)));
    const dir = path.join(pkgRoot, ep.date);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${packageId}.json${COMPRESS.ext}`);
    const tmpFile = `${file}.tmp`;
    fs.writeFileSync(tmpFile, buf);
    fs.renameSync(tmpFile, file); // 原子替换：崩溃不留半个包
    index.push({
      id: packageId,
      sessionId: ep.sessionId,
      seqRange: { start: ep.messages[0]?.seq ?? null, end: ep.messages.at(-1)?.seq ?? null },
      date: ep.date,
      week: ep.week,
      month: ep.date.slice(0, 7),
      bigTag: ep.bigTag,
      subTags: ep.subTags,
      tags: ep.tags,
      messageCount: ep.messageCount,
      chars: ep.chars,
      start: ep.start,
      end: ep.end,
      file: path.relative(root, file),
      bytes: buf.length,
    });
    count += 1;
  }

  index.sort((a, b) => a.start - b.start);

  // --session 只替换该 session 的包；全量则整个索引替换
  const indexFile = path.join(pkgRoot, 'index.json');
  let kept = [];
  let indexBroken = false;
  const hadIndex = fs.existsSync(indexFile);
  if (values.session && !hadIndex) indexBroken = true;
  if (values.session && hadIndex) {
    try {
      const prev = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      const scannedSessions = new Set(
        data.episodes
          .filter((e) => e.sessionId.includes(values.session))
          .map((e) => e.sessionId),
      );
      kept = (prev.packages || []).filter((p) => !scannedSessions.has(p.sessionId));
    } catch {
      // 索引损坏时不能把 kept 当空：否则孤儿清理会删掉其他 session 的包
      indexBroken = true;
    }
  }
  const byId = new Map();
  for (const p of [...kept, ...index]) byId.set(p.id, p);
  const merged = [...byId.values()].sort((a, b) => a.start - b.start);

  if (indexBroken) {
    throw new Error('package index missing or unreadable; run full package without --session first');
  }

  const indexTmp = `${indexFile}.tmp`;
  fs.writeFileSync(indexTmp, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    packages: merged,
  }, null, 2));
  fs.renameSync(indexTmp, indexFile);

  // 每次打包都清掉孤儿包（内容变化后旧 hash 会留下旧文件；--session 也一样）
  // 索引损坏或条目缺 file 时宁可不清理，也不能误删其他 session 的包
  let pruned = 0;
  const keep = new Set(merged.map((p) => p.file).filter(Boolean));
  const canPrune = !indexBroken && merged.length > 0 && merged.every((p) => p.file);
  if (canPrune) {
    const walkPkg = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) { walkPkg(p); continue; }
        if (!/\.json\.(zst|gz)$/.test(ent.name)) continue;
        const rel = path.relative(root, p);
        if (!keep.has(rel)) {
          fs.rmSync(p, { force: true });
          pruned += 1;
        }
      }
    };
    walkPkg(pkgRoot);
  } else {
    console.log('WARN: 索引不完整，已跳过孤儿清理');
  }

  console.log(`packaged ${count} episodes -> ${pkgRoot} (${COMPRESS.ext})`);
  console.log(`package index: ${merged.length} total${pruned ? `, pruned ${pruned} orphan(s)` : ''}`);
  console.log('next: aggregate --level day --yes   (prototype stand-in for the bottom-right confirm dialog)');
}

// ── pending：哪些周期还没生成清单（用于“昨天关机，今天补做”） ──────

function recordKeys(level) {
  const dir = path.join(root, 'records', level);
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5)),
  );
}

function pendingPeriods() {
  const idxFile = path.join(root, 'packages', 'index.json');
  if (!fs.existsSync(idxFile)) throw new Error(`先跑 package: ${idxFile}`);
  const packages = JSON.parse(fs.readFileSync(idxFile, 'utf8')).packages;

  const byLevel = { day: new Map(), week: new Map(), month: new Map() };
  for (const p of packages) {
    for (const level of ['day', 'week', 'month']) {
      const key = level === 'day' ? p.date : level === 'week' ? p.week : p.month;
      if (!key) continue;
      if (!byLevel[level].has(key)) byLevel[level].set(key, []);
      byLevel[level].get(key).push(p);
    }
  }

  const out = { day: [], week: [], month: [] };
  for (const level of ['day', 'week', 'month']) {
    // 包有、record 没有 → missing；record 有但包清单不一致 → stale
    for (const [key, list] of byLevel[level]) {
      const file = path.join(root, 'records', level, `${key}.json`);
      if (!fs.existsSync(file)) {
        out[level].push({ key, reason: 'missing' });
        continue;
      }
      let rec;
      try {
        rec = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        out[level].push({ key, reason: 'corrupt' });
        continue;
      }
      const wanted = list.map((x) => x.id).sort();
      const have = (rec.packageIds || []).slice().sort();
      if (wanted.length !== have.length || wanted.some((id, i) => id !== have[i])) {
        out[level].push({ key, reason: 'stale' });
      }
    }
    // record 有、包没有 → orphan
    for (const key of recordKeys(level)) {
      if (!byLevel[level].has(key)) out[level].push({ key, reason: 'orphan' });
    }
  }
  return out;
}

function pending() {
  const p = pendingPeriods();
  console.log('pending (record vs package):');
  let total = 0;
  for (const level of ['day', 'week', 'month']) {
    const items = p[level];
    total += items.length;
    if (items.length === 0) {
      console.log(`  ${level}: (none)`);
      continue;
    }
    console.log(`  ${level}:`);
    for (const it of items.sort((a, b) => a.key.localeCompare(b.key))) {
      console.log(`    ${it.key}  [${it.reason}]`);
    }
  }
  console.log(`\n${total} period(s) need attention. Run: aggregate --level day|week|month --yes`);
}

// ── aggregate：包 → day/week/month 清单（不复制包） ──────────────────

function aggregate() {
  const idxFile = path.join(root, 'packages', 'index.json');
  if (!fs.existsSync(idxFile)) throw new Error(`先跑 package: ${idxFile}`);
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')).packages;
  const level = ['day', 'week', 'month'].includes(values.level) ? values.level : 'day';

  if (!values.yes) {
    console.log(`would aggregate ${idx.length} packages by ${level}.`);
    console.log('prototype: pass --yes to confirm (real plugin shows the bottom-right dialog).');
    return;
  }

  const groups = new Map();
  for (const p of idx) {
    const key = level === 'day' ? p.date : level === 'week' ? p.week : p.month;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const dir = path.join(root, 'records', level);
  fs.mkdirSync(dir, { recursive: true });
  for (const [key, list] of groups) {
    const rec = {
      level,
      key,
      packageIds: list.map((x) => x.id),
      tags: [...new Set(list.flatMap((x) => x.tags))].slice(0, 40),
      messageCount: list.reduce((n, x) => n + x.messageCount, 0),
      chars: list.reduce((n, x) => n + x.chars, 0),
      packages: list.map((x) => ({ id: x.id, file: x.file, start: x.start, end: x.end })),
      createdAt: new Date().toISOString(),
    };
    const finalFile = path.join(dir, `${key}.json`);
    const tmpFile = `${finalFile}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(rec, null, 2));
    fs.renameSync(tmpFile, finalFile); // 原子替换：中途关机不会留下半个 JSON
  }

  // 记录“最后一次成功聚合”，用于诊断与补做提示
  const metaDir = path.join(root, 'meta');
  fs.mkdirSync(metaDir, { recursive: true });
  const lastFile = path.join(metaDir, 'last-run.json');
  const last = fs.existsSync(lastFile) ? JSON.parse(fs.readFileSync(lastFile, 'utf8')) : {};
  const lastKey = [...groups.keys()].sort().at(-1) ?? null;
  last[level] = { lastKey, at: new Date().toISOString() };
  fs.writeFileSync(lastFile, JSON.stringify(last, null, 2));

  console.log(`aggregated ${groups.size} ${level} records -> ${dir}`);
}

// ── read：按包读原文（带字符预算） ──────────────────────────────────

function findPackageFile(id) {
  const base = path.join(root, 'packages');
  if (!fs.existsSync(base)) return null;
  const candidates = [];
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.includes(id) && /\.json\.(zst|gz)$/.test(ent.name)) candidates.push(p);
    }
  };
  walk(base);
  // 优先精确匹配（id 是完整 packageId），再退回子串匹配
  return candidates.find((p) => path.basename(p).startsWith(`${id}.json`)) ?? candidates[0] ?? null;
}

function readPackage() {
  const id = (values.package || '').trim();
  if (!id) throw new Error('read 需要 --package <packageId>');
  const file = findPackageFile(id);
  if (!file) throw new Error(`找不到包: ${id}`);
  const buf = fs.readFileSync(file);
  const json = file.endsWith('.zst') ? zlib.zstdDecompressSync(buf) : zlib.gunzipSync(buf);
  const pkg = JSON.parse(json.toString('utf8'));
  const max = Math.max(200, Number(values.chars) || 4000);
  let out = '';
  for (const m of pkg.messages) {
    out += `[${m.role}] ${m.text}\n\n`;
    if (out.length >= max) break;
  }
  console.log(out.slice(0, max));
  console.log(`\n(${pkg.packageId}, ${pkg.meta.messageCount} msgs, ${pkg.meta.chars} chars)${out.length > max ? ' [truncated]' : ''}`);
}

// ── tags：列出标签频次 ──────────────────────────────────────────────

function listTags() {
  const idxFile = path.join(root, 'packages', 'index.json');
  if (!fs.existsSync(idxFile)) throw new Error(`先跑 package: ${idxFile}`);
  const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8')).packages;

  const subCounts = new Map();
  for (const p of idx) {
    const subs = Array.isArray(p.subTags)
      ? p.subTags
      : (p.tags || []).map((t) => ({ tag: canonicalTag(t), weight: 0.5, source: 'legacy' }));
    for (const s of subs) subCounts.set(s.tag, (subCounts.get(s.tag) || 0) + 1);
  }
  const top = [...subCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  console.log(`sub tags (${subCounts.size} distinct)\n`);
  for (const [t, c] of top) console.log(`${pad(c, 3)}  ${t}`);

  console.log(`\nbig tags (${idx.length} packages, first 10)\n`);
  for (const p of idx.slice(0, 10)) {
    console.log(`${p.bigTag || p.id}`);
    const subs = (p.subTags || [])
      .slice(0, 6)
      .map((s) => `${s.tag}(${s.weight.toFixed(1)})`)
      .join('  ');
    if (subs) console.log(`   ${subs}`);
  }
}

// ── doctor：真实使用前的自检 ────────────────────────────────────────

function dirSize(dir) {
  let total = 0;
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else { try { total += fs.statSync(p).size; } catch { /* ignore */ } }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return total;
}

function doctor() {
  const issues = [];
  const ok = (msg) => console.log(`  ok    ${msg}`);
  const warn = (msg) => { issues.push({ level: 'warn', msg }); console.log(`  WARN  ${msg}`); };
  const fail = (msg) => { issues.push({ level: 'fail', msg }); console.log(`  FAIL  ${msg}`); };

  const episodesFile = path.join(root, 'episodes.json');
  const pkgIndexFile = path.join(root, 'packages', 'index.json');
  const manifestFile = path.join(root, 'manifest.json');

  if (!fs.existsSync(episodesFile)) fail('episodes.json 不存在；先跑 scan');
  if (!fs.existsSync(pkgIndexFile)) fail('packages/index.json 不存在；先跑 package');

  let episodes = [];
  let packages = [];
  if (fs.existsSync(episodesFile)) {
    try { episodes = JSON.parse(fs.readFileSync(episodesFile, 'utf8')).episodes || []; }
    catch { fail('episodes.json 不是合法 JSON'); }
  }
  if (fs.existsSync(pkgIndexFile)) {
    try { packages = JSON.parse(fs.readFileSync(pkgIndexFile, 'utf8')).packages || []; }
    catch { fail('packages/index.json 不是合法 JSON'); }
  }

  // 1) episode 健康
  const hashes = new Map();
  let duplicateEpisodes = 0;
  for (const e of episodes) {
    if (hashes.has(e.hash)) {
      duplicateEpisodes += 1;
      warn(`重复 episode hash ${e.hash}: ${e.id} / ${hashes.get(e.hash)}`);
    } else hashes.set(e.hash, e.id);
  }
  const empty = episodes.filter((e) => !e.messageCount || !Array.isArray(e.messages) || e.messages.length === 0);
  if (empty.length) warn(`${empty.length} 个空 episode（无消息/无文本）`);
  if (!duplicateEpisodes) ok(`episodes 无重复（${episodes.length} 个）`);

  // 2) 包文件 vs 索引
  const pkgFiles = new Set();
  const pkgBase = path.join(root, 'packages');
  const walk = (d) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.json\.(zst|gz)$/.test(ent.name)) pkgFiles.add(path.relative(root, p));
    }
  };
  if (fs.existsSync(pkgBase)) walk(pkgBase);

  const indexed = new Set(packages.map((p) => p.file));
  let missing = 0;
  for (const p of packages) {
    if (!pkgFiles.has(p.file)) { fail(`包文件缺失: ${p.id} -> ${p.file}`); missing += 1; }
  }
  let orphan = 0;
  for (const f of pkgFiles) {
    if (!indexed.has(f)) { warn(`孤儿包文件（索引里没有）: ${f}`); orphan += 1; }
  }
  if (!missing && !orphan) ok(`包索引与文件一致（${packages.length} 个）`);

  const noSubs = packages.filter((p) => !Array.isArray(p.subTags) || p.subTags.length === 0);
  if (noSubs.length) warn(`${noSubs.length} 个包没有子标签（旧索引？重跑 package）`);
  else ok(`子标签结构完整（${packages.length} 个包）`);

  // --deep：逐个解压校验包内容
  if (values.deep) {
    let checked = 0;
    for (const p of packages) {
      const full = path.join(root, p.file);
      if (!fs.existsSync(full)) continue; // 上面已报缺失
      try {
        const buf = fs.readFileSync(full);
        const json = full.endsWith('.zst') ? zlib.zstdDecompressSync(buf) : zlib.gunzipSync(buf);
        const pkg = JSON.parse(json.toString('utf8'));
        if (pkg.packageId !== p.id) warn(`包 id 不一致: ${p.id} vs ${pkg.packageId}`);
        if (!Array.isArray(pkg.messages) || pkg.messages.length !== p.messageCount) {
          warn(`包消息数不一致: ${p.id}（索引 ${p.messageCount}）`);
        }
        checked += 1;
      } catch (err) {
        fail(`包解压/解析失败: ${p.id}（${err instanceof Error ? err.message : String(err)}）`);
      }
    }
    ok(`deep 校验 ${checked} 个包`);
  }

  // 3) record vs package
  const pend = pendingPeriods();
  for (const level of ['day', 'week', 'month']) {
    for (const it of pend[level]) {
      if (it.reason === 'missing') warn(`${level} 清单缺失: ${it.key}`);
      else if (it.reason === 'stale') warn(`${level} 清单过期（包已变）: ${it.key}`);
      else if (it.reason === 'corrupt') fail(`${level} 清单损坏: ${it.key}`);
      else if (it.reason === 'orphan') warn(`${level} 孤儿清单: ${it.key}`);
    }
  }

  // 4) manifest 坏帧
  if (fs.existsSync(manifestFile)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      for (const s of m.sessions || []) {
        if (s.badFrames) warn(`session ${s.id}: ${s.badFrames} 个坏帧`);
      }
    } catch { fail('manifest.json 不是合法 JSON'); }
  }

  // 5) 体积
  const epSize = fs.existsSync(episodesFile) ? fs.statSync(episodesFile).size : 0;
  const pkgSize = dirSize(pkgBase);
  console.log('');
  console.log(`  root: ${root}`);
  console.log(`  episodes.json: ${(epSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  packages/: ${(pkgSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  episodes ${episodes.length} / packages ${packages.length}`);

  const fails = issues.filter((i) => i.level === 'fail').length;
  const warns = issues.length - fails;
  console.log(`\n${fails ? 'FAIL' : warns ? 'WARN' : 'OK'}: ${fails} fail / ${warns} warn`);
  if (fails) process.exitCode = 1;
}

// ── stats ───────────────────────────────────────────────────────────

function stats() {
  const data = loadIndex();
  const sessions = new Set(data.episodes.map((e) => e.sessionId));
  const dates = new Set(data.episodes.map((e) => e.date));
  const chars = data.episodes.reduce((n, e) => n + e.chars, 0);
  const msgs = data.episodes.reduce((n, e) => n + e.messageCount, 0);
  const pkgFile = path.join(root, 'packages', 'index.json');
  const pkgCount = fs.existsSync(pkgFile)
    ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')).packages.length
    : 0;
  console.log(`sessions: ${sessions.size}`);
  console.log(`episodes: ${data.episodes.length}`);
  console.log(`packages: ${pkgCount}`);
  console.log(`messages: ${msgs}`);
  console.log(`chars: ${chars.toLocaleString()}`);
  console.log(`date range: ${data.episodes[0]?.date || '-'} .. ${data.episodes.at(-1)?.date || '-'}`);
  console.log(`distinct dates: ${dates.size}`);
  console.log(`index: ${path.join(root, 'episodes.json')}`);
}

// ── main ────────────────────────────────────────────────────────────

try {
  if (cmd === 'scan') scan();
  else if (cmd === 'package') packageAll();
  else if (cmd === 'pending') pending();
  else if (cmd === 'aggregate') aggregate();
  else if (cmd === 'read') readPackage();
  else if (cmd === 'tags') listTags();
  else if (cmd === 'doctor') doctor();
  else if (cmd === 'timeline') timeline();
  else if (cmd === 'trigger') trigger();
  else if (cmd === 'search') search();
  else if (cmd === 'stats') stats();
  else usage();
} catch (err) {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
