import React, { useState } from 'react';
import { TermFormModal } from './TermModals.jsx';
import { dbSet, saveTermRelations } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { keepFlag, clearFlag } from '../termNotify.js';

// 管理画面「用語管理」の一番上：変更が必要と報告された用語のまとめ
// 編集（保存すると全員に緑の〇が付く）／警告を継続（赤のまま）／解除（赤を消す）
export default function FlaggedTermsPanel({ terms, flags, knowledgeTypes }) {
  const [editing, setEditing] = useState(null);
  const list = Object.entries(flags || {}).filter(([id, f]) => f && f.active && terms[id]).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  const fmt = (ts) => { if (!ts) return ''; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const save = async (form) => {
    try {
      const { related, section, ...rest } = form;
      await dbSet('terms/' + editing.id, { ...rest, createdAt: editing.term.createdAt || Date.now(), updatedAt: Date.now() });
      await saveTermRelations(editing.id, Object.keys(editing.term.related || {}), related || []);
      showToast('更新しました。警告を解除するか、継続するか選んでください');
      setEditing(null);
    } catch (e) { showToast('エラー:' + e.message); }
  };
  if (!list.length) return <div className="tn-admin" style={{ borderColor: 'var(--border)' }}><div className="tn-admin-h" style={{ color: 'var(--sub)', margin: 0 }}>変更が必要と報告された用語はありません</div></div>;
  return (
    <div className="tn-admin">
      <div className="tn-admin-h"><span className="tn-dot red" style={{ margin: 0 }} />変更が必要と報告された用語<span className="tn-badge red" style={{ position: 'static', boxShadow: 'none' }}>{list.length}</span></div>
      {list.map(([id, f]) => {
        const reports = Object.values(f.reports || {}).sort((a, b) => (a.at || 0) - (b.at || 0));
        const updatedAfter = (terms[id].updatedAt || 0) > (f.at || 0);
        return (
          <div className="tn-admin-row" key={id}>
            <div className="tn-admin-name"><span className="tn-dot red" style={{ margin: 0 }} />{terms[id].name}</div>
            {reports.map((r, i) => <div key={i} className="tn-admin-meta">{fmt(r.at)}　{r.by || '名前なし'}：{r.text || '（理由の記入なし）'}</div>)}
            {updatedAfter && <div className="tn-admin-meta" style={{ color: '#047857', fontWeight: 700 }}>報告のあとに編集済み（{fmt(terms[id].updatedAt)}）</div>}
            {f.checkedAt && <div className="tn-admin-meta">警告を継続中（{fmt(f.checkedAt)}に確認）</div>}
            <div className="tn-admin-btns">
              <button className="primary" onClick={() => setEditing({ id, term: terms[id] })}>編集</button>
              <button onClick={async () => { await keepFlag(id); showToast('警告を継続します'); }}>警告を継続</button>
              <button className="danger" onClick={async () => { await clearFlag(id); showToast('警告を解除しました'); }}>解除</button>
            </div>
          </div>
        );
      })}
      <TermFormModal open={!!editing} mode="edit" initial={editing?.term} allTerms={terms} currentId={editing?.id}
        knowledgeTypes={knowledgeTypes} onClose={() => setEditing(null)} onSubmit={save} />
    </div>
  );
}
