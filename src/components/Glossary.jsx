import React, { useMemo, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { TermFormModal, TermDetailModal } from './TermModals.jsx';
import { esc, escRe, showToast, RANKS, CATEGORIES_BASE, CATEGORIES_SECTIONS } from '../utils.js';
import { dbPush, dbSet, saveTermRelations, removeTermWithRelations } from '../useFirebase.js';

function highlight(text, q) {
  if (!q) return esc(text);
  const safe = esc(text);
  try {
    return safe.replace(new RegExp(escRe(q), 'g'), (m) => `<span class="hl">${m}</span>`);
  } catch {
    return safe;
  }
}

export default function Glossary({ terms, isAdmin, initialCat, initialSection, initialKnowledgeType, initialKnowledgeSubType, knowledgeTypes, knowledgeSubtypes, onBackHome, onGoTest, onAdminLogin }) {
  const [rank, setRank] = useState('all');
  const [cat, setCat] = useState(initialCat || 'all');
  const [section, setSection] = useState(initialSection || 'all');
  const [knowledgeType, setKnowledgeType] = useState(initialKnowledgeType || 'all');
  const [knowledgeSubType, setKnowledgeSubType] = useState(initialKnowledgeSubType || 'all');
  const [q, setQ] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailHistory, setDetailHistory] = useState([]);
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

  const sectionCounts = useMemo(() => {
    const c = {};
    entries.forEach(([, t]) => { if (t.section) c[t.section] = (c[t.section] || 0) + 1; });
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(([, t]) =>
      (rank === 'all' || t.rank === rank) &&
      (cat === 'all' || t.category === cat) &&
      (section === 'all' || t.section === section) &&
      (knowledgeType === 'all' || t.knowledgeType === knowledgeType) &&
      (knowledgeSubType === 'all' || t.knowledgeSubType === knowledgeSubType) &&
      (!q || (t.name || '').includes(q) || (t.description || '').includes(q) || (t.note || '').includes(q))
    );
  }, [entries, rank, cat, section, knowledgeType, knowledgeSubType, q]);

  const resetFilters = () => { setRank('all'); setCat('all'); setSection('all'); setKnowledgeType('all'); setKnowledgeSubType('all'); };

  const detailTerm = detailId ? terms[detailId] : null;

  const handleAdd = async (form) => {
    try {
      const { related, ...rest } = form;
      const newId = await dbPush('terms', { ...rest, createdAt: Date.now() });
      await saveTermRelations(newId.key, [], related || []);
      setEditing(null);
      showToast('✅ 用語を追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const handleUpdate = async (form) => {
    try {
      const { related, ...rest } = form;
      await dbSet('terms/' + editing.id, { ...rest, updatedAt: Date.now() });
      const oldIds = Object.keys(editing.term.related || {});
      await saveTermRelations(editing.id, oldIds, related || []);
      setEditing(null);
      showToast('✅ 更新しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('削除しますか？')) return;
    try {
      const relatedIds = Object.keys(editing.term.related || {});
      await removeTermWithRelations(editing.id, relatedIds);
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
          {onBackHome && <button className="btn-back" onClick={onBackHome}>← ホーム</button>}
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
            {knowledgeType !== 'all' && (
              <span className="filter-chip fc-section" onClick={() => { setKnowledgeType('all'); setKnowledgeSubType('all'); }}>{knowledgeType} ✕</span>
            )}
            {knowledgeSubType !== 'all' && (
              <span className="filter-chip fc-section" onClick={() => setKnowledgeSubType('all')}>{knowledgeSubType} ✕</span>
            )}
            {rank !== 'all' && (
              <span className={`filter-chip fc-${rank}`} onClick={() => setRank('all')}>ランク:{rank} ✕</span>
            )}
            {cat !== 'all' && (
              <span className="filter-chip fc-cat" onClick={() => setCat('all')}>{cat} ✕</span>
            )}
            {section !== 'all' && (
              <span className="filter-chip fc-section" onClick={() => setSection('all')}>{section} ✕</span>
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
                <div className="term-card" data-rank={t.rank || ''} key={id} onClick={() => { setDetailHistory([]); setDetailId(id); }}>
                  <div className="term-stripe" />
                  <div className="term-body">
                    <div className="term-top">
                      <div className="term-name" dangerouslySetInnerHTML={{ __html: highlight(t.name, q) }} />
                      <div className="term-badges">
                        {t.rank && <span className={`badge badge-rank-${t.rank}`}>{t.rank}</span>}
                        <span className="badge badge-cat">{t.category}</span>
                        {t.section && <span className="badge badge-section">{t.section}</span>}
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
          cat={cat} setCat={(c) => { setCat(c); }}
          section={section} setSection={(s) => { setSection(s); }}
          rankCounts={rankCounts} catCounts={catCounts} sectionCounts={sectionCounts} totalCount={entries.length}
          onReset={resetFilters}
          onGoTest={() => { setSidebarOpen(false); onGoTest(); }}
          onAdminLogin={() => { setSidebarOpen(false); onAdminLogin(); }}
        />
      </div>

      <TermDetailModal
        open={!!detailId}
        term={detailTerm}
        currentId={detailId}
        allTerms={terms}
        isAdmin={isAdmin}
        onClose={() => { setDetailId(null); setDetailHistory([]); }}
        onBack={detailHistory.length > 0 ? () => {
          const prev = detailHistory[detailHistory.length - 1];
          setDetailHistory(detailHistory.slice(0, -1));
          setDetailId(prev);
        } : null}
        onEdit={() => { setEditing({ id: detailId, term: detailTerm }); setDetailId(null); }}
        onSelectRelated={(id) => { setDetailHistory([...detailHistory, detailId]); setDetailId(id); }}
      />
      <TermFormModal
        open={!!editing}
        mode={editing?.id ? 'edit' : 'add'}
        initial={editing?.term}
        allTerms={terms}
        currentId={editing?.id}
        knowledgeTypes={knowledgeTypes}
        knowledgeSubtypes={knowledgeSubtypes}
        onClose={() => setEditing(null)}
        onSubmit={editing?.id ? handleUpdate : handleAdd}
        onDelete={handleDelete}
      />
    </div>
  );
}
