import React, { useMemo, useState } from 'react';
import { DEFAULT_KNOWLEDGE_TYPES, termMatchesPath } from '../utils.js';
import { saveTermRelations } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';
import { KnowledgeConfigManager, TermMindMap } from './KnowledgeTree.jsx';

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
            name={term.name} category={term.category} section={term.section} description={term.description}
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

export default function AdminKnowledgeTab({ terms, knowledgeTypes }) {
  const kTypes = knowledgeTypes || DEFAULT_KNOWLEDGE_TYPES.map((t) => ({
    id: null, name: t.name, children: (t.children || []).map((c) => ({ id: null, name: c.name, children: [] })),
  }));
  const [mapFilter, setMapFilter] = useState(null);
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

      <TermMindMap terms={terms} knowledgeTypes={kTypes} mapFilter={mapFilter} onSelect={setMapFilter} />

      {mapFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--pd)', background: 'var(--pl)', padding: '5px 10px', borderRadius: 20, fontWeight: 700 }}>
            {mapFilter.join(' / ')} で絞り込み中
          </span>
          <button onClick={() => setMapFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>✕ 解除</button>
        </div>
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
