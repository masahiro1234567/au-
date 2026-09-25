import React, { useState } from 'react';
import { showToast, getTermPath } from '../utils.js';
import { dbPush, dbSet, dbRemove } from '../useFirebase.js';

// デフォルト値（id=null）はFirebaseにまだ無いので、書き込みが必要になった時点で実体化してidを得る。
// pathは「ルートから対象ノードまでの名前の配列」。実体化しながらFirebase上の実パス（idの配列）を返す。
export async function ensureNodeId(tree, path) {
  let nodes = tree;
  let dbPath = 'knowledge_types';
  for (let i = 0; i < path.length; i++) {
    const node = nodes.find((n) => n.name === path[i]);
    let id = node?.id;
    if (!id) {
      const ref = await dbPush(i === 0 ? 'knowledge_types' : `knowledge_types/${dbPath}`, { name: path[i] });
      id = ref.key;
    }
    dbPath = i === 0 ? id : `${dbPath}/children/${id}`;
    nodes = node?.children || [];
  }
  return dbPath;
}

export const DEPTH_COLORS = [
  { bg: '#E1F5EE', border: '#1D9E75', text: '#04342C' },
  { bg: '#FAECE7', border: '#D85A30', text: '#4A1B0C' },
  { bg: '#EEEDFE', border: '#7F77DD', text: '#26215C' },
  { bg: '#FBEAF0', border: '#D4537E', text: '#4B1528' },
  { bg: '#FAEEDA', border: '#BA7517', text: '#412402' },
];

// 1つのノードを再帰的に描画する（子がいれば、その子もまた同じ形で描画される＝何段でも深くできる）
export function TreeNode({ node, path, depth, siblingIndex, openIds, setOpenIds, newChildNames, setNewChildNames, onRename, onRemove, onAddChild }) {
  const key = [...path, node.name].join(' / ') + '#' + (node.id || `d${siblingIndex}`);
  const isOpen = !!openIds[key];
  const c = DEPTH_COLORS[(depth + siblingIndex) % DEPTH_COLORS.length];
  const childPath = [...path, node.name];
  const newName = newChildNames[key] || '';

  return (
    <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      <div
        onClick={() => setOpenIds((prev) => ({ ...prev, [key]: !prev[key] }))}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.bg, padding: '9px 12px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '.82rem', fontWeight: 800, color: c.text }}>
          {node.name}
          {!node.id && <span style={{ fontSize: '.62rem', opacity: .7, marginLeft: 6, fontWeight: 500 }}>（初期値）</span>}
          {node.children.length > 0 && (
            <span style={{ fontSize: '.64rem', fontWeight: 700, marginLeft: 8, background: 'rgba(255,255,255,.6)', padding: '2px 7px', borderRadius: 10 }}>
              子 {node.children.length}件
            </span>
          )}
        </span>
        <span style={{ fontSize: '.9rem', color: c.text }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: 12, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '.68rem', color: 'var(--sub)', flexShrink: 0 }}>名前</span>
            <input
              defaultValue={node.name}
              onBlur={(e) => onRename(path, node, e.target.value)}
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: '.78rem', fontFamily: 'inherit' }}
            />
            {node.id && (
              <button onClick={() => onRemove(path, node)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 9px', color: '#dc2626', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>削除</button>
            )}
          </div>

          <div style={{ paddingLeft: 14, borderLeft: `3px solid ${c.border}` }}>
            {node.children.map((child, ci) => (
              <TreeNode
                key={child.id || `${key}-${ci}`}
                node={child} path={childPath} depth={depth + 1} siblingIndex={ci}
                openIds={openIds} setOpenIds={setOpenIds}
                newChildNames={newChildNames} setNewChildNames={setNewChildNames}
                onRename={onRename} onRemove={onRemove} onAddChild={onAddChild}
              />
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: node.children.length ? 6 : 0 }}>
              <input
                value={newName}
                onChange={(e) => setNewChildNames((prev) => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && onAddChild(childPath, key)}
                placeholder="新しい子の名前"
                style={{ flex: 1, border: `1.5px solid ${c.border}`, borderRadius: 7, padding: '7px 9px', fontSize: '.78rem', fontFamily: 'inherit' }}
              />
              <button
                onClick={() => onAddChild(childPath, key)}
                style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: c.border, color: '#fff', fontSize: '.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >
                ＋追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 知識区分の管理パネル。ルートの項目も、その子も、さらに子の子も……何段でも同じ操作で追加・編集・削除できる
export function KnowledgeConfigManager({ knowledgeTypes, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [openIds, setOpenIds] = useState({});
  const [newChildNames, setNewChildNames] = useState({});
  const [newRootName, setNewRootName] = useState('');

  const addRoot = async () => {
    const name = newRootName.trim();
    if (!name) return showToast('名前を入力してください');
    try {
      await dbPush('knowledge_types', { name });
      setNewRootName('');
      showToast('✅ 追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const onRename = async (parentPath, node, name) => {
    if (!name.trim() || name === node.name) return;
    try {
      const dbPath = await ensureNodeId(knowledgeTypes, [...parentPath, node.name]);
      await dbSet(`knowledge_types/${dbPath}/name`, name.trim());
      showToast('✅ 変更しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const onRemove = async (parentPath, node) => {
    if (!node.id) return showToast('初期値は削除できません');
    if (!confirm(`「${node.name}」を削除しますか？（すでに用語に付けたタグはそのまま残ります）`)) return;
    try {
      const dbPath = await ensureNodeId(knowledgeTypes, [...parentPath, node.name]);
      await dbRemove(`knowledge_types/${dbPath}`);
      showToast('🗑 削除しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const onAddChild = async (parentPath, key) => {
    const name = (newChildNames[key] || '').trim();
    if (!name) return showToast('名前を入力してください');
    try {
      const dbPath = await ensureNodeId(knowledgeTypes, parentPath);
      await dbPush(`knowledge_types/${dbPath}/children`, { name });
      setNewChildNames((prev) => ({ ...prev, [key]: '' }));
      showToast('✅ 追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: '.82rem', fontWeight: 800 }}>⚙️ 知識区分（枝分かれ）の管理</span>
        <span style={{ fontSize: '1rem', color: 'var(--sub)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16 }}>
          <div style={{ fontSize: '.72rem', color: 'var(--sub)', marginBottom: 10 }}>
            「すべて」の下に、好きな深さまで項目を追加できます。項目を開くと、その中にさらに項目を追加できます。
          </div>
          {knowledgeTypes.map((node, i) => (
            <TreeNode
              key={node.id || `root-${i}`}
              node={node} path={[]} depth={0} siblingIndex={i}
              openIds={openIds} setOpenIds={setOpenIds}
              newChildNames={newChildNames} setNewChildNames={setNewChildNames}
              onRename={onRename} onRemove={onRemove} onAddChild={onAddChild}
            />
          ))}
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', border: '1.5px dashed var(--border)', borderRadius: 9, padding: 10, marginTop: 6 }}>
            <input
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRoot()}
              placeholder="新しい項目の名前（例：他社知識(法人)）"
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 9px', fontSize: '.8rem', fontFamily: 'inherit' }}
            />
            <button
              onClick={addRoot}
              style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              ＋追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 用語管理画面の上部に出すマインドマップ（線でつながった構成図・縦方向・コンパクト）
// ※見た目は「ルート→その子」までの2段で表示（さらに深い階層はここには出ないが、登録画面のPathSelectorでは何段でも選べる）
export function TermMindMap({ terms, knowledgeTypes, mapFilter, onSelect }) {
  const countFor = (path) => Object.values(terms).filter((t) => {
    const tp = getTermPath(t);
    return tp.length === path.length && path.every((p, i) => tp[i] === p);
  }).length;

  const isActive = (path) => !!mapFilter && mapFilter.length === path.length && mapFilter.every((p, i) => p === path[i]);
  const dim = (active) => (mapFilter && !active ? 0.4 : 1);

  const N = Math.max(knowledgeTypes.length, 1);
  const GAP = 8;
  const COL_W = Math.min(110, (360 - GAP * (N - 1)) / N);
  const totalW = COL_W * N + GAP * (N - 1);
  const startX = (380 - totalW) / 2;

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
      <svg width="100%" viewBox="0 0 380 172" style={{ maxWidth: 700, display: 'block' }}>
        <g style={{ cursor: 'pointer' }} onClick={() => onSelect(null)}>
          <rect x={140} y={4} width={100} height={28} rx={8} fill={mapFilter === null ? '#f97316' : '#F1EFE8'} stroke="#888780" strokeWidth={0.5} />
          <text x={190} y={18} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={mapFilter === null ? '#fff' : '#2C2C2A'}>すべて</text>
        </g>

        {knowledgeTypes.map((type, ti) => {
          const c = DEPTH_COLORS[ti % DEPTH_COLORS.length];
          const x = startX + ti * (COL_W + GAP);
          const cx = x + COL_W / 2;
          const rootPath = [type.name];
          const active = isActive(rootPath);

          return (
            <g key={type.id || ti}>
              <path d={`M190 32 C190 42, ${cx} 46, ${cx} 56`} fill="none" stroke={c.border} strokeWidth={0.75} />
              <g
                style={{ cursor: 'pointer', opacity: dim(active) }}
                onClick={() => onSelect(active ? null : rootPath)}
              >
                <rect x={x} y={56} width={COL_W} height={30} rx={8} fill={c.bg} stroke={c.border} strokeWidth={active ? 2 : 0.5} />
                <text x={cx} y={71} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(12, COL_W / 7)} fontWeight={700} fill={c.text}>{type.name}</text>
              </g>
              {type.children.map((ch, i) => {
                const chW = COL_W / 2 - 3;
                const chX = x + i * (COL_W / 2 + 3);
                const chCx = chX + chW / 2;
                const chPath = [...rootPath, ch.name];
                const chActive = isActive(chPath);
                return (
                  <g key={ch.id || ch.name}>
                    <path d={`M${cx} 86 C${cx} 96, ${chCx} 98, ${chCx} 108`} fill="none" stroke={c.border} strokeWidth={0.5} />
                    <g style={{ cursor: 'pointer', opacity: dim(chActive) }} onClick={() => onSelect(chActive ? null : chPath)}>
                      <rect x={chX} y={108} width={chW} height={28} rx={6} fill={chActive ? c.border : '#fff'} stroke={c.border} strokeWidth={chActive ? 2 : 0.5} />
                      <text x={chCx} y={122} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={chActive ? '#fff' : c.text}>{ch.name}({countFor(chPath)})</text>
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
