import React, { useMemo, useState, useEffect } from 'react';
import { CATEGORIES_BASE, CATEGORY_COLORS, RANKS, showToast, suggestRelatedTerms, suggestByCategory, getTermPaths, normalizePaths, pathsToDbFields } from '../utils.js';
import { ConfirmButton } from './ConfirmButton.jsx';

// 知識区分の階層セレクタ。選んだ項目がさらに子を持ってたら、その下に次の選択欄が自動で増える（何段でも）
export function PathSelector({ tree, path, onChange }) {
  const levels = [];
  let nodes = tree || [];
  for (let i = 0; i <= path.length; i++) {
    if (!nodes.length) break;
    levels.push({ nodes, selected: path[i] || '' });
    if (!path[i]) break;
    const node = nodes.find((n) => n.name === path[i]);
    if (!node) break;
    nodes = node.children;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {levels.map((lvl, i) => (
        <select
          key={i}
          value={lvl.selected}
          onChange={(e) => onChange([...path.slice(0, i), e.target.value].filter(Boolean))}
        >
          <option value="">{i === 0 ? '知識区分：選択なし' : '選択なし'}</option>
          {lvl.nodes.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
        </select>
      ))}
    </div>
  );
}


// 知識区分を複数登録するための入力。登録済みの区分をチップで並べ、下の選択欄から追加する
export function MultiPathSelector({ tree, paths, onChange }) {
  const [draft, setDraft] = useState([]);
  const list = normalizePaths(paths || []);
  const add = () => {
    if (!draft.length) return;
    onChange(normalizePaths([...list, draft]));
    setDraft([]);
  };
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  return (
    <div className="mps">
      {list.length > 0 ? (
        <div className="mps-chips">
          {list.map((p, i) => (
            <span key={p.join('/')} className="mps-chip">
              {p.join(' / ')}
              <button type="button" onClick={() => remove(i)} aria-label="この区分を外す">✕</button>
            </span>
          ))}
        </div>
      ) : (
        <div className="mps-empty">未分類</div>
      )}
      <div className="mps-add">
        <div style={{ flex: 1, minWidth: 0 }}>
          <PathSelector tree={tree} path={draft} onChange={setDraft} />
        </div>
        <button type="button" className="mps-add-btn" disabled={!draft.length} onClick={add}>追加</button>
      </div>
    </div>
  );
}

function RankSelect({ name, value, onChange }) {
  return (
    <div className="rank-select-row">
      {RANKS.map((r) => (
        <div className="rank-opt" data-rank={r} key={r}>
          <input
            type="radio"
            name={name}
            id={`${name}-${r}`}
            value={r}
            checked={value === r}
            onChange={() => onChange(r)}
          />
          <label htmlFor={`${name}-${r}`}>{r}</label>
        </div>
      ))}
    </div>
  );
}

// 関連用語のタグ付け入力。手入力での追加（用語名検索＋Enter）と、
// 説明文・カテゴリから即時に計算する候補（APIは使わず文字の重なりだけで判定）の両方に対応する
export function RelatedTermsTagInput({ allTerms, excludeId, selected, onChange, name, category, description, paths, focusPath }) {
  const [text, setText] = useState('');

  const matches = useMemo(() => {
    if (!text.trim()) return [];
    return Object.entries(allTerms || {})
      .filter(([id]) => id !== excludeId && !selected.includes(id))
      .filter(([, t]) => (t.name || '').includes(text.trim()))
      .slice(0, 6);
  }, [allTerms, excludeId, selected, text]);

  // 知識区分が同じ・近い用語を優先して最大5件。区分が未設定なら、説明文・カテゴリの重なりで提案する
  const pathsKey = JSON.stringify(paths || []) + '|' + (focusPath || []).join('/');
  const byCategory = (paths || []).length > 0;
  const suggestions = useMemo(() => {
    if (byCategory) {
      return suggestByCategory({ allTerms, excludeId, paths, focusPath, alreadySelected: selected, name, description, limit: 5 });
    }
    return suggestRelatedTerms({ allTerms, excludeId, name, category, description, alreadySelected: selected, limit: 5 });
  }, [allTerms, excludeId, name, category, description, selected, pathsKey]);

  const add = (id) => {
    onChange([...selected, id]);
    setText('');
  };
  const remove = (id) => onChange(selected.filter((x) => x !== id));

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || !text.trim()) return;
    const exact = Object.entries(allTerms || {}).find(([id, t]) => id !== excludeId && t.name === text.trim() && !selected.includes(id));
    if (exact) add(exact[0]);
  };

  return (
    <div className="related-tag-input">
      <div className="related-tag-box">
        {selected.map((id) => (
          <span className="related-tag-chip" key={id}>
            {allTerms?.[id]?.name || '?'}
            <button type="button" onClick={() => remove(id)} aria-label="削除">×</button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length ? '' : '用語名を入力してタグ追加'}
        />
      </div>
      {text.trim() && (
        <div className="related-tag-matches">
          {matches.length === 0 && <div className="related-picker-empty">該当する用語がありません</div>}
          {matches.map(([id, t]) => (
            <button type="button" key={id} className="related-tag-match-row" onClick={() => add(id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div className="related-tag-suggest-head">
        <span className="related-tag-suggest-lbl">
          {byCategory ? '同じ知識区分の用語から自動で提案（最大5件）' : '説明文・カテゴリから自動で提案（最大5件）'}
        </span>
        {suggestions.length > 1 && (
          <button type="button" className="related-tag-addall" onClick={() => { onChange([...selected, ...suggestions.map((x) => x.id)]); setText(''); }}>
            まとめて追加
          </button>
        )}
      </div>
      <div className="related-tag-suggest-list">
        {suggestions.length === 0 && (
          <span className="related-picker-empty">{byCategory ? '同じ区分の用語はほかにありません' : '該当する候補がありません（知識区分を設定すると精度が上がります）'}</span>
        )}
        {suggestions.map(({ id, term, reason }) => (
          <button type="button" key={id} className="related-tag-suggest-chip" onClick={() => add(id)}>
            + {term.name}
            {reason && <span className="related-tag-reason">{reason}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

const EMPTY = { name: '', knowledgePaths: [], category: CATEGORIES_BASE[0], rank: '秀', description: '', note: '', related: [] };

// 追加・編集 共通フォームモーダル
export function TermFormModal({ open, mode, initial, allTerms, currentId, knowledgeTypes, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const kTypes = knowledgeTypes || [];

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const relatedIds = Object.keys(initial.related || {});
      setForm({ ...EMPTY, ...initial, knowledgePaths: getTermPaths(initial), related: relatedIds });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      showToast('用語名は必須です');
      return;
    }
    onSubmit({ ...form, ...pathsToDbFields(form.knowledgePaths) });
  };

  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr">
          <h3>{mode === 'add' ? '用語を追加' : '用語を編集'}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>用語名 <span className="req">*</span></label>
            <input value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="例：MNP" />
          </div>
          <div className="form-group">
            <label>知識区分（任意・複数可）</label>
            <MultiPathSelector tree={kTypes} paths={form.knowledgePaths} onChange={set('knowledgePaths')} />
          </div>
          <div className="form-group">
            <label>カテゴリ <span className="req">*</span></label>
            <select value={form.category} onChange={(e) => set('category')(e.target.value)}>
              {CATEGORIES_BASE.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>ランク <span className="req">*</span></label>
            <RankSelect name={`${mode}-rank`} value={form.rank} onChange={set('rank')} />
          </div>
          <div className="form-group">
            <label>説明 <span className="req">*</span></label>
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="用語の説明を入力（未入力のままだとユーザー側には表示されません）" />
          </div>
          <div className="form-group">
            <label>補足・注意点（任意）</label>
            <textarea value={form.note} onChange={(e) => set('note')(e.target.value)} />
          </div>
          <div className="form-group">
            <label>関連用語（任意）</label>
            <RelatedTermsTagInput
              allTerms={allTerms}
              excludeId={currentId}
              selected={form.related}
              onChange={set('related')}
              name={form.name}
              category={form.category}
              description={form.description}
              paths={form.knowledgePaths}
            />
          </div>
        </div>
        <div className="modal-footer">
          {mode === 'edit' && <ConfirmButton label="削除" message={`「${form.name}」を削除しますか？`} onConfirm={onDelete} className="mbtn mbtn-danger" />}
          <button className="mbtn mbtn-cancel" onClick={onClose}>キャンセル</button>
          <button className="mbtn mbtn-primary" onClick={handleSubmit}>{mode === 'add' ? '保存' : '更新'}</button>
        </div>
      </div>
    </div>
  );
}

// 関連用語1行（カテゴリで色分けした左バー、アイコンなし、さらに関連があれば開閉シェブロン）
function RelatedRow({ term, isChild, onClick, hasChildren, isOpen, onToggle }) {
  const color = CATEGORY_COLORS[term.category] || '#888780';
  return (
    <div className={`related-thread-row ${isChild ? 'child' : ''}`} onClick={onClick}>
      <div className="related-thread-bar" style={{ background: color }} />
      <div className="related-thread-body">
        <div className="related-thread-name">{term.name}</div>
        <div className="related-thread-desc">{term.description}</div>
      </div>
      {hasChildren && (
        <span
          className="related-thread-chevron"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {isOpen ? '▼' : '▶'}
        </span>
      )}
    </div>
  );
}

// 関連用語を折りたたみリスト形式で表示する（デフォルトは閉じた状態。さらに関連があればシェブロンで再帰的に展開できる）
// visited: これまでに辿ってきた用語idの一覧。循環（AのB→BのA…）を防ぐために子の候補から除外する
function RelatedThread({ relatedIds, allTerms, onSelectRelated, visited }) {
  const [openIds, setOpenIds] = useState({});
  return (
    <div>
      {relatedIds.map((id, i) => {
        const t = allTerms?.[id];
        if (!t) return null;
        const childIds = Object.keys(t.related || {}).filter((cid) => !visited.includes(cid) && allTerms?.[cid]);
        const isOpen = !!openIds[id];
        return (
          <div key={id} className="related-thread-block" style={{ borderBottom: i < relatedIds.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
            <RelatedRow
              term={t} onClick={() => onSelectRelated(id)}
              hasChildren={childIds.length > 0} isOpen={isOpen}
              onToggle={() => setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))}
            />
            {isOpen && childIds.length > 0 && (
              <div className="related-thread-children">
                <RelatedThread relatedIds={childIds} allTerms={allTerms} onSelectRelated={onSelectRelated} visited={[...visited, id]} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 関連用語セクション：デフォルト収束。「関連用語を見る」ボタンで展開する
function RelatedSection({ relatedIds, allTerms, currentTermId, onSelectRelated }) {
  const [sectionOpen, setSectionOpen] = useState(false);
  return (
    <div className="detail-sec">
      <span className="lbl">関連用語（{relatedIds.length}件）</span>
      {!sectionOpen ? (
        <button type="button" className="related-section-toggle" onClick={() => setSectionOpen(true)}>
          関連用語を見る（{relatedIds.length}件）
        </button>
      ) : (
        <>
          <button type="button" className="related-section-toggle" onClick={() => setSectionOpen(false)}>閉じる</button>
          <RelatedThread relatedIds={relatedIds} allTerms={allTerms} onSelectRelated={onSelectRelated} visited={[currentTermId]} />
        </>
      )}
    </div>
  );
}

// 詳細表示の「関連用語」：同じ知識区分の用語を自動で最大5件。
// 初期状態は閉じていて、「関連用語を見る」ボタンで展開する
function AutoRelatedSection({ term, currentId, allTerms, onSelectRelated }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => suggestByCategory({
    allTerms, excludeId: currentId, paths: getTermPaths(term),
    name: term.name, description: term.description, limit: 5,
  }), [allTerms, currentId, term]);
  if (!list.length) return null;
  return (
    <div className="detail-sec">
      <span className="lbl">関連用語（{list.length}件）</span>
      <button type="button" className="related-section-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '閉じる' : `関連用語を見る（${list.length}件）`}
      </button>
      {open && (
        <div className="auto-related-list">
          {list.map(({ id, term: t, reason }) => (
            <div key={id} className="related-thread-row" onClick={() => onSelectRelated(id)}>
              <div className="related-thread-bar" style={{ background: CATEGORY_COLORS[t.category] || '#888780' }} />
              <div className="related-thread-body">
                <div className="related-thread-name">{t.name}</div>
                <div className="related-thread-desc">{t.description}</div>
              </div>
              <span className="related-tag-reason">{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 詳細表示モーダル
export function TermDetailModal({ open, term, currentId, allTerms, isAdmin, onClose, onBack, onEdit, onSelectRelated }) {
  if (!open || !term) return null;
  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr">
          {onBack && <button className="btn-back-detail" onClick={onBack}>← 戻る</button>}
          <h3>{term.name}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className={`detail-rank-bar rank-${term.rank || ''}`} />
          <div className="detail-badges">
            {term.rank && <span className={`badge badge-rank-${term.rank}`}>{term.rank}</span>}
            <span className="badge badge-cat">{term.category}</span>
          </div>
          <div className="detail-sec">
            <span className="lbl">説明</span>
            <p>{term.description}</p>
          </div>
          {term.note && (
            <div className="detail-sec">
              <span className="lbl">補足・注意点</span>
              <p>{term.note}</p>
            </div>
          )}
          <AutoRelatedSection key={currentId} term={term} currentId={currentId} allTerms={allTerms} onSelectRelated={onSelectRelated} />
        </div>
        <div className="modal-footer">
          <button className="mbtn mbtn-cancel" onClick={onClose}>閉じる</button>
          {isAdmin && <button className="mbtn mbtn-primary" onClick={onEdit}>編集</button>}
        </div>
      </div>
    </div>
  );
}
