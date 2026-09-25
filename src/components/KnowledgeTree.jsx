import React, { useState } from 'react';
import { showToast, getTermPath } from '../utils.js';
import { dbPush, dbSet, dbRemove } from '../useFirebase.js';
import { ConfirmButton } from './ConfirmButton.jsx';

// デフォルトの子ノード群を、実体化した親の下に再帰的に複製する（実体化のたびに子が消えてしまうのを防ぐ）
async function seedDefaultChildren(childrenDbPath, children) {
  for (const child of children) {
    const ref = await dbPush(childrenDbPath, { name: child.name });
    if (child.children && child.children.length) {
      await seedDefaultChildren(`${childrenDbPath}/${ref.key}/children`, child.children);
    }
  }
}

// デフォルト値（id=null）はFirebaseにまだ無いので、書き込みが必要になった時点で実体化してidを得る。
// pathは「ルートから対象ノードまでの名前の配列」。実体化しながらFirebase上の実パス（idの配列）を返す。
export async function ensureNodeId(tree, path) {
  let nodes = tree;
  let dbPath = 'knowledge_types';
  for (let i = 0; i < path.length; i++) {
    const node = nodes.find((n) => n.name === path[i]);
    let id = node?.id;
    if (!id) {
      const pushPath = i === 0 ? 'knowledge_types' : `knowledge_types/${dbPath}`;
      const ref = await dbPush(pushPath, { name: path[i] });
      id = ref.key;
      // 実体化した瞬間に、デフォルトとして持ってた子（iPhone/Android等）もそのままFirebaseへ複製する
      if (node?.children?.length) {
        await seedDefaultChildren(`${pushPath}/${id}/children`, node.children);
      }
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

export function findKnowledgeNode(knowledgeTypes, path) {
  let nodes = knowledgeTypes;
  let node = null;
  for (const name of path) {
    node = nodes.find((n) => n.name === name);
    if (!node) return null;
    nodes = node.children;
  }
  return node;
}

// ノードの名前を変更する（path=ルートから対象ノードまでの名前の配列）
export async function renameKnowledgeNode(knowledgeTypes, path, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const dbPath = await ensureNodeId(knowledgeTypes, path);
  await dbSet(`knowledge_types/${dbPath}/name`, trimmed);
}

// ノードを削除する（初期値=idが無いものは削除不可）
export async function removeKnowledgeNode(knowledgeTypes, path) {
  const node = findKnowledgeNode(knowledgeTypes, path);
  if (!node?.id) throw new Error('初期値は削除できません');
  const dbPath = await ensureNodeId(knowledgeTypes, path);
  await dbRemove(`knowledge_types/${dbPath}`);
}

// 指定したノード（parentPath、[]ならルート）に新しい子を追加する
export async function addKnowledgeChild(knowledgeTypes, parentPath, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const parentNode = parentPath.length ? findKnowledgeNode(knowledgeTypes, parentPath) : { children: knowledgeTypes };
  if (parentNode && parentNode.children.some((c) => c.name === trimmed)) throw new Error('同じ名前の項目がすでにあります');
  if (!parentPath.length) {
    await dbPush('knowledge_types', { name: trimmed });
    return;
  }
  const dbPath = await ensureNodeId(knowledgeTypes, parentPath);
  await dbPush(`knowledge_types/${dbPath}/children`, { name: trimmed });
}

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
              <ConfirmButton
                label="削除"
                message={`「${node.name || '（名前なし）'}」を削除しますか？`}
                onConfirm={() => onRemove(path, node)}
                style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 9px', color: '#dc2626', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              />
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
    try {
      await addKnowledgeChild(knowledgeTypes, [], newRootName);
      setNewRootName('');
      showToast('✅ 追加しました');
    } catch (e) { showToast(e.message.includes('入力') || e.message.includes('すでに') ? e.message : 'エラー:' + e.message); }
  };

  const onRename = async (parentPath, node, name) => {
    if (!name.trim() || name === node.name) return;
    try {
      await renameKnowledgeNode(knowledgeTypes, [...parentPath, node.name], name);
      showToast('✅ 変更しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const onRemove = async (parentPath, node) => {
    try {
      await removeKnowledgeNode(knowledgeTypes, [...parentPath, node.name]);
      showToast('🗑 削除しました');
    } catch (e) { showToast(e.message); }
  };

  const onAddChild = async (parentPath, key) => {
    const name = newChildNames[key] || '';
    if (!name.trim()) return showToast('名前を入力してください');
    try {
      await addKnowledgeChild(knowledgeTypes, parentPath, name);
      setNewChildNames((prev) => ({ ...prev, [key]: '' }));
      showToast('✅ 追加しました');
    } catch (e) { showToast(e.message); }
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
// ノードの直下の「葉」の数（子が無ければ1、あれば子の葉の合計）を数える。横幅の配分に使う。
function countLeaves(node) {
  if (!node.children.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}
// ツリー全体で一番深い階層数を求める（描画エリアの高さを決めるため）
function maxDepth(nodes) {
  if (!nodes.length) return 0;
  return 1 + Math.max(...nodes.map((n) => maxDepth(n.children)));
}

const ROW_H = 52; // 1階層ごとの縦の間隔

// 1つのノードと、その子孫すべてを再帰的に描画する（何段でも深くなれる）
function MindMapBranch({ node, path, x, width, y, colorIndex, isActive, dim, handleClick, editable, countFor, parentCx }) {
  const c = DEPTH_COLORS[colorIndex % DEPTH_COLORS.length];
  const boxH = 28;
  const boxW = Math.max(30, Math.min(width - 6, path.length === 1 ? 110 : 90));
  const cx = x + width / 2;
  const active = isActive(path);
  const totalLeaves = node.children.reduce((s, ch) => s + countLeaves(ch), 0) || 1;
  let cursor = x;

  return (
    <React.Fragment>
      {parentCx != null && (
        <path d={`M${parentCx} ${y - ROW_H + 30} C${parentCx} ${y - ROW_H + 40}, ${cx} ${y - 10}, ${cx} ${y}`} fill="none" stroke={c.border} strokeWidth={0.6} />
      )}
      <g style={{ cursor: 'pointer', opacity: dim(active) }} onClick={() => handleClick(path)}>
        <rect x={cx - boxW / 2} y={y} width={boxW} height={boxH} rx={7} fill={active ? c.border : c.bg} stroke={c.border} strokeWidth={active ? 2 : 0.5} />
        <text x={cx} y={y + boxH / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(10, boxW / 8)} fontWeight={700} fill={active ? '#fff' : c.text}>
          {node.name || '（名前なし）'}{path.length > 1 ? `(${countFor(path)})` : ''}
        </text>
        {editable && <text x={cx + boxW / 2 - 9} y={y + 8} fontSize={9}>✏️</text>}
      </g>
      {node.children.map((child) => {
        const leaves = countLeaves(child);
        const w = (leaves / totalLeaves) * width;
        const el = (
          <MindMapBranch
            key={child.id || child.name}
            node={child} path={[...path, child.name]} x={cursor} width={w} y={y + ROW_H}
            colorIndex={colorIndex} isActive={isActive} dim={dim} handleClick={handleClick}
            editable={editable} countFor={countFor} parentCx={cx}
          />
        );
        cursor += w;
        return el;
      })}
    </React.Fragment>
  );
}

// 用語管理画面の上部に出すマインドマップ（線でつながった構成図・縦方向・コンパクト）
// ノードとその子孫を再帰的に描画するので、何段ネストしても図の中にそのまま表示される
export function TermMindMap({ terms, knowledgeTypes, mapFilter, onSelect, editable, onEditNode }) {
  const countFor = (path) => Object.values(terms).filter((t) => {
    const tp = getTermPath(t);
    return tp.length === path.length && path.every((p, i) => tp[i] === p);
  }).length;

  const isActive = (path) => !!mapFilter && mapFilter.length === path.length && mapFilter.every((p, i) => p === path[i]);
  const dim = (active) => (mapFilter && !active ? 0.4 : 1);
  const handleClick = (path) => {
    if (editable) { onEditNode?.(path); return; }
    onSelect(isActive(path) ? null : path);
  };

  const totalW = 360;
  const startX = 10;
  const depth = maxDepth(knowledgeTypes);
  const viewH = 56 + Math.max(depth, 1) * ROW_H + 8;
  let cursor = startX;
  const totalLeaves = knowledgeTypes.reduce((s, n) => s + countLeaves(n), 0) || 1;

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: 8, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
      <svg width="100%" viewBox={`0 0 380 ${viewH}`} style={{ maxWidth: 700, display: 'block' }}>
        <g style={{ cursor: 'pointer' }} onClick={() => !editable && onSelect(null)}>
          <rect x={140} y={4} width={100} height={28} rx={8} fill={mapFilter === null ? '#f97316' : '#F1EFE8'} stroke="#888780" strokeWidth={0.5} />
          <text x={190} y={18} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={mapFilter === null ? '#fff' : '#2C2C2A'}>すべて</text>
        </g>

        {knowledgeTypes.map((type, ti) => {
          const leaves = countLeaves(type);
          const w = (leaves / totalLeaves) * totalW;
          const el = (
            <MindMapBranch
              key={type.id || ti}
              node={type} path={[type.name]} x={cursor} width={w} y={56}
              colorIndex={ti} isActive={isActive} dim={dim} handleClick={handleClick}
              editable={editable} countFor={countFor} parentCx={190}
            />
          );
          cursor += w;
          return el;
        })}
      </svg>
    </div>
  );
}

// マインドマップを折りたたみリスト形式で表示する（デフォルトは全部閉じた状態。深い階層でもごちゃつかない）
function ListNode({ node, path, colorIndex, isActive, handleClick, editable, countFor, openIds, setOpenIds }) {
  const key = path.join(' / ');
  const isOpen = !!openIds[key];
  const c = DEPTH_COLORS[colorIndex % DEPTH_COLORS.length];
  const active = isActive(path);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px',
          borderRadius: 8, cursor: 'pointer', marginBottom: 4,
          background: active ? c.border : c.bg, border: `0.5px solid ${c.border}`,
        }}
        onClick={() => handleClick(path)}
      >
        <span style={{ fontSize: '.8rem', fontWeight: 700, color: active ? '#fff' : c.text }}>
          {node.name || '（名前なし）'}{path.length > 1 ? `（${countFor(path)}）` : ''}
          {editable && <span style={{ marginLeft: 6, fontSize: '.72rem' }}>✏️</span>}
        </span>
        {hasChildren && (
          <span
            style={{ fontSize: '.85rem', color: active ? '#fff' : c.text, padding: '0 4px' }}
            onClick={(e) => { e.stopPropagation(); setOpenIds((prev) => ({ ...prev, [key]: !prev[key] })); }}
          >
            {isOpen ? '▼' : '▶'}
          </span>
        )}
      </div>
      {hasChildren && isOpen && (
        <div style={{ paddingLeft: 16, borderLeft: `2px solid ${c.border}`, marginLeft: 4, marginBottom: 4 }}>
          {node.children.map((child) => (
            <ListNode
              key={child.id || child.name}
              node={child} path={[...path, child.name]} colorIndex={colorIndex}
              isActive={isActive} handleClick={handleClick} editable={editable} countFor={countFor}
              openIds={openIds} setOpenIds={setOpenIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindMapList({ terms, knowledgeTypes, mapFilter, onSelect, editable, onEditNode }) {
  const [openIds, setOpenIds] = useState({});
  const countFor = (path) => Object.values(terms).filter((t) => {
    const tp = getTermPath(t);
    return tp.length === path.length && path.every((p, i) => tp[i] === p);
  }).length;
  const isActive = (path) => !!mapFilter && mapFilter.length === path.length && mapFilter.every((p, i) => p === path[i]);
  const handleClick = (path) => {
    if (editable) { onEditNode?.(path); return; }
    onSelect(isActive(path) ? null : path);
  };

  return (
    <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
      <div
        onClick={() => !editable && onSelect(null)}
        style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, cursor: 'pointer', background: mapFilter === null ? '#f97316' : '#F1EFE8', color: mapFilter === null ? '#fff' : '#2C2C2A', fontSize: '.8rem', fontWeight: 700 }}
      >
        すべて
      </div>
      {knowledgeTypes.map((node, i) => (
        <ListNode
          key={node.id || i}
          node={node} path={[node.name]} colorIndex={i}
          isActive={isActive} handleClick={handleClick} editable={editable} countFor={countFor}
          openIds={openIds} setOpenIds={setOpenIds}
        />
      ))}
    </div>
  );
}

// マインドマップ（図）に拡大縮小・ドラッグ移動をつけて表示するラッパー
export function ZoomPanBox({ children, height }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useState({ dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 })[0];

  const apply = () => ({ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0' });

  const onDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    dragRef.dragging = true;
    dragRef.startX = p.clientX; dragRef.startY = p.clientY;
    dragRef.startPanX = pan.x; dragRef.startPanY = pan.y;
  };
  const onMove = (e) => {
    if (!dragRef.dragging) return;
    const p = e.touches ? e.touches[0] : e;
    setPan({ x: dragRef.startPanX + (p.clientX - dragRef.startX), y: dragRef.startPanY + (p.clientY - dragRef.startY) });
  };
  const onUp = () => { dragRef.dragging = false; };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
        <button onClick={() => setScale((s) => Math.max(0.4, s - 0.2))} style={{ width: 32, padding: 0, border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '.82rem' }}>－</button>
        <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} style={{ padding: '4px 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '.72rem' }}>リセット</button>
        <button onClick={() => setScale((s) => Math.min(2.5, s + 0.2))} style={{ width: 32, padding: 0, border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '.82rem' }}>＋</button>
      </div>
      <div
        style={{ overflow: 'hidden', border: '1.5px solid var(--border)', borderRadius: 10, height: height || 260, cursor: 'grab', background: '#fff' }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      >
        <div style={apply()}>{children}</div>
      </div>
    </div>
  );
}
