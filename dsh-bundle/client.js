window.__ModuleLoader__.load({
  id: 'dsh-memory-calendar',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState } = React;

    const S = {
      page: {
        padding: '24px', minHeight: '100%', fontSize: 14,
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-base)',
      },
      header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 },
      title: { fontSize: 20, fontWeight: 600, margin: 0 },
      sub: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginBottom: 18, wordBreak: 'break-all' },
      stats: { display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
      card: {
        flex: '1 1 120px', minWidth: 120, padding: '12px 14px', borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
      },
      num: { fontSize: 22, fontWeight: 600, lineHeight: 1.2 },
      label: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      columns: { display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' },
      col: { flex: '1 1 300px', minWidth: 260 },
      sectionTitle: { fontSize: 13, fontWeight: 600, margin: '0 0 8px' },
      row: {
        padding: '12px 14px', borderRadius: 8, marginBottom: 10,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      rowTitle: {
        fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      },
      rowMeta: { fontSize: 11, lineHeight: 1.5, color: 'var(--dsw-alias-label-secondary)', marginBottom: 10 },
      tag: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: 11, margin: '3px 5px 3px 0', cursor: 'pointer',
      },
      tagActive: {
        background: 'var(--dsw-alias-brand-primary)', color: '#fff',
      },
      error: { color: 'var(--dsw-alias-state-error-primary)', whiteSpace: 'pre-wrap' },
      note: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.6, marginTop: 18 },
      panel: {
        padding: '16px', borderRadius: 10, marginBottom: 20,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      divider: {
        height: 1, background: 'var(--dsw-alias-border-l1)',
        margin: '16px 0 12px',
      },
      rowInline: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
      field: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      select: {
        padding: '3px 8px', borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)', fontSize: 12,
      },
      saveNote: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
      brainRow: {
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        padding: '10px 12px', borderRadius: 8, marginTop: 6, marginBottom: 10,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
      },
      brainName: { fontSize: 13, fontWeight: 600 },
      brainPath: {
        fontSize: 11, color: 'var(--dsw-alias-label-secondary)',
        flex: '1 1 160px', minWidth: 0, maxWidth: 220,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      },
      pathLine: {
        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      },
      badge: {
        fontSize: 10, padding: '1px 6px', borderRadius: 999,
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-secondary)',
      },
      btn: {
        fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
      },
      btnPrimary: {
        background: 'var(--dsw-alias-brand-primary)', color: '#fff',
        border: '1px solid var(--dsw-alias-brand-primary)',
      },
      input: {
        fontSize: 11, padding: '3px 7px', borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
      },
      confirm: {
        padding: '10px 12px', borderRadius: 8, marginBottom: 8,
        border: '1px solid var(--dsw-alias-state-warn-primary)',
        background: 'var(--dsw-alias-bg-layer-2)',
        fontSize: 12, lineHeight: 1.6,
      },
      toastWrap: {
        position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10002, pointerEvents: 'none',
      },
      toast: {
        padding: '8px 14px', borderRadius: 999,
        background: '#222', color: '#fff', fontSize: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,.28)', whiteSpace: 'nowrap',
      },
      modalBackdrop: {
        position: 'fixed', inset: 0, zIndex: 10001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'rgba(0,0,0,.35)',
      },
      modalCard: {
        width: 'min(520px, 100%)', maxHeight: '80vh', overflow: 'auto',
        padding: 16, borderRadius: 12,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-overlay)',
        boxShadow: '0 16px 48px rgba(0,0,0,.35)',
        fontSize: 12, lineHeight: 1.6,
      },
      graphWrap: {
        padding: '10px 6px 2px', marginBottom: 10, position: 'relative',
        border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 8,
        background: 'var(--dsw-alias-bg-base)',
      },
      graphFullscreen: {
        position: 'fixed', inset: '48px 32px 32px 32px', zIndex: 9999,
        padding: '12px', margin: 0, borderRadius: 12,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        boxShadow: '0 12px 40px rgba(0,0,0,.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      },
      graphCanvas: { position: 'relative', overflow: 'hidden', height: 320, marginTop: 8 },
      port: {
        position: 'absolute', right: 4, top: '50%', marginTop: -7,
        width: 14, height: 14, cursor: 'crosshair', zIndex: 2,
      },
      portLeft: {
        position: 'absolute', left: 4, top: '50%', marginTop: -7,
        width: 14, height: 14, cursor: 'crosshair', zIndex: 2,
      },
      portDot: {
        width: 10, height: 10, borderRadius: 999,
        background: 'var(--dsw-alias-bg-base)',
        border: '2px solid var(--dsw-alias-brand-primary)',
      },
      portDotGreen: {
        width: 10, height: 10, borderRadius: 999,
        background: 'var(--dsw-alias-bg-base)',
        border: '2px solid #22c55e',
      },
      anchor: {
        position: 'absolute', left: -6, top: '50%', marginTop: -6,
        width: 12, height: 12, borderRadius: 999, cursor: 'grab', zIndex: 2,
        background: 'var(--dsw-alias-state-warn-primary)',
        border: '2px solid var(--dsw-alias-bg-base)',
      },
      graphMenu: {
        position: 'absolute', minWidth: 120, padding: 4, zIndex: 5,
        borderRadius: 8, border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-overlay)',
        boxShadow: '0 6px 20px rgba(0,0,0,.18)',
      },
      graphMenuTitle: {
        padding: '4px 8px', fontSize: 11, fontWeight: 600,
        color: 'var(--dsw-alias-label-secondary)',
      },
      graphMenuItem: {
        display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px',
        border: 'none', borderRadius: 5, background: 'transparent', cursor: 'pointer',
        color: 'var(--dsw-alias-label-primary)', fontSize: 12,
      },
      nodeAction: {
        position: 'absolute', top: '50%', marginTop: -13,
        width: 26, height: 26, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', border: '1px solid var(--dsw-alias-border-l1)',
        boxShadow: '0 3px 10px rgba(0,0,0,.18)', cursor: 'pointer',
        zIndex: 7, transition: 'opacity .18s ease, transform .18s ease',
        fontSize: 14, lineHeight: 1,
      },
      nodeActionLeft: { left: -36, color: '#ef4444' },
      nodeActionRight: { right: -36, color: '#2563eb' },
      pathPopup: {
        position: 'absolute', padding: '6px 10px', borderRadius: 8,
        background: '#fff', border: '1px solid var(--dsw-alias-border-l1)',
        boxShadow: '0 6px 18px rgba(0,0,0,.18)', zIndex: 9,
        fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        animation: 'mcSlide .2s ease-out', maxWidth: 360,
      },
      nodeActionTip: {
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap',
        background: '#222', color: '#fff', fontSize: 11, lineHeight: 1.4,
        boxShadow: '0 3px 10px rgba(0,0,0,.25)', pointerEvents: 'none',
      },
    };

    function shortPath(path, count = 2) {
      const parts = String(path || '').split(/[\\/]/).filter(Boolean);
      if (parts.length <= count) return String(path || '');
      return `…\\${parts.slice(-count).join('\\')}`;
    }

    function PathText({ text, copy, style, onMenu, scrollOnHover = true }) {
      const [hover, setHover] = React.useState(false);
      const value = String(text || '');
      const long = scrollOnHover && value.length > 35;
      const inFlex = Boolean(style && style.flex);
      return h('span', {
        'data-mc-path': '1',
        style: {
          display: 'block',
          width: inFlex ? undefined : '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maskImage: 'linear-gradient(90deg,#000 0%,#000 62%,transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg,#000 0%,#000 62%,transparent 100%)',
          ...style,
        },
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenu(e, copy || value);
        },
      }, long ? h('span', {
        'data-mc-inner': '1',
        style: { display: 'inline-flex', gap: 40, width: 'max-content' },
      },
      h('span', { style: { display: 'inline-block' } }, value),
      hover ? h('span', { style: { display: 'inline-block' } }, value) : null)
        : value);
    }

    function MemorySettings() {
      const [state, setState] = useState({ loading: true, error: '', data: null });
      const [selectedTag, setSelectedTag] = useState('');
      const [tagsOpen, setTagsOpen] = useState(false);
      const [packagesOpen, setPackagesOpen] = useState(true);
      const [tagSearch, setTagSearch] = useState('');
      const [pkgSearch, setPkgSearch] = useState('');
      const [month, setMonth] = useState('');
      const [day, setDay] = useState('');
      const [brains, setBrains] = useState(null);

      const [graphView, setGraphView] = useState(false);
      const [graphZoom, setGraphZoom] = useState(1);
      const [graphMax, setGraphMax] = useState(false);
      const [graphDark, setGraphDark] = useState(false);
      const [graphSelected, setGraphSelected] = useState('');
      const [nodePos, setNodePos] = useState({});
      const [wsPanelOpen, setWsPanelOpen] = useState(false);
      const [expandedWs, setExpandedWs] = useState('');
      const [sessionChoice, setSessionChoice] = useState(() => {
        try {
          const parsed = JSON.parse(localStorage.getItem('mc-session-choice') || '{}');
          return parsed && typeof parsed === 'object' ? parsed : {};
        } catch { return {}; }
      });
      const saveSessionChoice = (next) => {
        setSessionChoice(next);
        try { localStorage.setItem('mc-session-choice', JSON.stringify(next)); } catch { /* optional */ }
      };
      const sessionsFor = (ws, meta) => {
        const all = meta?.sessions || [];
        const saved = sessionChoice[ws];
        if (!Array.isArray(saved)) return all;
        const byId = new Map(all.map((session) => [session.id, session]));
        return saved.map((id) => byId.get(id)).filter(Boolean);
      };
      const choiceIdsFor = (ws, meta) => sessionsFor(ws, meta).map((session) => session.id);
      const toggleSessionChoice = (ws, meta, id, checked) => {
        const current = choiceIdsFor(ws, meta);
        const next = checked
          ? [...new Set([...current, id])]
          : current.filter((sessionId) => sessionId !== id);
        saveSessionChoice({ ...sessionChoice, [ws]: next });
      };
      const reorderSessionChoice = (ws, meta, fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;
        const current = choiceIdsFor(ws, meta);
        const moving = current.filter((id) => id !== fromId);
        const target = moving.indexOf(toId);
        moving.splice(target < 0 ? moving.length : target, 0, fromId);
        saveSessionChoice({ ...sessionChoice, [ws]: moving });
      };
      const [hiddenWs, setHiddenWs] = useState(() => {
        try {
          const raw = localStorage.getItem('mc-hidden-workspaces');
          return Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
        } catch { return []; }
      });
      const setWorkspaceHidden = (ws, hide) => {
        setHiddenWs((prev) => {
          const next = hide
            ? [...new Set([...prev, ws])]
            : prev.filter((id) => id !== ws);
          try { localStorage.setItem('mc-hidden-workspaces', JSON.stringify(next)); } catch { /* optional */ }
          return next;
        });
      };
      const [pan, setPan] = useState({ x: 0, y: 0 });
      const [nodeDrag, setNodeDrag] = useState(null);
      const [panDrag, setPanDrag] = useState(null);
      const [linkDraft, setLinkDraft] = useState(null);
      const [flowLine, setFlowLine] = useState(null);
      const [flowGreen, setFlowGreen] = useState('');
      const [hoverNode, setHoverNode] = useState('');
      const [hoverCard, setHoverCard] = useState('');
      const [nodeDeleteConfirm, setNodeDeleteConfirm] = useState('');
      const [hoverAction, setHoverAction] = useState('');
      const [pathMenu, setPathMenu] = useState(null);
      const [toast, setToast] = useState('');
      const toastTimer = useRef(null);
      const menuTimer = useRef(null);
      const hoverTimer = useRef(null);
      const suppressClick = useRef(false);
      const [draft, setDraft] = useState({});
      const [connectMode, setConnectMode] = useState(false);
      const [connectBrain, setConnectBrain] = useState('');
      const [graphMenu, setGraphMenu] = useState(null);
      const [graphConfirm, setGraphConfirm] = useState(null);
      const [groupDraft, setGroupDraft] = useState(null);
      const [groupLinkConfirm, setGroupLinkConfirm] = useState(null);
      const [groupUnlinkConfirm, setGroupUnlinkConfirm] = useState(null);


      const [drag, setDrag] = useState(null);
      const graphInnerRef = useRef(null);

      useEffect(() => {
        if (!brains) return;
        const next = {};
        for (const [ws, entry] of Object.entries(brains.workspaces || {})) {
          next[ws] = entry.enabled === false
            ? []
            : [entry.activeId, ...(entry.linked || [])].filter(Boolean);
        }
        setDraft(next);
      }, [brains]);

      const [viewBrainId, setViewBrainId] = useState('');
      const [confirmBrain, setConfirmBrain] = useState(null);
      const [deleteBrainData, setDeleteBrainData] = useState(false);
      const [renameBrain, setRenameBrain] = useState(null);
      const [newBrain, setNewBrain] = useState({ name: '', root: '' });
      const [brainMsg, setBrainMsg] = useState('');
      const [usage, setUsage] = useState(null);

      useEffect(() => {
        let alive = true;
        fetch('/api/memory-calendar/brains', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
          .then((brainData) => {
            if (!alive) return;
            setBrains(brainData);
            const entry = brainData.workspaces?.[brainData.currentWorkspace];
            setViewBrainId(entry?.activeId || brainData.defaultActiveId || brainData.summaries?.[0]?.id || '');
          })
          .catch((err) => {
            if (alive) setState({ loading: false, error: String(err?.message || err), data: null });
          });
        return () => { alive = false; };
      }, []);

      useEffect(() => {
        let alive = true;
        const load = () => {
          fetch('/api/memory-calendar/usage', { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => { if (alive && data) setUsage(data); })
            .catch(() => { /* optional */ });
        };
        load();
        const timer = setInterval(load, 15000);
        return () => { alive = false; clearInterval(timer); };
      }, []);

      useEffect(() => {
        let alive = true;
        setState((prev) => ({ ...prev, loading: true, error: '' }));
        const query = viewBrainId ? `?brain=${encodeURIComponent(viewBrainId)}` : '';
        fetch(`/api/memory-calendar/summary${query}`, { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
          .then((data) => { if (alive) setState({ loading: false, error: '', data }); })
          .catch((err) => { if (alive) setState({ loading: false, error: String(err?.message || err), data: null }); });
        return () => { alive = false; };
      }, [viewBrainId]);

      async function postBrain(body) {
        const res = await fetch('/api/memory-calendar/brains', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setBrains(data);
        if ((body.action === 'bind' || body.action === 'activate') && body.id) setViewBrainId(body.id);
        if (body.action === 'remove' && body.id === viewBrainId) setViewBrainId('');
        setBrainMsg('已保存');
        return data;
      }

      const data = state.data;
      const normWs = (value) => String(value || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
      const dshWorkspaceOf = (ws) => (brains?.dshWorkspaces || [])
        .find((item) => normWs(item.path) === normWs(ws));
      const currentWorkspaceEntry = brains?.workspaces?.[brains?.currentWorkspace];
      const months = useMemo(() => [...new Set((data?.recent || [])
        .map((p) => String(p.date || '').slice(0, 7))
        .filter(Boolean))].sort().reverse(), [data]);
      const days = useMemo(() => [...new Set((data?.recent || [])
        .filter((p) => !month || String(p.date || '').startsWith(month))
        .map((p) => p.date)
        .filter(Boolean))].sort().reverse(), [data, month]);
      const filtered = useMemo(() => {
        if (!data) return [];
        const query = pkgSearch.trim().toLowerCase();
        return (data.recent || []).filter((p) => {
          if (selectedTag && !(p.filterTags || p.tags || []).includes(selectedTag)) return false;
          if (month && !String(p.date || '').startsWith(month)) return false;
          if (day && p.date !== day) return false;
          if (query) {
            const haystack = [
              p.bigTag,
              p.id,
              p.date,
              p.time,
              ...(p.filterTags || p.tags || []),
            ].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          return true;
        });
      }, [data, selectedTag, month, day, pkgSearch]);
      const tagQuery = tagSearch.trim().toLowerCase();
      const filteredTags = (data?.tags || [])
        .filter((t) => !tagQuery || String(t.tag || '').toLowerCase().includes(tagQuery));

      const dirtyChanges = useMemo(() => {
        if (!brains) return [];
        const map = brains.workspaces || {};
        const keys = new Set([...Object.keys(map), ...Object.keys(draft)]);
        return [...keys].map((ws) => {
          const entry = map[ws];
          const current = entry && entry.enabled !== false
            ? [entry.activeId, ...(entry.linked || [])].filter(Boolean)
            : [];
          const next = draft[ws] || [];
          return current.join('|') === next.join('|')
            ? null
            : { ws, from: current.join(', '), to: next.join(', ') };
        }).filter(Boolean);
      }, [brains, draft]);

      const graph = useMemo(() => {
        if (!brains) return null;
        const bs = brains.summaries || [];
        const wss = Object.keys(brains.workspaces || {}).filter(
          (ws) => ws === brains.currentWorkspace || !hiddenWs.includes(ws),
        );
        let H = Math.max(220, 50 + Math.max(bs.length, wss.length) * 70);
        const placed = (node) => (nodePos[node.id]
          ? { ...node, nodeX: nodePos[node.id].x, nodeY: nodePos[node.id].y }
          : node);
        const brainNodes = bs.map((b, i) => placed({
          ...b, kind: 'brain', nodeX: 50, nodeY: 30 + i * 70, w: 200, h: 48,
        }));
        const wsNodes = wss.map((ws, i) => {
          const meta = dshWorkspaceOf(ws);
          const selectedSessions = sessionsFor(ws, meta);
          return placed({
            ...brains.workspaces[ws],
            id: ws,
            kind: 'workspace',
            name: meta?.title || String(ws).split(/[\\/]/).filter(Boolean).pop() || ws,
            sessionCount: selectedSessions.length,
            sessionTotal: meta?.sessions?.length || 0,
            sub: ws,
            nodeX: 500,
            nodeY: 30 + i * 70,
            w: 220,
            h: 48,
          });
        });
        const hoveredBrain = brainNodes.find((b) => b.id === hoverCard);
        if (hoveredBrain) {
          const panelTop = hoveredBrain.nodeY + hoveredBrain.h + 6;
          const panelBottom = panelTop + 30;
          for (const b of brainNodes) {
            if (b.id === hoveredBrain.id) continue;
            const overlaps = b.nodeY < panelBottom + 8 && b.nodeY + b.h > panelTop;
            if (overlaps) b.nodeY = Math.max(b.nodeY, panelBottom + 10);
          }
        }
        const sortedNodes = [...brainNodes, ...wsNodes].sort((a, b) => a.nodeY - b.nodeY);
        for (let pass = 0; pass < 3; pass += 1) {
          for (let i = 0; i < sortedNodes.length; i += 1) {
            for (let j = i + 1; j < sortedNodes.length; j += 1) {
              const a = sortedNodes[i];
              const b = sortedNodes[j];
              const overlapX = a.nodeX < b.nodeX + b.w && b.nodeX < a.nodeX + a.w;
              const overlapY = a.nodeY < b.nodeY + b.h + 8 && b.nodeY < a.nodeY + a.h + 8;
              if (!overlapX || !overlapY) continue;
              if (b.nodeY >= a.nodeY) b.nodeY = a.nodeY + a.h + 10;
              else a.nodeY = b.nodeY + b.h + 10;
            }
          }
        }

        const edges = [];
        for (const w of wsNodes) {
          const ids = draft[w.id] || [];
          ids.forEach((brainId, index) => {
            const b = brainNodes.find((x) => x.id === brainId);
            if (b) {
              edges.push({
                key: `${w.id}:${brainId}`,
                from: b,
                to: w,
                offset: (index - (ids.length - 1) / 2) * 8,
              });
            }
          });
        }
        const brainEdges = [];
        for (const group of brains.groups || []) {
          const primary = brainNodes.find((b) => b.id === group.primary);
          if (!primary) continue;
          for (const id of group.members || []) {
            if (id === group.primary) continue;
            const member = brainNodes.find((b) => b.id === id);
            if (member) {
              brainEdges.push({
                key: `${group.id}:${id}`,
                from: primary,
                to: member,
                groupId: group.id,
                memberId: id,
              });
            }
          }
        }
        const sessionNodes = [];
        const sessionEdges = [];
        if (expandedWs) {
          const wsNode = wsNodes.find((node) => node.id === expandedWs);
          const meta = dshWorkspaceOf(expandedWs);
          const selectedSessions = sessionsFor(expandedWs, meta);
          if (wsNode && selectedSessions.length) {
            selectedSessions.forEach((session, index) => {
              const sessionNode = {
                id: `session:${session.id}`,
                kind: 'session',
                name: session.title || session.id,
                sub: session.id,
                wsId: wsNode.id,
                nodeX: wsNode.nodeX + 20,
                nodeY: wsNode.nodeY + wsNode.h + 18 + index * 34,
                w: 200,
                h: 28,
              };
              sessionNodes.push(sessionNode);
              sessionEdges.push({
                key: `${wsNode.id}:${session.id}`,
                from: wsNode,
                to: sessionNode,
              });
            });
            H = Math.max(H, ...sessionNodes.map((node) => node.nodeY + node.h + 30));
          }
        }
        return { H, brainNodes, wsNodes, sessionNodes, sessionEdges, edges, brainEdges };
      }, [brains, draft, nodePos, hoverCard, hiddenWs, expandedWs, sessionChoice]);

      function short(value, n) {
        const s = String(value || '');
        return s.length > n ? `${s.slice(0, n)}…` : s;
      }

      function brainName(id) {
        return (brains?.summaries || []).find((b) => b.id === id)?.name || id;
      }

      function fitZoom() {
        return Math.max(1.2, Math.min(2, (window.innerWidth - 140) / 760));
      }

      function openGraphFullscreen() {
        setGraphMax(true);
        setGraphZoom(fitZoom());
        setPan({ x: 0, y: 0 });
        setGraphSelected('');
      }

      function closeGraphFullscreen() {
        setGraphMax(false);
        setGraphZoom(1);
        setPan({ x: 0, y: 0 });
        setGraphSelected('');
      }

      async function copyPath(path) {
        if (!path) return;
        try {
          await navigator.clipboard.writeText(path);
          showToast('路径已复制');
          return;
        } catch { /* fallback below */ }
        try {
          const area = document.createElement('textarea');
          area.value = path;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          showToast('路径已复制');
        } catch {
          showToast('复制失败，请手动选择路径');
        }
      }

      function pathText(text, extraStyle, scrollOnHover = true, copy = text) {
        return h(PathText, {
          text,
          copy,
          style: extraStyle,
          scrollOnHover,
          onMenu: (e, value) => setPathMenu({ x: e.clientX, y: e.clientY, path: value }),
        });
      }

      function closeMenuSoon() {
        if (menuTimer.current) clearTimeout(menuTimer.current);
        menuTimer.current = setTimeout(() => setGraphMenu(null), 500);
      }

      function keepMenuOpen() {
        if (menuTimer.current) clearTimeout(menuTimer.current);
      }

      function showToast(message) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(message);
        toastTimer.current = setTimeout(() => setToast(''), 2600);
      }

      function showCard(id) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        if (id !== nodeDeleteConfirm) setNodeDeleteConfirm('');
        if (id !== hoverCard) setHoverAction('');
        setHoverCard(id);
      }

      function hideCard() {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => {
          setHoverCard('');
          setHoverAction('');
          setNodeDeleteConfirm('');
        }, 240);
      }

      function resetGraph() {
        setGraphZoom(graphMax ? fitZoom() : 1);
        setPan({ x: 0, y: 0 });
        setNodePos({});
        setGraphSelected('');
        const saved = {};
        for (const [ws, entry] of Object.entries(brains?.workspaces || {})) {
          saved[ws] = entry.enabled === false
            ? []
            : [entry.activeId, ...(entry.linked || [])].filter(Boolean);
        }
        setDraft(saved);
        setConnectMode(false);
        setConnectBrain('');
        showToast('已恢复到上次保存的方案');
      }

      function renderGraph() {
        if (!graph) return null;
        const pathFor = (from, to, offset = 0) => {
          const x1 = from.nodeX + from.w;
          const y1 = from.nodeY + from.h / 2 + offset;
          const x2 = to.nodeX;
          const y2 = to.nodeY + to.h / 2 + offset;
          const dx = Math.max(40, (x2 - x1) / 2);
          return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        };
        const pathBetween = (from, to) => {
          const x1 = from.nodeX;
          const y1 = from.nodeY + from.h / 2;
          const x2 = to.nodeX;
          const y2 = to.nodeY + to.h / 2;
          const laneX = Math.min(x1, x2) - 24;
          return `M ${x1} ${y1} C ${laneX} ${y1}, ${laneX} ${y2}, ${x2} ${y2}`;
        };
        const activeBg = graphDark ? '#243a5e' : 'var(--dsw-alias-brand-primary)';
        const activeBorder = graphDark ? '#6ea8fe' : 'var(--dsw-alias-brand-primary)';
        const nodeBox = (node, active) => ({
          position: 'absolute',
          left: node.nodeX, top: node.nodeY, width: node.w, height: node.h,
          padding: '6px 18px', boxSizing: 'border-box', borderRadius: 10,
          overflow: 'visible', cursor: 'pointer', userSelect: 'none',
          background: active ? activeBg : (graphDark ? '#24262c' : '#ffffff'),
          border: `1px solid ${active ? activeBorder : (graphDark ? '#3a3d45' : 'var(--dsw-alias-border-l1)')}`,
          color: active ? '#FFFFFF' : (graphDark ? '#e8e8ea' : 'var(--dsw-alias-label-primary)'),
          boxShadow: hoverNode === node.id
            ? '0 0 0 3px rgba(34,197,94,.28), 0 8px 24px rgba(0,0,0,.22)'
            : '0 6px 18px rgba(0,0,0,.18)',
        });
        return h('div', {
          style: {
            ...(graphMax ? S.graphFullscreen : S.graphWrap),
            background: graphDark ? '#17181c' : '#f2f2ef',
          },
          onContextMenu: (e) => {
            if (linkDraft) {
              e.preventDefault();
              setLinkDraft(null);
              setHoverNode('');
            }
          },
        },
          h('style', null, '@keyframes mcRipple{0%{box-shadow:0 0 0 0 rgba(34,197,94,.65)}100%{box-shadow:0 0 0 12px rgba(34,197,94,0)}}@keyframes mcPop{0%{opacity:0;transform:scale(.55)}100%{opacity:1;transform:scale(1)}}@keyframes mcBlink{0%,100%{opacity:1}50%{opacity:.35}}@keyframes mcFlow{to{stroke-dashoffset:-14}}@keyframes mcSlide{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:translateX(0)}}@keyframes mcPathScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}[data-mc-path]{display:inline-block;max-width:100%;overflow:hidden;white-space:nowrap;vertical-align:bottom;mask-image:linear-gradient(90deg,#000 0%,#000 62%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 62%,transparent 100%)}[data-mc-inner]{display:inline-flex;gap:40px;width:max-content}[data-mc-inner]>span+span{opacity:0}[data-mc-path]:hover [data-mc-inner]{animation:mcPathScroll 8s linear 2s infinite}[data-mc-path]:hover [data-mc-inner]>span+span{opacity:1;transition:opacity 0s linear 2s}'),
          h('div', { style: { ...S.rowInline, justifyContent: 'space-between' } },
            h('div', { style: S.rowInline },
              h('button', {
                style: S.btn,
                title: graphMax ? '缩小：退出大窗' : '放大：大窗并同步放大',
                onClick: graphMax ? closeGraphFullscreen : openGraphFullscreen,
              }, graphMax ? '⤡' : '⤢'),
              h('button', { style: S.btn, onClick: resetGraph }, '重置'),
              h('button', {
                style: S.btn,
                title: graphDark ? '切换浅色' : '切换深色',
                onClick: () => setGraphDark((v) => !v),
              }, graphDark ? '☀' : '☾')),
            h('button', {
              style: S.btn,
              onClick: () => {
                const from = viewBrainId || (brains.summaries || [])[0]?.id;
                if (from) setLinkDraft({ kind: 'workspace', from, x: 0, y: 0 });
              },
            }, '建立连接')),
          h('div', {
            style: {
              position: 'absolute', left: 0, top: 62, zIndex: 40,
              display: 'flex', alignItems: 'flex-start',
            },
            onPointerDown: (e) => e.stopPropagation(),
          },
            h('button', {
              style: {
                ...S.btn, padding: '8px 4px', borderRadius: '0 8px 8px 0',
                writingMode: 'vertical-rl', letterSpacing: 2,
              },
              title: '隐藏/显示工作区',
              onClick: () => setWsPanelOpen((v) => !v),
            }, wsPanelOpen ? '收起' : '工作区'),
            wsPanelOpen ? h('div', {
              style: {
                width: 238, maxHeight: 'calc(100vh - 180px)', overflow: 'auto',
                marginLeft: 4, padding: 10, borderRadius: 10,
                background: 'var(--dsw-alias-bg-base)',
                border: '1px solid var(--dsw-alias-border-l1)',
                boxShadow: '0 10px 30px rgba(0,0,0,.2)',
              },
            },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } },
                `工作区抽屉 · ${Object.keys(brains.workspaces || {}).length} 个`),
              h('div', { style: { ...S.saveNote, marginBottom: 8 } },
                '这里列的是工作区，不是会话。会话来自侧边栏当前可见范围，不含归档；隐藏只影响图谱显示，不关闭记忆；隐藏项可拖入画布。'),
              ...Object.keys(brains.workspaces || {}).map((ws) => {
                const hidden = hiddenWs.includes(ws);
                const current = brains.currentWorkspace === ws;
                const meta = dshWorkspaceOf(ws);
                const name = meta?.title || String(ws).split(/[\\/]/).filter(Boolean).pop() || ws;
                const sessionsList = meta?.sessions || [];
                const selectedSessions = sessionsFor(ws, meta);
                const selectedIds = new Set(selectedSessions.map((session) => session.id));
                const sessionCount = selectedSessions.length;
                const expanded = expandedWs === ws;
                const row = h('div', {
                  draggable: hidden,
                  title: hidden ? '拖入画布以显示' : ws,
                  onDragStart: (e) => {
                    e.dataTransfer.setData('text/mc-workspace', ws);
                    e.dataTransfer.effectAllowed = 'copy';
                  },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 7px', marginBottom: 4, borderRadius: 6,
                    background: hidden ? 'var(--dsw-alias-bg-layer-1)' : 'var(--dsw-alias-bg-layer-2)',
                    cursor: hidden ? 'grab' : 'default',
                    opacity: hidden ? 0.65 : 1,
                  },
                },
                  h('button', {
                    style: { ...S.btn, padding: '1px 5px', fontSize: 10 },
                    title: expanded ? '收起会话' : '展开会话',
                    onClick: (e) => {
                      e.stopPropagation();
                      setExpandedWs((prev) => (prev === ws ? '' : ws));
                    },
                  }, expanded ? '▾' : '▸'),
                  h('span', {
                    style: { flex: 1, minWidth: 0, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                  }, name),
                  h('span', {
                    style: { ...S.saveNote, fontSize: 10, whiteSpace: 'nowrap' },
                    title: '勾选数量 / 侧边栏当前可见会话',
                  }, `${sessionCount}/${sessionsList.length} 会话`),
                  current
                    ? h('span', { style: S.badge }, '当前')
                    : h('button', {
                      style: { ...S.btn, padding: '1px 6px', fontSize: 10 },
                      onClick: () => setWorkspaceHidden(ws, !hidden),
                    }, hidden ? '显示' : '隐藏'));
                const sessionList = expanded && sessionsList.length
                  ? h('div', { style: { margin: '0 0 7px 22px', display: 'grid', gap: 2 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 } },
                      h('button', {
                        style: { ...S.btn, padding: '1px 5px', fontSize: 10 },
                        onClick: () => saveSessionChoice({ ...sessionChoice, [ws]: sessionsList.map((s) => s.id) }),
                      }, '全选'),
                      h('button', {
                        style: { ...S.btn, padding: '1px 5px', fontSize: 10 },
                        onClick: () => saveSessionChoice({ ...sessionChoice, [ws]: [] }),
                      }, '清空'),
                      h('span', { style: { ...S.saveNote, fontSize: 10 } }, `${sessionCount}/${sessionsList.length}`)),
                    ...sessionsList.map((session) => h('div', {
                      key: session.id,
                      title: `${session.title}\n拖拽调整显示顺序`,
                      draggable: true,
                      onDragStart: (e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('text/mc-session', JSON.stringify({ ws, id: session.id }));
                        e.dataTransfer.effectAllowed = 'move';
                      },
                      onDragOver: (e) => {
                        if (e.dataTransfer?.types?.includes('text/mc-session')) e.preventDefault();
                      },
                      onDrop: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const payload = JSON.parse(e.dataTransfer.getData('text/mc-session') || '{}');
                          if (payload.ws === ws) {
                            reorderSessionChoice(ws, meta, payload.id, session.id);
                          }
                        } catch { /* ignore malformed drag */ }
                      },
                      style: {
                        ...S.saveNote, fontSize: 10, padding: '2px 4px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        borderLeft: '2px solid var(--dsw-alias-border-l1)',
                        cursor: 'grab',
                      },
                    },
                      h('input', {
                        type: 'checkbox',
                        checked: selectedIds.has(session.id),
                        onClick: (e) => e.stopPropagation(),
                        onChange: (e) => toggleSessionChoice(ws, meta, session.id, e.target.checked),
                      }),
                      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        short(session.title, 22)))))
                  : null;
                return h('div', { key: ws }, row, sessionList);
              })) : null,
          ),
          h('div', {
            style: graphMax
              ? { ...S.graphCanvas, flex: '1 1 auto', height: 'auto', minHeight: 0 }
              : S.graphCanvas,
            onDragOver: (e) => {
              if (e.dataTransfer?.types?.includes('text/mc-workspace')) e.preventDefault();
            },
            onDrop: (e) => {
              const ws = e.dataTransfer?.getData('text/mc-workspace');
              if (!ws) return;
              e.preventDefault();
              const rect = graphInnerRef.current?.getBoundingClientRect();
              if (rect) {
                const x = (e.clientX - rect.left) / graphZoom;
                const y = (e.clientY - rect.top) / graphZoom;
                setNodePos((prev) => ({ ...prev, [ws]: { x: Math.max(0, x - 110), y: Math.max(0, y - 24) } }));
              }
              setWorkspaceHidden(ws, false);
            },
            onWheel: (e) => {
              e.preventDefault();
              setGraphZoom((z) => Math.min(3, Math.max(0.5, +(z + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2))));
            },
            onPointerDown: (e) => {
              if (e.button !== 0) return;
              if (linkDraft) return;
              if (e.target.closest('[data-node]')) return;
              setPanDrag({
                startX: e.clientX, startY: e.clientY,
                origX: pan.x, origY: pan.y,
              });
            },
            onPointerMove: (e) => {
              if (nodeDrag) {
                const rect = graphInnerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = (e.clientX - rect.left) / graphZoom;
                const y = (e.clientY - rect.top) / graphZoom;
                setNodePos((prev) => ({ ...prev, [nodeDrag.id]: { x: x - nodeDrag.dx, y: y - nodeDrag.dy } }));
                suppressClick.current = true;
                return;
              }
              if (panDrag) {
                setPan({
                  x: panDrag.origX + (e.clientX - panDrag.startX),
                  y: panDrag.origY + (e.clientY - panDrag.startY),
                });
                return;
              }
              if (linkDraft) {
                const rect = graphInnerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = (e.clientX - rect.left) / graphZoom;
                const y = (e.clientY - rect.top) / graphZoom;
                const candidates = linkDraft.kind === 'brain'
                  ? graph.brainNodes.filter((b) => b.id !== linkDraft.from)
                  : graph.wsNodes;
                const target = candidates.find((n) => x >= n.nodeX && x <= n.nodeX + n.w
                  && y >= n.nodeY && y <= n.nodeY + n.h);
                const endX = target ? target.nodeX : x;
                const endY = target ? target.nodeY + target.h / 2 : y;
                setLinkDraft((d) => {
                  if (!d) return d;
                  const moved = d.moved || Math.hypot(x - (d.startX ?? x), y - (d.startY ?? y)) > 4;
                  return { ...d, x: endX, y: endY, moved, targetId: target?.id || '' };
                });
                setHoverNode(target?.id || '');
                return;
              }
              if (!drag) return;
              const rect = graphInnerRef.current?.getBoundingClientRect();
              if (!rect) return;
              setDrag((d) => d ? { ...d, x: (e.clientX - rect.left) / graphZoom, y: (e.clientY - rect.top) / graphZoom } : d);
            },
            onPointerUp: (e) => {
              setHoverNode('');
              if (linkDraft) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (linkDraft.kind === 'workspace') {
                  const targetId = el?.closest?.('[data-workspace]')?.getAttribute('data-workspace');
                  if (targetId) {
                    setDraft((prev) => {
                      const current = prev[targetId] || [];
                      return current.includes(linkDraft.from)
                        ? prev
                        : { ...prev, [targetId]: [...current, linkDraft.from] };
                    });
                    setLinkDraft(null);
                  }
                } else {
                  const targetId = el?.closest?.('[data-brain]')?.getAttribute('data-brain');
                  if (targetId && targetId !== linkDraft.from) {
                    setGroupLinkConfirm({ from: linkDraft.from, to: targetId });
                    setLinkDraft(null);
                  }
                }
                return;
              }
              if (nodeDrag) { setNodeDrag(null); return; }
              if (panDrag) { setPanDrag(null); return; }
              if (drag) {
                const rect = graphInnerRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = (e.clientX - rect.left) / graphZoom;
                  const y = (e.clientY - rect.top) / graphZoom;
                  const target = graph.wsNodes.find((w) => x >= w.nodeX && x <= w.nodeX + w.w && y >= w.nodeY && y <= w.nodeY + w.h);
                  if (target) {
                    setDraft((prev) => {
                      const current = prev[target.id] || [];
                      if (current.includes(drag.brainId)) return prev;
                      return { ...prev, [target.id]: [...current, drag.brainId] };
                    });
                  }
                }
                setDrag(null);
              }
            },
            onPointerLeave: () => {
              setPanDrag(null);
              setNodeDrag(null);
              setDrag(null);
              setHoverNode('');
            },
          },
            h('div', {
              ref: graphInnerRef,
              style: {
                position: 'relative', width: 760, height: graph.H,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${graphZoom})`,
                transformOrigin: 'top left',
              },
            },
              h('svg', { width: 760, height: graph.H, style: { position: 'absolute', inset: 0, overflow: 'visible' } },
                graph.sessionEdges.map((edge) => h('path', {
                  key: `s-${edge.key}`,
                  d: `M ${edge.from.nodeX + edge.from.w / 2} ${edge.from.nodeY + edge.from.h} L ${edge.to.nodeX + edge.to.w / 2} ${edge.to.nodeY}`,
                  fill: 'none',
                  stroke: 'var(--dsw-alias-border-l1)',
                  strokeWidth: 1.5,
                  strokeDasharray: '4 4',
                  opacity: 0.8,
                })),
                graph.brainEdges.map((edge) => h('path', {
                  key: `b-${edge.key}`,
                  d: pathBetween(edge.from, edge.to),
                  fill: 'none',
                  stroke: '#22c55e',
                  strokeWidth: 2,
                  strokeDasharray: flowGreen === edge.key ? '8 6' : undefined,
                  opacity: 0.85,
                  style: { animation: flowGreen === edge.key ? 'mcFlow .8s linear infinite' : undefined },
                  onMouseEnter: () => showCard(edge.to.id),
                  onMouseLeave: hideCard,
                })),
                graph.edges.map((edge) => {
                  const server = brains.workspaces?.[edge.to.id];
                  const current = server && server.enabled !== false
                    ? [server.activeId, ...(server.linked || [])].filter(Boolean)
                    : [];
                  const isDirty = JSON.stringify(current) !== JSON.stringify(draft[edge.to.id] || []);
                  const flowing = flowLine
                    && flowLine.brainId === edge.from.id
                    && flowLine.ws === edge.to.id;
                  return h('path', {
                    key: edge.key,
                    d: pathFor(edge.from, edge.to, edge.offset || 0),
                    fill: 'none',
                    stroke: isDirty ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-brand-primary)',
                    strokeWidth: 2.5,
                    opacity: 0.9,
                    strokeDasharray: flowing ? '8 6' : undefined,
                    style: {
                      cursor: 'grab',
                      animation: flowing ? 'mcFlow .7s linear infinite' : undefined,
                    },
                    onMouseEnter: () => {
                      showCard(edge.to.id);
                      setFlowLine({ ws: edge.to.id, brainId: edge.from.id });
                    },
                    onMouseLeave: () => {
                      hideCard();
                      setFlowLine(null);
                    },
                    onPointerDown: (e) => {
                      e.stopPropagation();
                      const rect = graphInnerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setDraft((prev) => ({
                        ...prev,
                        [edge.to.id]: (prev[edge.to.id] || []).filter((id) => id !== edge.from.id),
                      }));
                      setHoverNode('');
                      setLinkDraft({
                        kind: 'workspace',
                        from: edge.from.id,
                        x: (e.clientX - rect.left) / graphZoom,
                        y: (e.clientY - rect.top) / graphZoom,
                      });
                    },
                  });
                }),
                drag ? h('path', {
                  d: pathFor(
                    graph.brainNodes.find((b) => b.id === drag.brainId),
                    { nodeX: drag.x, nodeY: drag.y - 24, w: 0, h: 48 },
                  ),
                  fill: 'none',
                  stroke: 'var(--dsw-alias-state-warn-primary)',
                  strokeWidth: 2,
                  strokeDasharray: '5 4',
                }) : null,
                linkDraft ? (() => {
                  const source = graph.brainNodes.find((b) => b.id === linkDraft.from);
                  if (!source) return null;
                  const x1 = linkDraft.kind === 'brain' ? source.nodeX : source.nodeX + source.w;
                  const y1 = source.nodeY + source.h / 2;
                  const x2 = linkDraft.x;
                  const y2 = linkDraft.y;
                  const color = linkDraft.kind === 'brain' ? '#22c55e' : 'var(--dsw-alias-brand-primary)';
                  const d = linkDraft.kind === 'brain'
                    ? `M ${x1} ${y1} C ${Math.min(x1, x2) - 24} ${y1}, ${Math.min(x1, x2) - 24} ${y2}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
                  return h('path', {
                    d,
                    fill: 'none',
                    stroke: color,
                    strokeWidth: 2,
                    strokeDasharray: '5 4',
                  });
                })() : null),
              graph.brainNodes.map((node) => {
                const active = (draft[brains.currentWorkspace] || [])[0] === node.id;
                return h('div', {
                  key: node.id,
                  'data-brain': node.id,
                  'data-node': node.id,
                  style: {
                    ...nodeBox(node, active),
                    display: 'flex',
                    alignItems: 'center',
                    transition: nodeDrag ? 'none' : 'left .22s ease, top .22s ease, background .15s, border-color .15s',
                    zIndex: hoverCard === node.id || nodeDrag?.id === node.id || graphSelected === node.id ? 20 : 1,
                    pointerEvents: nodeDrag && nodeDrag.id !== node.id ? 'none' : 'auto',
                    ...(graphSelected === node.id ? { boxShadow: '0 0 0 3px rgba(56,132,255,.5)' } : {}),
                  },
                  onMouseEnter: () => showCard(node.id),
                  onMouseLeave: () => {
                    hideCard();
                    if (graphMenu) closeMenuSoon();
                  },
                  onPointerDown: (e) => {
                    if (e.button !== 0) return;
                    if (linkDraft) { suppressClick.current = false; return; }
                    const rect = graphInnerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const x = (e.clientX - rect.left) / graphZoom;
                    const y = (e.clientY - rect.top) / graphZoom;
                    suppressClick.current = false;
                    setNodeDrag({ id: node.id, dx: x - node.nodeX, dy: y - node.nodeY });
                  },
                  onClick: () => {
                    if (suppressClick.current) { suppressClick.current = false; return; }
                    if (linkDraft?.kind === 'brain' && linkDraft.from !== node.id) {
                      setGroupLinkConfirm({ from: linkDraft.from, to: node.id });
                      setLinkDraft(null);
                      return;
                    }
                    if (graphMax) {
                      setGraphSelected(node.id);
                      return;
                    }
                    if (connectMode) setConnectBrain(node.id);
                    else setViewBrainId(node.id);
                  },
                  onPointerUp: (e) => {
                    if (linkDraft?.kind === 'brain' && linkDraft.from !== node.id) {
                      e.stopPropagation();
                      setGroupLinkConfirm({ from: linkDraft.from, to: node.id });
                      setLinkDraft(null);
                      setHoverNode('');
                    }
                  },
                  onContextMenu: (e) => {
                    e.preventDefault();
                    if (linkDraft) {
                      setLinkDraft(null);
                      setHoverNode('');
                      return;
                    }
                    const rect = graphInnerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setGraphMenu({
                      x: (e.clientX - rect.left) / graphZoom,
                      y: (e.clientY - rect.top) / graphZoom,
                      id: node.id,
                      name: node.name,
                      path: node.root,
                      kind: 'brain',
                    });
                  },
                },
                  h('div', { style: { fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, short(node.name, 22)),
                  h('div', {
                    style: S.portLeft,
                    title: '左键：连大脑；右键：取消',
                    onPointerDown: (e) => {
                      e.stopPropagation();
                      if (linkDraft) return;
                      const rect = graphInnerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setDrag(null);
                      setHoverNode('');
                      setHoverAction('');
                      setNodeDeleteConfirm('');
                      const x = (e.clientX - rect.left) / graphZoom;
                      const y = (e.clientY - rect.top) / graphZoom;
                      setLinkDraft({
                        kind: 'brain',
                        from: node.id,
                        x, y, startX: x, startY: y, moved: false,
                      });
                    },
                    onClick: (e) => e.stopPropagation(),
                  }, h('div', {
                    style: ((linkDraft?.kind === 'brain'
                      && (linkDraft.from === node.id || hoverNode === node.id)))
                      ? { ...S.portDotGreen, animation: 'mcRipple 1.4s ease-out infinite' }
                      : S.portDot,
                  })),
                  h('div', {
                    style: S.port,
                    title: '左键：连工作区；右键：取消',
                    onPointerDown: (e) => {
                      e.stopPropagation();
                      if (linkDraft) return;
                      const rect = graphInnerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setDrag(null);
                      setHoverNode('');
                      setHoverAction('');
                      setNodeDeleteConfirm('');
                      setLinkDraft({
                        kind: 'workspace',
                        from: node.id,
                        x: (e.clientX - rect.left) / graphZoom,
                        y: (e.clientY - rect.top) / graphZoom,
                      });
                    },
                    onClick: (e) => e.stopPropagation(),
                  }, h('div', {
                    style: (linkDraft?.kind === 'workspace' && linkDraft.from === node.id)
                      ? { ...S.portDot, animation: 'mcRipple 1.4s ease-out infinite' }
                      : S.portDot,
                  })),
                  h('div', {
                    style: {
                      ...S.nodeAction,
                      ...S.nodeActionLeft,
                      opacity: hoverCard === node.id && !linkDraft && !nodeDrag ? 1 : 0,
                      transform: hoverCard === node.id && !linkDraft && !nodeDrag ? 'translateX(0)' : 'translateX(-6px)',
                      pointerEvents: hoverCard === node.id && !linkDraft && !nodeDrag ? 'auto' : 'none',
                    },
                    onMouseEnter: () => {
                      showCard(node.id);
                      setHoverAction(`${node.id}:left`);
                    },
                    onMouseLeave: () => {
                      hideCard();
                      setHoverAction('');
                    },
                    onPointerDown: (e) => e.stopPropagation(),
                    onClick: async (e) => {
                      e.stopPropagation();
                      if (nodeDeleteConfirm !== node.id) {
                        setNodeDeleteConfirm(node.id);
                        showToast('再次点击删除节点以确认');
                        return;
                      }
                      try {
                        await postBrain({ action: 'remove', id: node.id, deleteData: false });
                        setNodeDeleteConfirm('');
                        showToast('大脑已删除，记忆数据保留');
                      } catch (err) { setBrainMsg(`删除失败：${err.message}`); }
                    },
                  },
                  hoverAction === `${node.id}:left` && !linkDraft
                    ? h('div', { style: S.nodeActionTip },
                      nodeDeleteConfirm === node.id ? '再次点击确认删除' : '删除节点')
                    : null,
                  nodeDeleteConfirm === node.id
                    ? h('svg', {
                      width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
                      stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round',
                    }, h('path', { d: 'M20 6L9 17l-5-5' }))
                    : h('svg', {
                      width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
                      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
                    },
                    h('path', { d: 'M3 6h18' }),
                    h('path', { d: 'M8 6V4h8v2' }),
                    h('path', { d: 'M6 6l1 14h10l1-14' }),
                    h('path', { d: 'M10 11v6M14 11v6' }))),
                  h('div', {
                    style: {
                      ...S.nodeAction,
                      ...S.nodeActionRight,
                      opacity: hoverCard === node.id && !linkDraft && !nodeDrag ? 1 : 0,
                      transform: hoverCard === node.id && !linkDraft && !nodeDrag ? 'translateX(0)' : 'translateX(6px)',
                      pointerEvents: hoverCard === node.id && !linkDraft && !nodeDrag ? 'auto' : 'none',
                    },
                    onMouseEnter: () => {
                      showCard(node.id);
                      setHoverAction(`${node.id}:right`);
                    },
                    onMouseLeave: () => {
                      hideCard();
                      setHoverAction('');
                    },
                    onPointerDown: (e) => {
                      e.stopPropagation();
                      if (linkDraft) return;
                      setHoverAction('');
                      setNodeDeleteConfirm('');
                      const rect = graphInnerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setLinkDraft({
                        kind: 'workspace',
                        from: node.id,
                        x: (e.clientX - rect.left) / graphZoom,
                        y: (e.clientY - rect.top) / graphZoom,
                      });
                    },
                    onClick: (e) => e.stopPropagation(),
                  },
                  hoverAction === `${node.id}:right` && !linkDraft
                    ? h('div', { style: S.nodeActionTip }, '连接到工作区')
                    : null,
                  h('svg', {
                    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
                    stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round',
                  }, h('path', { d: 'M12 5v14M5 12h14' }))));
              }),
              graph.wsNodes.map((node) => {
                const active = brains.currentWorkspace === node.id;
                const linkedCount = (draft[node.id] || []).length;
                return h('div', {
                  key: node.id,
                  title: '大脑数来自记忆连接；会话数来自 DSH workspace registry，包含历史/归档',
                  'data-workspace': node.id,
                  'data-node': node.id,
                  style: {
                    ...nodeBox(node, active),
                    zIndex: hoverCard === node.id || nodeDrag?.id === node.id ? 20 : 1,
                    transition: nodeDrag ? 'none' : 'left .22s ease, top .22s ease',
                    pointerEvents: nodeDrag && nodeDrag.id !== node.id ? 'none' : 'auto',
                  },
                  onMouseEnter: () => showCard(node.id),
                  onMouseLeave: () => {
                    hideCard();
                    if (graphMenu) closeMenuSoon();
                  },
                  onPointerDown: (e) => {
                    if (e.button !== 0) return;
                    if (linkDraft) { suppressClick.current = false; return; }
                    const rect = graphInnerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const x = (e.clientX - rect.left) / graphZoom;
                    const y = (e.clientY - rect.top) / graphZoom;
                    suppressClick.current = false;
                    setNodeDrag({ id: node.id, dx: x - node.nodeX, dy: y - node.nodeY });
                  },
                  onClick: () => {
                    if (suppressClick.current) { suppressClick.current = false; return; }
                    if (linkDraft?.kind === 'workspace' && linkDraft.from) {
                      setDraft((prev) => {
                        const current = prev[node.id] || [];
                        return current.includes(linkDraft.from)
                          ? prev
                          : { ...prev, [node.id]: [...current, linkDraft.from] };
                      });
                      setLinkDraft(null);
                      return;
                    }
                    if (connectMode && connectBrain) {
                      setDraft((prev) => {
                        const current = prev[node.id] || [];
                        return current.includes(connectBrain)
                          ? prev
                          : { ...prev, [node.id]: [...current, connectBrain] };
                      });
                      setConnectBrain('');
                      setConnectMode(false);
                    }
                  },
                  onPointerUp: (e) => {
                    if (linkDraft?.kind === 'workspace' && linkDraft.from) {
                      e.stopPropagation();
                      setDraft((prev) => {
                        const current = prev[node.id] || [];
                        return current.includes(linkDraft.from)
                          ? prev
                          : { ...prev, [node.id]: [...current, linkDraft.from] };
                      });
                      setLinkDraft(null);
                      setHoverNode('');
                    }
                  },
                  onContextMenu: (e) => {
                    if (linkDraft) {
                      e.preventDefault();
                      setLinkDraft(null);
                      setHoverNode('');
                      return;
                    }
                    e.preventDefault();
                    const rect = graphInnerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setGraphMenu({
                      x: (e.clientX - rect.left) / graphZoom,
                      y: (e.clientY - rect.top) / graphZoom,
                      id: node.id,
                      name: node.name,
                      path: node.sub,
                      kind: 'workspace',
                    });
                  },
                },
                  h('div', { style: { fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, short(node.name, 24)),
                  h('div', { style: { fontSize: 10, opacity: 0.8 } },
                    linkedCount
                      ? `${linkedCount} 个已连接大脑${node.sessionTotal ? ` · ${node.sessionCount}/${node.sessionTotal} 会话` : ''}`
                      : '未连接 · 插件不激活'),
                  h('div', { style: S.portLeft, title: '连接目标' },
                    h('div', {
                      style: (linkDraft?.kind === 'workspace' && hoverNode === node.id)
                        ? { ...S.portDot, animation: 'mcRipple 1.4s ease-out infinite' }
                        : S.portDot,
                    }))
                );
              }),
              graph.sessionNodes.map((node) => h('div', {
                key: node.id,
                title: node.sub,
                style: {
                  position: 'absolute',
                  left: node.nodeX,
                  top: node.nodeY,
                  width: node.w,
                  height: node.h,
                  boxSizing: 'border-box',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: graphDark ? '#2a2c34' : '#ffffff',
                  border: '1px dashed var(--dsw-alias-border-l1)',
                  color: graphDark ? '#d8d8dc' : 'var(--dsw-alias-label-secondary)',
                  fontSize: 11,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  zIndex: 1,
                },
              }, short(node.name, 26))),
              graph.wsNodes.flatMap((node) => {
                const ids = draft[node.id] || [];
                const related = hoverCard === node.id || ids.includes(hoverCard);
                if (!related || linkDraft || nodeDrag) return [];
                return ids.map((brainId) => {
                  const edge = graph.edges.find((e) => e.to.id === node.id && e.from.id === brainId);
                  const offset = Number(edge?.offset) || 0;
                  return h('div', {
                  key: `break-${node.id}-${brainId}`,
                  title: '断开连接',
                  style: {
                    position: 'absolute',
                    left: node.nodeX - 14,
                    top: node.nodeY + node.h / 2 + offset - 4,
                    width: 8,
                    height: 8,
                    boxSizing: 'border-box',
                    borderRadius: 999,
                    background: 'var(--dsw-alias-state-warn-primary)',
                    border: '1px solid #fff',
                    cursor: 'grab',
                    zIndex: 5,
                    animation: 'mcPop .18s ease-out, mcBlink 1.4s ease-in-out .35s infinite',
                    boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                  },
                  onMouseEnter: () => {
                    showCard(node.id);
                    setFlowLine({ ws: node.id, brainId });
                  },
                  onMouseLeave: () => {
                    hideCard();
                    setFlowLine(null);
                  },
                  onPointerDown: (e) => {
                    e.stopPropagation();
                    const rect = graphInnerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setDraft((prev) => ({
                      ...prev,
                      [node.id]: (prev[node.id] || []).filter((id) => id !== brainId),
                    }));
                    setHoverNode('');
                    showToast('已断开一条连接，保存后生效');
                    setLinkDraft({
                      kind: 'workspace',
                      from: brainId,
                      x: (e.clientX - rect.left) / graphZoom,
                      y: (e.clientY - rect.top) / graphZoom,
                    });
                  },
                });
              });
              }),
              [...graph.brainNodes, ...graph.wsNodes].map((node) => (hoverCard === node.id && !nodeDrag ? h('div', {
                key: `path-${node.kind}-${node.id}`,
                title: node.root || node.sub,
                style: {
                  ...S.pathPopup,
                  left: node.nodeX,
                  top: node.nodeY + node.h + 6,
                  width: node.w,
                },
              }, pathText(node.root || node.sub, { width: '100%' })) : null)),
              graph.brainEdges.flatMap((edge) => [edge.from, edge.to].map((node) => {
                const cardHover = hoverCard === node.id;
                if (linkDraft || nodeDrag || !cardHover) return null;
                return h('div', {
                  key: `gcut-${edge.key}-${node.id}`,
                  title: '断开连接',
                  style: {
                    position: 'absolute',
                    left: node.nodeX - 28,
                    top: node.nodeY + node.h / 2 - 27,
                    width: 10,
                    height: 10,
                    boxSizing: 'border-box',
                    borderRadius: 999,
                    background: '#ef4444',
                    border: '1px solid #fff',
                    zIndex: 8,
                    cursor: 'pointer',
                    animation: 'mcPop .18s ease-out .12s both, mcBlink 1.4s ease-in-out .5s infinite',
                    boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                  },
                  onMouseEnter: () => {
                    showCard(node.id);
                    setFlowGreen(edge.key);
                  },
                  onMouseLeave: () => {
                    hideCard();
                    setFlowGreen('');
                  },
                  onPointerDown: (e) => e.stopPropagation(),
                  onClick: () => setGroupUnlinkConfirm({
                    groupId: edge.groupId,
                    brainId: edge.memberId,
                    name: brainName(edge.memberId),
                  }),
                });
              })),
              linkDraft && !linkDraft.targetId ? h('div', {
                style: {
                  position: 'absolute',
                  left: linkDraft.x - 6,
                  top: linkDraft.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: linkDraft.kind === 'brain' ? '#22c55e' : 'var(--dsw-alias-brand-primary)',
                  border: '2px solid #fff',
                  zIndex: 6,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,.25)',
                },
                title: '点击取消这条线',
                onPointerDown: (e) => e.stopPropagation(),
                onClick: () => setLinkDraft(null),
                onContextMenu: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLinkDraft(null);
                },
              }) : null,
              graphMenu ? h('div', {
                style: {
                  ...S.graphMenu,
                  left: Math.min(graphMenu.x + 8, 760 - 150),
                  top: Math.min(graphMenu.y, graph.H - 180),
                  zIndex: 30,
                },
                onMouseEnter: keepMenuOpen,
                onMouseLeave: closeMenuSoon,
              },
                h('div', { style: S.graphMenuTitle }, short(graphMenu.name, 20)),
                h('button', {
                  style: S.graphMenuItem,
                  onClick: () => {
                    copyPath(graphMenu.path);
                    setGraphMenu(null);
                  },
                }, '复制路径'),
                graphMenu.kind === 'brain' ? h('button', {
                  style: S.graphMenuItem,
                  onClick: () => {
                    setLinkDraft({ kind: 'workspace', from: graphMenu.id, x: 0, y: 0 });
                    setGraphMenu(null);
                  },
                }, '建立连接') : null,
                graphMenu.kind === 'brain' ? h('button', {
                  style: S.graphMenuItem,
                  onClick: () => {
                    setLinkDraft({
                      kind: 'brain', from: graphMenu.id,
                      x: 0, y: 0, startX: 0, startY: 0, moved: false,
                    });
                    setGraphMenu(null);
                  },
                }, '整合超级大脑') : null,
                graphMenu.kind === 'brain' ? h('button', {
                  style: S.graphMenuItem,
                  onClick: () => {
                    setGraphConfirm({ type: 'copy', id: graphMenu.id, name: graphMenu.name });
                    setGraphMenu(null);
                  },
                }, '复制数据') : null,
                graphMenu.kind === 'brain' ? h('button', {
                  style: S.graphMenuItem,
                  onClick: () => {
                    setDeleteBrainData(false);
                    setGraphConfirm({ type: 'delete', id: graphMenu.id, name: graphMenu.name });
                    setGraphMenu(null);
                  },
                }, '删除') : null
              ) : null),
            h('button', {
              style: { ...S.btn, ...S.btnPrimary, position: 'absolute', right: 10, bottom: 10 },
              disabled: dirtyChanges.length === 0,
              onClick: () => setGraphConfirm({ type: 'save' }),
            }, dirtyChanges.length ? `保存（${dirtyChanges.length}）` : '保存')),
          h('div', { style: { ...S.saveNote, color: graphDark ? '#a9abb3' : undefined } },
            linkDraft
              ? (linkDraft.kind === 'brain'
                ? '绿色线：点另一个大脑完成整合；右键取消。'
                : '点右侧工作区完成连接；右键取消。')
              : '左键点端口出线，右键取消；左端口连大脑（绿线），右端口连工作区；红点断开单条。'),
          graphConfirm ? h('div', { style: S.confirm },
            h('div', null,
              graphConfirm.type === 'save'
                ? `保存 ${dirtyChanges.length} 项连接变更？确认后写入 brains.json。`
                : graphConfirm.type === 'copy'
                  ? `复制「${graphConfirm.name}」的数据？会在同目录生成独立副本，占用额外磁盘；完成后出现新的大脑。`
                  : `删除「${graphConfirm.name}」？只删注册，数据可以保留。`),
            graphConfirm.type === 'save' ? h('div', { style: S.rowMeta },
              dirtyChanges.map((c) => h('div', { key: c.ws },
                `${String(c.ws).split(/[\\/]/).filter(Boolean).pop()}：${c.from} → ${c.to}`))) : null,
            graphConfirm.type === 'delete' ? h('label', { style: S.field },
              h('input', {
                type: 'checkbox',
                checked: deleteBrainData,
                onChange: (e) => setDeleteBrainData(e.target.checked),
              }),
              '同时删除记忆数据（不可恢复）') : null,
            h('div', { style: S.rowInline },
              h('button', { style: S.btn, onClick: () => { setGraphConfirm(null); setDeleteBrainData(false); } }, '取消'),
              h('button', {
                style: { ...S.btn, ...S.btnPrimary },
                onClick: async () => {
                  try {
                    if (graphConfirm.type === 'save') {
                      await postBrain({ action: 'save', workspaces: draft });
                      showToast('连接方案已保存');
                    } else if (graphConfirm.type === 'copy') {
                      await postBrain({ action: 'copy', id: graphConfirm.id });
                    } else {
                      await postBrain({ action: 'remove', id: graphConfirm.id, deleteData: deleteBrainData });
                    }
                    setGraphConfirm(null);
                    setDeleteBrainData(false);
                  } catch (err) { setBrainMsg(`操作失败：${err.message}`); }
                },
              }, graphConfirm.type === 'save'
                ? '确认保存'
                : graphConfirm.type === 'copy'
                  ? '确认复制'
                  : '确认删除')))
            : null);
      }

      if (state.loading) return h('div', { style: S.page }, '正在读取本地记忆索引…');
      if (state.error) {
        return h('div', { style: S.page },
          h('h2', { style: S.title }, '记忆日历',
            h('span', { style: { marginLeft: 6, fontSize: 10, fontWeight: 400, opacity: 0.55, verticalAlign: 'middle' } }, 'Beta 2.0')),
          h('p', { style: S.error }, `读取失败：${state.error}`),
          h('p', { style: S.note }, '确认 dsh-memory-calendar 插件已启用，并且原型索引已经生成。'));
      }

      return h('div', { style: S.page },
        toast ? h('div', { style: S.toastWrap }, h('div', { style: S.toast }, toast)) : null,
        pathMenu ? h('div', {
          style: {
            ...S.graphMenu,
            position: 'fixed',
            left: Math.min(pathMenu.x + 8, window.innerWidth - 170),
            top: Math.min(pathMenu.y, window.innerHeight - 90),
            zIndex: 10003,
          },
          onMouseLeave: () => setPathMenu(null),
        }, h('button', {
          style: S.graphMenuItem,
          onClick: () => {
            copyPath(pathMenu.path);
            setPathMenu(null);
          },
        }, '复制路径')) : null,
        h('div', { style: S.header }, h('h2', { style: S.title }, '记忆日历',
          h('span', { style: { marginLeft: 6, fontSize: 10, fontWeight: 400, opacity: 0.55, verticalAlign: 'middle' } }, 'Beta 2.0'))),
        h('div', { style: S.stats },
          h('div', { style: S.card }, h('div', { style: S.num }, data.packages), h('div', { style: S.label }, '文本包')),
          h('div', { style: S.card }, h('div', { style: S.num }, data.episodes), h('div', { style: S.label }, 'episode')),
          h('div', { style: S.card }, h('div', { style: S.num }, (data.tags || []).length), h('div', { style: S.label }, '子标签'))),
        h('div', { style: { ...S.saveNote, marginTop: -8, marginBottom: 14 } },
          '文本包只含对话文本；原始归档（完整保存）是 Beta 3.0 目标。'),
        h('div', { style: S.panel },
          h('h3', { style: S.sectionTitle }, '通知'),
          h('div', { style: S.saveNote }, '检查点成功时，在屏幕顶部居中显示提示，约 10 秒后消失。'),
          h('div', { style: S.saveNote }, '提示只在本应用内显示，不进入 Windows 通知中心；DSH 窗口最小化时可能看不到。'),
          h('div', { style: S.saveNote }, '检查点失败不会显示成功提示。通知目前没有可调开关，也没有系统通知选项。'),
          h('div', { style: S.saveNote }, '记忆范围在图谱中设置：连一个大脑 = 独立；连多个 = 共享；一个都不连 = 插件不激活。')),
        brains ? h('div', { style: S.panel },
          h('div', { style: { ...S.rowInline, justifyContent: 'space-between', marginBottom: 6 } },
            h('h3', { style: { ...S.sectionTitle, margin: 0 } }, '大脑'),
            h('div', { style: S.rowInline },
              h('button', {
                style: graphView ? S.btn : { ...S.btn, ...S.btnPrimary },
                onClick: () => setGraphView(false),
              }, '列表'),
              h('button', {
                style: graphView ? { ...S.btn, ...S.btnPrimary } : S.btn,
                onClick: () => setGraphView(true),
              }, '图谱'))),
          h('div', {
            style: {
              marginTop: 2,
              marginBottom: 4,
            },
          },
            pathText(`当前工作区：${shortPath(brains.currentWorkspace)}`, { ...S.saveNote, ...S.pathLine, width: '100%' }, false, brains.currentWorkspace)),
          usage ? h('div', {
            style: { ...S.saveNote, marginBottom: 8 },
            title: Object.entries(usage.byTool || {})
              .map(([name, value]) => `${name}: ${value.calls} 次 / ${value.tokens} tokens`)
              .join('\n'),
          }, `插件调用 ${usage.totalCalls} 次 · 结果约 ${
            usage.resultTokens >= 1000
              ? `${(usage.resultTokens / 1000).toFixed(1)}k`
              : usage.resultTokens
          } tokens（估算，本次运行）`) : null,
          h('label', { style: { ...S.field, marginBottom: 8 } },
            h('input', {
              type: 'checkbox',
              checked: currentWorkspaceEntry?.private === true,
              onChange: async (e) => {
                try {
                  await postBrain({
                    action: 'workspace-private',
                    workspace: brains.currentWorkspace,
                    private: e.target.checked,
                  });
                } catch (err) { setBrainMsg(`切换私密失败：${err.message}`); }
              },
            }),
            '关闭本工作区记忆（不新增 / 不检索）'),
          currentWorkspaceEntry?.private === true
            ? h('div', { style: S.rowMeta }, '已有包仍在本地磁盘，不会被删除；只是不新增、不检索。')
            : null,
          graphView ? renderGraph() : (brains.summaries || []).map((b) => h('div', { key: b.id },
            h('div', { style: S.brainRow },
            h('span', { style: S.brainName }, b.name),
            b.active ? h('span', { style: S.badge }, '当前') : null,
            b.linked ? h('span', { style: S.badge }, '已连接·只读') : null,
            b.readOnly && !b.active && !b.linked ? h('span', { style: S.badge }, '只读') : null,
            (b.usedBy || []).length > 1 ? h('span', { style: S.badge }, `${b.usedBy.length} 个工作区`) : null,
            pathText(shortPath(b.root), S.brainPath, false, b.root),
            h('span', { style: S.badge }, `${b.packages} 包`),
            h('div', {
              style: {
                display: 'flex',
                gap: 8,
                flexBasis: '100%',
                flexShrink: 0,
                flexWrap: 'nowrap',
                alignItems: 'center',
              },
            },
            renameBrain?.id === b.id
              ? h(React.Fragment, null,
                h('input', {
                  style: { ...S.input, width: 160 },
                  value: renameBrain.name,
                  onChange: (e) => setRenameBrain({ ...renameBrain, name: e.target.value }),
                }),
                h('button', {
                  style: S.btn,
                  onClick: async () => {
                    try {
                      await postBrain({ action: 'rename', id: b.id, name: renameBrain.name });
                      setRenameBrain(null);
                    } catch (err) { setBrainMsg(`重命名失败：${err.message}`); }
                  },
                }, '保存'),
                h('button', { style: S.btn, onClick: () => setRenameBrain(null) }, '取消'))
              : h(React.Fragment, null,
                h('button', { style: S.btn, onClick: () => setRenameBrain({ id: b.id, name: b.name }) }, '重命名'),
                h('button', {
                  style: S.btn,
                  onClick: () => {
                    setDeleteBrainData(false);
                    setConfirmBrain({ action: 'remove', id: b.id, name: b.name });
                  },
                }, '删除')))))),
          (brains.groups || []).length ? h('div', null,
            h('div', { style: S.divider }),
            h('h3', { style: S.sectionTitle }, '超级大脑组'),
            (brains.groups || []).map((g) => {
              const primary = (brains.summaries || []).find((b) => b.id === g.primary);
              return h('div', {
                key: g.id,
                style: { ...S.brainRow, flexDirection: 'column', alignItems: 'stretch', gap: 4 },
              },
                h('div', { style: S.rowInline },
                  h('span', { style: S.brainName }, primary?.name || g.name),
                  h('span', { style: S.badge }, '路径合并'),
                  h('span', { style: S.badge }, '只读合集'),
                  h('span', {
                    style: { ...S.badge, cursor: 'help' },
                    title: '组名随主脑：主脑改名或换主脑后，组名自动更新。',
                  }, '组名随主脑'),
                  h('button', {
                    style: S.btn,
                    onClick: () => setConfirmBrain({ action: 'group-remove', id: g.id, name: primary?.name || g.name }),
                  }, '删除组')),
                h('div', { style: S.rowMeta }, '已合并路径：'),
                g.members.map((id) => {
                  const b = (brains.summaries || []).find((x) => x.id === id);
                  return h('div', { key: id },
                    pathText(`${b?.name || id} — ${shortPath(b?.root)}`, { ...S.rowMeta, ...S.pathLine, width: '100%' }, false, b?.root));
                }));
            }))
            : null,
          h('div', { style: S.rowInline },
            h('input', {
              style: S.input,
              placeholder: '新大脑名字',
              value: newBrain.name,
              onChange: (e) => setNewBrain({ ...newBrain, name: e.target.value }),
            }),
            h('input', {
              style: { ...S.input, flex: '1 1 240px' },
              placeholder: '现有 .memory-calendar 路径',
              value: newBrain.root,
              onChange: (e) => setNewBrain({ ...newBrain, root: e.target.value }),
            }),
            h('button', {
              style: S.btn,
              onClick: () => setConfirmBrain({
                action: 'add',
                name: newBrain.name || '新大脑',
                root: newBrain.root,
              }),
            }, '添加')),
          confirmBrain ? h('div', { style: S.confirm },
            h('div', { style: S.pathLine, title: confirmBrain.root || '' }, confirmBrain.action === 'add'
              ? `添加大脑「${confirmBrain.name}」？路径：${confirmBrain.root}；只注册，不复制数据。`
              : confirmBrain.action === 'group-remove'
                ? `删除组「${confirmBrain.name}」？只删组，不删成员大脑和数据。`
                : `删除「${confirmBrain.name}」？只删除注册，数据可以保留；删除后本工作区会自动换一个大脑。`),
            confirmBrain.action === 'remove' ? h('label', { style: S.field },
              h('input', {
                type: 'checkbox',
                checked: deleteBrainData,
                onChange: (e) => setDeleteBrainData(e.target.checked),
              }),
              '同时删除记忆数据（不可恢复）') : null,
            h('div', { style: S.rowInline },
              h('button', { style: S.btn, onClick: () => setConfirmBrain(null) }, '取消'),
              h('button', {
                style: { ...S.btn, ...S.btnPrimary },
                onClick: async () => {
                  try {
                    const payload = { action: confirmBrain.action, id: confirmBrain.id };
                    if (confirmBrain.action === 'remove') payload.deleteData = deleteBrainData;
                    if (confirmBrain.action === 'add') {
                      payload.name = confirmBrain.name;
                      payload.root = confirmBrain.root;
                    }
                    await postBrain(payload);
                    if (confirmBrain.action === 'add') setNewBrain({ name: '', root: '' });
                    setConfirmBrain(null);
                  } catch (err) { setBrainMsg(`操作失败：${err.message}`); }
                },
              }, confirmBrain.action === 'add'
                ? '确认添加'
                : confirmBrain.action === 'group-remove' ? '确认删除组' : '确认删除')))
            : null,
          groupUnlinkConfirm ? h('div', { style: S.modalBackdrop },
            h('div', { style: S.modalCard },
              h('div', null, `是否断开「${groupUnlinkConfirm.name}」的绿色连接？`),
              h('div', { style: S.rowMeta }, '断开后它会退出超级大脑组；组成员少于 2 个时组会自动解散。'),
              h('div', { style: S.rowInline },
                h('button', { style: S.btn, onClick: () => setGroupUnlinkConfirm(null) }, '取消'),
                h('button', {
                  style: { ...S.btn, ...S.btnPrimary },
                  onClick: async () => {
                    try {
                      await postBrain({
                        action: 'group-unlink',
                        id: groupUnlinkConfirm.groupId,
                        brainId: groupUnlinkConfirm.brainId,
                      });
                      setGroupUnlinkConfirm(null);
                      showToast('已断开绿色大脑连接');
                    } catch (err) { setBrainMsg(`断开失败：${err.message}`); }
                  },
                }, '确认断开'))))
            : null,
          groupLinkConfirm ? h('div', { style: S.modalBackdrop },
            h('div', { style: S.modalCard },
            h('div', null, '是否建立大脑连接？'),
            h('div', { style: S.rowMeta }, `从「${brainName(groupLinkConfirm.from)}」连接到：`),
            h('div', { style: S.rowInline },
              h('label', { style: S.field }, '目标大脑',
                h('select', {
                  style: S.select,
                  value: groupLinkConfirm.to || '',
                  onChange: (e) => setGroupLinkConfirm({ ...groupLinkConfirm, to: e.target.value }),
                }, (brains.summaries || [])
                  .filter((b) => b.id !== groupLinkConfirm.from)
                  .map((b) => h('option', { key: b.id, value: b.id }, b.name))))),
            h('div', { style: S.rowMeta }, '下一步进入整合设置；「创建」才是最终二次确认。两个大脑仍独立存储，不复制文件。'),
            h('div', { style: S.rowInline },
              h('button', { style: S.btn, onClick: () => setGroupLinkConfirm(null) }, '取消'),
              h('button', {
                style: { ...S.btn, ...S.btnPrimary },
                disabled: !groupLinkConfirm.to,
                onClick: () => {
                  setGroupDraft({
                    name: '超级大脑',
                    members: [groupLinkConfirm.from, groupLinkConfirm.to],
                    primary: groupLinkConfirm.from,
                  });
                  setGroupLinkConfirm(null);
                },
              }, '下一步'))))
            : null,
          groupDraft ? h('div', { style: S.modalBackdrop },
            h('div', { style: S.modalCard },
            h('div', null, '整合超级大脑（路径合并）：不复制文件，只把多个大脑作为只读合集；选一个主脑负责写入。'),
            h('div', { style: S.rowInline },
              h('input', {
                style: S.input,
                placeholder: '超级大脑名字',
                value: groupDraft.name,
                onChange: (e) => setGroupDraft({ ...groupDraft, name: e.target.value }),
              }),
              h('label', { style: S.field }, '主脑',
                h('select', {
                  style: S.select,
                  value: groupDraft.primary,
                  onChange: (e) => setGroupDraft({ ...groupDraft, primary: e.target.value }),
                }, groupDraft.members.map((id) => {
                  const b = (brains.summaries || []).find((x) => x.id === id);
                  return h('option', { key: id, value: id }, b ? b.name : id);
                })))),
            h('div', { style: S.rowInline },
              (brains.summaries || []).map((b) => h('label', { key: b.id, style: S.field },
                h('input', {
                  type: 'checkbox',
                  checked: groupDraft.members.includes(b.id),
                  onChange: (e) => {
                    const set = new Set(groupDraft.members);
                    if (e.target.checked) set.add(b.id); else set.delete(b.id);
                    const members = [...set];
                    setGroupDraft({
                      ...groupDraft,
                      members,
                      primary: members.includes(groupDraft.primary) ? groupDraft.primary : members[0],
                    });
                  },
                }),
                b.name))),
            h('div', { style: S.saveNote }, `已选 ${groupDraft.members.length} 个；至少 2 个。`),
            h('div', { style: S.rowInline },
              h('button', { style: S.btn, onClick: () => setGroupDraft(null) }, '取消'),
              h('button', {
                style: { ...S.btn, ...S.btnPrimary },
                disabled: groupDraft.members.length < 2,
                onClick: async () => {
                  try {
                    await postBrain({
                      action: 'group-create',
                      name: groupDraft.name,
                      members: groupDraft.members,
                      primary: groupDraft.primary,
                    });
                    setGroupDraft(null);
                  } catch (err) { setBrainMsg(`创建失败：${err.message}`); }
                },
              }, '创建'))))
            : null,
          h('div', { style: S.saveNote }, brainMsg || '大脑只在设置里调整；连接是显式动作，不会自动发生。'))
          : null,
        h('div', { style: S.columns },
          h('div', { style: S.col },
            h('h3', {
              style: { ...S.sectionTitle, cursor: 'pointer', userSelect: 'none' },
              onClick: () => setTagsOpen((v) => !v),
              title: tagsOpen ? '收起子标签' : '展开子标签',
            }, `子标签 ${tagsOpen ? '▾' : '▸'} ${tagQuery ? `${filteredTags.length}/${(data.tags || []).length}` : (data.tags || []).length}`),
            tagsOpen ? h('input', {
              type: 'search',
              value: tagSearch,
              onChange: (e) => setTagSearch(e.target.value),
              placeholder: '搜索子标签…',
              style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 },
            }) : null,
            selectedTag ? h('div', { style: S.rowMeta },
              h('span', {
                style: { ...S.tag, ...S.tagActive },
                onClick: () => setSelectedTag(''),
                title: '点击取消筛选',
              }, `${selectedTag} ×`)) : null,
            tagsOpen
              ? (filteredTags.length
                ? filteredTags.slice(0, 80).map((t) => h('span', {
                  key: t.tag,
                  style: t.tag === selectedTag ? { ...S.tag, ...S.tagActive } : S.tag,
                  onClick: () => setSelectedTag((cur) => (cur === t.tag ? '' : t.tag)),
                  title: `出现 ${t.count} 次`,
                }, `${t.tag} ${t.count}`))
                : h('div', { style: S.rowMeta }, '没有匹配的子标签。'))
              : h('div', { style: S.rowMeta }, '已收起；点标题展开。')),
          h('div', { style: S.col },
            h('div', { style: { ...S.rowInline, justifyContent: 'space-between' } },
              h('h3', {
                style: { ...S.sectionTitle, margin: 0, cursor: 'pointer', userSelect: 'none' },
                onClick: () => setPackagesOpen((v) => !v),
                title: packagesOpen ? '收起最近的包' : '展开最近的包',
              }, `${selectedTag ? `包含「${selectedTag}」的包` : (month || day ? '筛选结果' : '最近的包')} ${packagesOpen ? '▾' : '▸'}`),
              h('div', { style: { ...S.rowInline, marginBottom: 0 } },
                packagesOpen ? h(React.Fragment, null,
                  h('label', { style: S.field }, '月',
                    h('select', {
                      value: month,
                      onChange: (e) => { setMonth(e.target.value); setDay(''); },
                      style: S.select,
                    }, [h('option', { key: '', value: '' }, '全部月份'),
                      ...months.map((m) => h('option', { key: m, value: m }, m))])),
                  h('label', { style: S.field }, '日',
                    h('select', {
                      value: day,
                      onChange: (e) => setDay(e.target.value),
                      style: S.select,
                    }, [h('option', { key: '', value: '' }, '全部日期'),
                      ...days.map((d) => h('option', { key: d, value: d }, d))]))) : null,
                h('span', { style: S.saveNote }, `${filtered.length} 个包`))),
            packagesOpen ? h('input', {
              type: 'search',
              value: pkgSearch,
              onChange: (e) => setPkgSearch(e.target.value),
              placeholder: '搜索包标题 / 标签 / ID / 日期…',
              style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 },
            }) : null,
            packagesOpen ? h(React.Fragment, null,
              filtered.length === 0 ? h('div', { style: S.rowMeta }, '没有匹配的包。') : null,
              filtered.map((p) => {
                const tags = selectedTag && (p.filterTags || []).includes(selectedTag) && !(p.tags || []).includes(selectedTag)
                  ? [selectedTag, ...(p.tags || [])]
                  : (p.tags || []);
                const shownTags = tags.slice(0, 5);
                const extraTags = tags.length - shownTags.length;
                const id = String(p.id || '');
                const shortId = id.length > 28 ? `${id.slice(0, 28)}…` : id;
                const rawTitle = String(p.bigTag || id);
                const displayTitle = rawTitle.replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+/, '') || rawTitle;
                return h('div', { key: id, style: S.row },
                  h('div', { style: S.rowTitle, title: rawTitle }, displayTitle),
                  h('div', {
                    style: { ...S.rowMeta, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                    title: id,
                  }, `${p.date || ''} · ${p.messageCount || 0} 条消息 · ${shortId}`),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 }, title: tags.join('、') },
                    shownTags.map((t) => h('span', { key: t, style: S.tag }, t)),
                    extraTags > 0 ? h('span', { style: { ...S.tag, cursor: 'default' }, title: tags.join('、') }, `+${extraTags}`) : null));
              }))
              : h('div', { style: S.rowMeta }, '已收起；点标题展开。')),
        h('p', { style: S.note },
          '这里只展示索引；原文用 memory_read / memory_expand 查看。标签的置顶/忽略/合并尚未实现。')));
    }

    function MemoryHelp() {
      const section = (title, body) => h('div', {
        style: { ...S.row, marginBottom: 10, lineHeight: 1.7 },
      },
        h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 6 } }, title),
        ...body);
      const p = (text) => h('div', { style: { ...S.rowMeta, marginBottom: 4 } }, text);
      const li = (text) => h('div', { style: { ...S.rowMeta, marginBottom: 3 } }, `• ${text}`);
      return h('div', { style: S.page },
        h('h2', { style: S.title }, '记忆日历 · 记忆说明'),
        h('p', { style: S.note },
          '面向使用者的简短说明。完整版在仓库 docs/用户说明书.md，内容更详细。'),
        section('它是什么', [
          p('把过去的对话整理成本地“文本包”，需要时再检索；不上传、不云同步。'),
          p('它不会主动把整段记忆塞进每一轮对话，也不会替用户判断敏感内容。'),
          p('数据只在本机：<工作区>\\.memory-calendar'),
        ]),
        section('怎么让它想起来', [
          p('直接在对话里问，例如“上次那个记忆插件怎么验证的？”。'),
          li('默认正常强度；说“仔细 / 完整 / 别漏”会自动加深。'),
          li('默认找不到时，会自动再搜一次；仍找不到会明确说没找到。'),
        ]),
        section('怎么让它记住', [
          p('直接说“记住这个：……”，会逐字保存到当前工作区的 pin。'),
          li('查看：“我让你记住过什么？”'),
          li('删除：“把那条 pin 删掉”。'),
          p('注意：目前 pin 没有独立管理页面，只能在对话里操作。'),
        ]),
        section('关闭本工作区记忆', [
          p('设置 → 记忆 → 勾选“关闭本工作区记忆”。'),
          li('当前工作区不再新增包、不再参与检索。'),
          li('已有包不会删除；其他工作区不受影响。'),
        ]),
        section('工作区抽屉与会话', [
          p('图谱左侧「工作区」按钮打开抽屉。'),
          li('▸ 展开可见会话；勾选决定图谱显示；拖拽只调整顺序。'),
          li('隐藏工作区只影响图谱显示，不关闭记忆、不删连接。'),
          li('工作区不能连接工作区；会话是只读终点，不参与记忆连接。'),
        ]),
        section('自动检查点与顶部提示', [
          p('聊天变长、上下文压力较高时，会自动打包一次。'),
          li('完成时屏幕顶部居中提示“记忆检查点已保存”，约 10 秒消失。'),
          li('检测到上下文被压缩时，提示“上下文已压缩，记忆已补包”。'),
          li('这是 DSH 应用内提示，不是 Windows 系统通知。'),
          p('当前已验证 50% 档和手动检查点；70% / 85% 档还在观察。'),
        ]),
        section('当前限制', [
          li('文本包只含 user / assistant 文本，不含推理、工具完整输出、附件。'),
          li('没有独立 pin 管理页、没有云同步、没有语义向量检索。'),
          li('插件本地 HTTP 路由还没有真正的 token 鉴权。'),
          p('升级 DSH 或插件前，先备份 .memory-calendar。'),
        ]),
        h('p', { style: S.note },
          '完整说明：插件目录下的 用户说明书.md'));
    }

    function MemoryToast() {
      useEffect(() => {
        let alive = true;
        let stored = '';
        const storageKey = 'dsh-memory-calendar-last-checkpoint';
        try { stored = localStorage.getItem(storageKey) || ''; } catch { /* private mode */ }
        let seen = stored;
        const el = document.createElement('div');
        el.id = 'memory-calendar-toast';
        el.style.cssText = [
          'position:fixed', 'left:50%', 'top:64px', 'transform:translateX(-50%)',
          'z-index:2147483647', 'pointer-events:none',
          'min-width:220px', 'max-width:min(460px,calc(100vw - 32px))',
          'padding:12px 18px 12px 16px',
          'border-radius:12px',
          'background:linear-gradient(180deg,#1b1b1f 0%,#0b0b0e 100%)',
          'border:1px solid rgba(255,255,255,.85)',
          'box-shadow:0 14px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08)',
          'color:#f7f7f8', 'font-size:13px',
          'line-height:1.45', 'text-align:left', 'display:none',
        ].join(';');
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:700;letter-spacing:.2px;font-size:13px;';
        const subEl = document.createElement('div');
        subEl.style.cssText = 'margin-top:2px;color:rgba(255,255,255,.58);font-size:11px;';
        el.appendChild(titleEl);
        el.appendChild(subEl);
        document.body.appendChild(el);
        let hideTimer = 0;
        const show = (title, subtitle) => {
          titleEl.textContent = title;
          subEl.textContent = subtitle;
          el.style.display = 'block';
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => { el.style.display = 'none'; }, 10000);
        };
        const poll = async () => {
          try {
            const res = await fetch('/api/memory-calendar/auto-status', { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            const done = (data.status || [])
              .filter((s) => String(s.lastPhase || '').startsWith('done:'))
              .sort((a, b) => Number(b.lastRunAt || 0) - Number(a.lastRunAt || 0))[0];
            if (!done) return;
            const key = `${done.id}:${done.lastRunAt}:${done.lastPhase}`;
            const fresh = Date.now() - Number(done.lastRunAt || 0) < 5 * 60 * 1000;
            if (key !== seen && (seen || fresh)) {
              const dropped = String(done.lastPhase).includes('compaction-drop');
              show(
                dropped ? '上下文已压缩' : '记忆检查点已保存',
                dropped ? '记忆已补包 · 已保存到本地' : '已保存到本地记忆库',
              );
            }
            seen = key;
            try { localStorage.setItem(storageKey, key); } catch { /* private mode */ }
          } catch { /* 本地接口不可用时静默 */ }
        };
        poll();
        const timer = setInterval(() => { if (alive) poll(); }, 5000);
        return () => {
          alive = false;
          clearInterval(timer);
          clearTimeout(hideTimer);
          el.remove();
        };
      }, []);
      return null;
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'memory-calendar',
          order: 70,
          label: () => '记忆',
        }, MemorySettings));
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'memory-calendar-help',
          order: 71,
          label: () => '记忆说明',
        }, MemoryHelp));
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'memory-calendar-toast',
          order: 50,
        }, MemoryToast));
      },
    };
  },
});
