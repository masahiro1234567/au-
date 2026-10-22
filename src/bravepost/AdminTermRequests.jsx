import React, { useState } from 'react';
import { useDbCollection, dbPush, dbUpdateMany, saveTermRelations } from '../useFirebase.js';
import { TermFormModal } from '../components/TermModals.jsx';
import { showToast } from '../utils.js';

// ===== 管理画面「用語の申請」：Brave X から届いた用語集への追加の申請を確認する =====
// 「内容を確認して追加」で用語の追加フォームが開く（申請の内容が入った状態）。保存すると用語集に載り、申請は「承認」になる
export default function AdminTermRequests({ terms, knowledgeTypes, user }) {
  const [reqs] = useDbCollection('bp_term_requests');
  const [open, setOpen] = useState(null); // 確認中の申請
  const [showDone, setShowDone] = useState(false);
  const all = Object.entries(reqs || {}).filter(([, r]) => r && r.name).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.at - a.at);
  const pending = all.filter((r) => (r.status || 'pending') === 'pending');
  const done = all.filter((r) => r.status && r.status !== 'pending');
  const when = (t) => { const d = new Date(t || 0); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  const approve = async (form) => {
    try {
      const { related, section, ...rest } = form;
      const newRef = await dbPush('terms', { ...rest, createdAt: Date.now() });
      await saveTermRelations(newRef.key, [], related || []);
      await dbUpdateMany({ [`bp_term_requests/${open.id}/status`]: 'approved', [`bp_term_requests/${open.id}/termId`]: newRef.key, [`bp_term_requests/${open.id}/reviewedBy`]: user?.name || '', [`bp_term_requests/${open.id}/reviewedAt`]: Date.now() });
      setOpen(null); showToast('用語集に追加しました');
    } catch (e) { showToast('エラー：' + e.message); }
  };
  const reject = async (r) => {
    const note = window.prompt('見送りにします。申請した人に伝えるひとこと（空でもOK）', '');
    if (note === null) return;
    try {
      await dbUpdateMany({ [`bp_term_requests/${r.id}/status`]: 'rejected', [`bp_term_requests/${r.id}/reviewNote`]: note || null, [`bp_term_requests/${r.id}/reviewedBy`]: user?.name || '', [`bp_term_requests/${r.id}/reviewedAt`]: Date.now() });
      showToast('見送りにしました');
    } catch (e) { showToast('エラー：' + e.message); }
  };

  const Card = ({ r }) => (
    <div className="tr-card">
      <div className="tr-top"><b>{r.name}</b><span className="tr-cat">{r.category}</span>
        {r.status === 'approved' && <span className="tr-st ok">承認済み</span>}{r.status === 'rejected' && <span className="tr-st ng">見送り</span>}</div>
      <div className="tr-desc">{r.description}</div>
      {r.postText && <div className="tr-from">もとの投稿：{r.postText}</div>}
      <div className="tr-meta">申請：{r.by}　{when(r.at)}{r.reviewedBy ? `　／　確認：${r.reviewedBy}` : ''}{r.reviewNote ? `（${r.reviewNote}）` : ''}</div>
      {(r.status || 'pending') === 'pending' && (
        <div className="tr-btns">
          <button className="tbtn tbtn-primary" style={{ width: "auto", padding: "0 16px", marginTop: 0 }} onClick={() => setOpen(r)}>内容を確認して追加</button>
          <button className="btn-ghost" onClick={() => reject(r)}>見送り</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="tr-wrap">
      <div className="tr-head">確認待ち {pending.length}件</div>
      {pending.map((r) => <Card key={r.id} r={r} />)}
      {!pending.length && <div className="tr-empty">確認待ちの申請はありません</div>}
      {done.length > 0 && <button className="btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone(!showDone)}>{showDone ? '確認済みを閉じる' : `確認済みの申請を見る（${done.length}件）`}</button>}
      {showDone && done.map((r) => <Card key={r.id} r={r} />)}
      <TermFormModal open={!!open} mode="add" initial={open ? { name: open.name, category: open.category, description: open.description } : null}
        allTerms={terms} knowledgeTypes={knowledgeTypes} onClose={() => setOpen(null)} onSubmit={approve} />
    </div>
  );
}
