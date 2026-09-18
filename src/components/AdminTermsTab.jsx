import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, CATEGORIES_SECTIONS, KNOWLEDGE_TYPES, KNOWLEDGE_SUBTYPES, RANKS, showToast } from '../utils.js';
import { dbPush, dbSet, saveTermRelations, removeTermWithRelations } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';

const emptyRow = () => ({ name: '', knowledgeType: '', knowledgeSubType: '', category: CATEGORIES_BASE[0], section: '', rank: '秀', description: '', note: '' });

function BulkAddSection({ rows, setRows, parseText, setParseText, open, setOpen, duplicateIndices, onSaved }) {
  const updateRow = (i, key, val) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (i) => setRows((rs) => {
    const next = rs.filter((_, idx) => idx !== i);
    return next.length ? next : [emptyRow()];
  });

  // 用語名を改行区切りで貼り付けて、行を一括作成する（カテゴリ・ランク・説明は空のまま／手入力）
  const parseNames = () => {
    const names = parseText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return showToast('用語名を入力してください');
    const newRows = names.map((n) => ({ ...emptyRow(), name: n }));
    setRows((rs) => {
      const isBlankStarter = rs.length === 1 && !rs[0].name.trim() && !rs[0].description.trim();
      return isBlankStarter ? newRows : [...rs, ...newRows];
    });
    setParseText('');
    showToast(`✅ ${names.length}件の行を作成しました`);
  };

  const save = async () => {
    const items = rows.filter((r) => r.name.trim() && r.description.trim());
    if (!items.length) return showToast('保存できる用語がありません');
    let ok = 0;
    for (const item of items) {
      try { await dbPush('terms', { ...item, createdAt: Date.now() }); ok++; } catch { /* noop */ }
    }
    showToast(`✅ ${ok}件を登録しました`);
    setRows([emptyRow()]);
    setOpen(false);
    onSaved?.();
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: '.85rem', fontWeight: 800 }}>＋ 一括登録 / 新規追加</span>
        <span style={{ fontSize: '1rem', color: 'var(--sub)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ background: '#fff', border: '1.5px solid var(--primary)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 14 }}>
          <div style={{ background: 'var(--bg)', border: '1.5px dashed var(--border)', borderRadius: 9, padding: 11, marginBottom: 14 }}>
            <div style={{ fontSize: '.78rem', fontWeight: 800, marginBottom: 6, color: 'var(--pd)' }}>📋 用語名から一括で行を作成</div>
            <div style={{ fontSize: '.7rem', color: 'var(--sub)', marginBottom: 8 }}>用語名を1行に1つずつ貼り付けてください。カテゴリ・ランク・説明はこのあと行ごとに入力します。</div>
            <textarea
              rows={4}
              placeholder={'例：\nMNP\n事務手数料\n家族割'}
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 10px', fontSize: '.82rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
            />
            <button
              onClick={parseNames}
              style={{ width: '100%', padding: 9, borderRadius: 8, border: 'none', background: 'var(--pl)', color: 'var(--pd)', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              読み取って行を作成
            </button>
          </div>
          {rows.map((row, i) => {
            const isDup = duplicateIndices.has(i);
            return (
              <div
                className="bulk-row"
                key={i}
                style={isDup ? { background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: 8 } : undefined}
              >
                <div className="bulk-row-top">
                  <span style={{ fontSize: '.75rem', color: 'var(--sub)', fontWeight: 700 }}>用語 {i + 1}</span>
                  <button className="btn-row-del" onClick={() => removeRow(i)}>削除</button>
                </div>
                <div className="bulk-row-fields">
                  <input className="bulk-name" placeholder="用語名 *" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
                  <select className="bulk-cat" value={row.knowledgeType || ''} onChange={(e) => { updateRow(i, 'knowledgeType', e.target.value); updateRow(i, 'knowledgeSubType', ''); }}>
                    <option value="">知識区分：選択なし</option>
                    {KNOWLEDGE_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {(row.knowledgeType === '自社知識' || row.knowledgeType === '他社知識') && (
                    <select className="bulk-cat" value={row.knowledgeSubType || ''} onChange={(e) => updateRow(i, 'knowledgeSubType', e.target.value)}>
                      <option value="">区分：選択なし</option>
                      {KNOWLEDGE_SUBTYPES.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  )}
                  <select className="bulk-cat" value={row.category} onChange={(e) => updateRow(i, 'category', e.target.value)}>
                    {CATEGORIES_BASE.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="bulk-cat" value={row.section || ''} onChange={(e) => updateRow(i, 'section', e.target.value)}>
                    <option value="">部分知識：選択なし</option>
                    {CATEGORIES_SECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="bulk-rank-row">
                  {RANKS.map((r) => (
                    <label key={r}>
                      <input type="radio" name={`br-${i}`} checked={row.rank === r} onChange={() => updateRow(i, 'rank', r)} /> {r}
                    </label>
                  ))}
                </div>
                <textarea className="bulk-desc" rows={2} placeholder="説明 *" value={row.description} onChange={(e) => updateRow(i, 'description', e.target.value)} />
                <textarea className="bulk-note" rows={1} placeholder="補足・注意点（任意）" value={row.note} onChange={(e) => updateRow(i, 'note', e.target.value)} />
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={addRow}
              style={{ flex: 1, padding: 9, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg)', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--sub)' }}
            >
              ＋ 行を追加
            </button>
            <button
              onClick={() => setRows([emptyRow()])}
              style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fee2e2', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#dc2626' }}
            >
              全行クリア
            </button>
          </div>
          <button
            onClick={save}
            style={{ width: '100%', padding: 11, borderRadius: 9, border: 'none', background: 'var(--grad)', color: '#fff', fontSize: '.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            一括保存
          </button>
        </div>
      )}
    </div>
  );
}

// 用語管理画面の上部に出すマインドマップ（線でつながった構成図・縦方向・コンパクト）
function TermMindMap({ terms, mapFilter, onSelect }) {
  const counts = useMemo(() => {
    const c = { self: { モバイル: 0, ネット: 0 }, other: { モバイル: 0, ネット: 0 }, device: { iPhone: 0, Android: 0 } };
    Object.values(terms).forEach((t) => {
      if (t.knowledgeType === '自社知識' && (t.knowledgeSubType === 'モバイル' || t.knowledgeSubType === 'ネット')) {
        c.self[t.knowledgeSubType]++;
      } else if (t.knowledgeType === '他社知識' && (t.knowledgeSubType === 'モバイル' || t.knowledgeSubType === 'ネット')) {
        c.other[t.knowledgeSubType]++;
      } else if (t.knowledgeType === '端末知識(iPhone)') {
        c.device.iPhone++;
      } else if (t.knowledgeType === '端末知識(Android)') {
        c.device.Android++;
      }
    });
    return c;
  }, [terms]);

  const isActive = (type, sub) => !!mapFilter && mapFilter.type === type && mapFilter.sub === (sub || null);
  const dim = (active) => (mapFilter && !active ? 0.4 : 1);

  const COLORS = {
    自社知識: { bg: '#E1F5EE', border: '#1D9E75', text: '#04342C' },
    端末知識: { bg: '#EEEDFE', border: '#7F77DD', text: '#26215C' },
    他社知識: { bg: '#FAECE7', border: '#D85A30', text: '#4A1B0C' },
  };
  // 3列（自社/端末/他社）× 各列2つの子ノード。縦方向：上から すべて → 3列 → 各列の子2つ
  const cols = [
    { type: '自社知識', x: 10, children: [{ sub: 'モバイル', count: counts.self.モバイル }, { sub: 'ネット', count: counts.self.ネット }] },
    { type: '端末知識', x: 135, children: [{ sub: 'iPhone', count: counts.device.iPhone }, { sub: 'Android', count: counts.device.Android }] },
    { type: '他社知識', x: 260, children: [{ sub: 'モバイル', count: counts.other.モバイル }, { sub: 'ネット', count: counts.other.ネット }] },
  ];
  const COL_W = 110;

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, marginBottom: 12 }}>
      <svg width="100%" viewBox="0 0 380 172" style={{ overflow: 'visible' }}>
        {/* すべて（頂点） */}
        <g style={{ cursor: 'pointer' }} onClick={() => onSelect(null)}>
          <rect x={140} y={4} width={100} height={28} rx={8} fill={mapFilter === null ? '#f97316' : '#F1EFE8'} stroke="#888780" strokeWidth={0.5} />
          <text x={190} y={18} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={mapFilter === null ? '#fff' : '#2C2C2A'}>すべて</text>
        </g>

        {cols.map((col) => {
          const c = COLORS[col.type];
          const cx = col.x + COL_W / 2;
          const active = isActive(col.type, null);
          return (
            <g key={col.type}>
              <path d={`M190 32 C190 42, ${cx} 46, ${cx} 56`} fill="none" stroke={c.border} strokeWidth={0.75} />
              <g style={{ cursor: 'pointer', opacity: dim(active) }} onClick={() => onSelect(active ? null : { type: col.type, sub: null })}>
                <rect x={col.x} y={56} width={COL_W} height={30} rx={8} fill={c.bg} stroke={c.border} strokeWidth={active ? 2 : 0.5} />
                <text x={cx} y={71} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={c.text}>{col.type}</text>
              </g>
              {col.children.map((ch, i) => {
                const chX = col.x + i * (COL_W / 2 + 3);
                const chW = COL_W / 2 - 3;
                const chCx = chX + chW / 2;
                const chActive = isActive(col.type, ch.sub);
                return (
                  <g key={ch.sub}>
                    <path d={`M${cx} 86 C${cx} 96, ${chCx} 98, ${chCx} 108`} fill="none" stroke={c.border} strokeWidth={0.5} />
                    <g style={{ cursor: 'pointer', opacity: dim(chActive) }} onClick={() => onSelect(chActive ? null : { type: col.type, sub: ch.sub })}>
                      <rect x={chX} y={108} width={chW} height={28} rx={6} fill={chActive ? c.border : '#fff'} stroke={c.border} strokeWidth={chActive ? 2 : 0.5} />
                      <text x={chCx} y={122} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill={chActive ? '#fff' : c.text}>{ch.sub}({ch.count})</text>
                    </g>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TermItem({ id, term, allTerms, expanded, onToggle, onSaved, onDeleted }) {
  const [name, setName] = useState(term.name || '');
  const [knowledgeType, setKnowledgeType] = useState(term.knowledgeType || '');
  const [knowledgeSubType, setKnowledgeSubType] = useState(term.knowledgeSubType || '');
  const [category, setCategory] = useState(term.category || CATEGORIES_BASE[0]);
  const [section, setSection] = useState(term.section || '');
  const [rank, setRank] = useState(term.rank || '秀');
  const [description, setDescription] = useState(term.description || '');
  const [note, setNote] = useState(term.note || '');
  const [related, setRelated] = useState(Object.keys(term.related || {}));

  const rc = { 秀: 'badge-rank-秀', 優: 'badge-rank-優', 良: 'badge-rank-良', 可: 'badge-rank-可' };

  const save = async () => {
    if (!name.trim() || !description.trim()) return showToast('用語名と説明は必須です');
    try {
      await dbSet('terms/' + id, { name, knowledgeType, knowledgeSubType, category, section, rank, description, note, updatedAt: Date.now() });
      const oldIds = Object.keys(term.related || {});
      await saveTermRelations(id, oldIds, related);
      showToast('✅ 更新しました');
      onSaved?.();
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const del = async () => {
    if (!confirm('この用語を削除しますか？')) return;
    try {
      const relatedIds = Object.keys(term.related || {});
      await removeTermWithRelations(id, relatedIds);
      showToast('🗑 削除しました');
      onDeleted?.();
    } catch (e) { showToast('エラー:' + e.message); }
  };

  return (
    <div className="admin-term-item">
      <div className="admin-term-hdr" onClick={onToggle}>
        <div className="admin-term-name">{term.name}</div>
        <div className="admin-term-badges">
          {term.rank && <span className={`badge ${rc[term.rank] || ''}`}>{term.rank}</span>}
          <span className="badge badge-cat">{term.category}</span>
          {term.section && <span className="badge badge-section">{term.section}</span>}
        </div>
        <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>{expanded ? '－' : '＋'}</button>
      </div>
      <div className={`admin-term-body ${expanded ? '' : 'collapsed'}`}>
        <div style={{ paddingTop: 11 }}>
          <div className="admin-edit-group">
            <label>用語名</label>
            <input className="admin-edit-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="admin-edit-group">
            <label>知識区分（任意）</label>
            <select
              className="admin-cat-sel"
              value={knowledgeType}
              onChange={(e) => { setKnowledgeType(e.target.value); setKnowledgeSubType(''); }}
            >
              <option value="">選択なし</option>
              {KNOWLEDGE_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {(knowledgeType === '自社知識' || knowledgeType === '他社知識') && (
            <div className="admin-edit-group">
              <label>区分（モバイル/ネット）</label>
              <select className="admin-cat-sel" value={knowledgeSubType} onChange={(e) => setKnowledgeSubType(e.target.value)}>
                <option value="">選択なし</option>
                {KNOWLEDGE_SUBTYPES.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          )}
          <div className="admin-edit-group">
            <label>カテゴリ</label>
            <select className="admin-cat-sel" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES_BASE.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-edit-group">
            <label>部分知識（任意）</label>
            <select className="admin-cat-sel" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">選択なし</option>
              {CATEGORIES_SECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-edit-group"><label>ランク</label></div>
          <div className="admin-rank-row">
            {RANKS.map((r) => (
              <div className="admin-rank-opt" data-rank={r} key={r}>
                <input type="radio" name={`aer-${id}`} id={`aerr-${id}-${r}`} checked={rank === r} onChange={() => setRank(r)} />
                <label htmlFor={`aerr-${id}-${r}`}>{r}</label>
              </div>
            ))}
          </div>
          <div className="admin-edit-group">
            <label>説明</label>
            <textarea className="admin-edit-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="admin-edit-group">
            <label>補足・注意点</label>
            <textarea className="admin-edit-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="admin-edit-group">
            <label>関連用語（任意）</label>
            <RelatedTermsTagInput
              allTerms={allTerms} excludeId={id} selected={related} onChange={setRelated}
              name={name} category={category} section={section} description={description}
            />
          </div>
          <div className="admin-action-row">
            <button className="btn-del-term" onClick={del}>🗑 削除</button>
            <button className="btn-save-term" onClick={save}>✅ 保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTermsTab({ terms }) {
  // デフォルトは全収束。展開したIDだけをセットで管理。
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapFilter, setMapFilter] = useState(null); // { type: '自社知識'|'他社知識'|'端末知識', sub: string|null } | null

  // 一括登録の行データ（検索欄の下に重複まとめを出すため、ここで持つ）
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([emptyRow()]);
  const [parseText, setParseText] = useState('');

  const existingNames = useMemo(
    () => new Set(Object.values(terms).map((t) => (t.name || '').trim()).filter(Boolean)),
    [terms]
  );

  // 重複している行のインデックスを判定する（完全一致のみ：既存の用語 or 一括登録内での重複）
  const duplicateIndices = useMemo(() => {
    const nameCounts = {};
    bulkRows.forEach((r) => {
      const n = r.name.trim();
      if (n) nameCounts[n] = (nameCounts[n] || 0) + 1;
    });
    const dupSet = new Set();
    bulkRows.forEach((r, i) => {
      const n = r.name.trim();
      if (!n) return;
      if (existingNames.has(n) || nameCounts[n] > 1) dupSet.add(i);
    });
    return dupSet;
  }, [bulkRows, existingNames]);

  const duplicateRows = useMemo(
    () => bulkRows.map((r, i) => ({ ...r, i })).filter((r) => duplicateIndices.has(r.i)),
    [bulkRows, duplicateIndices]
  );

  const removeBulkRow = (i) => setBulkRows((rs) => {
    const next = rs.filter((_, idx) => idx !== i);
    return next.length ? next : [emptyRow()];
  });

  const handleRefresh = () => {
    // ブラウザの再読み込みはせず、この画面内だけで最新の状態を反映させる
    if (window.caches?.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    setExpandedIds(new Set());
    setSearch('');
    setRefreshKey((k) => k + 1);
    showToast('✅ 最新の状態に更新しました');
  };

  const matchesMapFilter = (t) => {
    if (!mapFilter) return true;
    if (mapFilter.type === '端末知識') {
      if (mapFilter.sub === 'iPhone') return t.knowledgeType === '端末知識(iPhone)';
      if (mapFilter.sub === 'Android') return t.knowledgeType === '端末知識(Android)';
      return t.knowledgeType === '端末知識(iPhone)' || t.knowledgeType === '端末知識(Android)';
    }
    if (mapFilter.sub) return t.knowledgeType === mapFilter.type && t.knowledgeSubType === mapFilter.sub;
    return t.knowledgeType === mapFilter.type;
  };

  const sorted = useMemo(() => {
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms)
      .filter(([, t]) => matchesMapFilter(t))
      .filter(([, t]) => !search || (t.name || '').includes(search) || (t.description || '').includes(search))
      .sort((a, b) =>
        (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
      );
  }, [terms, search, mapFilter]);

  // マインドマップで絞り込み中の時だけ、「それ以外（この条件のタグが付いてない用語）」も見られるようにする
  const [othersOpen, setOthersOpen] = useState(false);
  const others = useMemo(() => {
    if (!mapFilter) return [];
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms)
      .filter(([, t]) => !matchesMapFilter(t))
      .filter(([, t]) => !search || (t.name || '').includes(search) || (t.description || '').includes(search))
      .sort((a, b) =>
        (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
      );
  }, [terms, search, mapFilter]);

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpandedIds(new Set(sorted.map(([id]) => id)));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div>
      <button className="btn-force-refresh" onClick={handleRefresh}>
        🔄 更新（変更が反映されない時はこちら）
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>用語管理</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={expandAll} style={{ background: 'var(--pl)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--pd)', fontFamily: 'inherit' }}>全展開</button>
          <button onClick={collapseAll} style={{ background: '#f0ebe6', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--sub)', fontFamily: 'inherit' }}>全収束</button>
        </div>
      </div>

      <TermMindMap terms={terms} mapFilter={mapFilter} onSelect={setMapFilter} />

      {mapFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--pd)', background: 'var(--pl)', padding: '5px 10px', borderRadius: 20, fontWeight: 700 }}>
            {mapFilter.type}{mapFilter.sub ? ` / ${mapFilter.sub}` : ''} で絞り込み中
          </span>
          <button onClick={() => setMapFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>✕ 解除</button>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 用語名・説明文で検索"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.85rem', fontFamily: 'inherit', marginBottom: 12, background: '#fff' }}
      />

      {/* 一括登録中に重複がある時だけ、検索欄の下にまとめて表示する */}
      {duplicateRows.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
            重複している用語が{duplicateRows.length}件あります
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {duplicateRows.map((r) => (
              <div key={r.i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 7, padding: '6px 10px' }}>
                <span style={{ fontSize: '.82rem', fontWeight: 700 }}>{r.name || '（未入力）'}</span>
                <button
                  onClick={() => removeBulkRow(r.i)}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 9px', color: '#dc2626', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <BulkAddSection
        rows={bulkRows} setRows={setBulkRows}
        parseText={parseText} setParseText={setParseText}
        open={bulkOpen} setOpen={setBulkOpen}
        duplicateIndices={duplicateIndices}
      />

      {mapFilter && (
        <div style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--pd)', margin: '4px 0 6px' }}>
          ✅ 該当する用語（{sorted.length}件）
        </div>
      )}
      {!sorted.length ? (
        <div className="tc ts" style={{ padding: 30 }}>{search ? '該当する用語がありません' : '用語データなし'}</div>
      ) : (
        <div className="admin-terms-list">
          {sorted.map(([id, t]) => (
            <TermItem
              key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
              expanded={expandedIds.has(id)}
              onToggle={() => toggle(id)}
            />
          ))}
        </div>
      )}

      {mapFilter && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setOthersOpen((o) => !o)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0ebe6', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.78rem', fontWeight: 800, color: 'var(--sub)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span>△ それ以外（この区分のタグが付いてない用語・{others.length}件）</span>
            <span>{othersOpen ? '▲' : '▼'}</span>
          </button>
          {othersOpen && (
            <div className="admin-terms-list" style={{ marginTop: 8 }}>
              {others.length === 0 ? (
                <div className="tc ts" style={{ padding: 20 }}>該当する用語はありません</div>
              ) : (
                others.map(([id, t]) => (
                  <TermItem
                    key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
                    expanded={expandedIds.has(id)}
                    onToggle={() => toggle(id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
