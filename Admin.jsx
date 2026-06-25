import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { TermFormModal, TermDetailModal } from './TermModals.jsx';
import { esc, escRe, showToast, RANKS, CATEGORIES } from '../utils.js';
import { dbPush, dbSet, dbRemove } from '../useFirebase.js';

function highlight(text, q) {
  if (!q) return esc(text);
  const safe = esc(text);
  try {
    return safe.replace(new RegExp(escRe(q), 'g'), (m) => `<span class="hl">${m}</span>`);
  } catch {
    return safe;
  }
}

export default function Glossary({ terms, isAdmin, onGoTest, onAdminLogin }) {
  const [rank, setRank] = useState('all');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, term } or null

  const entries = useMemo(() => Object.entries(terms), [terms]);

  const rankCounts = useMemo(() => {
    const c = {};
    entries.forEach(([, t]) => { c[t.rank] = (c[t.rank] || 0) + 1; });
    return c;
  }, [entries]);

  const catCounts = useMemo(() => {
    const c = {};
    entries.forEach(([, t]) => { c[t.category] = (c[t.category] || 0) + 1; });
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(([, t]) =>
      (rank === 'all' || t.rank === rank) &&
      (cat === 'all' || t.category === cat) &&
      (!q || (t.name || '').includes(q) || (t.description || '').includes(q) || (t.note || '').includes(q))
    );
  }, [entries, rank, cat, q]);

  const resetFilters = () => { setRank('all'); setCat('all'); };

  const detailTerm = detailId ? terms[detailId] : null;

  const handleAdd = async (form) => {
    try {
      await dbPush('terms', { ...form, createdAt: Date.now() });
      setEditing(null);
      showToast('✅ 用語を追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const handleUpdate = async (form) => {
    try {
      await dbSet('terms/' + editing.id, { ...form, updatedAt: Date.now() });
      setEditing(null);
      showToast('✅ 更新しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('削除しますか？')) return;
    try {
      await dbRemove('terms/' + editing.id);
      setEditing(null);
      setDetailId(null);
      showToast('🗑 削除しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  return (
    <div className="page" style={{ display: 'flex' }}>
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>au事業部 用語集</h1>
        </div>
        <div className="hdr-right">
          <button
            className={`btn-toggle ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>
      <div className="app-body">
        <div className="main">
          <div className="search-wrap">
            <div className="search-box">
              <span style={{ color: 'var(--sub)' }}>🔍</span>
              <input
                type="search"
                placeholder="用語を検索..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
              />
              {q && <button className="search-clear show" onClick={() => setQ('')}>✕</button>}
            </div>
          </div>
          <div className="active-filters">
            {rank !== 'all' && (
              <span className={`filter-chip fc-${rank}`} onClick={() => setRank('all')}>ランク:{rank} ✕</span>
            )}
            {cat !== 'all' && (
              <span className="filter-chip fc-cat" onClick={() => setCat('all')}>{cat} ✕</span>
            )}
          </div>
          <div className="terms-count">{filtered.length}件</div>
          {!filtered.length ? (
            <div className="empty-state">
              <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📭</div>
              <p>該当する用語がありません</p>
            </div>
          ) : (
            <div className="terms-grid">
              {filtered.map(([id, t]) => (
                <div className="term-card" data-rank={t.rank || ''} key={id} onClick={() => setDetailId(id)}>
                  <div className="term-stripe" />
                  <div className="term-body">
                    <div className="term-top">
                      <div className="term-name" dangerouslySetInnerHTML={{ __html: highlight(t.name, q) }} />
                      <div className="term-badges">
                        {t.rank && <span className={`badge badge-rank-${t.rank}`}>{t.rank}</span>}
                        <span className="badge badge-cat">{t.category}</span>
                      </div>
                    </div>
                    <p className="term-desc" dangerouslySetInnerHTML={{ __html: highlight(t.description, q) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          rank={rank} setRank={(r) => { setRank(r); }}
          cat={cat} setCat={(c) => { setCat(c); setSidebarOpen(false); }}
          rankCounts={rankCounts} catCounts={catCounts} totalCount={entries.length}
          onReset={resetFilters}
          onGoTest={() => { setSidebarOpen(false); onGoTest(); }}
          onAdminLogin={() => { setSidebarOpen(false); onAdminLogin(); }}
        />
      </div>

      <TermDetailModal
        open={!!detailId}
        term={detailTerm}
        isAdmin={isAdmin}
        onClose={() => setDetailId(null)}
        onEdit={() => { setEditing({ id: detailId, term: detailTerm }); setDetailId(null); }}
      />
      <TermFormModal
        open={!!editing}
        mode={editing?.id ? 'edit' : 'add'}
        initial={editing?.term}
        onClose={() => setEditing(null)}
        onSubmit={editing?.id ? handleUpdate : handleAdd}
        onDelete={handleDelete}
      />
    </div>
  );
}
