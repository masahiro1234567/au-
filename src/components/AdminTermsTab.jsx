import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, DEFAULT_KNOWLEDGE_TYPES, RANKS, showToast, getTermPaths, pathsToDbFields, isDescMissing } from '../utils.js';
import { dbPush, dbSet, dbUpdateMany, saveTermRelations, removeTermWithRelations } from '../useFirebase.js';
import { RelatedTermsTagInput, MultiPathSelector } from './TermModals.jsx';
import { ConfirmButton } from './ConfirmButton.jsx';

const emptyRow = () => ({ name: '', knowledgePaths: [], category: CATEGORIES_BASE[0], rank: '秀', description: '', note: '' });

function BulkAddSection({ rows, setRows, parseText, setParseText, open, setOpen, duplicateIndices, knowledgeTypes, onSaved }) {
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
    // 説明が空でも保存する（「説明未入力」として管理画面に別枠で表示し、あとから入力できる）
    const items = rows.filter((r) => r.name.trim());
    if (!items.length) return showToast('保存できる用語がありません');
    let ok = 0, missing = 0;
    for (const item of items) {
      try {
        await dbPush('terms', { ...item, ...pathsToDbFields(item.knowledgePaths), name: item.name.trim(), createdAt: Date.now() });
        ok++;
        if (!item.description.trim()) missing++;
      } catch { /* noop */ }
    }
    showToast(missing ? `${ok}件を登録しました（うち説明未入力 ${missing}件）` : `${ok}件を登録しました`);
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
                  <select className="bulk-cat" value={row.category} onChange={(e) => updateRow(i, 'category', e.target.value)}>
                    {CATEGORIES_BASE.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <MultiPathSelector tree={knowledgeTypes} paths={row.knowledgePaths || []} onChange={(p) => updateRow(i, 'knowledgePaths', p)} />
                </div>
                <div className="bulk-rank-row">
                  {RANKS.map((r) => (
                    <label key={r}>
                      <input type="radio" name={`br-${i}`} checked={row.rank === r} onChange={() => updateRow(i, 'rank', r)} /> {r}
                    </label>
                  ))}
                </div>
                <textarea className="bulk-desc" rows={2} placeholder="説明（空のまま保存すると「説明未入力」に入ります）" value={row.description} onChange={(e) => updateRow(i, 'description', e.target.value)} />
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

function TermItem({ id, term, allTerms, knowledgeTypes, expanded, onToggle, onSaved, onDeleted }) {
  const [name, setName] = useState(term.name || '');
  const [knowledgePaths, setKnowledgePaths] = useState(getTermPaths(term));
  const [category, setCategory] = useState(term.category || CATEGORIES_BASE[0]);
  const [rank, setRank] = useState(term.rank || '秀');
  const [description, setDescription] = useState(term.description || '');
  const [note, setNote] = useState(term.note || '');
  const [related, setRelated] = useState(Object.keys(term.related || {}));

  const rc = { 秀: 'badge-rank-秀', 優: 'badge-rank-優', 良: 'badge-rank-良', 可: 'badge-rank-可' };

  const save = async () => {
    if (!name.trim()) return showToast('用語名は必須です');
    try {
      await dbSet('terms/' + id, { name, ...pathsToDbFields(knowledgePaths), category, rank, description, note, createdAt: term.createdAt || Date.now(), updatedAt: Date.now() });
      const oldIds = Object.keys(term.related || {});
      await saveTermRelations(id, oldIds, related);
      showToast('✅ 更新しました');
      onSaved?.();
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const del = async () => {
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
            <MultiPathSelector tree={knowledgeTypes} paths={knowledgePaths} onChange={setKnowledgePaths} />
          </div>
          <div className="admin-edit-group">
            <label>カテゴリ</label>
            <select className="admin-cat-sel" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES_BASE.map((c) => <option key={c} value={c}>{c}</option>)}
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
              name={name} category={category} description={description}
            />
          </div>
          <div className="admin-action-row">
            <ConfirmButton label="🗑 削除" message={`「${term.name}」を削除しますか？`} onConfirm={del} className="btn-del-term" style={{}} confirmStyle={{ background: '#dc2626', border: 'none', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }} />
            <button className="btn-save-term" onClick={save}>✅ 保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTermsTab({ terms, ghostIds = [], knowledgeTypes }) {
  const kTypes = knowledgeTypes || DEFAULT_KNOWLEDGE_TYPES.map((t) => ({
    id: null, name: t.name, children: (t.children || []).map((c) => ({ id: null, name: c.name, children: [] })),
  }));

  // デフォルトは全収束。展開したIDだけをセットで管理。
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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

  const sorted = useMemo(() => {
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms)
      .filter(([, t]) => !search || (t.name || '').includes(search) || (t.description || '').includes(search))
      .sort((a, b) =>
        (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
      );
  }, [terms, search]);

  // 説明未入力の用語は別枠に分ける
  const missingList = useMemo(() => sorted.filter(([, t]) => isDescMissing(t)), [sorted]);
  const filledList = useMemo(() => sorted.filter(([, t]) => !isDescMissing(t)), [sorted]);
  const [missingOpen, setMissingOpen] = useState(true);

  const removeAllDuplicates = () => {
    setBulkRows((rs) => {
      const next = rs.filter((_, i) => !duplicateIndices.has(i));
      return next.length ? next : [emptyRow()];
    });
    showToast(`${duplicateIndices.size}件の重複行を削除しました`);
  };

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
        <div className="section-title" style={{ marginBottom: 0 }}>用語追加</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={expandAll} style={{ background: 'var(--pl)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--pd)', fontFamily: 'inherit' }}>全展開</button>
          <button onClick={collapseAll} style={{ background: '#f0ebe6', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--sub)', fontFamily: 'inherit' }}>全収束</button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 用語名・説明文で検索"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.85rem', fontFamily: 'inherit', marginBottom: 12, background: '#fff' }}
      />

      {/* 一括登録中に重複がある時だけ、検索欄の下にまとめて表示する */}
      {duplicateRows.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#dc2626' }}>
              重複している用語が{duplicateRows.length}件あります
            </span>
            <button
              onClick={removeAllDuplicates}
              style={{ background: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              重複をまとめて削除
            </button>
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
        knowledgeTypes={kTypes}
      />

      {ghostIds.length > 0 && (
        <div className="missing-box" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <div className="missing-title" style={{ color: '#991b1b' }}>名前のない壊れたデータが{ghostIds.length}件あります</div>
              <div className="missing-sub" style={{ color: '#b91c1c' }}>削除した用語の関連付けだけが残ったものです。画面には表示されませんが、削除しておくのがおすすめです</div>
            </div>
            <button
              onClick={async () => {
                try {
                  const u = {}; ghostIds.forEach((id) => { u['terms/' + id] = null; });
                  await dbUpdateMany(u);
                  showToast(ghostIds.length + '件の壊れたデータを削除しました');
                } catch (e) { showToast('エラー:' + e.message); }
              }}
              style={{ flexShrink: 0, background: '#dc2626', border: 'none', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: '.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              削除する
            </button>
          </div>
        </div>
      )}

      {!sorted.length ? (
        <div className="tc ts" style={{ padding: 30 }}>{search ? '該当する用語がありません' : '用語データなし'}</div>
      ) : (
        <>
          {missingList.length > 0 && (
            <div className="missing-box">
              <div className="missing-head" onClick={() => setMissingOpen((o) => !o)}>
                <div>
                  <div className="missing-title">説明が未入力の用語（{missingList.length}件）</div>
                  <div className="missing-sub">説明を入れて保存すると下の一覧に移ります。未入力のうちはユーザー側・テストには表示されません</div>
                </div>
                <span style={{ color: 'var(--sub)', fontSize: '.9rem' }}>{missingOpen ? '▲' : '▼'}</span>
              </div>
              {missingOpen && (
                <div className="admin-terms-list">
                  {missingList.map(([id, t]) => (
            <TermItem
              key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
              knowledgeTypes={kTypes}
              expanded={expandedIds.has(id)}
              onToggle={() => toggle(id)}
            />
          ))}
                </div>
              )}
            </div>
          )}

          <div className="section-title" style={{ fontSize: '.85rem', margin: '4px 0 8px' }}>登録済みの用語（{filledList.length}件）</div>
          {filledList.length ? (
            <div className="admin-terms-list">
              {filledList.map(([id, t]) => (
            <TermItem
              key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
              knowledgeTypes={kTypes}
              expanded={expandedIds.has(id)}
              onToggle={() => toggle(id)}
            />
          ))}
            </div>
          ) : (
            <div className="tc ts" style={{ padding: 20 }}>{search ? '該当する用語がありません' : 'まだありません'}</div>
          )}
        </>
      )}
    </div>
  );
}
