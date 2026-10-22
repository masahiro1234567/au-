import React, { useEffect, useMemo } from 'react';
import { useDbCollection, dbPush, dbSet, dbUpdateMany } from './useFirebase.js';
import { nameKey } from './testStats.js';
import { normName } from './evalSheets.js';

// ===== お知らせ（ホームの赤丸・タブを開いたときの通知）=====
// 保存先（au-data-base）
//   notices/{id} = { tab, title, body, at, by, to?: [名前], exclude?: 名前 }
//     tab：glossary / devices / oretab / kpi / nippou / bx / test / eval / mypage
//     to：渡した人だけに出す（無ければ全員）。exclude：その人には出さない（自分で起こした変更など）
//   notice_seen/{名前キー}/{お知らせID} = 確認した時刻
//   notice_seen/{名前キー}/_base = この機能を初めて使った時刻（それより前のものは出さない）
// Brave X は、投稿・回答そのものから数える（ID：bxp_投稿ID ／ bxr_投稿ID_回答ID）
// 用語一覧は、これまでの「まだ見ていない更新」の仕組み（termNotify.js）をそのまま使う
export const NOTICE_TABS = {
  glossary: '用語一覧', devices: '機種比較', oretab: 'オレタブ', kpi: 'KPI', nippou: '日報',
  bx: 'Brave X', test: 'テスト', eval: '評価一覧', mypage: 'マイページ',
};
const DAY = 86400000;
const KEEP = 45 * DAY; // 45日より前のお知らせは出さない

export async function pushNotice({ tab, title, body = '', to = null, exclude = '', by = '' }) {
  try {
    const n = { tab, title, body, at: Date.now(), by: by || '' };
    if (to && to.length) n.to = [...new Set(to.filter(Boolean))];
    if (exclude) n.exclude = exclude;
    await dbPush('notices', n);
  } catch (e) { /* お知らせが送れなくても本来の保存は止めない */ }
}

export function whenLabel(at) {
  const d = Date.now() - (at || 0);
  if (d < 60000) return 'たった今';
  if (d < 3600000) return `${Math.floor(d / 60000)}分前`;
  if (d < DAY) return `${Math.floor(d / 3600000)}時間前`;
  if (d < 2 * DAY) return '昨日';
  const x = new Date(at); return `${x.getMonth() + 1}/${x.getDate()}`;
}

// ログイン中の人のお知らせを、タブごとの「カード」にまとめる
// カード：{ key, tab, title, body, at, ids:[確認したことにするID], onSeen?:()=>void }。数字は ids の数
export function useNotices(user, extra = {}) {
  const me = user?.name || '';
  const key = me ? nameKey(me) : '__none__';
  const [notices] = useDbCollection('notices');
  const [seen, seenLoaded] = useDbCollection(`notice_seen/${key}`);
  const [posts] = useDbCollection('bp_posts');
  const [replies] = useDbCollection('bp_replies');
  const base = seen && seen._base;
  useEffect(() => { if (me && seenLoaded && !base) dbSet(`notice_seen/${key}/_base`, Date.now()); }, [me, seenLoaded, base]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => {
    const out = {};
    if (!me || !base) return out;
    const add = (c) => { (out[c.tab] = out[c.tab] || []).push(c); };
    const fresh = (id, at) => at && at > base && Date.now() - at < KEEP && !(seen || {})[id];
    const mine = normName(me);
    // 1) 管理者や各画面が送ったお知らせ
    Object.entries(notices || {}).forEach(([id, n]) => {
      if (!n || !NOTICE_TABS[n.tab] || !fresh(id, n.at)) return;
      if (Array.isArray(n.to) && n.to.length && !n.to.some((x) => normName(x) === mine)) return;
      if (n.exclude && normName(n.exclude) === mine) return;
      add({ key: id, tab: n.tab, title: n.title || 'お知らせ', body: n.body || '', at: n.at, ids: [id] });
    });
    // 2) Brave X：新しい投稿／新しい回答（自分のものは数えない）
    const newPosts = [], newReplies = [], toMe = [];
    Object.entries(posts || {}).forEach(([pid, p]) => {
      if (!p) return;
      if (p.byKey !== nameKey(me) && fresh(`bxp_${pid}`, p.at)) newPosts.push({ id: `bxp_${pid}`, p });
      Object.entries((replies || {})[pid] || {}).forEach(([rid, r]) => {
        if (!r || r.byKey === nameKey(me) || !fresh(`bxr_${pid}_${rid}`, r.at)) return;
        (p.byKey === nameKey(me) ? toMe : newReplies).push({ id: `bxr_${pid}_${rid}`, r, p });
      });
    });
    const head = (t) => { const s = String(t || '').replace(/\s+/g, ' '); return s.length > 24 ? s.slice(0, 24) + '…' : s; };
    if (toMe.length) add({ key: 'bx-tome', tab: 'bx', title: `あなたの投稿に回答が${toMe.length}件あります`, body: toMe.slice(0, 2).map((x) => `${x.r.by}さん：「${head(x.r.text)}」`).join('\n'), at: Math.max(...toMe.map((x) => x.r.at)), ids: toMe.map((x) => x.id) });
    if (newPosts.length) add({ key: 'bx-posts', tab: 'bx', title: `新しい投稿が${newPosts.length}件あります`, body: newPosts.sort((a, b) => b.p.at - a.p.at).slice(0, 2).map((x) => `${x.p.by}さん（${x.p.type || '投稿'}）：「${head(x.p.text)}」`).join('\n'), at: Math.max(...newPosts.map((x) => x.p.at)), ids: newPosts.map((x) => x.id) });
    if (newReplies.length) add({ key: 'bx-replies', tab: 'bx', title: `新しい回答が${newReplies.length}件あります`, body: newReplies.slice(0, 2).map((x) => `${x.r.by}さん：「${head(x.r.text)}」`).join('\n'), at: Math.max(...newReplies.map((x) => x.r.at)), ids: newReplies.map((x) => x.id) });
    // 3) ほかの画面から渡されたカード（用語一覧など）
    Object.values(extra).flat().filter(Boolean).forEach(add);
    Object.values(out).forEach((l) => l.sort((a, b) => (b.at || 0) - (a.at || 0)));
    return out;
  }, [me, base, notices, seen, posts, replies, extra]);

  const count = (tab) => (cards[tab] || []).reduce((a, c) => a + (c.count != null ? c.count : c.ids.length), 0);
  const confirm = async (list) => {
    const up = {};
    (Array.isArray(list) ? list : [list]).forEach((c) => {
      if (c.onSeen) c.onSeen();
      c.ids.forEach((id) => { if (!String(id).startsWith('term:')) up[`notice_seen/${key}/${id}`] = Date.now(); });
    });
    if (Object.keys(up).length) await dbUpdateMany(up);
  };
  // Brave X の中の「NEW」・回答の赤丸用：まだ確認していないIDか
  const isNew = (id) => Object.values(cards).flat().some((c) => c.ids.includes(id));
  const markSeen = (ids) => { const up = {}; ids.forEach((id) => { up[`notice_seen/${key}/${id}`] = Date.now(); }); if (ids.length) dbUpdateMany(up); };
  return { cards, count, confirm, isNew, markSeen, ready: !!base };
}

// ===== iPhone の通知のようなカード（タブを開いたときに上から出る）=====
export function NoticeBanner({ tab, cards, onConfirm, onConfirmAll, onLater }) {
  const name = NOTICE_TABS[tab] || '';
  const shown = cards.slice(0, 3);
  const rest = cards.length - shown.length;
  return (
    <div className="nt-wrap" role="dialog" aria-label={`${name}のお知らせ`}>
      <div className="nt-dim" onClick={onLater} />
      <div className="nt-stack">
        {shown.map((c) => (
          <div className="nt-card" key={c.key}>
            <div className="nt-head"><span className="nt-app">au</span><span className="nt-from">AU NAVI ・ {name}</span><span className="nt-when">{whenLabel(c.at)}</span></div>
            <b className="nt-title">{c.title}</b>
            {c.body && <div className="nt-body">{c.body}</div>}
            <button className="nt-ok" onClick={() => onConfirm(c)}>確認</button>
          </div>
        ))}
        {rest > 0 && <div className="nt-more">ほかに {rest}件のお知らせがあります</div>}
        {cards.length > 1 && <button className="nt-all" onClick={onConfirmAll}>すべて確認（{cards.length}件）</button>}
        <button className="nt-later" onClick={onLater}>あとで見る</button>
      </div>
    </div>
  );
}

// ホームのタイルの赤丸
export const RedBadge = ({ n, label }) => (n > 0 ? <span className="nt-badge" aria-label={`${label || ''}お知らせ ${n}件`}>{n > 99 ? '99+' : n}</span> : null);
