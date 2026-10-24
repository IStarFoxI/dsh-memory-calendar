/**
 * dsh-memory-calendar — Host half (Phase 0 preview)
 *
 * Registers read-only tools over the prototype index:
 *   memory_search / memory_timeline / memory_read / memory_expand
 *
 * No network, no LLM, no session mutation. The prototype index is the
 * source; the session log remains the ultimate truth.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import zlib from 'node:zlib';
import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'memory-calendar';
export const inject = ['tools', 'workingDirectory', 'webServer', 'clientModules', 'sessions', 'timer', 'workspaceRegistry', 'sessionController'];

const TAG_ALIASES = new Map(Object.entries({
  '记忆压缩': '记忆插件',
  '上下文压缩': '记忆插件',
  'memory plugin': '记忆插件',
  'star dimension': '星维',
  '星维 · star dimension': '星维',
}));

function canonicalTag(tag) {
  const t = String(tag || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const lower = t.toLowerCase();
  return TAG_ALIASES.get(lower) ?? lower;
}

function resolveSettingsRoot(config, ctx) {
  const configured = config?.storage?.root;
  if (configured && String(configured).trim()) {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    return path.resolve(String(configured).replace(/^~(?=$|[\\/])/, home));
  }
  // Host 的 process.cwd() 不一定是工作区；优先默认工作区
  const base = ctx?.workingDirectory?.defaultDirectory || process.cwd();
  const local = path.join(base, '.memory-calendar');
  if (existsSync(local)) return local;
  const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.dsh');
  return path.join(home, 'memory-calendar');
}

async function resolveRoot(config, ctx, exec, scope = 'shared') {
  const settingsRoot = resolveSettingsRoot(config, ctx);
  // 工作区/独立：只读当前 agent 工作区自己的 .memory-calendar，绝不回落到全局
  if ((scope === 'workspace' || scope === 'session') && exec?.agent && ctx?.workingDirectory?.ensure) {
    try {
      const ws = await ctx.workingDirectory.ensure(exec.agent, exec.signal);
      return path.join(ws, '.memory-calendar');
    } catch {
      /* fall through to settings root below */
    }
  }
  return settingsRoot;
}

function loadEpisodes(root) {
  const file = path.join(root, 'episodes.json');
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const e of data.episodes || []) {
    if (!e.text && Array.isArray(e.messages)) {
      e.text = e.messages.map((m) => `[${m.role}] ${m.text}`).join('\n\n');
    }
  }
  return data.episodes || [];
}

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function parseDate(s, endOfDay = false) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return null;
  return new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0,
  ).getTime();
}

function inRange(ep, from, to) {
  return (!from || ep.start >= from) && (!to || ep.start <= to);
}

function termsNear(text, terms, window = 500) {
  const idxs = terms.map((t) => text.indexOf(t));
  if (idxs.some((i) => i < 0)) return false;
  return Math.max(...idxs) - Math.min(...idxs) <= window;
}

const QUERY_STOPWORDS = new Set([
  '我', '你', '他', '她', '它', '我们', '你们', '他们', '的', '了', '吗', '呢', '吧', '啊', '呀', '哦',
  '是', '不是', '是不是', '有没有', '说过', '说说', '告诉我', '问一下', '我想', '帮我', '可以',
  '怎么', '如何', '为什么', '什么', '叫什么', '来着', '一下', '关于', '以及', '还有',
  '那个', '这个', '一台', '一个', '一只', '叫', '过', '要', '想',
]);

function queryTerms(q) {
  const text = String(q || '').toLowerCase().trim();
  if (!text) return [];
  try {
    const seg = new Intl.Segmenter('zh-Hans', { granularity: 'word' });
    const all = [...new Set([...seg.segment(text)]
      .filter((s) => s.isWordLike)
      .map((s) => s.segment)
      .filter(Boolean))];
    const content = all.filter((t) => !QUERY_STOPWORDS.has(t) && (t.length > 1 || /^[a-z0-9]/i.test(t)));
    return content.length ? content : all;
  } catch {
    return [...new Set(text.split(/\s+/).filter((t) => !QUERY_STOPWORDS.has(t) && t))];
  }
}

function snippet(text, q, width = 240, terms = []) {
  const lower = text.toLowerCase();
  let i = lower.indexOf(String(q).toLowerCase());
  if (i < 0) {
    for (const term of terms) {
      const j = lower.indexOf(term);
      if (j >= 0 && (i < 0 || j < i)) i = j;
    }
  }
  if (i < 0) return text.slice(0, width).replace(/\s+/g, ' ');
  const s = Math.max(0, i - 80);
  return `${s > 0 ? '…' : ''}${text.slice(s, s + width).replace(/\s+/g, ' ')}…`;
}

function conversationKey(episode) {
  const raw = (episode.messages || [])
    .map((m) => `${m.role}:${String(m.text || '').replace(/\s+/g, ' ').trim()}`)
    .join('\n');
  if (!raw.trim()) return '';
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function duplicateLookup(episodes) {
  const groups = new Map();
  for (const episode of episodes) {
    const key = conversationKey(episode);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(episode);
  }
  const byId = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sources = group.map((episode) => ({
      id: episode.id,
      date: episode.date,
      time: `${episode.startTime}-${episode.endTime}`,
    }));
    for (const episode of group) byId.set(episode.id, sources);
  }
  return byId;
}

function searchEpisodes(root, query, opts = {}, scope = 'shared', sessionId = '') {
  const episodes = loadEpisodes(root);
  const duplicateById = duplicateLookup(episodes);
  const q = String(query || '').trim();
  if (!q) return { query: q, deep: false, total: 0, hits: [] };

  const from = parseDate(opts.from);
  const to = parseDate(opts.to, true);
  const qLower = q.toLowerCase();
  const textTerms = queryTerms(qLower);
  const tagTerms = textTerms.map(canonicalTag).filter(Boolean);
  const deep = Boolean(opts.deep);
  const limit = Math.max(1, Math.min(Number(opts.limit) || (deep ? 8 : 3), 20));

  const N = episodes.length || 1;
  const df = new Map();
  for (const t of tagTerms) {
    df.set(t, episodes.filter((e) => (e.subTags || []).some((s) => s.tag === t)).length);
  }
  const idf = (t) => Math.log(1 + N / Math.max(1, df.get(t) || 0));

  const hits = [];
  const debugRows = [];
  for (const e of episodes) {
    if (!inRange(e, from, to)) continue;
    if (scope === 'session' && sessionId && e.sessionId !== sessionId) continue;
    const text = (e.text || '').toLowerCase();
    const subTags = Array.isArray(e.subTags)
      ? e.subTags
      : (e.tags || []).map((t) => ({ tag: canonicalTag(t), weight: 0.5 }));
    const tagHits = tagTerms.map((t) => subTags.find((s) => s.tag === t));
    const allTags = tagTerms.length > 0 && tagHits.every(Boolean);
    const allTerms = textTerms.length > 0 && textTerms.every((t) => text.includes(t));
    const big = (e.bigTag || e.title || '').toLowerCase();
    const bigHits = textTerms.filter((t) => big.includes(t)).length;
    const bigRelevant = textTerms.length > 2 && bigHits >= Math.ceil(textTerms.length * 0.6);
    const gate = !(textTerms.length > 1 && !allTags && !allTerms && !bigRelevant);
    const debugRow = opts.debug
      ? { id: e.id, date: e.date, big: big.slice(0, 80), allTags, allTerms, bigHits, bigRelevant, gate, score: 0 }
      : null;
    if (debugRow) debugRows.push(debugRow);
    if (!gate) continue;

    let score = 0;
    if (text.includes(qLower)) score += 20;
    for (const term of textTerms) {
      let idx = 0;
      let count = 0;
      while ((idx = text.indexOf(term, idx)) >= 0) { count += 1; idx += term.length; }
      score += Math.min(count, 3);
    }
    for (let i = 0; i < tagTerms.length; i++) {
      const hit = tagHits[i];
      if (hit) score += 10 * hit.weight * idf(tagTerms[i]);
    }
    for (const term of textTerms) if (big.includes(term)) score += 5;
    if (big.includes(qLower)) score += 12;
    const bigRatio = textTerms.length ? bigHits / textTerms.length : 1;
    score *= 0.5 + bigRatio;

    if (score <= 0) continue;
    if (debugRow) debugRow.score = Math.round(score);
    const duplicateSources = duplicateById.get(e.id);
    hits.push({
      id: e.id,
      date: e.date,
      time: `${e.startTime}-${e.endTime}`,
      bigTag: e.bigTag || e.title,
      tags: (e.subTags || []).slice(0, 6).map((s) => s.tag),
      score: Math.round(score),
      coverage: textTerms.length
        ? Math.round(textTerms.filter((t) => text.includes(t)).length / textTerms.length * 100)
        : 100,
      duplicateCount: duplicateSources?.length || 1,
      duplicates: duplicateSources || [],
      snippet: snippet(e.text || '', q, 240, textTerms),
    });
  }

  hits.sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
  return {
    query: q,
    terms: textTerms,
    deep,
    total: hits.length,
    hits: hits.slice(0, limit),
    ...(opts.debug ? { debug: debugRows } : {}),
  };
}

function timeline(root, opts = {}, scope = 'shared', sessionId = '') {
  const episodes = loadEpisodes(root);
  const from = parseDate(opts.from);
  const to = parseDate(opts.to, true);
  const granularity = opts.granularity === 'week' ? 'week' : 'day';
  const groups = new Map();

  for (const e of episodes) {
    if (!inRange(e, from, to)) continue;
    if (scope === 'session' && sessionId && e.sessionId !== sessionId) continue;
    const key = granularity === 'week' ? e.week : e.date;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  return {
    granularity,
    groups: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({
        key,
        episodes: list.length,
        messages: list.reduce((n, e) => n + (e.messageCount || 0), 0),
        first: list[0]?.bigTag || list[0]?.title || '',
      })),
  };
}

function findPackageFile(root, id) {
  const base = path.join(root, 'packages');
  if (!existsSync(base)) return null;
  const candidates = [];
  const walk = (d) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.includes(id) && /\.json\.(zst|gz)$/.test(ent.name)) candidates.push(p);
    }
  };
  walk(base);
  return candidates.find((p) => path.basename(p).startsWith(`${id}.json`)) ?? candidates[0] ?? null;
}

function loadPackage(root, id) {
  if (!id) throw new Error('packageId is required');
  const file = findPackageFile(root, id);
  if (!file) throw new Error(`package not found: ${id}`);
  const buf = readFileSync(file);
  const json = file.endsWith('.zst') ? zlib.zstdDecompressSync(buf) : zlib.gunzipSync(buf);
  return { file, pkg: JSON.parse(json.toString('utf8')) };
}

function readPackage(root, id, chars = 4000, scope = 'shared', sessionId = '') {
  const { pkg } = loadPackage(root, id);
  const pkgSession = pkg.meta?.sessionId || pkg.sessionId;
  if (scope === 'session' && sessionId && pkgSession && pkgSession !== sessionId) {
    throw new Error('package belongs to another session (independent memory)');
  }
  const max = Math.max(200, Math.min(Number(chars) || 4000, 20000));
  let out = '';
  for (const m of pkg.messages || []) {
    out += `[${m.role}] ${m.text}\n\n`;
    if (out.length >= max) break;
  }
  return {
    packageId: pkg.packageId,
    sessionId: pkg.sessionId,
    seqRange: pkg.seqRange || null,
    messageCount: pkg.meta?.messageCount,
    chars: pkg.meta?.chars,
    truncated: out.length > max,
    text: out.slice(0, max),
  };
}

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

function pinsPath(root) {
  return path.join(root, 'pins.json');
}

function readPins(root) {
  const data = readJson(pinsPath(root), { version: 1, pins: [] });
  return {
    version: 1,
    pins: Array.isArray(data.pins) ? data.pins : [],
  };
}

function writePins(root, data) {
  mkdirSync(root, { recursive: true });
  const file = pinsPath(root);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, file);
}

function normalizePinTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(/[,\s]+/);
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 12);
}

function buildSummary(root) {
  const episodes = loadEpisodes(root);
  const packages = readJson(path.join(root, 'packages', 'index.json'), { packages: [] }).packages || [];
  const tagCounts = new Map();
  for (const p of packages) {
    for (const t of p.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  return {
    root,
    episodes: episodes.length,
    packages: packages.length,
    tags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count })),
    recent: [...packages]
      .sort((a, b) => (b.start || 0) - (a.start || 0))
      .map((p) => ({
        id: p.id,
        date: p.date,
        bigTag: p.bigTag || p.id,
        messageCount: p.messageCount,
        chars: p.chars,
        tags: (p.tags || []).slice(0, 8),
        filterTags: p.tags || [],
      })),
  };
}

const POPUP_TYPES = ['system', 'in-app', 'both'];
const SCOPES = ['shared', 'workspace', 'session'];
const UI_EVENTS = ['onboarding', 'packaged', 'pending', 'start', 'done', 'error'];
const DEFAULT_UI = {
  popupType: 'system',
  confirmBeforeCompress: true,
  memoryScope: 'shared',
  notifyOn: [...UI_EVENTS],
};

function sanitizeUi(input) {
  const popupType = POPUP_TYPES.includes(input?.popupType) ? input.popupType : DEFAULT_UI.popupType;
  const confirmBeforeCompress = typeof input?.confirmBeforeCompress === 'boolean'
    ? input.confirmBeforeCompress
    : DEFAULT_UI.confirmBeforeCompress;
  const memoryScope = SCOPES.includes(input?.memoryScope) ? input.memoryScope : DEFAULT_UI.memoryScope;
  const notifyOn = Array.isArray(input?.notifyOn)
    ? [...new Set(input.notifyOn.filter((e) => UI_EVENTS.includes(e)))]
    : [...DEFAULT_UI.notifyOn];
  return { popupType, confirmBeforeCompress, memoryScope, notifyOn };
}

function readUi(root) {
  return sanitizeUi(readJson(path.join(root, 'meta', 'ui.json'), {}));
}

function writeUi(root, next) {
  const dir = path.join(root, 'meta');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'ui.json');
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, file);
}

function workspaceKey(ws) {
  return path.resolve(String(ws || ''));
}

function defaultWorkspace(settingsRoot) {
  return workspaceKey(path.dirname(settingsRoot));
}

function defaultBrain(root) {
  return { id: 'brain-default', name: '默认大脑', root, readOnly: false };
}

function sanitizeBrains(raw, settingsRoot) {
  const list = Array.isArray(raw?.brains)
    ? raw.brains
      .filter((b) => b && b.id && b.root)
      .map((b) => ({
        id: String(b.id),
        name: String(b.name || b.id),
        root: path.resolve(String(b.root)),
        readOnly: Boolean(b.readOnly),
      }))
    : [];
  if (!list.length) list.push(defaultBrain(settingsRoot));
  const ids = new Set(list.map((b) => b.id));
  const defaultWs = defaultWorkspace(settingsRoot);

  const workspaces = {};
  if (raw?.workspaces && typeof raw.workspaces === 'object') {
    for (const [ws, entry] of Object.entries(raw.workspaces)) {
      if (!entry) continue;
      const enabled = entry.enabled !== false;
      const activeId = enabled ? (ids.has(entry.activeId) ? entry.activeId : list[0].id) : '';
      const linked = enabled && Array.isArray(entry.linked)
        ? [...new Set(entry.linked.filter((id) => id !== activeId && ids.has(id)))]
        : [];
      workspaces[workspaceKey(ws)] = {
        activeId,
        linked,
        enabled,
        private: entry.private === true,
      };
    }
  }
  if (!workspaces[defaultWs]) {
    const enabled = raw?.enabled !== false;
    const activeId = enabled ? (ids.has(raw?.activeId) ? raw.activeId : list[0].id) : '';
    const linked = enabled && Array.isArray(raw?.linked)
      ? [...new Set(raw.linked.filter((id) => id !== activeId && ids.has(id)))]
      : [];
    workspaces[defaultWs] = {
      activeId,
      linked,
      enabled,
      private: raw?.private === true,
    };
  }

  const access = {};
  if (raw?.access && typeof raw.access === 'object') {
    for (const [sessionId, brainIds] of Object.entries(raw.access)) {
      const good = Array.isArray(brainIds)
        ? [...new Set(brainIds.filter((id) => ids.has(id)))]
        : [];
      if (good.length) access[sessionId] = good;
    }
  }

  const groups = Array.isArray(raw?.groups)
    ? raw.groups.map((g) => {
      if (!g || !g.name || !Array.isArray(g.members)) return null;
      const members = [...new Set(g.members.filter((id) => ids.has(id)))];
      if (!members.length) return null;
      const primary = members.includes(g.primary) ? g.primary : members[0];
      return {
        id: String(g.id || `group-${Date.now().toString(36)}`),
        name: String(g.name),
        members,
        primary,
      };
    }).filter(Boolean)
    : [];

  return {
    brains: list,
    workspaces,
    defaultActiveId: ids.has(raw?.defaultActiveId) ? raw.defaultActiveId : list[0].id,
    access,
    groups,
  };
}

function readBrains(settingsRoot) {
  const file = path.join(settingsRoot, 'meta', 'brains.json');
  const raw = readJson(file, null);
  if (!raw) {
    const ws = defaultWorkspace(settingsRoot);
    const data = {
      brains: [defaultBrain(settingsRoot)],
      workspaces: { [ws]: { activeId: 'brain-default', linked: [], enabled: true, private: false } },
      defaultActiveId: 'brain-default',
      access: {},
      groups: [],
    };
    writeBrains(settingsRoot, data);
    return data;
  }
  return sanitizeBrains(raw, settingsRoot);
}

function writeBrains(settingsRoot, data) {
  const dir = path.join(settingsRoot, 'meta');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'brains.json');
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, file);
}

function ensureWorkspace(data, settingsRoot, ws) {
  const key = workspaceKey(ws || defaultWorkspace(settingsRoot));
  if (!data.workspaces[key]) {
    // 新工作区诞生一个独立大脑
    const id = `brain-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    data.brains.push({
      id,
      name: path.basename(key) || '新工作区',
      root: path.join(key, '.memory-calendar'),
      readOnly: false,
    });
    data.workspaces[key] = { activeId: id, linked: [], private: false };
    return { key, entry: data.workspaces[key], created: true };
  }
  return { key, entry: data.workspaces[key], created: false };
}

function brainById(data, id) {
  return data.brains.find((b) => b.id === id);
}

function sessionSummaryTitle(item) {
  const values = item?.projections?.values || {};
  const raw = values.title ?? values.sessionListMetadata?.title ?? values.sessionTitle;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') return String(raw.val ?? raw.value ?? '');
  return '';
}

function normWorkspacePath(value) {
  return String(value || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

function checkpointRootForWorkspace(settingsRoot, wsKey) {
  const data = readBrains(settingsRoot);
  const entry = data.workspaces?.[wsKey];
  if (!entry) {
    return wsKey === workspaceKey(defaultWorkspace(settingsRoot)) ? settingsRoot : null;
  }
  if (entry.enabled === false || entry.private === true) return null;
  const brain = brainById(data, entry.activeId || data.defaultActiveId);
  return brain?.root || null;
}

function brainSummaries(data, currentKey) {
  const entry = data.workspaces[currentKey] || { activeId: data.defaultActiveId, linked: [] };
  return data.brains.map((b) => {
    const idx = readJson(path.join(b.root, 'packages', 'index.json'), { packages: [] });
    const usedBy = Object.entries(data.workspaces)
      .filter(([, e]) => e.activeId === b.id)
      .map(([ws]) => ws);
    return {
      ...b,
      packages: Array.isArray(idx.packages) ? idx.packages.length : 0,
      active: b.id === entry.activeId,
      linked: entry.linked.includes(b.id),
      usedBy,
    };
  });
}

function readSet(data, entry, extraIds = []) {
  if (entry.enabled === false || entry.private === true) return [];
  const ids = [...new Set([entry.activeId, ...entry.linked, ...extraIds])].filter(Boolean);
  return ids
    .map((id) => brainById(data, id))
    .filter(Boolean)
    .map((b, i) => ({ ...b, readOnly: i > 0 }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 64 * 1024) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const AUTO_STATUS = new Map();
const AUTO_STATE = new Map();
let PACKAGER_BUSY = false;

const AUTO_DEFAULTS = {
  enabled: true,
  tier1: 0.5,
  tier2: 0.7,
  tier3: 0.85,
  cooldownMs: 60000,
};

function resolveAutoConfig(config) {
  const raw = config?.autoPackage && typeof config.autoPackage === 'object' ? config.autoPackage : {};
  const clamp = (v, fallback) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : fallback);
  return {
    enabled: raw.enabled !== false,
    tier1: clamp(raw.tier1, AUTO_DEFAULTS.tier1),
    tier2: clamp(raw.tier2, AUTO_DEFAULTS.tier2),
    tier3: clamp(raw.tier3, AUTO_DEFAULTS.tier3),
    cooldownMs: Number.isFinite(Number(raw.cooldownMs))
      ? Math.max(5000, Number(raw.cooldownMs))
      : AUTO_DEFAULTS.cooldownMs,
  };
}

function runPackagerAsync(root, sessionId, workspace = '') {
  if (PACKAGER_BUSY) {
    return Promise.resolve({ ok: false, phase: 'busy', stderr: 'another checkpoint is running' });
  }
  PACKAGER_BUSY = true;
  const file = fileURLToPath(new URL('./packager.mjs', import.meta.url));
  const workspaceArgs = workspace ? ['--workspace', workspace] : [];
  const run = (args) => new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args, '--root', root, '--session', sessionId, ...workspaceArgs], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr = (stderr + String(chunk)).slice(-1200); });
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, status: null, stderr: err.message });
    });
    child.on('exit', (status) => {
      clearTimeout(timer);
      resolve({ ok: status === 0, status, stderr });
    });
  });
  return (async () => {
    const scan = await run(['scan']);
    if (!scan.ok) return { ok: false, phase: 'scan', ...scan };
    const pack = await run(['package']);
    return { ok: pack.ok, phase: pack.ok ? 'done' : 'package', scan, package: pack };
  })().finally(() => { PACKAGER_BUSY = false; });
}

function jsonRender(_args, value) {
  return [{ type: 'text', text: String(value) }];
}

function sameOriginRequest(req, ctx) {
  const origin = req.headers?.origin;
  if (!origin) return true; // local CLI / tests
  try {
    const expected = ctx.webServer.getOrigin();
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function apply(ctx, config) {
  const getBrainSet = async (exec) => {
    const settingsRoot = resolveSettingsRoot(config, ctx);
    const data = readBrains(settingsRoot);
    let ws = defaultWorkspace(settingsRoot);
    try {
      if (exec?.agent && ctx?.workingDirectory?.ensure) {
        ws = await ctx.workingDirectory.ensure(exec.agent, exec.signal);
      }
    } catch { /* use default workspace */ }
    const ensured = ensureWorkspace(data, settingsRoot, ws);
    if (ensured.created) writeBrains(settingsRoot, data);
    const scope = readUi(settingsRoot).memoryScope;
    const sessionId = exec?.agent?.id || '';
    const extraIds = data.access?.[sessionId] || [];
    let roots = readSet(data, ensured.entry, extraIds);
    // 独立模式只读当前大脑，不读外连/窗口授权大脑
    if (scope === 'session') roots = roots.filter((b) => !b.readOnly);
    return { settingsRoot, data, workspace: ensured.key, entry: ensured.entry, scope, roots };
  };

  const EXPLICIT_RECALL_RE = /(仔细|认真|完整|全部|别漏|不要漏|好好想|再想|回忆一下|帮我回忆)/;

  function resolveIntensity(args) {
    const raw = Number(args?.intensity);
    if (Number.isFinite(raw)) return Math.max(1, Math.min(3, Math.round(raw)));
    if (args?.deep || EXPLICIT_RECALL_RE.test(String(args?.query || ''))) return 3;
    return 2;
  }

  const tools = [
    defineTool({
      name: 'memory_search',
      description: 'Search the user’s local long-term memory (conversation packages + tags). Use when the user references past conversations or asks about something discussed before. intensity: 1 quick, 2 normal, 3 thorough. Normal search auto-retries at 3 only when it finds nothing/weak; set 1 to force quick. 3 is a fallback, not the norm.',
      parameters: {
        query: { type: 'string', required: true, description: 'Keywords, entity, or question to look up.' },
        intensity: { type: 'number', description: 'Recall intensity 1-3. 1 quick, 2 normal (default), 3 thorough. Auto-raised to 3 when the user explicitly asks for a careful/complete recall.' },
        deep: { type: 'boolean', description: 'Legacy alias for intensity 3. Use only when the user says “recall harder / think again”.' },
        from: { type: 'string', description: 'Optional start date, YYYY-MM-DD.' },
        to: { type: 'string', description: 'Optional end date, YYYY-MM-DD.' },
        limit: { type: 'number', description: 'Max hits (default depends on intensity: 1→3, 2→5, 3→8; max 20).' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, scope } = await getBrainSet(exec);
        const sessionId = exec?.agent?.id || '';
        const requestedIntensity = resolveIntensity(args);
        let effectiveIntensity = requestedIntensity;
        const collect = (level) => {
          let out = [];
          for (const brain of roots) {
            const result = searchEpisodes(
              brain.root,
              args.query,
              { ...args, deep: level === 3 },
              scope === 'session' ? 'session' : 'shared',
              sessionId,
            );
            for (const hit of result.hits) {
              out.push({ ...hit, brain: brain.name, brainId: brain.id, readOnly: brain.readOnly });
            }
          }
          const byId = new Map();
          for (const hit of out) {
            const key = String(hit.id || hit.e?.id
              || `${hit.brainId}:${hit.date}:${hit.time}`);
            const prev = byId.get(key);
            if (!prev) {
              byId.set(key, { ...hit, brainIds: [hit.brainId] });
            } else {
              prev.score = Math.max(prev.score, hit.score);
              prev.readOnly = prev.readOnly && hit.readOnly;
              if (!prev.brainIds.includes(hit.brainId)) prev.brainIds.push(hit.brainId);
            }
          }
          out = [...byId.values()];
          out.sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));
          return out;
        };
        const topScore = (list) => list.reduce((max, hit) => Math.max(max, Number(hit.score) || 0), 0);
        let hits = collect(effectiveIntensity);
        let escalated = false;
        if (effectiveIntensity === 2 && (hits.length === 0 || topScore(hits) < 5)) {
          hits = collect(3);
          effectiveIntensity = 3;
          escalated = true;
        }
        const top = topScore(hits);
        const noHit = hits.length === 0 || top < 8;
        const lowConfidence = !noHit && top < 15;
        if (noHit) hits = [];
        const defaultLimit = effectiveIntensity === 1 ? 3 : effectiveIntensity === 2 ? 5 : 8;
        const limit = Math.max(1, Math.min(Number(args.limit) || defaultLimit, 20));
        return JSON.stringify({
          query: args.query,
          intensity: effectiveIntensity,
          requestedIntensity,
          escalated,
          noHit,
          lowConfidence,
          topScore: top,
          explicitRecall: requestedIntensity === 3 && !Number.isFinite(Number(args.intensity)) && !args.deep,
          brains: roots.map((b) => ({ id: b.id, name: b.name, readOnly: b.readOnly })),
          total: hits.length,
          hits: hits.slice(0, limit),
        }, null, 2);
      },
    }),
    defineTool({
      name: 'memory_timeline',
      description: 'List the user’s memory timeline by day or week. Use when the user references a time range (“that afternoon”, “last week”, “three months ago”) before searching for details.',
      parameters: {
        from: { type: 'string', description: 'Start date, YYYY-MM-DD.' },
        to: { type: 'string', description: 'End date, YYYY-MM-DD.' },
        granularity: { type: 'string', description: 'day or week (default day).' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, scope } = await getBrainSet(exec);
        const sessionId = exec?.agent?.id || '';
        const groups = roots.map((brain) => ({
          brain: brain.name,
          brainId: brain.id,
          readOnly: brain.readOnly,
          ...timeline(brain.root, args, scope === 'session' ? 'session' : 'shared', sessionId),
        }));
        return JSON.stringify({ brains: roots.map((b) => ({ id: b.id, name: b.name, readOnly: b.readOnly })), groups }, null, 2);
      },
    }),
    defineTool({
      name: 'memory_read',
      description: 'Read the original text of one memory package by packageId. Use after memory_search when the user needs exact wording or more detail. intensity controls default depth: 1→2000 chars, 2→4000, 3→12000; explicit chars wins.',
      parameters: {
        packageId: { type: 'string', required: true, description: 'Package id from memory_search.' },
        intensity: { type: 'number', description: 'Recall intensity 1-3; controls default chars when chars is omitted.' },
        chars: { type: 'number', description: 'Max characters to return (default depends on intensity; max 20000).' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, scope } = await getBrainSet(exec);
        const sessionId = exec?.agent?.id || '';
        const intensity = resolveIntensity(args);
        const chars = Math.max(500, Math.min(Number(args.chars) || (intensity === 1 ? 2000 : intensity === 2 ? 4000 : 12000), 20000));
        let lastError = null;
        for (const brain of roots) {
          try {
            const pkg = readPackage(
              brain.root,
              args.packageId,
              chars,
              scope === 'session' ? 'session' : 'shared',
              sessionId,
            );
            return JSON.stringify({
              ...pkg,
              intensity,
              chars,
              brain: brain.name,
              brainId: brain.id,
              readOnly: brain.readOnly,
            }, null, 2);
          } catch (err) {
            lastError = err;
          }
        }
        throw lastError || new Error('package not found in connected brains');
      },
    }),
    defineTool({
      name: 'memory_expand',
      description: 'Expand one memory package back to its exact original session-log events. Use after memory_search/memory_read when you need the raw source, including tool or reasoning events omitted from the text package. Local-only and may contain unredacted content.',
      parameters: {
        packageId: { type: 'string', required: true, description: 'Package id from memory_search.' },
        maxEvents: { type: 'number', description: 'Max raw events to return (default 200, max 1000).' },
        maxChars: { type: 'number', description: 'Max JSON characters to return (default 12000, max 50000).' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, scope } = await getBrainSet(exec);
        const currentSession = exec?.agent?.id || '';
        const maxEvents = Math.max(1, Math.min(Number(args.maxEvents) || 200, 1000));
        const maxChars = Math.max(1000, Math.min(Number(args.maxChars) || 12000, 50000));
        let persistence;
        try { persistence = ctx.get?.('sessionPersistence') || ctx.sessionPersistence; } catch { /* optional */ }
        if (!persistence) throw new Error('sessionPersistence is unavailable; use memory_read for the text package');
        let lastError = null;
        for (const brain of roots) {
          try {
            const { pkg } = loadPackage(brain.root, args.packageId);
            if (scope === 'session' && currentSession && pkg.sessionId && pkg.sessionId !== currentSession) {
              throw new Error('package belongs to another session (independent memory)');
            }
            const range = pkg.seqRange || {
              start: pkg.messages?.[0]?.seq ?? null,
              end: pkg.messages?.at(-1)?.seq ?? null,
            };
            if (!pkg.sessionId || range.start == null || range.end == null) {
              throw new Error('package has no session/seq range; use memory_read');
            }
            const handle = await persistence.open(pkg.sessionId, 'read');
            let events = [];
            try {
              const read = await handle.read(0, Number(range.end) + 1);
              events = read.events || [];
            } finally {
              await handle.close();
            }
            const inRange = events.filter((e) => e.seq >= range.start && e.seq <= range.end);
            let selected = inRange.slice(0, maxEvents);
            let text = '';
            while (selected.length) {
              text = JSON.stringify({
                packageId: pkg.packageId,
                sessionId: pkg.sessionId,
                seqRange: range,
                eventCount: inRange.length,
                returned: selected.length,
                truncated: selected.length < inRange.length,
                raw: true,
                events: selected,
              }, null, 2);
              if (text.length <= maxChars) break;
              selected = selected.slice(0, -1);
            }
            return text || JSON.stringify({
              packageId: pkg.packageId,
              sessionId: pkg.sessionId,
              seqRange: range,
              eventCount: inRange.length,
              returned: 0,
              truncated: true,
              raw: true,
              events: [],
            }, null, 2);
          } catch (err) {
            lastError = err;
          }
        }
        throw lastError || new Error('package not found in connected brains');
      },
    }),
    defineTool({
      name: 'memory_pin',
      description: 'Pin one short memory verbatim for the current workspace. Use when the user explicitly says “remember this / 记住这个 / 别忘”. No LLM summary, no redaction; stored locally in the primary brain pins.json.',
      parameters: {
        text: { type: 'string', required: true, description: 'Exact text to remember, copied verbatim.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional short tags, max 12.' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, workspace } = await getBrainSet(exec);
        const root = roots[0]?.root;
        if (!root) throw new Error('no active brain');
        const text = String(args.text || '').trim();
        if (!text) throw new Error('text is required');
        const tags = normalizePinTags(args.tags);
        const data = readPins(root);
        const existing = data.pins.find((p) => p.workspace === workspace && p.text === text);
        if (existing) return JSON.stringify({ pinned: true, duplicate: true, pin: existing, root }, null, 2);
        const pin = {
          id: `pin-${Date.now().toString(36)}-${createHash('sha256').update(text).digest('hex').slice(0, 6)}`,
          text,
          tags,
          workspace,
          sessionId: exec?.agent?.id || '',
          createdAt: new Date().toISOString(),
        };
        data.pins.push(pin);
        writePins(root, data);
        return JSON.stringify({ pinned: true, duplicate: false, pin, root }, null, 2);
      },
    }),
    defineTool({
      name: 'memory_pins',
      description: 'List pinned memories for the current workspace. Use when the user asks what you were told to remember.',
      parameters: {
        query: { type: 'string', description: 'Optional substring filter over text/tags/id.' },
        limit: { type: 'number', description: 'Max pins (default 20, max 100).' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, workspace } = await getBrainSet(exec);
        const root = roots[0]?.root;
        if (!root) throw new Error('no active brain');
        const q = String(args.query || '').toLowerCase();
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const pins = readPins(root).pins
          .filter((p) => p.workspace === workspace)
          .filter((p) => !q || p.text.toLowerCase().includes(q)
            || (p.tags || []).some((t) => t.toLowerCase().includes(q))
            || p.id.toLowerCase().includes(q))
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, limit);
        return JSON.stringify({ workspace, total: pins.length, pins, root }, null, 2);
      },
    }),
    defineTool({
      name: 'memory_unpin',
      description: 'Delete one pinned memory by id. Only pins from the current workspace can be removed.',
      parameters: {
        id: { type: 'string', required: true, description: 'Pin id from memory_pins.' },
      },
      output: { schema: { type: 'string' }, render: jsonRender },
      async execute(args, exec) {
        const { roots, workspace } = await getBrainSet(exec);
        const root = roots[0]?.root;
        if (!root) throw new Error('no active brain');
        const id = String(args.id || '').trim();
        const data = readPins(root);
        const pin = data.pins.find((p) => p.id === id && p.workspace === workspace);
        if (!pin) throw new Error('pin not found in current workspace');
        data.pins = data.pins.filter((p) => p !== pin);
        writePins(root, data);
        return JSON.stringify({ unpinned: true, pin, workspace, root }, null, 2);
      },
    }),
  ];

  ctx.effect(() => {
    const disposers = [];

    // Pressure checkpoints: check before a turn and periodically, so DSH compaction cannot outrun us.
    const autoConfig = resolveAutoConfig(config);
    if (autoConfig.enabled && typeof ctx.on === 'function') {
      const autoState = AUTO_STATE;

      const runCheckpoint = (session, id, st, status, root, workspace, reason) => {
        if (st.running) return;
        if (Date.now() - st.lastAt < autoConfig.cooldownMs) return;
        const seq = Number(session.seq) || 0;
        st.running = true;
        st.lastAt = Date.now();
        st.tier = Math.max(st.tier, 1);
        autoState.set(id, st);
        status.running = true;
        status.lastRunAt = st.lastAt;
        status.lastPhase = `launch:${reason}`;
        AUTO_STATUS.set(id, status);
        runPackagerAsync(root, id, workspace).then((res) => {
          if (res.ok) {
            st.lastSeq = seq;
            status.lastPhase = `done:${reason}`;
            status.lastError = '';
            status.lastSeq = seq;
          } else {
            st.tier = Math.max(0, st.tier - 1);
            status.lastPhase = `${res.phase || 'failed'}:${reason}`;
            status.lastError = String(res.stderr || res.status || '');
            ctx.logger?.warn?.(`[memory-calendar] pressure checkpoint failed (${res.phase}): ${res.stderr || res.status}`);
          }
        }).finally(() => {
          st.running = false;
          autoState.set(id, st);
          status.running = false;
          AUTO_STATUS.set(id, status);
        });
      };

      const checkPressure = (session, source) => {
        if (!session || session.header?.origin === 'subagent') return;
        const id = String(session.id);
        const settingsRoot = resolveSettingsRoot(config, ctx);
        const cwd = session.header?.cwd || defaultWorkspace(settingsRoot);
        const cwdKey = workspaceKey(cwd);
        const root = checkpointRootForWorkspace(settingsRoot, cwdKey);
        if (!root) return;
        let meter;
        try { meter = ctx.get?.('tokenMeter') || ctx.tokenMeter; } catch { /* optional */ }
        if (!meter?.measure) return;
        const contextWindow = Number(session.requestContext?.()?.contextWindow);
        if (!Number.isFinite(contextWindow) || contextWindow <= 0) return;
        let measured;
        try { measured = meter.measure(session); } catch { return; }
        const totalTokens = Number(measured?.totalTokens || 0);
        const ratio = totalTokens / contextWindow;
        if (!Number.isFinite(ratio)) return;

        const st = autoState.get(id) || { tier: 0, running: false, lastAt: 0, lastSeq: -1, lastRatio: null };
        const prev = AUTO_STATUS.get(id) || {};
        const prevRatio = st.lastRatio;
        st.lastRatio = ratio;
        autoState.set(id, st);
        const status = {
          id,
          contextWindow,
          totalTokens,
          ratio,
          tier: 0,
          lastEventAt: Date.now(),
          lastSource: source,
          lastDrop: String(prev.lastPhase || '').includes('compaction-drop'),
          running: st.running,
          lastRunAt: Number(prev.lastRunAt) || st.lastAt,
          lastPhase: String(prev.lastPhase || ''),
          lastError: String(prev.lastError || ''),
          lastSeq: Number.isFinite(Number(prev.lastSeq)) ? Number(prev.lastSeq) : st.lastSeq,
        };
        const tier = ratio >= autoConfig.tier3 ? 3 : ratio >= autoConfig.tier2 ? 2 : ratio >= autoConfig.tier1 ? 1 : 0;
        status.tier = tier;
        const dropped = prevRatio != null && prevRatio > 0.5 && ratio < prevRatio - 0.08;
        if (dropped) {
          status.lastDrop = true;
          AUTO_STATUS.set(id, status);
          runCheckpoint(session, id, st, status, root, cwd, 'compaction-drop');
          return;
        }
        if (ratio < autoConfig.tier1 * 0.9) {
          st.tier = 0;
          autoState.set(id, st);
          status.tier = 0;
          AUTO_STATUS.set(id, status);
          return;
        }
        AUTO_STATUS.set(id, status);
        if (tier <= 0 || st.running || tier <= st.tier) return;
        runCheckpoint(session, id, st, status, root, cwd, `tier${tier}`);
      };

      disposers.push(ctx.on('session/event', (session, event) => {
        if (event?.type !== 'turn/end' && event?.type !== 'turn/start') return;
        checkPressure(session, event.type);
      }));

      if (typeof ctx.setInterval === 'function') {
        const timer = ctx.setInterval(() => {
          let sessions = [];
          try { sessions = ctx.sessions?.list?.() || []; } catch { /* optional */ }
          for (const session of sessions) checkPressure(session, 'timer');
        }, 5000);
        if (timer) disposers.push(timer);
      }
    }

    // Settings page data source (local HTTP route; no upload)
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/summary',
      async handler(req, res) {
        try {
          const settingsRoot = resolveSettingsRoot(config, ctx);
          const data = readBrains(settingsRoot);
          const url = new URL(req.url || '/', 'http://local');
          const currentKey = workspaceKey(url.searchParams.get('workspace') || defaultWorkspace(settingsRoot));
          const ensured = ensureWorkspace(data, settingsRoot, currentKey);
          // Read route is side-effect free; do not persist transient workspaces here.
          const entry = ensured.entry;
          const requested = url.searchParams.get('brain');
          const brain = requested
            ? brainById(data, requested)
            : (brainById(data, entry.activeId) || data.brains[0]);
          if (!brain) {
            res.statusCode = 404;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'brain not found' }));
            return;
          }
          const body = JSON.stringify({
            ...buildSummary(brain.root),
            brain: { id: brain.id, name: brain.name, readOnly: brain.readOnly === true },
            activeId: entry.activeId,
            linked: entry.linked,
            workspace: currentKey,
          });
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(body);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/settings',
      async handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        try {
          const root = resolveSettingsRoot(config, ctx);
          if (req.method === 'GET') {
            res.statusCode = 200;
            res.end(JSON.stringify(readUi(root)));
            return;
          }
          if (req.method === 'POST') {
            if (!sameOriginRequest(req, ctx)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'origin not allowed' }));
              return;
            }
            const body = await readBody(req);
            const next = sanitizeUi(JSON.parse(body || '{}'));
            writeUi(root, next);
            res.statusCode = 200;
            res.end(JSON.stringify(next));
            return;
          }
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method not allowed' }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/usage',
      handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        const names = ['memory_search', 'memory_timeline', 'memory_read'];
        const byTool = Object.fromEntries(names.map((name) => [name, { calls: 0, tokens: 0 }]));
        let totalCalls = 0;
        let resultTokens = 0;
        let meter;
        try { meter = ctx.get?.('tokenMeter') || ctx.tokenMeter; } catch { /* optional */ }
        const sessions = ctx.sessions?.list?.() || [];
        for (const session of sessions) {
          const pending = new Map();
          const events = session.ownEvents?.() || [];
          for (const event of events) {
            const data = event?.data || {};
            if (event.type === 'tool/call' && byTool[data.name]) {
              pending.set(String(data.callId), data.name);
              byTool[data.name].calls += 1;
              totalCalls += 1;
            } else if (event.type === 'tool/result') {
              const name = pending.get(String(data.message?.toolCallId));
              if (!name) continue;
              pending.delete(String(data.message?.toolCallId));
              let tokens = 0;
              try { tokens = meter?.estimateMessage?.(data.message) || 0; } catch { /* optional */ }
              if (!tokens) {
                try { tokens = Math.ceil(JSON.stringify(data.message).length / 4); } catch { tokens = 0; }
              }
              byTool[name].tokens += tokens;
              resultTokens += tokens;
            }
          }
        }
        res.statusCode = 200;
        res.end(JSON.stringify({
          totalCalls,
          resultTokens,
          byTool,
          sessions: sessions.length,
          estimated: true,
        }));
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/auto-status',
      handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        const autoConfig = resolveAutoConfig(config);
        let meter;
        try { meter = ctx.get?.('tokenMeter') || ctx.tokenMeter; } catch { /* optional */ }
        const rows = (ctx.sessions?.list?.() || []).map((session) => {
          const contextWindow = Number(session.requestContext?.()?.contextWindow) || 0;
          let totalTokens = 0;
          try { totalTokens = Number(meter?.measure?.(session)?.totalTokens) || 0; } catch { /* optional */ }
          const ratio = contextWindow > 0 ? totalTokens / contextWindow : null;
          const tier = ratio == null ? null
            : ratio >= autoConfig.tier3 ? 3
              : ratio >= autoConfig.tier2 ? 2
                : ratio >= autoConfig.tier1 ? 1 : 0;
          return {
            id: String(session.id),
            title: session.header?.title || '',
            origin: session.header?.origin || '',
            contextWindow,
            totalTokens,
            ratio,
            tier,
          };
        });
        res.statusCode = 200;
        res.end(JSON.stringify({
          enabled: autoConfig.enabled,
          ...autoConfig,
          sessions: rows,
          status: [...AUTO_STATUS.values()],
        }));
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/checkpoint',
      async handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('allow', 'POST');
          res.end(JSON.stringify({ ok: false, error: 'POST only' }));
          return;
        }
        if (!sameOriginRequest(req, ctx)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ ok: false, error: 'origin not allowed' }));
          return;
        }
        try {
          const body = JSON.parse((await readBody(req)) || '{}');
          const sessions = ctx.sessions?.list?.() || [];
          const wanted = String(body.sessionId || '');
          let session = null;
          if (wanted) {
            session = sessions.find((s) => String(s.id) === wanted) || null;
            if (!session) {
              res.statusCode = 404;
              res.end(JSON.stringify({ ok: false, error: 'session not found' }));
              return;
            }
            if (session.header?.origin === 'subagent') {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'cannot checkpoint a subagent session' }));
              return;
            }
          } else {
            session = sessions.find((s) => s.header?.origin !== 'subagent'
              && Number(s.requestContext?.()?.contextWindow) > 0) || null;
          }
          if (!session) {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, error: 'no live session' }));
            return;
          }
          const settingsRoot = resolveSettingsRoot(config, ctx);
          const cwd = session.header?.cwd || defaultWorkspace(settingsRoot);
          const wsKey = workspaceKey(cwd);
          const root = checkpointRootForWorkspace(settingsRoot, wsKey);
          if (!root) {
            res.statusCode = 409;
            res.end(JSON.stringify({ ok: false, error: 'workspace memory is off' }));
            return;
          }
          const result = await runPackagerAsync(root, String(session.id), cwd);
          if (result.ok) {
            let meter;
            try { meter = ctx.get?.('tokenMeter') || ctx.tokenMeter; } catch { /* optional */ }
            const contextWindow = Number(session.requestContext?.()?.contextWindow) || 0;
            const totalTokens = Number(meter?.measure?.(session)?.totalTokens) || 0;
            const now = Date.now();
            AUTO_STATE.set(String(session.id), {
              tier: 0,
              running: false,
              lastAt: now,
              lastSeq: Number(session.seq) || 0,
              lastRatio: contextWindow > 0 ? totalTokens / contextWindow : 0,
            });
            AUTO_STATUS.set(String(session.id), {
              id: String(session.id),
              contextWindow,
              totalTokens,
              ratio: contextWindow > 0 ? totalTokens / contextWindow : 0,
              tier: 0,
              lastEventAt: Date.now(),
              lastSource: 'manual',
              lastDrop: false,
              running: false,
              lastRunAt: Date.now(),
              lastPhase: 'done:manual',
              lastError: '',
              lastSeq: Number(session.seq) || 0,
            });
          }
          res.statusCode = result.ok ? 200 : 500;
          res.end(JSON.stringify({ sessionId: String(session.id), ...result }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }));
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/brains',
      async handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method not allowed' }));
          return;
        }
        if (req.method === 'POST' && !sameOriginRequest(req, ctx)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'origin not allowed' }));
          return;
        }
        try {
          const settingsRoot = resolveSettingsRoot(config, ctx);
          const data = readBrains(settingsRoot);
          const url = new URL(req.url || '/', 'http://local');
          const currentKey = workspaceKey(url.searchParams.get('workspace') || defaultWorkspace(settingsRoot));
          const ensured = ensureWorkspace(data, settingsRoot, currentKey);
          const entry = ensured.entry;
          let dirty = ensured.created;

          const windows = (ctx.sessions?.list?.() || []).map((s, i) => ({
            id: String(s.id),
            label: `DEEPSEEK ${i + 1}`,
            cwd: s.header?.cwd || '',
            createdAt: s.header?.createdAt || 0,
          }));

          let dshWorkspaces = [];
          try {
            const registry = ctx.workspaceRegistry;
            const listValue = await ctx.sessionController.list({}, AbortSignal.timeout(4000));
            const byCwd = new Map();
            for (const item of listValue?.items || []) {
              if (item.blank || item.origin === 'subagent') continue;
              const cwd = String(item.cwd || '');
              const key = normWorkspacePath(cwd);
              if (!key) continue;
              if (!byCwd.has(key)) byCwd.set(key, []);
              byCwd.get(key).push({
                id: String(item.sessionId),
                title: sessionSummaryTitle(item) || String(item.sessionId).slice(-8),
              });
            }
            dshWorkspaces = (registry?.list?.() || []).map((w) => {
              const sessions = byCwd.get(normWorkspacePath(w.path)) || [];
              return {
                id: String(w.id),
                title: String(w.title || ''),
                path: String(w.path || ''),
                sessionIds: sessions.map((session) => session.id),
                sessions,
                createdAt: w.createdAt || '',
              };
            });
          } catch { /* optional DSH registry/controller */ }

          const respond = () => {
            // GET must be side-effect free: a transient workspace may be returned,
            // but brains.json is only written by an explicit POST.
            if (dirty && req.method !== 'GET') writeBrains(settingsRoot, data);
            res.statusCode = 200;
            res.end(JSON.stringify({
              ...data,
              currentWorkspace: currentKey,
              windows,
              dshWorkspaces,
              summaries: brainSummaries(data, currentKey),
            }));
          };

          if (req.method === 'GET') {
            respond();
            return;
          }
          if (req.method === 'POST') {
            const body = JSON.parse((await readBody(req)) || '{}');
            const action = body.action;
            if (action === 'rename') {
              const brain = brainById(data, body.id);
              if (!brain) throw new Error('brain not found');
              const name = String(body.name || '').trim();
              if (name) brain.name = name;
            } else if (action === 'link') {
              const brain = brainById(data, body.id);
              if (!brain) throw new Error('brain not found');
              entry.enabled = true;
              if (brain.id !== entry.activeId && !entry.linked.includes(brain.id)) entry.linked.push(brain.id);
            } else if (action === 'unlink') {
              entry.linked = entry.linked.filter((id) => id !== body.id);
            } else if (action === 'bind' || action === 'activate') {
              const brain = brainById(data, body.id);
              if (!brain) throw new Error('brain not found');
              entry.enabled = true;
              entry.activeId = brain.id;
              entry.linked = entry.linked.filter((id) => id !== brain.id);
            } else if (action === 'add') {
              const root = path.resolve(String(body.root || ''));
              if (!root || !existsSync(root)) throw new Error('root not found');
              const name = String(body.name || '').trim() || '新大脑';
              const id = `brain-${Date.now().toString(36)}`;
              data.brains.push({ id, name, root, readOnly: true });
            } else if (action === 'copy') {
              const source = brainById(data, body.id);
              if (!source) throw new Error('brain not found');
              const stamp = Date.now().toString(36);
              const dest = `${source.root}-copy-${stamp}`;
              if (existsSync(dest)) throw new Error('copy destination already exists');
              cpSync(source.root, dest, { recursive: true });
              const id = `brain-${stamp}`;
              const name = String(body.name || '').trim() || `${source.name} 副本`;
              data.brains.push({ id, name, root: dest, readOnly: false });
            } else if (action === 'workspace-private') {
              const key = workspaceKey(body.workspace || currentKey);
              const target = data.workspaces[key];
              if (!target) throw new Error('workspace not found');
              target.private = body.private === true;
            } else if (action === 'save') {
              const map = body.workspaces && typeof body.workspaces === 'object' ? body.workspaces : {};
              for (const [ws, raw] of Object.entries(map)) {
                const ids = Array.isArray(raw)
                  ? raw
                  : (raw && typeof raw === 'object' ? [raw.activeId, ...(raw.linked || [])] : [raw]);
                const valid = [...new Set(ids
                  .filter((id) => brainById(data, String(id)))
                  .map(String))];
                const key = workspaceKey(ws);
                const entry = data.workspaces[key] || { activeId: '', linked: [], enabled: false };
                entry.enabled = valid.length > 0;
                entry.activeId = valid[0] || '';
                entry.linked = valid.slice(1);
                data.workspaces[key] = entry;
              }
            } else if (action === 'group-create') {
              const members = [...new Set((body.members || []).filter((id) => brainById(data, id)))];
              if (members.length < 2) throw new Error('至少选择两个大脑');
              const primary = members.includes(body.primary) ? body.primary : members[0];
              const name = brainById(data, primary)?.name || '超级大脑';
              data.groups.push({ id: `group-${Date.now().toString(36)}`, name, members, primary });
            } else if (action === 'group-remove') {
              data.groups = data.groups.filter((g) => g.id !== body.id);
            } else if (action === 'group-unlink') {
              const group = data.groups.find((g) => g.id === body.id);
              if (!group) throw new Error('group not found');
              group.members = group.members.filter((id) => id !== body.brainId);
              if (group.members.length < 2) {
                data.groups = data.groups.filter((g) => g.id !== group.id);
              } else if (!group.members.includes(group.primary)) {
                group.primary = group.members[0];
              }
            } else if (action === 'group-apply') {
              const group = data.groups.find((g) => g.id === body.id);
              if (!group) throw new Error('group not found');
              entry.enabled = true;
              entry.activeId = group.primary;
              entry.linked = group.members.filter((id) => id !== group.primary);
            } else if (action === 'access') {
              const brain = brainById(data, body.id);
              if (!brain) throw new Error('brain not found');
              const sessionId = String(body.sessionId || '').trim();
              if (!sessionId) throw new Error('sessionId required');
              const list = new Set(data.access[sessionId] || []);
              if (body.enabled === true) list.add(brain.id); else list.delete(brain.id);
              if (list.size) data.access[sessionId] = [...list];
              else delete data.access[sessionId];
            } else if (action === 'remove') {
              const brain = brainById(data, body.id);
              if (!brain) throw new Error('brain not found');
              const remaining = data.brains.filter((b) => b.id !== brain.id);
              if (!remaining.length) throw new Error('cannot remove last brain');
              if (body.deleteData === true) {
                rmSync(brain.root, { recursive: true, force: true });
              }
              data.brains = remaining;
              for (const [sessionId, ids] of Object.entries(data.access)) {
                const next = ids.filter((id) => id !== brain.id);
                if (next.length) data.access[sessionId] = next;
                else delete data.access[sessionId];
              }
              for (const wsEntry of Object.values(data.workspaces)) {
                if (wsEntry.activeId === brain.id) {
                  wsEntry.activeId = remaining.some((b) => b.id === data.defaultActiveId)
                    ? data.defaultActiveId
                    : remaining[0].id;
                }
                wsEntry.linked = wsEntry.linked.filter((id) => id !== brain.id);
              }
            } else {
              throw new Error('unknown action');
            }
            dirty = true;
            respond();
            return;
          }
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method not allowed' }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      },
    }));

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/api/memory-calendar/package-now',
      async handler(req, res) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method not allowed' }));
          return;
        }
        if (!sameOriginRequest(req, ctx)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'origin not allowed' }));
          return;
        }
        res.statusCode = 410;
        res.end(JSON.stringify({
          ok: false,
          error: 'package-now disabled; use POST /api/memory-calendar/checkpoint',
        }));
      },
    }));

    for (const tool of tools) disposers.push(ctx.tools.register(tool));

    return () => {
      for (const dispose of disposers) {
        try { dispose?.(); } catch { /* already disposed */ }
      }
    };
  });
}
