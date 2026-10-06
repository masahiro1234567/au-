import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDbCollection, dbSet, dbPush, dbRemove, dbUpdateMany } from '../useFirebase.js';
import { nameKey } from '../testStats.js';
import { showToast, CATEGORIES_BASE } from '../utils.js';
import { AutoTA } from '../components/EvalEditors.jsx';
import { ManualButton } from '../manual/Manual.jsx';
import { onAppBack } from '../backStack.js';

// ===== Brave X：質問・情報共有の投稿（Twitterのようなスレッド） =====
// 保存先（au-data-base）
//   bp_posts/{id}        { by, byKey, type:'質問'|'共有', cat, text, at, editedAt, likes:{名前キー:true}, reposts:{名前キー:時刻} }
//   bp_replies/{投稿ID}/{id} { by, byKey, text, at, likes:{} }
//   bp_saves/{名前キー}/{投稿ID} { tags:[...], at }   ← 保存とタグは本人だけ
//   bp_users/{名前キー}  { tags:[...] }               ← 自分のタグの一覧
//   bp_term_requests/{id} { name, category, description, postId, postText, by, byKey, at, status:'pending'|'approved'|'rejected' }
// リポストされた投稿は、最後のリポストから7日間、全員のタイムラインの一番上に出る
export const BP_CATS = [...CATEGORIES_BASE, '立ち回り', 'その他'];
const TYPES = ['質問', '共有'];
const PIN_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_TAGS = ['あとで読む'];
const keys = (o) => Object.keys(o || {});
const ago = (t) => {
  const d = Date.now() - (t || 0), m = Math.floor(d / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day === 1) return '昨日';
  if (day < 7) return `${day}日前`;
  const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()}`;
};
const lastRepost = (p) => Math.max(0, ...Object.values(p.reposts || {}).map(Number));

const I = {
  chat: <path d="M5 18l-1 3 4-2h9a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />,
  rep: <path d="M7 7h11l-3-3M17 17H6l3 3M18 7v5M6 17v-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />,
  heartF: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="currentColor" />,
  bm: <path d="M7 4h10v16l-5-4-5 4z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />,
  bmF: <path d="M7 4h10v16l-5-4-5 4z" fill="currentColor" />,
  burger: <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
};
const Ico = ({ k, s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">{I[k]}</svg>;
const Logo = () => <span className="bp-logo"><img src="/bx-logo-white.png" alt="Brave X" /></span>;
const initial = (n) => String(n || '？').replace(/\s/g, '').slice(0, 1);

export default function BravePost({ user, onBack }) {
  const me = user?.name || '';
  const myKey = nameKey(me);
  const [posts] = useDbCollection('bp_posts');
  const [replies] = useDbCollection('bp_replies');
  const [saves] = useDbCollection(`bp_saves/${myKey}`);
  const [myInfo] = useDbCollection(`bp_users/${myKey}`);
  const [reqs] = useDbCollection('bp_term_requests');

  const [scr, setScr] = useState('tl'); // tl / thread / compose / request / saved / mine / reqs
  const [from, setFrom] = useState('tl');
  const [cur, setCur] = useState(null);
  const [filt, setFilt] = useState('すべて');
  const [tagF, setTagF] = useState('すべて');
  const [menu, setMenu] = useState(false);
  const [saveFor, setSaveFor] = useState(null);
  const [edit, setEdit] = useState(null); // { id, text, rid? }
  const [reqDraft, setReqDraft] = useState(null); // 投稿画面→用語集への申請画面に渡す下書き
  const sw = useRef(null);

  const tags = (myInfo && Array.isArray(myInfo.tags) ? myInfo.tags : (myInfo && myInfo.tags ? Object.values(myInfo.tags) : DEFAULT_TAGS));
  const savedMap = saves || {};
  const list = useMemo(() => Object.entries(posts || {}).filter(([, p]) => p && p.text).map(([id, p]) => ({ id, ...p })), [posts]);
  const replyList = (pid) => Object.entries((replies || {})[pid] || {}).filter(([, r]) => r && r.text).map(([rid, r]) => ({ rid, ...r })).sort((a, b) => a.at - b.at);
  const tagsOf = (pid) => { const t = savedMap[pid] && savedMap[pid].tags; return Array.isArray(t) ? t : Object.values(t || {}); };

  const open = (id) => { setFrom(scr === 'thread' ? from : scr); setCur(id); setScr('thread'); setEdit(null); };
  const go = (s) => { setScr(s); setMenu(false); setEdit(null); };
  const back = () => go(scr === 'thread' || scr === 'compose' ? from : scr === 'request' ? 'thread' : 'tl');

  const toggle = async (path, on, val) => { try { if (on) await dbRemove(path); else await dbSet(path, val); } catch (e) { showToast('できませんでした：' + e.message); } };
  const like = (p) => toggle(`bp_posts/${p.id}/likes/${myKey}`, !!(p.likes || {})[myKey], true);
  const repost = (p) => {
    const on = !!(p.reposts || {})[myKey];
    toggle(`bp_posts/${p.id}/reposts/${myKey}`, on, Date.now());
    if (!on) showToast('リポストしました。7日間、全員のタイムラインの上に表示されます');
  };
  const likeReply = (pid, r) => toggle(`bp_replies/${pid}/${r.rid}/likes/${myKey}`, !!(r.likes || {})[myKey], true);
  const removePost = async (p) => {
    if (!window.confirm('この投稿を削除しますか？ 回答・コメントも一緒に消えます。')) return;
    try { await dbUpdateMany({ [`bp_posts/${p.id}`]: null, [`bp_replies/${p.id}`]: null }); showToast('削除しました'); if (scr === 'thread') back(); } catch (e) { showToast('削除できませんでした：' + e.message); }
  };
  const removeReply = async (pid, r) => {
    if (!window.confirm('この回答を削除しますか？')) return;
    try { await dbRemove(`bp_replies/${pid}/${r.rid}`); showToast('削除しました'); } catch (e) { showToast('削除できませんでした：' + e.message); }
  };
  const saveEdit = async () => {
    if (!edit.text.trim()) return showToast('内容を入れてください');
    try {
      if (edit.rid) await dbUpdateMany({ [`bp_replies/${edit.id}/${edit.rid}/text`]: edit.text, [`bp_replies/${edit.id}/${edit.rid}/editedAt`]: Date.now() });
      else await dbUpdateMany({ [`bp_posts/${edit.id}/text`]: edit.text, [`bp_posts/${edit.id}/editedAt`]: Date.now() });
      setEdit(null); showToast('直しました');
    } catch (e) { showToast('保存できませんでした：' + e.message); }
  };

  // ブラウザの「戻る」：開いているものを閉じる → 投稿の中なら一覧へ。タイムラインならホームへ（au navi に任せる）
  const backRef = useRef(null);
  backRef.current = () => {
    if (saveFor) { setSaveFor(null); return true; }
    if (menu) { setMenu(false); return true; }
    if (scr !== 'tl') { back(); return true; }
    return false;
  };
  useEffect(() => onAppBack(() => backRef.current()), []);

  // 左から右へのスワイプでサイドバー（感度は低め。横にしっかり動かしたときだけ）
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return;
    if (e.target.closest && e.target.closest('.bp-chips, textarea, input, .bp-sheet')) return;
    sw.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    const s = sw.current; sw.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 2.2) return;
    if (dx > 0 && !menu) setMenu(true);
    if (dx < 0 && menu) setMenu(false);
  };

  // ---- 投稿1件の表示 ----
  const postCard = (p, pinned, full) => {
    const liked = !!(p.likes || {})[myKey], repd = !!(p.reposts || {})[myKey], saved = !!savedMap[p.id];
    const mine = p.byKey === myKey;
    const editing = edit && edit.id === p.id && !edit.rid;
    const st = tagsOf(p.id);
    return (
      <article key={p.id} className={`bp-post ${pinned ? 'pin' : ''}`}>
        <div className="bp-av" aria-hidden="true">{initial(p.by)}</div>
        <div className="bp-pmain">
          <button className="bp-open" onClick={() => !full && open(p.id)} disabled={full}>
            <div className="bp-meta"><b>{p.by}</b><span>{ago(p.at)}{p.editedAt ? '（編集済み）' : ''}</span></div>
            <div className="bp-meta" style={{ marginTop: 4 }}><span className={`bp-tag ${p.type === '質問' ? 'q' : 's'}`}>{p.type}</span><span className="bp-tag c">{p.cat}</span></div>
            {!editing && <div className="bp-txt">{p.text}</div>}
          </button>
          {editing && (
            <div className="bp-editbox">
              <AutoTA className="bp-ta" value={edit.text} aria-label="投稿を編集" onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
              <div className="bp-row"><button className="bp-btn p" onClick={saveEdit}>保存</button><button className="bp-btn" onClick={() => setEdit(null)}>やめる</button></div>
            </div>
          )}
          {mine && !editing && <div className="bp-row" style={{ margin: '2px 0 4px' }}><button className="bp-own" onClick={() => setEdit({ id: p.id, text: p.text })}>編集</button><button className="bp-own del" onClick={() => removePost(p)}>削除</button></div>}
          <div className="bp-acts">
            <button className="bp-act" onClick={() => open(p.id)} aria-label="回答・コメントを見る"><Ico k="chat" />{replyList(p.id).length}</button>
            <button className={`bp-act ${repd ? 'rp' : ''}`} onClick={() => repost(p)} aria-label={repd ? 'リポストを取り消す' : 'リポスト'}><Ico k="rep" />{keys(p.reposts).length}</button>
            <button className={`bp-act ${liked ? 'on' : ''}`} onClick={() => like(p)} aria-label={liked ? 'いいねを取り消す' : 'いいね'}><Ico k={liked ? 'heartF' : 'heart'} />{keys(p.likes).length}</button>
            <button className={`bp-act ${saved ? 'sv' : ''}`} style={{ marginLeft: 'auto' }} onClick={() => setSaveFor(p.id)} aria-label={saved ? '保存のタグを変える' : '保存する'}><Ico k={saved ? 'bmF' : 'bm'} /></button>
          </div>
          {st.length > 0 && <div className="bp-saved">保存：{st.join('・')}</div>}
        </div>
      </article>
    );
  };

  // ---- 画面ごとの中身 ----
  let title = 'Brave X', body = null, foot = null;
  const now = Date.now();
  if (scr === 'tl') {
    const show = list.filter((p) => filt === 'すべて' || p.type === filt || p.cat === filt);
    const pinned = show.filter((p) => now - lastRepost(p) < PIN_MS).sort((a, b) => lastRepost(b) - lastRepost(a));
    const rest = show.filter((p) => !(now - lastRepost(p) < PIN_MS)).sort((a, b) => b.at - a.at);
    body = (<>
      <div className="bp-chips">{['すべて', ...TYPES, ...BP_CATS].map((f) => <button key={f} className={`bp-chip ${f === filt ? 'on' : ''}`} onClick={() => setFilt(f)}>{f}</button>)}</div>
      {pinned.length > 0 && <><div className="bp-sect"><Ico k="rep" s={14} />リポストされた投稿（7日間、上に表示）<i /></div>{pinned.map((p) => postCard(p, true))}</>}
      <div className="bp-sect">新しい投稿<i /></div>
      {rest.map((p) => postCard(p))}
      {!pinned.length && !rest.length && <div className="bp-empty">この条件の投稿はまだありません。<br />右下の【投稿する】から書けます。</div>}
      <div style={{ height: 90 }} />
    </>);
    foot = <button className="bp-fab" onClick={() => { setFrom('tl'); setScr('compose'); }}><span>＋</span>投稿する</button>;
  } else if (scr === 'thread') {
    const p = list.find((x) => x.id === cur);
    title = '投稿';
    if (!p) body = <div className="bp-empty">この投稿は削除されました</div>;
    else {
      const rs = replyList(p.id);
      body = (<>
        {postCard(p, false, true)}
        <div className="bp-sect">{p.type === '質問' ? '回答' : 'コメント'}<i /></div>
        {rs.map((r) => {
          const liked = !!(r.likes || {})[myKey], mine = r.byKey === myKey, editing = edit && edit.rid === r.rid;
          return (
            <div className="bp-post reply" key={r.rid}>
              <div className="bp-av sm" aria-hidden="true">{initial(r.by)}</div>
              <div className="bp-pmain">
                <div className="bp-meta"><b>{r.by}</b><span>{ago(r.at)}{r.editedAt ? '（編集済み）' : ''}</span></div>
                {editing ? (
                  <div className="bp-editbox">
                    <AutoTA className="bp-ta" value={edit.text} aria-label="回答を編集" onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
                    <div className="bp-row"><button className="bp-btn p" onClick={saveEdit}>保存</button><button className="bp-btn" onClick={() => setEdit(null)}>やめる</button></div>
                  </div>
                ) : <div className="bp-txt">{r.text}</div>}
                {mine && !editing && <div className="bp-row" style={{ margin: '2px 0 4px' }}><button className="bp-own" onClick={() => setEdit({ id: p.id, rid: r.rid, text: r.text })}>編集</button><button className="bp-own del" onClick={() => removeReply(p.id, r)}>削除</button></div>}
                <div className="bp-acts">
                  <button className={`bp-act ${liked ? 'on' : ''}`} onClick={() => likeReply(p.id, r)} aria-label={liked ? 'いいねを取り消す' : 'いいね'}><Ico k={liked ? 'heartF' : 'heart'} />{keys(r.likes).length}</button>
                </div>
              </div>
            </div>
          );
        })}
        {!rs.length && <div className="bp-empty">まだありません</div>}
        <div style={{ height: 20 }} />
      </>);
      foot = <ReplyBar post={p} me={me} myKey={myKey} onRequest={(text) => { setReqDraft({ name: '', category: CATEGORIES_BASE.includes(p.cat) ? p.cat : '用語', description: text, postId: p.id, postText: p.text }); setScr('request'); }} />;
    }
  } else if (scr === 'compose') {
    title = '新しい投稿';
    body = <Compose me={me} myKey={myKey} onDone={() => go('tl')} />;
  } else if (scr === 'request') {
    title = '用語集への追加を申請';
    body = <RequestForm draft={reqDraft} me={me} myKey={myKey} onDone={() => { setScr('thread'); }} />;
  } else if (scr === 'saved') {
    title = '保存済みのポスト';
    const ids = keys(savedMap).filter((id) => tagF === 'すべて' || tagsOf(id).includes(tagF));
    const ps = list.filter((p) => ids.includes(p.id)).sort((a, b) => ((savedMap[b.id] || {}).at || 0) - ((savedMap[a.id] || {}).at || 0));
    const allTags = [...new Set([...tags, ...keys(savedMap).flatMap(tagsOf)])];
    body = (<>
      <div className="bp-chips">{['すべて', ...allTags].map((t) => <button key={t} className={`bp-chip ${t === tagF ? 'on' : ''}`} onClick={() => setTagF(t)}>{t === 'すべて' ? 'すべて' : `＃ ${t}`}　{t === 'すべて' ? list.filter((p) => savedMap[p.id]).length : list.filter((p) => tagsOf(p.id).includes(t)).length}</button>)}</div>
      {ps.map((p) => postCard(p))}
      {!ps.length && <div className="bp-empty">保存したポストはまだありません。<br />ポストの右下の保存マークから保存できます。</div>}
    </>);
  } else if (scr === 'mine') {
    title = '自分のポスト';
    const ps = list.filter((p) => p.byKey === myKey).sort((a, b) => b.at - a.at);
    body = (<>{ps.map((p) => postCard(p))}{!ps.length && <div className="bp-empty">まだ投稿していません</div>}</>);
  } else if (scr === 'reqs') {
    title = '申請した用語';
    const rs = Object.entries(reqs || {}).filter(([, r]) => r && r.byKey === myKey).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.at - a.at);
    const ST = { pending: ['確認中', 'w'], approved: ['用語集に追加されました', 'ok'], rejected: ['見送り', 'ng'] };
    body = (<div className="bp-pad">
      {rs.map((r) => (
        <div className="bp-box" key={r.id}>
          <div className="bp-row" style={{ justifyContent: 'space-between' }}><b>{r.name}</b><span className={`bp-st ${(ST[r.status] || ST.pending)[1]}`}>{(ST[r.status] || ST.pending)[0]}</span></div>
          <div className="bp-small">{r.category}　{ago(r.at)}</div>
          <div className="bp-txt" style={{ margin: 0 }}>{r.description}</div>
          {r.reviewNote && <div className="bp-small">管理者から：{r.reviewNote}</div>}
        </div>
      ))}
      {!rs.length && <div className="bp-empty">申請した用語はまだありません</div>}
    </div>);
  }


  const counts = { saved: list.filter((p) => savedMap[p.id]).length, mine: list.filter((p) => p.byKey === myKey).length, reqs: Object.values(reqs || {}).filter((r) => r && r.byKey === myKey).length };
  const isTop = ['tl', 'saved', 'mine', 'reqs'].includes(scr);

  return (
    <div className="page bp" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { sw.current = null; }}>
      <header className="hdr">
        <div className="logo"><Logo /><h1>{title}</h1></div>
        <div className="hdr-right">
          <button className="btn-back" onClick={isTop && scr === 'tl' ? onBack : back}>← {scr === 'tl' ? 'ホーム' : '戻る'}</button>
          <ManualButton screen="bravepost" />
          <button className={`btn-toggle bp-burger ${menu ? 'active' : ''}`} onClick={() => setMenu(!menu)} aria-label="Brave Xのメニュー" aria-expanded={menu}><Ico k="burger" s={20} /></button>
        </div>
      </header>
      <div className="bp-scroll"><div className="bp-col">{body}</div></div>
      {foot}

      {menu && <button className="bp-dim" onClick={() => setMenu(false)} aria-label="メニューを閉じる" />}
      <nav className={`bp-side ${menu ? 'open' : ''}`} aria-label="Brave Xのメニュー" aria-hidden={!menu}>
        <div className="bp-me"><div className="bp-av">{initial(me)}</div><div><b>{me}</b><small>Brave X</small></div></div>
        <button className={`bp-sbtn ${scr === 'tl' ? 'on' : ''}`} onClick={() => go('tl')}>タイムライン</button>
        <button className={`bp-sbtn ${scr === 'mine' ? 'on' : ''}`} onClick={() => go('mine')}>自分のポスト<em>{counts.mine}件</em></button>
        <button className={`bp-sbtn ${scr === 'saved' && tagF === 'すべて' ? 'on' : ''}`} onClick={() => { setTagF('すべて'); go('saved'); }}><Ico k="bm" />保存済みのポスト<em>{counts.saved}件</em></button>
        {tags.map((t) => <button key={t} className={`bp-stag ${scr === 'saved' && tagF === t ? 'on' : ''}`} onClick={() => { setTagF(t); go('saved'); }}>＃ {t}</button>)}
        <button className={`bp-sbtn ${scr === 'reqs' ? 'on' : ''}`} onClick={() => go('reqs')}>申請した用語<em>{counts.reqs}件</em></button>
        <div className="bp-small" style={{ padding: '12px 16px' }}>画面を左から右へスワイプしても開けます。</div>
      </nav>

      {saveFor && <SaveSheet pid={saveFor} myKey={myKey} tags={tags} current={savedMap[saveFor] ? tagsOf(saveFor) : null} onClose={() => setSaveFor(null)} />}
    </div>
  );
}

// ---- 回答（コメント）を書く ----
function ReplyBar({ post, me, myKey, onRequest }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const isQ = post.type === '質問';
  const send = async (toReq) => {
    if (!text.trim()) return showToast(isQ ? '回答を書いてください' : 'コメントを書いてください');
    setBusy(true);
    try {
      await dbPush(`bp_replies/${post.id}`, { by: me, byKey: myKey, text: text.trim(), at: Date.now() });
      const t = text.trim(); setText('');
      if (toReq) onRequest(t); else showToast(isQ ? '回答しました' : 'コメントしました');
    } catch (e) { showToast('送れませんでした：' + e.message); }
    setBusy(false);
  };
  return (
    <div className="bp-replybar">
      <div className="bp-col" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AutoTA className="bp-ta" value={text} placeholder={isQ ? '回答を書く' : 'コメントを書く'} aria-label={isQ ? '回答を書く' : 'コメントを書く'} onChange={(e) => setText(e.target.value)} />
        <div className="bp-two"><button className="bp-btn p" disabled={busy} onClick={() => send(false)}>{isQ ? '回答する' : 'コメントする'}</button><button className="bp-btn" disabled={busy} onClick={() => send(true)}>送って用語集に申請</button></div>
      </div>
    </div>
  );
}

// ---- 新しい投稿 ----
function Compose({ me, myKey, onDone }) {
  const [type, setType] = useState('質問');
  const [cat, setCat] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = text.trim() && cat;
  const post = async () => {
    if (!ok) return showToast('何についての投稿かと、内容を入れてください');
    setBusy(true);
    try { await dbPush('bp_posts', { by: me, byKey: myKey, type, cat, text: text.trim(), at: Date.now() }); showToast('投稿しました'); onDone(); } catch (e) { showToast('投稿できませんでした：' + e.message); }
    setBusy(false);
  };
  return (
    <div className="bp-pad"><div className="bp-box">
      <div className="bp-lbl">投稿の種類</div>
      <div className="bp-two">{TYPES.map((t) => <button key={t} className={`bp-seg ${t === type ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div>
      <div className="bp-lbl">何についての投稿か</div>
      <div className="bp-wrap">{BP_CATS.map((c) => <button key={c} className={`bp-chip ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <label className="bp-lbl" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>内容
        <AutoTA className="bp-ta big" value={text} rows={5} placeholder={type === '質問' ? '分からないこと・困っていることを書く' : '施策の変更、プラン変更の情報、現場での気づきなどを書く'} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="bp-small">投稿には名前が表示されます。</div>
      <button className={`bp-btn p ${ok ? '' : 'dis'}`} disabled={busy} onClick={post}>{busy ? '投稿中…' : '投稿する'}</button>
    </div></div>
  );
}

// ---- 用語集への追加を申請（管理画面には行かない） ----
function RequestForm({ draft, me, myKey, onDone }) {
  const [f, setF] = useState(() => draft || { name: '', category: '用語', description: '' });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!f.name.trim() || !f.description.trim()) return showToast('用語の名前と説明を入れてください');
    setBusy(true);
    try {
      await dbPush('bp_term_requests', { ...f, name: f.name.trim(), description: f.description.trim(), by: me, byKey: myKey, at: Date.now(), status: 'pending' });
      showToast('申請しました。管理者が確認すると用語集に載ります'); onDone();
    } catch (e) { showToast('申請できませんでした：' + e.message); }
    setBusy(false);
  };
  return (
    <div className="bp-pad">
      {f.postText && <div className="bp-box soft"><div className="bp-lbl">もとの投稿</div><div className="bp-small" style={{ color: '#4a3528', fontSize: 13 }}>{f.postText}</div></div>}
      <div className="bp-box">
        <label className="bp-lbl" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>用語の名前<input className="bp-inp" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="bp-lbl">カテゴリ</div>
        <div className="bp-wrap">{CATEGORIES_BASE.map((c) => <button key={c} className={`bp-chip ${c === f.category ? 'on' : ''}`} onClick={() => setF({ ...f, category: c })}>{c}</button>)}</div>
        <label className="bp-lbl" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>説明（回答の文章が入っています）
          <AutoTA className="bp-ta big" value={f.description} rows={4} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        <div className="bp-small">申請すると、管理者が確認してから用語集に載ります。ランク・関連する用語は管理者が付けます。</div>
        <button className="bp-btn p" disabled={busy} onClick={send}>{busy ? '申請中…' : '申請する'}</button>
      </div>
    </div>
  );
}

// ---- 保存とタグ（自分にだけ見える） ----
function SaveSheet({ pid, myKey, tags, current, onClose }) {
  const [sel, setSel] = useState(current || []);
  const [nt, setNt] = useState('');
  const [list, setList] = useState(tags);
  const add = () => {
    const t = nt.trim().replace(/[.#$[\]/]/g, '');
    if (!t) return;
    if (!list.includes(t)) setList([...list, t]);
    if (!sel.includes(t)) setSel([...sel, t]);
    setNt('');
  };
  const save = async () => {
    try {
      const up = { [`bp_saves/${myKey}/${pid}`]: { tags: sel, at: Date.now() } };
      if (list.join('\n') !== tags.join('\n')) up[`bp_users/${myKey}/tags`] = list;
      await dbUpdateMany(up); showToast('保存しました'); onClose();
    } catch (e) { showToast('保存できませんでした：' + e.message); }
  };
  const unsave = async () => { try { await dbRemove(`bp_saves/${myKey}/${pid}`); showToast('保存を外しました'); onClose(); } catch (e) { showToast('できませんでした：' + e.message); } };
  return (
    <>
      <button className="bp-dim" style={{ zIndex: 70 }} onClick={onClose} aria-label="閉じる" />
      <div className="bp-sheet" role="dialog" aria-label="ポストを保存">
        <b style={{ fontSize: 16 }}>ポストを保存</b>
        <div className="bp-lbl">タグ（いくつでも選べます）</div>
        <div className="bp-wrap">{list.map((t) => <button key={t} className={`bp-chip ${sel.includes(t) ? 'on' : ''}`} onClick={() => setSel(sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t])}>＃ {t}</button>)}</div>
        <div className="bp-row"><input className="bp-inp" placeholder="新しいタグ" aria-label="新しいタグ" value={nt} onChange={(e) => setNt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} /><button className="bp-btn" style={{ flexShrink: 0 }} onClick={add}>追加</button></div>
        <button className="bp-btn p" onClick={save}>保存する</button>
        {current && <button className="bp-btn del" onClick={unsave}>保存を外す</button>}
        <div className="bp-small">保存とタグは自分にだけ見えます。</div>
      </div>
    </>
  );
}
