import React, { useMemo, useState } from 'react';
import { DEFAULT_KNOWLEDGE_TYPES, termMatchesPath, showToast } from '../utils.js';
import { saveTermRelations } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';
import { ConfirmButton } from './ConfirmButton.jsx';
import {
  KnowledgeConfigManager, TermMindMap, MindMapList, ZoomPanBox,
  findKnowledgeNode, renameKnowledgeNode, removeKnowledgeNode, addKnowledgeChild,
} from './KnowledgeTree.jsx';

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

      <div style={{ fontSize: '.7rem', color: 'var(--sub)', marginBottom: 6 }}>子（{node.children.length}件）</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {node.children.length === 0 && <span style={{ fontSize: '.72rem', color: 'var(--sub)' }}>まだ子がありません</span>}
        {node.children.map((c) => (
          <span key={c.id || c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 6px 5px 12px', fontSize: '.76rem', fontWeight: 700 }}>
            {c.name || '（名前なし）'}
            {c.id && (
              <button onClick={() => doRemoveChild(c.name)} style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '.85rem', lineHeight: 1, padding: '0 4px' }}>✕</button>
            )}
          </span>
        ))}
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
