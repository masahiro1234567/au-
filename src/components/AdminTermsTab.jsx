import React, { useMemo, useState } from 'react';
import { CATEGORIES, RANKS, showToast } from '../utils.js';
import { dbPush, dbSet, dbRemove } from '../useFirebase.js';

const emptyRow = () => ({ name: '', category: CATEGORIES[0], rank: '秀', description: '', note: '' });

function BulkAddSection({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);

  const updateRow = (i, key, val) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  };
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

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
          {rows.map((row, i) => (
            <div className="bulk-row" key={i}>
              <div className="bulk-row-top">
                <span style={{ fontSize: '.75rem', color: 'var(--sub)', fontWeight: 700 }}>用語 {i + 1}</span>
                {rows.length > 1 && <button className="btn-row-del" onClick={() => removeRow(i)}>削除</button>}
              </div>
              <div className="bulk-row-fields">
                <input className="bulk-name" placeholder="用語名 *" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
                <select className="bulk-cat" value={row.category} onChange={(e) => updateRow(i, 'category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <button
            onClick={addRow}
            style={{ width: '100%', padding: 9, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg)', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--sub)', marginBottom: 10 }}
          >
            ＋ 行を追加
          </button>
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

function TermItem({ id, term, expanded, onToggle, onSaved, onDeleted }) {
  const [name, setName] = useState(term.name || '');
  const [category, setCategory] = useState(term.category || CATEGORIES[0]);
  const [rank, setRank] = useState(term.rank || '秀');
  const [description, setDescription] = useState(term.description || '');
  const [note, setNote] = useState(term.note || '');

  const rc = { 秀: 'badge-rank-秀', 優: 'badge-rank-優', 良: 'badge-rank-良', 可: 'badge-rank-可' };

  const save = async () => {
    if (!name.trim() || !description.trim()) return showToast('用語名と説明は必須です');
    try {
      await dbSet('terms/' + id, { name, category, rank, description, note, updatedAt: Date.now() });
      showToast('✅ 更新しました');
      onSaved?.();
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const del = async () => {
    if (!confirm('この用語を削除しますか？')) return;
    try {
      await dbRemove('terms/' + id);
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
            <label>カテゴリ</label>
            <select className="admin-cat-sel" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

  const sorted = useMemo(() => {
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms).sort((a, b) =>
      (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
    );
  }, [terms]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>用語管理</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={expandAll} style={{ background: 'var(--pl)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--pd)', fontFamily: 'inherit' }}>全展開</button>
          <button onClick={collapseAll} style={{ background: '#f0ebe6', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', color: 'var(--sub)', fontFamily: 'inherit' }}>全収束</button>
        </div>
      </div>

      <BulkAddSection />

      {!sorted.length ? (
        <div className="tc ts" style={{ padding: 30 }}>用語データなし</div>
      ) : (
        <div className="admin-terms-list">
          {sorted.map(([id, t]) => (
            <TermItem
              key={id} id={id} term={t}
              expanded={expandedIds.has(id)}
              onToggle={() => toggle(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
