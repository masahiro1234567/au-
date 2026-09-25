import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_KNOWLEDGE_TYPES, termMatchesPath, getTermPath, showToast } from '../utils.js';
import { saveTermRelations, dbUpdateMany } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';
import { ConfirmButton } from './ConfirmButton.jsx';
import {
  KnowledgeConfigManager, TermMindMap, MindMapList, ZoomPanBox,
  findKnowledgeNode, renameKnowledgeNode, removeKnowledgeNode, addKnowledgeChild, reorderKnowledgeChildren,
} from './KnowledgeTree.jsx';


// 子の並び替え（ドラッグ）。マウス・タッチ両対応のため Pointer Events で実装
function SortableChildren({ items, onRemove, onReorder }) {
  const [order, setOrder] = useState(items.map((c) => c.name));
  const [dragName, setDragName] = useState(null);
  const drag = useRef({ name: null, startX: 0, startY: 0, active: false, changed: false });
  const itemsKey = items.map((c) => c.name).join('\u0001');

  // Firebaseから並びが更新されたら反映（ドラッグ中は反映しない）
  useEffect(() => { if (!drag.current.name) setOrder(items.map((c) => c.name)); }, [itemsKey]);

  const byName = new Map(items.map((c) => [c.name, c]));
  const orderRef = useRef(order);
  orderRef.current = order;

  const onDown = (e, name) => {
    if (e.target.closest('button')) return; // ✕ボタンは通常のクリック
    drag.current = { name, startX: e.clientX, startY: e.clientY, active: false, changed: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.name) return;
    if (!d.active) {
      if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 5) return;
      d.active = true;
      setDragName(d.name);
    }
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sort-name]');
    const over = el?.getAttribute('data-sort-name');
    if (!over || over === d.name) return;
    setOrder((o) => {
      const from = o.indexOf(d.name), to = o.indexOf(over);
      if (from < 0 || to < 0) return o;
      const n = [...o];
      n.splice(from, 1);
      n.splice(to, 0, d.name);
      d.changed = true;
      return n;
    });
  };
  const onUp = () => {
    const d = drag.current;
    const changed = d.active && d.changed;
    drag.current = { name: null, startX: 0, startY: 0, active: false, changed: false };
    setDragName(null);
    if (changed) onReorder(orderRef.current);
  };

  if (!items.length) return <span style={{ fontSize: '.72rem', color: 'var(--sub)' }}>まだ子がありません</span>;

  return (
    <>
      {order.map((name) => {
        const c = byName.get(name);
        if (!c) return null;
        const dragging = dragName === name;
        return (
          <span
            key={c.id || c.name}
            data-sort-name={name}
            className={`sort-chip ${dragging ? 'dragging' : ''}`}
            onPointerDown={(e) => onDown(e, name)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <svg className="sort-grip" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
              {[2, 7, 12].map((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" />))}
            </svg>
            {c.name || '（名前なし）'}
            {c.id && (
              <button onClick={() => onRemove(c.name)} className="sort-chip-x">✕</button>
            )}
          </span>
        );
      })}
    </>
  );
}

// マインドマップ上で選んだノードを直接編集するパネル（名前変更・子の追加・子の削除・自分自身の削除）
function MindMapNodeEditor({ knowledgeTypes, path, onClose }) {
  const [newChildName, setNewChildName] = useState('');
  const node = findKnowledgeNode(knowledgeTypes, path);
  if (!node) return null;

  const doRename = async (name) => {
    if (!name.trim() || name === node.name) return;
    try {
      await renameKnowledgeNode(knowledgeTypes, path, name);
      showToast('✅ 変更しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const doAddChild = async () => {
    if (!newChildName.trim()) return showToast('名前を入力してください');
    try {
      await addKnowledgeChild(knowledgeTypes, path, newChildName);
      setNewChildName('');
      showToast('✅ 追加しました');
    } catch (e) { showToast(e.message); }
  };

  const doRemoveChild = async (childName) => {
    try {
      await removeKnowledgeNode(knowledgeTypes, [...path, childName]);
      showToast('🗑 削除しました');
    } catch (e) { showToast(e.message); }
  };

  const doReorder = async (names) => {
    try {
      await reorderKnowledgeChildren(knowledgeTypes, path, names);
      showToast('並び順を保存しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const doRemoveSelf = async () => {
    try {
      await removeKnowledgeNode(knowledgeTypes, path);
      showToast('🗑 削除しました');
      onClose();
    } catch (e) { showToast(e.message); }
  };

  return (
    <div style={{ background: '#fff8f0', border: '1.5px solid var(--primary)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.72rem', color: 'var(--sub)' }}>✏️ 編集中：{path.join(' / ')}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.9rem', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.7rem', color: 'var(--sub)', flexShrink: 0 }}>名前</span>
        <input
          defaultValue={node.name}
          onBlur={(e) => doRename(e.target.value)}
          style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 9px', fontSize: '.82rem', fontFamily: 'inherit' }}
        />
        {node.id && (
          <ConfirmButton
            label="このノードを削除"
            message={`「${node.name || '（名前なし）'}」を削除しますか？`}
            onConfirm={doRemoveSelf}
            style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '7px 10px', color: '#dc2626', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          />
        )}
      </div>

      <div style={{ fontSize: '.7rem', color: 'var(--sub)', marginBottom: 6 }}>子（{node.children.length}件）{node.children.length > 1 && '　ドラッグで並び替えできます'}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <SortableChildren items={node.children} onRemove={doRemoveChild} onReorder={doReorder} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newChildName}
          onChange={(e) => setNewChildName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doAddChild()}
          placeholder="新しい子の名前"
          style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 9px', fontSize: '.78rem', fontFamily: 'inherit' }}
        />
        <button onClick={doAddChild} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          ＋追加
        </button>
      </div>
    </div>
  );
}

// 用語1件分の「関連付けだけ」を編集する軽量な行（他のフィールドはここでは触らない）
function RelationRow({ id, term, allTerms }) {
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState(Object.keys(term.related || {}));

  const save = async () => {
    const oldIds = Object.keys(term.related || {});
    await saveTermRelations(id, oldIds, related);
  };

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 9, marginBottom: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '.82rem', fontWeight: 700 }}>{term.name}</span>
        <span style={{ fontSize: '.7rem', color: 'var(--sub)' }}>関連 {Object.keys(term.related || {}).length}件 {open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          <RelatedTermsTagInput
            allTerms={allTerms} excludeId={id} selected={related} onChange={setRelated}
            name={term.name} category={term.category} description={term.description}
          />
          <button
            onClick={save}
            style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 7, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ✅ 関連付けを保存
          </button>
        </div>
      )}
    </div>
  );
}


// マインドマップで選んだ区分に、複数の用語をまとめて登録する（カテゴリ分け作業の簡略化用）
function BulkAssignPanel({ terms, path }) {
  const [scope, setScope] = useState('unassigned'); // 'unassigned'（未分類のみ）| 'all'（すべて）
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const pathKey = path.join('/');

  // 区分を切り替えたら選択をリセット
  React.useEffect(() => { setSelected(new Set()); }, [pathKey]);

  const isHere = (t) => getTermPath(t).join('/') === pathKey;

  const list = useMemo(() => {
    return Object.entries(terms)
      .filter(([, t]) => (scope === 'all' ? true : getTermPath(t).length === 0))
      .filter(([, t]) => !q || (t.name || '').includes(q))
      .sort((a, b) => {
        // この区分に登録済みの用語は下に回す
        const ha = isHere(a[1]) ? 1 : 0, hb = isHere(b[1]) ? 1 : 0;
        if (ha !== hb) return ha - hb;
        return (a[1].name || '').localeCompare(b[1].name || '', 'ja');
      });
  }, [terms, scope, q, pathKey]);

  const unassignedCount = useMemo(() => Object.values(terms).filter((t) => getTermPath(t).length === 0).length, [terms]);
  const selectable = list.filter(([, t]) => !isHere(t)).map(([id]) => id);
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
  const selectedHere = [...selected].filter((id) => terms[id] && isHere(terms[id]));
  const selectedToAssign = [...selected].filter((id) => terms[id] && !isHere(terms[id]));

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allSelected) selectable.forEach((id) => n.delete(id)); else selectable.forEach((id) => n.add(id));
    return n;
  });

  const assign = async () => {
    if (!selectedToAssign.length) return;
    setSaving(true);
    try {
      const updates = {};
      selectedToAssign.forEach((id) => {
        updates[`terms/${id}/knowledgePath`] = path;
        // 旧形式のフィールドは新形式と食い違わないよう消しておく
        updates[`terms/${id}/knowledgeType`] = null;
        updates[`terms/${id}/knowledgeSubType`] = null;
      });
      await dbUpdateMany(updates);
      showToast(`${selectedToAssign.length}件を「${path.join(' / ')}」に登録しました`);
      setSelected(new Set());
    } catch (e) { showToast('エラー:' + e.message); }
    setSaving(false);
  };

  const unassign = async () => {
    if (!selectedHere.length) return;
    setSaving(true);
    try {
      const updates = {};
      selectedHere.forEach((id) => {
        updates[`terms/${id}/knowledgePath`] = null;
        updates[`terms/${id}/knowledgeType`] = null;
        updates[`terms/${id}/knowledgeSubType`] = null;
      });
      await dbUpdateMany(updates);
      showToast(`${selectedHere.length}件を区分から外しました`);
      setSelected(new Set());
    } catch (e) { showToast('エラー:' + e.message); }
    setSaving(false);
  };

  const pill = (active) => ({
    fontSize: '.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
    border: active ? 'none' : '1.5px solid var(--border)', background: active ? 'var(--pd)' : '#fff', color: active ? '#fff' : 'var(--sub)',
  });

  return (
    <div className="ba-panel">
      <div className="ba-head">
        <div className="ba-title">用語をまとめて登録</div>
        <div className="ba-target">登録先：<b>{path.join(' / ')}</b></div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button style={pill(scope === 'unassigned')} onClick={() => setScope('unassigned')}>未分類のみ（{unassignedCount}）</button>
        <button style={pill(scope === 'all')} onClick={() => setScope('all')}>すべての用語</button>
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="用語名で絞り込み"
        className="ba-search"
      />

      <div className="ba-listbar">
        <label className="ba-check">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!selectable.length} />
          <span>表示中をすべて選択</span>
        </label>
        <span className="ba-count">{selected.size}件選択中</span>
      </div>

      <div className="ba-list">
        {list.length === 0 ? (
          <div className="ba-empty">{scope === 'unassigned' ? '未分類の用語はありません' : '該当する用語がありません'}</div>
        ) : list.map(([id, t]) => {
          const cur = getTermPath(t);
          const here = isHere(t);
          return (
            <label key={id} className={`ba-row ${selected.has(id) ? 'on' : ''}`}>
              <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
              <span className="ba-row-name">{t.name}</span>
              <span className={`ba-row-path ${here ? 'here' : ''}`}>
                {here ? '登録済み' : cur.length ? cur.join(' / ') : '未分類'}
              </span>
            </label>
          );
        })}
      </div>

      <div className="ba-actions">
        {selectedHere.length > 0 && (
          <button className="ba-btn ba-btn-sub" disabled={saving} onClick={unassign}>
            {selectedHere.length}件を区分から外す
          </button>
        )}
        <button className="ba-btn" disabled={saving || !selectedToAssign.length} onClick={assign}>
          {saving ? '保存中…' : `${selectedToAssign.length}件をこの区分に登録`}
        </button>
      </div>
      {scope === 'all' && selectedToAssign.some((id) => getTermPath(terms[id]).length) && (
        <div className="ba-note">別の区分に入っている用語は、この区分へ移動します</div>
      )}
    </div>
  );
}

export default function AdminKnowledgeTab({ terms, knowledgeTypes }) {
  const kTypes = knowledgeTypes || DEFAULT_KNOWLEDGE_TYPES.map((t) => ({
    id: null, name: t.name, children: (t.children || []).map((c) => ({ id: null, name: c.name, children: [] })),
  }));
  const [mapFilter, setMapFilter] = useState(null);
  const [mapEditMode, setMapEditMode] = useState(false);
  const [editingPath, setEditingPath] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list'（折りたたみリスト）| 'map'（ズーム対応の図）
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return Object.entries(terms)
      .filter(([, t]) => termMatchesPath(t, mapFilter))
      .filter(([, t]) => !search || (t.name || '').includes(search))
      .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'ja'));
  }, [terms, mapFilter, search]);

  return (
    <div>
      <div className="section-title">用語管理</div>
      <div style={{ fontSize: '.75rem', color: 'var(--sub)', marginBottom: 12 }}>
        知識区分（枝分かれ）の構成を編集したり、マインドマップから用語を絞り込んで関連付けを管理できます。
      </div>

      <KnowledgeConfigManager knowledgeTypes={kTypes} defaultOpen />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setViewMode('list')}
            style={{ fontSize: '.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', border: viewMode === 'list' ? 'none' : '1.5px solid var(--border)', background: viewMode === 'list' ? 'var(--pd)' : '#fff', color: viewMode === 'list' ? '#fff' : 'var(--sub)' }}
          >
            📋 折りたたみリスト
          </button>
          <button
            onClick={() => setViewMode('map')}
            style={{ fontSize: '.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', border: viewMode === 'map' ? 'none' : '1.5px solid var(--border)', background: viewMode === 'map' ? 'var(--pd)' : '#fff', color: viewMode === 'map' ? '#fff' : 'var(--sub)' }}
          >
            🔍 図（拡大・移動）
          </button>
        </div>
        <button
          onClick={() => { setMapEditMode((v) => !v); setEditingPath(null); setMapFilter(null); }}
          style={{
            fontSize: '.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
            border: mapEditMode ? 'none' : '1.5px solid var(--border)',
            background: mapEditMode ? 'var(--primary)' : '#fff',
            color: mapEditMode ? '#fff' : 'var(--sub)',
          }}
        >
          ✏️ {mapEditMode ? '編集中（タップして終了）' : '直接編集する'}
        </button>
      </div>

      {viewMode === 'list' ? (
        <MindMapList
          terms={terms} knowledgeTypes={kTypes} mapFilter={mapFilter} onSelect={setMapFilter}
          editable={mapEditMode} onEditNode={setEditingPath}
        />
      ) : (
        <ZoomPanBox height={280}>
          <TermMindMap
            terms={terms} knowledgeTypes={kTypes} mapFilter={mapFilter} onSelect={setMapFilter}
            editable={mapEditMode} onEditNode={setEditingPath}
          />
        </ZoomPanBox>
      )}

      {mapEditMode && editingPath && (
        <MindMapNodeEditor knowledgeTypes={kTypes} path={editingPath} onClose={() => setEditingPath(null)} />
      )}

      {!mapEditMode && mapFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--pd)', background: 'var(--pl)', padding: '5px 10px', borderRadius: 20, fontWeight: 700 }}>
            {mapFilter.join(' / ')} で絞り込み中
          </span>
          <button onClick={() => setMapFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>✕ 解除</button>
        </div>
      )}

      {!mapEditMode && mapFilter && <BulkAssignPanel terms={terms} path={mapFilter} />}

      {!mapEditMode && !mapFilter && (
        <div className="ba-hint">マインドマップで区分を1つ選ぶと、その区分に用語をまとめて登録できます</div>
      )}

      <div className="section-title" style={{ fontSize: '.85rem', marginTop: 16 }}>関連付けの管理</div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 用語名で検索"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.85rem', fontFamily: 'inherit', marginBottom: 12, background: '#fff' }}
      />
      {filtered.length === 0 ? (
        <div className="tc ts" style={{ padding: 20 }}>該当する用語がありません</div>
      ) : (
        filtered.map(([id, t]) => <RelationRow key={id} id={id} term={t} allTerms={terms} />)
      )}
    </div>
  );
}
