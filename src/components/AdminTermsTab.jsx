import React, { useMemo, useState } from 'react';
import { CATEGORIES_BASE, CATEGORIES_SECTIONS, DEFAULT_KNOWLEDGE_TYPES, RANKS, showToast } from '../utils.js';
import { dbPush, dbSet, dbRemove, saveTermRelations, removeTermWithRelations } from '../useFirebase.js';
import { RelatedTermsTagInput } from './TermModals.jsx';

const emptyRow = () => ({ name: '', knowledgeType: '', knowledgeSubType: '', category: CATEGORIES_BASE[0], section: '', rank: '秀', description: '', note: '' });

// デフォルト値（id=null）はFirebaseにまだ無いので、書き込みが必要になった時点で実体化してidを得る
async function ensureTypeId(type) {
  if (type.id) return type.id;
  const ref = await dbPush('knowledge_types', { name: type.name });
  return ref.key;
}

// ①すべて → ②知識区分 → ③区分、の3階層をそのまま管理できるアコーディオン形式の設定パネル
// prompt()は環境によって出ない場合があるため使わず、常に見えてる入力欄＋ボタンで追加する
function KnowledgeConfigManager({ knowledgeTypes }) {
  const [open, setOpen] = useState(false);
  const [openIds, setOpenIds] = useState({});
  const [newLevel2Name, setNewLevel2Name] = useState('');
  const [newLevel3Names, setNewLevel3Names] = useState({}); // { [typeKey]: text }

  const toggleOpen = (key) => setOpenIds((prev) => ({ ...prev, [key]: !prev[key] }));

  const addLevel2 = async () => {
    const name = newLevel2Name.trim();
    if (!name) return showToast('②の名前を入力してください');
    try {
      await dbPush('knowledge_types', { name });
      setNewLevel2Name('');
      showToast('✅ 追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const renameLevel2 = async (type, name) => {
    if (!name.trim() || name === type.name) return;
    try {
      const id = await ensureTypeId(type);
      await dbSet(`knowledge_types/${id}/name`, name.trim());
      showToast('✅ 変更しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const removeLevel2 = async (type) => {
    if (!type.id) return showToast('初期値は削除できません');
    if (!confirm(`「${type.name}」を削除しますか？（すでに用語に付けたタグはそのまま残ります）`)) return;
    try { await dbRemove(`knowledge_types/${type.id}`); showToast('🗑 削除しました'); } catch (e) { showToast('エラー:' + e.message); }
  };

  const addLevel3 = async (type, key) => {
    const name = (newLevel3Names[key] || '').trim();
    if (!name) return showToast('③の名前を入力してください');
    try {
      const id = await ensureTypeId(type);
      await dbPush(`knowledge_types/${id}/children`, { name });
      setNewLevel3Names((prev) => ({ ...prev, [key]: '' }));
      showToast('✅ 追加しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const removeLevel3 = async (type, child) => {
    if (!child.id) return showToast('初期値は削除できません');
    if (!confirm(`「${child.name}」を削除しますか？`)) return;
    try {
      const id = await ensureTypeId(type);
      await dbRemove(`knowledge_types/${id}/children/${child.id}`);
      showToast('🗑 削除しました');
    } catch (e) { showToast('エラー:' + e.message); }
  };

  const NumBadge = ({ n, color }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: '50%', background: color || 'var(--sub)', color: '#fff',
      fontSize: '.68rem', fontWeight: 800, flexShrink: 0, marginRight: 7,
    }}>
      {n}
    </span>
  );

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: '.82rem', fontWeight: 800 }}>⚙️ 知識区分の管理（①すべて→②→③）</span>
        <span style={{ fontSize: '1rem', color: 'var(--sub)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', color: '#fff', borderRadius: 9, padding: '11px 14px', fontSize: '.86rem', fontWeight: 800, marginBottom: 14 }}>
            <NumBadge n="①" color="rgba(255,255,255,.3)" />すべて
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 14, borderLeft: '3px solid var(--border)', marginBottom: 12 }}>
            {knowledgeTypes.map((type, ti) => {
              const key = type.id || `default-${ti}`;
              const isOpen = !!openIds[key];
              const bg = ['#E1F5EE', '#FAECE7', '#EEEDFE', '#FBEAF0', '#FAEEDA'][ti % 5];
              const border = ['#1D9E75', '#D85A30', '#7F77DD', '#D4537E', '#BA7517'][ti % 5];
              const text = ['#04342C', '#4A1B0C', '#26215C', '#4B1528', '#412402'][ti % 5];
              return (
                <div key={key} style={{ border: `1.5px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleOpen(key)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bg, padding: '10px 12px', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '.84rem', fontWeight: 800, color: text }}>
                      <NumBadge n="②" color={border} />
                      {type.name}
                      {!type.id && <span style={{ fontSize: '.64rem', opacity: .7, marginLeft: 6, fontWeight: 500 }}>（初期値）</span>}
                      <span style={{ fontSize: '.66rem', fontWeight: 700, marginLeft: 8, background: 'rgba(255,255,255,.6)', padding: '2px 7px', borderRadius: 10 }}>
                        ③ {type.children.length}件
                      </span>
                    </span>
                    <span style={{ fontSize: '1rem', color: text }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: 12, background: '#fff' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: '.68rem', color: 'var(--sub)', flexShrink: 0 }}>②の名前</span>
                        <input
                          defaultValue={type.name}
                          onBlur={(e) => renameLevel2(type, e.target.value)}
                          style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '6px 8px', fontSize: '.78rem', fontFamily: 'inherit' }}
                        />
                        {type.id && (
                          <button onClick={() => removeLevel2(type)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 9px', color: '#dc2626', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>削除</button>
                        )}
                      </div>

                      <div style={{ paddingLeft: 14, borderLeft: `3px solid ${border}` }}>
                        <div style={{ fontSize: '.68rem', color: text, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                          <NumBadge n="③" color={border} />この②に含まれる区分
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {type.children.length === 0 && <span style={{ fontSize: '.72rem', color: 'var(--sub)' }}>まだ区分がありません</span>}
                          {type.children.map((child) => (
                            <span key={child.id || child.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, border: `1px solid ${border}`, color: text, borderRadius: 20, padding: '5px 6px 5px 12px', fontSize: '.76rem', fontWeight: 700 }}>
                              {child.name}
                              {!child.id && <span style={{ fontSize: '.6rem', opacity: .7, fontWeight: 500 }}>（初期値）</span>}
                              {child.id && (
                                <button onClick={() => removeLevel3(type, child)} style={{ background: 'none', border: 'none', color: text, opacity: .6, cursor: 'pointer', fontSize: '.85rem', lineHeight: 1, padding: '0 4px' }}>✕</button>
                              )}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={newLevel3Names[key] || ''}
                            onChange={(e) => setNewLevel3Names((prev) => ({ ...prev, [key]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addLevel3(type, key)}
                            placeholder="例：モバイル"
                            style={{ flex: 1, border: `1.5px solid ${border}`, borderRadius: 7, padding: '7px 9px', fontSize: '.78rem', fontFamily: 'inherit' }}
                          />
                          <button
                            onClick={() => addLevel3(type, key)}
                            style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: border, color: '#fff', fontSize: '.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                          >
                            ＋追加
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1.5px dashed var(--border)', borderRadius: 9, padding: 10 }}>
            <NumBadge n="②" color="var(--sub)" />
            <input
              value={newLevel2Name}
              onChange={(e) => setNewLevel2Name(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLevel2()}
              placeholder="新しい②の名前（例：他社知識(法人)）"
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: 7, padding: '7px 9px', fontSize: '.8rem', fontFamily: 'inherit' }}
            />
            <button
              onClick={addLevel2}
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
          {rows.map((row, i) => {
            const isDup = duplicateIndices.has(i);
            const rowType = knowledgeTypes.find((t) => t.name === row.knowledgeType);
            const rowSubtypes = rowType?.children || [];
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
                  <select className="bulk-cat" value={row.knowledgeType || ''} onChange={(e) => { updateRow(i, 'knowledgeType', e.target.value); updateRow(i, 'knowledgeSubType', ''); }}>
                    <option value="">知識区分：選択なし</option>
                    {knowledgeTypes.map((k) => <option key={k.name} value={k.name}>{k.name}</option>)}
                  </select>
                  {rowSubtypes.length > 0 && (
                    <select className="bulk-cat" value={row.knowledgeSubType || ''} onChange={(e) => updateRow(i, 'knowledgeSubType', e.target.value)}>
                      <option value="">区分：選択なし</option>
                      {rowSubtypes.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  )}
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

const BRANCH_COLORS = [
  { bg: '#E1F5EE', border: '#1D9E75', text: '#04342C' },
  { bg: '#FAECE7', border: '#D85A30', text: '#4A1B0C' },
  { bg: '#EEEDFE', border: '#7F77DD', text: '#26215C' },
  { bg: '#FBEAF0', border: '#D4537E', text: '#4B1528' },
  { bg: '#FAEEDA', border: '#BA7517', text: '#412402' },
];

// 用語管理画面の上部に出すマインドマップ（線でつながった構成図・縦方向・コンパクト・可変数の②に対応）
function TermMindMap({ terms, knowledgeTypes, mapFilter, onSelect }) {
  const countFor = (typeName, subName) => {
    return Object.values(terms).filter((t) => {
      if (t.knowledgeType !== typeName) return false;
      if (subName != null) return t.knowledgeSubType === subName;
      return true;
    }).length;
  };

  const isActive = (typeName, childName) => !!mapFilter && mapFilter.type === typeName && mapFilter.sub === (childName ?? null);
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
          const c = BRANCH_COLORS[ti % BRANCH_COLORS.length];
          const x = startX + ti * (COL_W + GAP);
          const cx = x + COL_W / 2;
          const active = isActive(type.name, null);
          const children = type.children.map((ch) => ({ name: ch.name, count: countFor(type.name, ch.name) }));

          return (
            <g key={type.id || ti}>
              <path d={`M190 32 C190 42, ${cx} 46, ${cx} 56`} fill="none" stroke={c.border} strokeWidth={0.75} />
              <g
                style={{ cursor: 'pointer', opacity: dim(active) }}
                onClick={() => onSelect(active ? null : { type: type.name, sub: null })}
              >
                <rect x={x} y={56} width={COL_W} height={30} rx={8} fill={c.bg} stroke={c.border} strokeWidth={active ? 2 : 0.5} />
                <text x={cx} y={71} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(12, COL_W / 7)} fontWeight={700} fill={c.text}>{type.name}</text>
              </g>
              {children.map((ch, i) => {
                const chW = COL_W / 2 - 3;
                const chX = x + i * (COL_W / 2 + 3);
                const chCx = chX + chW / 2;
                const chActive = isActive(type.name, ch.name);
                return (
                  <g key={ch.name}>
                    <path d={`M${cx} 86 C${cx} 96, ${chCx} 98, ${chCx} 108`} fill="none" stroke={c.border} strokeWidth={0.5} />
                    <g style={{ cursor: 'pointer', opacity: dim(chActive) }} onClick={() => onSelect(chActive ? null : { type: type.name, sub: ch.name })}>
                      <rect x={chX} y={108} width={chW} height={28} rx={6} fill={chActive ? c.border : '#fff'} stroke={c.border} strokeWidth={chActive ? 2 : 0.5} />
                      <text x={chCx} y={122} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={chActive ? '#fff' : c.text}>{ch.name}({ch.count})</text>
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

function TermItem({ id, term, allTerms, knowledgeTypes, expanded, onToggle, onSaved, onDeleted }) {
  const [name, setName] = useState(term.name || '');
  const [knowledgeType, setKnowledgeType] = useState(term.knowledgeType || '');
  const [knowledgeSubType, setKnowledgeSubType] = useState(term.knowledgeSubType || '');
  const [category, setCategory] = useState(term.category || CATEGORIES_BASE[0]);
  const [section, setSection] = useState(term.section || '');
  const [rank, setRank] = useState(term.rank || '秀');
  const [description, setDescription] = useState(term.description || '');
  const [note, setNote] = useState(term.note || '');
  const [related, setRelated] = useState(Object.keys(term.related || {}));

  const rc = { 秀: 'badge-rank-秀', 優: 'badge-rank-優', 良: 'badge-rank-良', 可: 'badge-rank-可' };
  const currentType = knowledgeTypes.find((t) => t.name === knowledgeType);
  const subOptions = currentType?.children || [];

  const save = async () => {
    if (!name.trim() || !description.trim()) return showToast('用語名と説明は必須です');
    try {
      await dbSet('terms/' + id, { name, knowledgeType, knowledgeSubType, category, section, rank, description, note, updatedAt: Date.now() });
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
            <label>知識区分（任意）</label>
            <select
              className="admin-cat-sel"
              value={knowledgeType}
              onChange={(e) => { setKnowledgeType(e.target.value); setKnowledgeSubType(''); }}
            >
              <option value="">選択なし</option>
              {knowledgeTypes.map((k) => <option key={k.name} value={k.name}>{k.name}</option>)}
            </select>
          </div>
          {subOptions.length > 0 && (
            <div className="admin-edit-group">
              <label>区分（任意）</label>
              <select className="admin-cat-sel" value={knowledgeSubType} onChange={(e) => setKnowledgeSubType(e.target.value)}>
                <option value="">選択なし</option>
                {subOptions.map((k) => <option key={k.name} value={k.name}>{k.name}</option>)}
              </select>
            </div>
          )}
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

export default function AdminTermsTab({ terms, knowledgeTypes }) {
  const kTypes = knowledgeTypes || DEFAULT_KNOWLEDGE_TYPES.map((t) => ({ id: null, name: t.name, children: t.children.map((c) => ({ id: null, name: c })) }));

  // デフォルトは全収束。展開したIDだけをセットで管理。
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapFilter, setMapFilter] = useState(null); // { type: string, sub: string|null } | null

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

  const matchesMapFilter = (t) => {
    if (!mapFilter) return true;
    if (mapFilter.sub) return t.knowledgeType === mapFilter.type && t.knowledgeSubType === mapFilter.sub;
    return t.knowledgeType === mapFilter.type;
  };

  const sorted = useMemo(() => {
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms)
      .filter(([, t]) => matchesMapFilter(t))
      .filter(([, t]) => !search || (t.name || '').includes(search) || (t.description || '').includes(search))
      .sort((a, b) =>
        (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
      );
  }, [terms, search, mapFilter]);

  // マインドマップで絞り込み中の時だけ、「それ以外（この条件のタグが付いてない用語）」も見られるようにする
  const [othersOpen, setOthersOpen] = useState(false);
  const others = useMemo(() => {
    if (!mapFilter) return [];
    const ro = { 秀: 0, 優: 1, 良: 2, 可: 3 };
    return Object.entries(terms)
      .filter(([, t]) => !matchesMapFilter(t))
      .filter(([, t]) => !search || (t.name || '').includes(search) || (t.description || '').includes(search))
      .sort((a, b) =>
        (ro[a[1].rank] ?? 4) - (ro[b[1].rank] ?? 4) || (a[1].name || '').localeCompare(b[1].name || '', 'ja')
      );
  }, [terms, search, mapFilter]);

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

      <KnowledgeConfigManager knowledgeTypes={kTypes} />

      <TermMindMap terms={terms} knowledgeTypes={kTypes} mapFilter={mapFilter} onSelect={setMapFilter} />

      {mapFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '.78rem', color: 'var(--pd)', background: 'var(--pl)', padding: '5px 10px', borderRadius: 20, fontWeight: 700 }}>
            {mapFilter.type}{mapFilter.sub ? ` / ${mapFilter.sub}` : ''} で絞り込み中
          </span>
          <button onClick={() => setMapFilter(null)} style={{ background: 'none', border: 'none', color: 'var(--sub)', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>✕ 解除</button>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 用語名・説明文で検索"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.85rem', fontFamily: 'inherit', marginBottom: 12, background: '#fff' }}
      />

      {/* 一括登録中に重複がある時だけ、検索欄の下にまとめて表示する */}
      {duplicateRows.length > 0 && (
        <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: '.78rem', fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
            重複している用語が{duplicateRows.length}件あります
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

      {mapFilter && (
        <div style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--pd)', margin: '4px 0 6px' }}>
          ✅ 該当する用語（{sorted.length}件）
        </div>
      )}
      {!sorted.length ? (
        <div className="tc ts" style={{ padding: 30 }}>{search ? '該当する用語がありません' : '用語データなし'}</div>
      ) : (
        <div className="admin-terms-list">
          {sorted.map(([id, t]) => (
            <TermItem
              key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
              knowledgeTypes={kTypes}
              expanded={expandedIds.has(id)}
              onToggle={() => toggle(id)}
            />
          ))}
        </div>
      )}

      {mapFilter && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setOthersOpen((o) => !o)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0ebe6', border: '1.5px solid var(--border)', borderRadius: 9, padding: '9px 12px', fontSize: '.78rem', fontWeight: 800, color: 'var(--sub)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span>△ それ以外（この区分のタグが付いてない用語・{others.length}件）</span>
            <span>{othersOpen ? '▲' : '▼'}</span>
          </button>
          {othersOpen && (
            <div className="admin-terms-list" style={{ marginTop: 8 }}>
              {others.length === 0 ? (
                <div className="tc ts" style={{ padding: 20 }}>該当する用語はありません</div>
              ) : (
                others.map(([id, t]) => (
                  <TermItem
                    key={id + '_' + refreshKey} id={id} term={t} allTerms={terms}
                    knowledgeTypes={kTypes}
                    expanded={expandedIds.has(id)}
                    onToggle={() => toggle(id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
