import React, { useState, useEffect } from 'react';
import { CATEGORIES, RANKS, showToast } from '../utils.js';

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

const EMPTY = { name: '', category: CATEGORIES[0], rank: '秀', description: '', note: '' };

// 追加・編集 共通フォームモーダル
export function TermFormModal({ open, mode, initial, onClose, onSubmit, onDelete }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  if (!open) return null;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.description.trim()) {
      showToast('用語名と説明は必須です');
      return;
    }
    onSubmit(form);
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
            <label>カテゴリ <span className="req">*</span></label>
            <select value={form.category} onChange={(e) => set('category')(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>ランク <span className="req">*</span></label>
            <RankSelect name={`${mode}-rank`} value={form.rank} onChange={set('rank')} />
          </div>
          <div className="form-group">
            <label>説明 <span className="req">*</span></label>
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="用語の説明を入力" />
          </div>
          <div className="form-group">
            <label>補足・注意点（任意）</label>
            <textarea value={form.note} onChange={(e) => set('note')(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          {mode === 'edit' && <button className="mbtn mbtn-danger" onClick={onDelete}>削除</button>}
          <button className="mbtn mbtn-cancel" onClick={onClose}>キャンセル</button>
          <button className="mbtn mbtn-primary" onClick={handleSubmit}>{mode === 'add' ? '保存' : '更新'}</button>
        </div>
      </div>
    </div>
  );
}

// 詳細表示モーダル
export function TermDetailModal({ open, term, isAdmin, onClose, onEdit }) {
  if (!open || !term) return null;
  return (
    <div className="modal-overlay open" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <div className="modal-hdr">
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
        </div>
        <div className="modal-footer">
          <button className="mbtn mbtn-cancel" onClick={onClose}>閉じる</button>
          {isAdmin && <button className="mbtn mbtn-primary" onClick={onEdit}>編集</button>}
        </div>
      </div>
    </div>
  );
}
