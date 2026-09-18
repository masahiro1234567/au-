import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, CATEGORIES_SECTIONS, RANKS, showToast } from '../utils.js';
import { dbPush, dbSet, saveTermRelations, removeTermWithRelations } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';

const emptyRow = () => ({ name: '', category: CATEGORIES_BASE[0], section: '', rank: '秀', description: '', note: '' });

function BulkAddSection({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);
  const [parseText, setParseText] = useState('');

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
          {rows.map((row, i) => (
            <div className="bulk-row" key={i}>
              <div className="bulk-row-top">
                <span style={{ fontSize: '.75rem', color: 'var(--sub)', fontWeight: 700 }}>用語 {i + 1}</span>
                <button className="btn-row-del" onClick={() => removeRow(i)}>削除</button>
              </div>
              <div className="bulk-row-fields">
                <input className="bulk-name" placeholder="用語名 *" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
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
          ))}
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

function TermItem({ id, term, allTerms, expanded, onToggle, onSaved, onDeleted }) {
  const [name, setName] = useState(term.name || '');
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
      await dbSet('terms/' + id, { name, category, section, rank, description, note, updatedAt: Date.now() });
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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 用語名・説明文で検索"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.85rem', fontFamily: 'inherit', marginBottom: 12, background: '#fff' }}
      />

      <BulkAddSection />

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
    </div>
  );
}
