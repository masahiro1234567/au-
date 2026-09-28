import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_KNOWLEDGE_TYPES, termMatchesPath, getTermPaths, pathStartsWith, pathsToDbFields, showToast, overlapInfo, overlapGroups } from '../utils.js';
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
function MindMapNodeEditor({ knowledgeTypes, path, onClose, onRenamed }) {
  const [newChildName, setNewChildName] = useState('');
  const node = findKnowledgeNode(knowledgeTypes, path);
  // 名前欄は選択中のノードの名前と常に連動させる（別のノードを選ぶとパネルごと作り直される）
  const [nameDraft, setNameDraft] = useState(node?.name || '');
  if (!node) return null;

  const doRename = async (name) => {
    if (!name.trim() || name.trim() === node.name) { setNameDraft(node.name); return; }
    try {
      const n = await renameKnowledgeNode(knowledgeTypes, path, name);
      // 編集パネルを新しい名前のまま開いておく
      onRenamed?.([...path.slice(0, -1), name.trim()]);
      showToast(n ? `変更しました（登録済みの用語${n}件も書き換えました）` : '変更しました');
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
      const n = await removeKnowledgeNode(knowledgeTypes, [...path, childName]);
      showToast(n ? `削除しました（${n}件の用語からこの区分を外しました）` : '削除しました');
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
      const n = await removeKnowledgeNode(knowledgeTypes, path);
      showToast(n ? `削除しました（${n}件の用語からこの区分を外しました）` : '削除しました');
      onClose();
    } catch (e) { showToast(e.message); }
  };

  return (
    <div style={{ background: '#fff8f0', border: '1.5px solid var(--primary)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.78rem', color: 'var(--sub)' }}>
          編集中：{path.slice(0, -1).map((p) => p + ' / ')}<b style={{ color: 'var(--pd)', fontSize: '.9rem' }}>{path[path.length - 1]}</b>
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.9rem', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '.7rem', color: 'var(--sub)', flexShrink: 0 }}>名前</span>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          onBlur={() => doRename(nameDraft)}
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
function RelationRow({ id, term, allTerms, focusPath }) {
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
            paths={getTermPaths(term)} focusPath={focusPath}
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


// マインドマップで選んだ区分に、複数の用語をまとめて登録・解除する（カテゴリ分け作業の簡略化用）
// ・子に登録すると、親の区分にも入っているものとして扱う（親での表示・件数にも含まれる）
// ・1つの用語を複数の区分に登録できる（登録しても他の区分からは外れない）
function BulkAssignPanel({ terms, path }) {
  const [scope, setScope] = useState('unassigned'); // 'unassigned' | 'anc:<深さ>'（上の区分） | 'here' | 'overlap' | 'all'
  const [overlapWith, setOverlapWith] = useState(null); // 重複先で絞り込むとき、その区分の表示名
  const [q, setQ] = useState('');
  // チェック＝「この区分に入っている」。変更したものだけを changes に持ち、保存でまとめて反映する
  const [changes, setChanges] = useState(() => new Map()); // id → true（登録する）/ false（外す）
  const [saving, setSaving] = useState(false);
  const pathKey = path.join('/');

  useEffect(() => {
    setChanges(new Map()); setOverlapWith(null);
    // 上の区分の絞り込みは区分ごとに中身が変わるので、区分を切り替えたら未分類に戻す
    setScope((sc) => (sc.startsWith('anc:') ? 'unassigned' : sc));
  }, [pathKey]);

  const ov = useMemo(() => overlapInfo(terms, path), [terms, pathKey]);

  // この区分（または配下）に登録済みか
  const isHere = (t) => termMatchesPath(t, path);

  // 上の区分（親・祖父…）それぞれに「直接」登録されていて、まだこの区分には入っていない用語
  // depth＝上の区分の階層の深さ（例：他社知識/Softbank/Ymobile を選択中なら、Softbank=2・他社知識=1）
  const inAncestor = (t, depth) => !termMatchesPath(t, path) &&
    getTermPaths(t).some((p) => p.length === depth && pathStartsWith(path, p));
  const ancestors = [];
  for (let d = path.length - 1; d >= 1; d--) ancestors.push({ depth: d, name: path[d - 1] });

  const counts = useMemo(() => {
    const all = Object.values(terms);
    return {
      unassigned: all.filter((t) => getTermPaths(t).length === 0).length,
      anc: Object.fromEntries(ancestors.map((a) => [a.depth, all.filter((t) => inAncestor(t, a.depth)).length])),
      here: all.filter((t) => termMatchesPath(t, path)).length,
    };
  }, [terms, pathKey]);

  const list = useMemo(() => {
    return Object.entries(terms)
      .filter(([, t]) => {
        if (scope === 'unassigned') return getTermPaths(t).length === 0;
        if (scope === 'here') return termMatchesPath(t, path);
        if (scope.startsWith('anc:')) return inAncestor(t, Number(scope.slice(4)));
        return true;
      })
      .filter(([id]) => {
        if (scope !== 'overlap') return true;
        if (!overlapWith) return ov.ids.includes(id);
        return (ov.others.find((o) => o.path.join(' / ') === overlapWith)?.ids || []).includes(id);
      })
      .filter(([, t]) => !q || (t.name || '').includes(q))
      .sort((a, b) => {
        // 「すべての用語」では登録済みを上に
        const ha = isHere(a[1]) ? 0 : 1, hb = isHere(b[1]) ? 0 : 1;
        if (scope === 'all' && ha !== hb) return ha - hb;
        return (a[1].name || '').localeCompare(b[1].name || '', 'ja');
      });
  }, [terms, scope, q, pathKey, ov, overlapWith]);

  const visibleIds = list.map(([id]) => id);
  const isChecked = (id) => (changes.has(id) ? changes.get(id) : isHere(terms[id]));
  const allChecked = visibleIds.length > 0 && visibleIds.every(isChecked);

  const setChecked = (ids, value) => setChanges((m) => {
    const n = new Map(m);
    ids.forEach((id) => {
      if (!terms[id]) return;
      if (value === isHere(terms[id])) n.delete(id); else n.set(id, value);
    });
    return n;
  });
  const toggle = (id) => setChecked([id], !isChecked(id));
  const toggleAll = () => setChecked(visibleIds, !allChecked);

  const valid = [...changes.entries()].filter(([id]) => terms[id]);
  const toAssign = valid.filter(([, v]) => v).map(([id]) => id);
  const toUnassign = valid.filter(([, v]) => !v).map(([id]) => id);
  const changeCount = toAssign.length + toUnassign.length;

  const save = async () => {
    if (!changeCount) return;
    setSaving(true);
    try {
      const updates = {};
      const put = (id, paths) => {
        Object.entries(pathsToDbFields(paths)).forEach(([k, v]) => { updates[`terms/${id}/${k}`] = v; });
      };
      // 登録：既存の区分は残したまま追加（親区分に入っていた場合は、より詳しいこちらに置き換わる）
      toAssign.forEach((id) => put(id, [...getTermPaths(terms[id]), path]));
      // 解除：この区分とその配下への登録だけを外す（他の区分への登録は残る）
      toUnassign.forEach((id) => put(id, getTermPaths(terms[id]).filter((p) => !pathStartsWith(p, path))));
      await dbUpdateMany(updates);
      const msg = [toAssign.length && `登録${toAssign.length}件`, toUnassign.length && `解除${toUnassign.length}件`].filter(Boolean).join('・');
      showToast(`「${path.join(' / ')}」を更新しました（${msg}）`);
      setChanges(new Map());
    } catch (e) { showToast('エラー:' + e.message); }
    setSaving(false);
  };

  const pill = (active) => ({
    fontSize: '.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
    border: active ? 'none' : '1.5px solid var(--border)', background: active ? 'var(--pd)' : '#fff', color: active ? '#fff' : 'var(--sub)',
  });

  const ancName = scope.startsWith('anc:') ? path[Number(scope.slice(4)) - 1] : '';
  const emptyMsg = { unassigned: '未分類の用語はありません', here: 'この区分に登録されている用語はありません', overlap: 'ほかの区分と重複している用語はありません', all: '該当する用語がありません' }[scope] || `${ancName}に直接登録されている用語はありません`;

  return (
    <div className="ba-panel">
      <div className="ba-head">
        <div className="ba-title">用語の登録・解除</div>
        <div className="ba-target">対象の区分：<b>{path.join(' / ')}</b></div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button style={pill(scope === 'unassigned')} onClick={() => setScope('unassigned')}>未分類のみ（{counts.unassigned}）</button>
        {ancestors.filter((a) => counts.anc[a.depth] > 0 || scope === `anc:${a.depth}`).map((a) => (
          <button key={a.depth} style={pill(scope === `anc:${a.depth}`)} onClick={() => setScope(`anc:${a.depth}`)}>
            {a.name}に登録済み（{counts.anc[a.depth]}）
          </button>
        ))}
        <button style={pill(scope === 'here')} onClick={() => setScope('here')}>この区分に登録済み（{counts.here}）</button>
        <button style={pill(scope === 'overlap')} onClick={() => { setScope('overlap'); setOverlapWith(null); }}>重複あり（{ov.count}）</button>
        <button style={pill(scope === 'all')} onClick={() => setScope('all')}>すべての用語</button>
      </div>

      {scope === 'overlap' && (
        ov.count ? (
          <div className="ov-break">
            <div className="ov-break-title">重複先の内訳（タップで絞り込み）</div>
            <div className="ov-break-chips">
              <button className={`ov-chip ${!overlapWith ? 'on' : ''}`} onClick={() => setOverlapWith(null)}>すべて {ov.count}件</button>
              {ov.others.map((o) => {
                const k = o.path.join(' / ');
                return (
                  <button key={k} className={`ov-chip ${overlapWith === k ? 'on' : ''}`} onClick={() => setOverlapWith(overlapWith === k ? null : k)}>
                    {k}<b>{o.count}件</b>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="用語名で絞り込み" className="ba-search" />

      <div className="ba-listbar">
        <label className="ba-check">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={!visibleIds.length} />
          <span>表示中をすべてチェック</span>
        </label>
        <span className="ba-count">{changeCount ? `未保存の変更 ${changeCount}件` : 'チェック＝この区分に登録'}</span>
      </div>

      <div className="ba-list">
        {list.length === 0 ? (
          <div className="ba-empty">{emptyMsg}</div>
        ) : list.map(([id, t]) => {
          const paths = getTermPaths(t);
          const here = isHere(t);
          return (
            <label key={id} className={`ba-row ${isChecked(id) ? 'on' : ''} ${changes.has(id) ? 'changed' : ''}`}>
              <input type="checkbox" checked={isChecked(id)} onChange={() => toggle(id)} />
              <span className="ba-row-name">{t.name}</span>
              {changes.has(id) && <span className={`ba-chg ${changes.get(id) ? 'add' : 'del'}`}>{changes.get(id) ? '追加' : '解除'}</span>}
              <span className="ba-row-paths">
                {paths.length ? paths.map((p) => (
                  <span key={p.join('/')} className={`ba-tag ${pathStartsWith(p, path) ? 'here' : ''}`}>{p.join(' / ')}</span>
                )) : <span className="ba-tag none">未分類</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className="ba-actions">
        <button className="ba-btn ba-btn-sub" disabled={saving || !changeCount} onClick={() => setChanges(new Map())}>
          元に戻す
        </button>
        <button className="ba-btn" disabled={saving || !changeCount} onClick={save}>
          {saving ? '保存中…' : changeCount
            ? `変更を保存（${[toAssign.length && `登録${toAssign.length}件`, toUnassign.length && `解除${toUnassign.length}件`].filter(Boolean).join('・')}）`
            : '変更はありません'}
        </button>
      </div>
      <div className="ba-note">
        {scope.startsWith('anc:')
          ? `「${ancName}」に直接登録されている（${ancName}の下の区分にはまだ入っていない）用語です。チェックして保存すると「${ancName}」から「${path[path.length - 1]}」へ移動します（${ancName}の件数にはそのまま含まれます）。`
          : 'チェックを付けると登録、外すと解除です。ほかの区分への登録はそのまま残ります。絞り込みを切り替えても、保存前の変更は残ります。'}
      </div>
    </div>
  );
}


// 全体の重複一覧：区分の組み合わせごとに件数を表示し、開くと用語名が見える
function OverlapSummary({ terms, onPick }) {
  const groups = useMemo(() => overlapGroups(terms), [terms]);
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const total = groups.reduce((s, g) => s + g.ids.length, 0);
  if (!groups.length) return null;
  return (
    <div className="ov-sum">
      <div className="ov-sum-head" onClick={() => setOpen((o) => !o)}>
        <span>複数の区分に登録されている用語：<b>{total}件</b>（{groups.length}通りの組み合わせ）</span>
        <span style={{ color: 'var(--sub)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="ov-sum-list">
          {groups.map((g) => {
            const k = g.labels.join('|');
            const isOpen = openKey === k;
            return (
              <div key={k} className="ov-sum-row">
                <div className="ov-sum-combo" onClick={() => setOpenKey(isOpen ? null : k)}>
                  <span className="ov-sum-paths">
                    {g.labels.map((l, i) => (
                      <React.Fragment key={l}>
                        {i > 0 && <span className="ov-sum-amp">＋</span>}
                        <span className="ba-tag">{l}</span>
                      </React.Fragment>
                    ))}
                  </span>
                  <b className="ov-sum-count">{g.ids.length}件</b>
                </div>
                {isOpen && (
                  <div className="ov-sum-terms">
                    {g.ids.map((id) => terms[id] && (
                      <span key={id} className="ov-sum-term">{terms[id].name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
          terms={terms} knowledgeTypes={kTypes} mapFilter={mapEditMode ? editingPath : mapFilter} onSelect={setMapFilter}
          editable={mapEditMode} onEditNode={setEditingPath}
        />
      ) : (
        <ZoomPanBox height={280}>
          <TermMindMap
            terms={terms} knowledgeTypes={kTypes} mapFilter={mapEditMode ? editingPath : mapFilter} onSelect={setMapFilter}
            editable={mapEditMode} onEditNode={setEditingPath}
          />
        </ZoomPanBox>
      )}

      {mapEditMode && editingPath && (
        <MindMapNodeEditor key={editingPath.join('\u0001')} knowledgeTypes={kTypes} path={editingPath} onClose={() => setEditingPath(null)} onRenamed={setEditingPath} />
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

      {!mapEditMode && !mapFilter && <OverlapSummary terms={terms} />}

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
        filtered.map(([id, t]) => <RelationRow key={id} id={id} term={t} allTerms={terms} focusPath={mapFilter} />)
      )}
    </div>
  );
}
