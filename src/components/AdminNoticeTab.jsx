import React, { useMemo, useState } from 'react';
import { useDbCollection, dbRemove } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { showToast } from '../utils.js';
import { NOTICE_TABS, pushNotice, whenLabel } from '../notices.jsx';
import { AutoTA } from './EvalEditors.jsx';

// ===== 管理画面「お知らせ」：好きなタブにお知らせを出す（オレタブの新機能・機種比較の更新など）=====
// 自動で出るもの：Brave X の投稿・回答、用語の更新、KPI、定期テスト、評価の更新。ここは、それ以外を手で知らせるとき用
const TEMPLATES = [
  ['oretab', 'オレタブに新しい機能が追加されました', '［追加した機能］を練習できるようになりました'],
  ['devices', '機種比較が更新されました', '［機種名］を追加しました'],
  ['glossary', '用語一覧が更新されました', '［内容］'],
  ['nippou', '日報の使い方が変わりました', '［内容］'],
];

export default function AdminNoticeTab({ user }) {
  const [notices] = useDbCollection('notices');
  const [seenAll] = useDbCollection('notice_seen');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const people = useMemo(() => Object.values(fpUsers || {}).filter((u) => u && u.name && u.permission !== 'pending').map((u) => u.name).sort((a, b) => a.localeCompare(b, 'ja')), [fpUsers]);
  const [f, setF] = useState({ tab: 'oretab', title: '', body: '', mode: 'all', to: [] });
  const [busy, setBusy] = useState(false);
  const list = Object.entries(notices || {}).filter(([, n]) => n).map(([id, n]) => ({ id, ...n })).sort((a, b) => b.at - a.at).slice(0, 60);
  const seenCount = (id) => Object.values(seenAll || {}).filter((s) => s && s[id]).length;

  const send = async () => {
    if (!f.title.trim()) return showToast('見出しを入れてください');
    if (f.mode === 'people' && !f.to.length) return showToast('知らせる人を選んでください');
    setBusy(true);
    await pushNotice({ tab: f.tab, title: f.title.trim(), body: f.body.trim(), to: f.mode === 'people' ? f.to : null, by: user?.name || '管理者' });
    setBusy(false); setF({ ...f, title: '', body: '', to: [] });
    showToast('お知らせを出しました');
  };

  return (
    <div className="an">
      <div className="ev-card an-form">
        <div className="ev-h" style={{ marginTop: 0 }}>新しいお知らせ</div>
        <div className="an-note">ホームのタイルに赤丸が付き、そのタブを開いたときに通知が出ます。「確認」を押した人には2回目は出ません。</div>
        <div className="an-tpl">{TEMPLATES.map(([tab, title, body]) => <button key={title} className="ev-btn" onClick={() => setF({ ...f, tab, title, body })}>{NOTICE_TABS[tab]}：{title}</button>)}</div>
        <label className="an-fld"><span>出すタブ</span>
          <select className="ev-inp" value={f.tab} onChange={(e) => setF({ ...f, tab: e.target.value })}>{Object.entries(NOTICE_TABS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="an-fld"><span>見出し</span><input className="ev-inp" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="例：オレタブに新しい機能が追加されました" /></label>
        <label className="an-fld"><span>くわしく（任意）</span><AutoTA className="ev-inp ev-ta" rows={2} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <div className="an-fld"><span>知らせる人</span>
          <div className="an-row">
            <label className="an-radio"><input type="radio" checked={f.mode === 'all'} onChange={() => setF({ ...f, mode: 'all' })} />全員</label>
            <label className="an-radio"><input type="radio" checked={f.mode === 'people'} onChange={() => setF({ ...f, mode: 'people' })} />1人ずつ選ぶ</label>
          </div>
          {f.mode === 'people' && <div className="an-people">{people.map((n) => (
            <label key={n} className="an-chk"><input type="checkbox" checked={f.to.includes(n)} onChange={(e) => setF({ ...f, to: e.target.checked ? [...f.to, n] : f.to.filter((x) => x !== n) })} />{n}</label>
          ))}</div>}
        </div>
        <div className="an-row" style={{ justifyContent: 'flex-end' }}><button className="ev-btn p" disabled={busy} onClick={send}>お知らせを出す</button></div>
      </div>

      <div className="ev-card">
        <div className="ev-h" style={{ marginTop: 0 }}>これまでのお知らせ（自動で出たものも含む）</div>
        {!list.length && <div className="ev-note">まだありません</div>}
        {list.map((n) => (
          <div key={n.id} className="an-item">
            <div className="an-item-main">
              <div className="an-row"><span className="an-tab">{NOTICE_TABS[n.tab] || n.tab}</span><b>{n.title}</b></div>
              {n.body && <div className="an-body">{n.body}</div>}
              <div className="an-meta">{whenLabel(n.at)}{n.by ? `・${n.by}` : ''}・{n.to && n.to.length ? `${n.to.length}人に（${n.to.slice(0, 3).join('・')}${n.to.length > 3 ? ' ほか' : ''}）` : '全員に'}・確認済み {seenCount(n.id)}人</div>
            </div>
            <button className="ev-btn" style={{ color: '#b91c1c' }} onClick={async () => { if (window.confirm('このお知らせを取り消します。まだ確認していない人にも出なくなります。よろしいですか？')) { await dbRemove(`notices/${n.id}`); showToast('取り消しました'); } }}>取り消す</button>
          </div>
        ))}
      </div>
    </div>
  );
}
