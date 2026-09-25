import React, { useLayoutEffect, useRef, useState } from 'react';
import { showToast, getTermPath } from '../utils.js';
import { dbPush, dbSet, dbRemove, dbGet, dbUpdateMany } from '../useFirebase.js';
import { ConfirmButton } from './ConfirmButton.jsx';

// デフォルトの子ノード群を、実体化した親の下に再帰的に複製する（実体化のたびに子が消えてしまうのを防ぐ）
async function seedDefaultChildren(childrenDbPath, children) {
  for (const [i, child] of children.entries()) {
    const ref = await dbPush(childrenDbPath, { name: child.name, order: i });
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
  // 新しい子は末尾に来るよう、order に現在時刻を入れる
  await dbPush(`knowledge_types/${dbPath}/children`, { name: trimmed, order: Date.now() });
}

// 指定したノードの子の並び順を保存する（orderedNames＝並べたい順の子の名前）
export async function reorderKnowledgeChildren(knowledgeTypes, parentPath, orderedNames) {
  const dbPath = await ensureNodeId(knowledgeTypes, parentPath);
  // 親を実体化した直後は子のidが手元に無いので、Firebaseから読み直して名前で対応付ける
  const raw = (await dbGet(`knowledge_types/${dbPath}/children`)) || {};
  const idByName = new Map(Object.entries(raw).map(([id, c]) => [c.name, id]));
  const updates = {};
  orderedNames.forEach((name, i) => {
    const id = idByName.get(name);
    if (id) updates[`knowledge_types/${dbPath}/children/${id}/order`] = i;
  });
  await dbUpdateMany(updates);
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

// ===== マインドマップ（図） =====
// ノードの横幅を「文字の長さ」から計算し、子孫全体の幅を下から積み上げて配置する。
// そのため、どれだけ階層が深く・枝が多くてもノード同士が重ならない。
// zoom を上げると文字だけでなく「横の間隔・縦の間隔」も広がるので、混み合った部分が見やすくなる。

// 文字列の表示幅をざっくり推定（全角≒1em、半角≒0.6em）
function estimateTextW(str, fontSize) {
  let w = 0;
  for (const ch of str || '') w += /[\u0000-\u00ff]/.test(ch) ? 0.6 : 1;
  return w * fontSize;
}

// ツリーをレイアウト用の構造に変換（各ノードの箱の幅と、子孫を含めた幅を計算）
function measureTree(node, path, labelFor, m) {
  const label = labelFor(node, path);
  const boxW = estimateTextW(label, m.font) + m.padX * 2;
  const children = (node.children || []).map((ch) => measureTree(ch, [...path, ch.name], labelFor, m));
  const childrenW = children.reduce((s, c) => s + c.subtreeW, 0) + Math.max(0, children.length - 1) * m.gapX;
  return { node, path, label, boxW, children, childrenW, subtreeW: Math.max(boxW, childrenW) };
}

// 計算済みの幅をもとに、実際の座標を決める
function placeTree(item, x, depth, m, out, parent) {
  const cx = x + item.subtreeW / 2;
  const y = m.top + depth * m.rowH;
  const placed = { ...item, cx, y };
  out.push({ item: placed, parent });
  let cursor = x + (item.subtreeW - item.childrenW) / 2;
  item.children.forEach((ch) => {
    placeTree(ch, cursor, depth + 1, m, out, placed);
    cursor += ch.subtreeW + m.gapX;
  });
}

// ツリー全体で一番深い階層数（描画エリアの高さを決めるため）
function maxDepth(nodes) {
  if (!nodes || !nodes.length) return 0;
  return 1 + Math.max(...nodes.map((n) => maxDepth(n.children)));
}

function metricsFor(zoom) {
  const z = zoom || 1;
  return {
    font: Math.round(11 + 2 * (z - 1)),       // 文字は控えめに大きくなる
    padX: 10 + 2 * (z - 1),
    boxH: 26 + 4 * (z - 1),
    gapX: 14 * z * z,                          // 横の間隔は大きく広がる
    rowH: 58 * (0.7 + 0.3 * z) + 10 * (z - 1), // 縦の間隔も広がる
    top: 12,
    margin: 16,
  };
}

// 用語管理画面の上部に出すマインドマップ。ノードとその子孫を何段でも描画する
export function TermMindMap({ terms, knowledgeTypes, mapFilter, onSelect, editable, onEditNode, zoom = 1 }) {
  const countFor = (path) => Object.values(terms).filter((t) => {
    const tp = getTermPath(t);
    return tp.length === path.length && path.every((p, i) => tp[i] === p);
  }).length;

  const isActive = (path) => !!mapFilter && mapFilter.length === path.length && mapFilter.every((p, i) => p === path[i]);
  const dim = (active) => (mapFilter && !active ? 0.4 : 1);
  const handleClick = (path) => {
    if (editable) { if (path.length) onEditNode?.(path); return; }
    if (!path.length) { onSelect(null); return; }
    onSelect(isActive(path) ? null : path);
  };

  const m = metricsFor(zoom);
  const labelFor = (node, path) => {
    if (!path.length) return 'すべて';
    const name = node.name || '（名前なし）';
    return path.length > 1 ? `${name}（${countFor(path)}）` : name;
  };
  const root = measureTree({ name: 'すべて', children: knowledgeTypes }, [], labelFor, m);
  const nodes = [];
  placeTree(root, m.margin, 0, m, nodes, null);

  const width = root.subtreeW + m.margin * 2;
  const depth = maxDepth(knowledgeTypes);
  const height = m.top + depth * m.rowH + m.boxH + m.margin;

  // 最上位の枝ごとに色を変える
  const colorOf = (path) => {
    if (!path.length) return { bg: '#F1EFE8', border: '#888780', text: '#2C2C2A' };
    const idx = knowledgeTypes.findIndex((t) => t.name === path[0]);
    return DEPTH_COLORS[(idx < 0 ? 0 : idx) % DEPTH_COLORS.length];
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto' }}>
      {nodes.filter((n) => n.parent).map(({ item, parent }) => {
        const c = colorOf(item.path);
        const y1 = parent.y + m.boxH;
        const y2 = item.y;
        const my = (y1 + y2) / 2;
        return (
          <path key={'l-' + item.path.join('/')}
            d={`M${parent.cx} ${y1} C${parent.cx} ${my}, ${item.cx} ${my}, ${item.cx} ${y2}`}
            fill="none" stroke={c.border} strokeWidth={1} opacity={dim(isActive(item.path))} />
        );
      })}
      {nodes.map(({ item }) => {
        const c = colorOf(item.path);
        const isRoot = !item.path.length;
        const active = isRoot ? mapFilter === null : isActive(item.path);
        const fill = active ? (isRoot ? '#f97316' : c.border) : c.bg;
        return (
          <g key={'n-' + (item.path.join('/') || 'root')} data-node="1"
            style={{ cursor: 'pointer', opacity: isRoot ? 1 : dim(active) }}
            onClick={() => handleClick(item.path)}>
            <rect x={item.cx - item.boxW / 2} y={item.y} width={item.boxW} height={m.boxH} rx={m.boxH / 3.5}
              fill={fill} stroke={active && isRoot ? '#f97316' : c.border}
              strokeWidth={active ? 2 : 0.8}
              strokeDasharray={editable && !isRoot ? '4 3' : undefined} />
            <text x={item.cx} y={item.y + m.boxH / 2} textAnchor="middle" dominantBaseline="central"
              fontSize={m.font} fontWeight={700} fill={active ? '#fff' : c.text}>
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
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

// マインドマップ（図）の表示枠。
// ＋／－で zoom を変えると、図のレイアウト自体が広がる（単純な拡大ではなく、間隔が開いて重なりが解消される）。
// 枠内はスクロール可能で、PCではドラッグでも移動できる。拡大・縮小時は見ている中心位置を保つ。
const ZOOM_STEPS = [0.8, 1, 1.25, 1.5, 1.8, 2.2];

export function ZoomPanBox({ children, height }) {
  const [zi, setZi] = useState(1);
  const zoom = ZOOM_STEPS[zi];
  const boxRef = useRef(null);
  const drag = useRef({ on: false, moved: false, sx: 0, sy: 0, sl: 0, st: 0 });
  const ratio = useRef(null);

  const changeZoom = (next) => {
    const el = boxRef.current;
    if (el) {
      ratio.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / Math.max(1, el.scrollWidth),
        y: (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight),
      };
    }
    setZi(Math.max(0, Math.min(ZOOM_STEPS.length - 1, next)));
  };

  // 拡大・縮小後に、直前に見ていた中心へスクロール位置を戻す
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !ratio.current) return;
    el.scrollLeft = ratio.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = ratio.current.y * el.scrollHeight - el.clientHeight / 2;
    ratio.current = null;
  }, [zi]);

  // PC：マウスドラッグで移動（スマホは通常のスクロールで移動）
  const onDown = (e) => {
    const el = boxRef.current;
    drag.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    boxRef.current.scrollLeft = d.sl - dx;
    boxRef.current.scrollTop = d.st - dy;
  };
  const onUp = () => { drag.current.on = false; };
  // ドラッグ直後のクリックでノードが反応しないようにする
  const onClickCapture = (e) => {
    if (drag.current.moved) { e.stopPropagation(); drag.current.moved = false; }
  };

  const btn = { minWidth: 32, height: 30, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit', color: 'var(--text)' };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: '.72rem', color: 'var(--sub)', fontWeight: 700, marginRight: 'auto' }}>
          ＋で間隔が広がります
        </span>
        <button style={{ ...btn, opacity: zi === 0 ? 0.4 : 1 }} disabled={zi === 0} onClick={() => changeZoom(zi - 1)}>－</button>
        <button style={btn} onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button style={{ ...btn, opacity: zi === ZOOM_STEPS.length - 1 ? 0.4 : 1 }} disabled={zi === ZOOM_STEPS.length - 1} onClick={() => changeZoom(zi + 1)}>＋</button>
      </div>
      <div
        ref={boxRef}
        style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch', border: '1.5px solid var(--border)', borderRadius: 10, height: height || 280, cursor: 'grab', background: '#fff', userSelect: 'none' }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onClickCapture={onClickCapture}
      >
        <div style={{ minWidth: '100%', width: 'max-content', padding: '4px 0' }}>
          {React.isValidElement(children) ? React.cloneElement(children, { zoom }) : children}
        </div>
      </div>
    </div>
  );
}
