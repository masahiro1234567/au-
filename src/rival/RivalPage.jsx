import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet, dbPush, dbRemove, dbUpdateMany } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { ManualButton } from '../manual/Manual.jsx';
import { AutoTA } from '../components/EvalEditors.jsx';
import { CATS, CAT_DESC, DATA, SECS, AI_SEED, AI_BY, COMPANIES } from './data.js';

// ===== 他社比較 =====
// 保存場所（au-data-base）
//   rival_docs/{会社id}/{id}           = { tag: 'PDF'|'カタログ'|'Web', title, url, order }  公式の資料（管理者が追加・削除）
//   rival_posts/{会社id}/{項目}/{id}   = { text, by, uid, at, ai? }                          みんなの書き込み（本人と管理者が編集・削除）
//   rival_config/seeded                = 最初の資料とAI生成の書き込みを入れたら true
const TAG_CLASS = { PDF: 'pdf', カタログ: 'cat', Web: 'web' };
const host = (u) => String(u || '').replace(/^https?:\/\//, '').split('/')[0];
const when = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
const arr = (o) => Object.entries(o || {}).filter(([, v]) => v).map(([id, v]) => ({ id, ...v }));

// 最初に1回だけ、資料とAI生成の書き込みを入れる（キーを固定しているので、2人同時に開いても重ならない）
async function seedOnce() {
  const up = { 'rival_config/seeded': true };
  const at = Date.now();
  COMPANIES.forEach((c) => {
    c.docs.forEach(([tag, title, url], i) => { up[`rival_docs/${c.id}/seed${i}`] = { tag, title, url, order: i }; });
    const ai = AI_SEED[c.id];
    if (ai) ['feat', 'merit', 'demerit'].forEach((k, i) => { up[`rival_posts/${c.id}/${k}/ai`] = { text: ai[i], by: AI_BY, uid: '', at, ai: true }; });
  });
  await dbUpdateMany(up);
}

export default function RivalPage({ user, isAdmin, onBack }) {
  const [config, cfgLoaded] = useDbCollection('rival_config');
  const [docsAll] = useDbCollection('rival_docs');
  const [postsAll] = useDbCollection('rival_posts');
  const [cat, setCat] = useState('mobile');
  const [view, setView] = useState('docs'); // docs ／ list
  const [sel, setSel] = useState({ mobile: 'sb', net: 'dhikari', sub: 'ddenki' });
  const [writing, setWriting] = useState(''); // 書いている項目
  const [draft, setDraft] = useState('');
  const [editId, setEditId] = useState(''); // 「項目/id」
  const [editText, setEditText] = useState('');
  const [addDoc, setAddDoc] = useState(null);

  useEffect(() => { if (cfgLoaded && !config.seeded) seedOnce().catch(() => {}); }, [cfgLoaded, config.seeded]);

  const groups = DATA[cat];
  const companies = useMemo(() => COMPANIES.filter((c) => c.cat === cat), [cat]);
  const cur = companies.find((c) => c.id === sel[cat]) || companies[0];
  const postsOf = (cid, k) => arr(postsAll[cid] && postsAll[cid][k]).sort((a, b) => (b.at || 0) - (a.at || 0));
  const countOf = (cid) => SECS.reduce((n, [k]) => n + postsOf(cid, k).length, 0);
  const docs = arr(docsAll[cur.id]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.at || 0) - (b.at || 0));
  const canEdit = (p) => isAdmin || (!p.ai && p.uid && user && p.uid === user.uid);
  const pick = (id) => { setSel({ ...sel, [cat]: id }); setWriting(''); setEditId(''); setAddDoc(null); };

  const save = async (k) => {
    const t = draft.trim();
    if (!t) return showToast('内容を入力してください');
    await dbPush(`rival_posts/${cur.id}/${k}`, { text: t, by: (user && user.name) || '名前なし', uid: (user && user.uid) || '', at: Date.now() });
    setWriting(''); setDraft(''); showToast('書き込みました');
  };
  const saveEdit = async (k, p) => {
    const t = editText.trim();
    if (!t) return showToast('内容を入力してください');
    await dbUpdateMany({ [`rival_posts/${cur.id}/${k}/${p.id}/text`]: t, [`rival_posts/${cur.id}/${k}/${p.id}/editedAt`]: Date.now() });
    setEditId(''); showToast('保存しました');
  };
  const del = async (k, p) => {
    if (!window.confirm('この書き込みを削除します。よろしいですか？')) return;
    await dbRemove(`rival_posts/${cur.id}/${k}/${p.id}`); showToast('削除しました');
  };
  const saveDoc = async () => {
    const d = addDoc || {};
    if (!d.title || !d.title.trim() || !/^https?:\/\//.test(d.url || '')) return showToast('名前と、https:// から始まるURLを入れてください');
    await dbPush(`rival_docs/${cur.id}`, { tag: d.tag || 'Web', title: d.title.trim(), url: d.url.trim(), order: 100, at: Date.now() });
    setAddDoc(null); showToast('資料を追加しました');
  };

  const first = (cid, k) => { const p = postsOf(cid, k)[0]; return p ? p.text : '－'; };

  return (
    <div className="page rv">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>他社比較</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← ホーム</button><ManualButton screen="rival" /></div>
      </header>
      <div className="rv-bar">
        <div className="rv-seg">
          {CATS.map(([id, label]) => <button key={id} className={cat === id ? 'on' : ''} onClick={() => { setCat(id); setWriting(''); setEditId(''); setAddDoc(null); }}>{label}<small>{CAT_DESC[id]}</small></button>)}
        </div>
        <div className="rv-seg sm">
          <button className={view === 'docs' ? 'on' : ''} onClick={() => setView('docs')}>会社ごと</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>一覧で比べる</button>
        </div>
      </div>

      {view === 'docs' ? (
        <div className="rv-body">
          <nav className="rv-side" aria-label="会社をえらぶ">
            {groups.map(([g, items]) => (
              <div key={g} className="rv-group">
                <div className="rv-gname">{g}</div>
                {items.map(([id, name]) => {
                  const n = countOf(id);
                  return <button key={id} className={`rv-co ${cur.id === id ? 'on' : ''}`} onClick={() => pick(id)}><b>{name}</b>{n > 0 && <small>{n}件</small>}</button>;
                })}
              </div>
            ))}
          </nav>

          <main className="rv-main">
            <div className="rv-title"><h2>{cur.name}</h2><span className="rv-pill">{cur.group}</span></div>

            <section className="rv-card">
              <div className="rv-card-h"><b>公式の資料（原本）</b><span className="rv-sub">公式サイトで、いつも最新の原本が開きます</span><span className="rv-grow" />
                {isAdmin && !addDoc && <button className="ev-btn" onClick={() => setAddDoc({ tag: 'Web', title: '', url: '' })}>＋ 資料を追加</button>}</div>
              {addDoc && (
                <div className="rv-adddoc">
                  <select className="ev-inp" value={addDoc.tag} onChange={(e) => setAddDoc({ ...addDoc, tag: e.target.value })} aria-label="資料の種類"><option>Web</option><option>PDF</option><option>カタログ</option></select>
                  <input className="ev-inp" placeholder="資料の名前（例：総合カタログ）" value={addDoc.title} onChange={(e) => setAddDoc({ ...addDoc, title: e.target.value })} />
                  <input className="ev-inp" placeholder="https://…" value={addDoc.url} onChange={(e) => setAddDoc({ ...addDoc, url: e.target.value })} />
                  <div className="rv-row-end"><button className="ev-btn" onClick={() => setAddDoc(null)}>やめる</button><button className="ev-btn p" onClick={saveDoc}>追加</button></div>
                </div>
              )}
              <div className="rv-docs">
                {docs.map((d) => (
                  <div key={d.id} className="rv-doc-wrap">
                    <a className="rv-doc" href={d.url} target="_blank" rel="noopener noreferrer">
                      <span className={`rv-tag ${TAG_CLASS[d.tag] || 'web'}`}>{d.tag || 'Web'}</span>
                      <span className="rv-doc-t"><b>{d.title}</b><small>{host(d.url)}</small></span>
                      <span className="rv-open">開く ↗</span>
                    </a>
                    {isAdmin && <button className="rv-x" aria-label={`${d.title}を削除`} onClick={async () => { if (window.confirm('この資料を一覧から外します。よろしいですか？')) { await dbRemove(`rival_docs/${cur.id}/${d.id}`); showToast('外しました'); } }}>×</button>}
                  </div>
                ))}
                {!docs.length && <div className="ev-note">まだ資料がありません</div>}
              </div>
            </section>

            <div className="rv-ai-note">「{AI_BY}」の書き込みは、AIが2026年10月時点の公開情報を調べて書いたものです。まちがいや古い内容があるかもしれません。お客様に案内する前に、上の原本で確認してください。気づいたら直してください。</div>

            <div className="rv-secs">
              {SECS.map(([k, name, ph]) => {
                const list = postsOf(cur.id, k);
                const isW = writing === k;
                return (
                  <section key={k} className={`rv-card ${k === 'talk' ? 'wide' : ''}`}>
                    <div className="rv-card-h"><b>{name}</b>{list.length > 0 && <span className="rv-sub">{list.length}件</span>}<span className="rv-grow" />
                      {!isW && <button className="ev-btn p" onClick={() => { setWriting(k); setDraft(''); }}>＋ 書く</button>}</div>
                    {isW && (
                      <div className="rv-write">
                        <AutoTA className="ev-inp ev-ta" rows={3} value={draft} placeholder={`例：${ph}`} aria-label={`${name}を書く`} onChange={(e) => setDraft(e.target.value)} />
                        <div className="rv-row-end"><button className="ev-btn" onClick={() => setWriting('')}>やめる</button><button className="ev-btn p" onClick={() => save(k)}>保存</button></div>
                      </div>
                    )}
                    {list.map((p) => (
                      <div key={p.id} className="rv-post">
                        {editId === `${k}/${p.id}` ? (
                          <div className="rv-write">
                            <AutoTA className="ev-inp ev-ta" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                            <div className="rv-row-end"><button className="ev-btn" onClick={() => setEditId('')}>やめる</button><button className="ev-btn p" onClick={() => saveEdit(k, p)}>保存</button></div>
                          </div>
                        ) : <div className="rv-text">{p.text}</div>}
                        <div className="rv-meta">
                          <span>記入：<b className={p.ai ? 'ai' : ''}>{p.by}</b>・{when(p.editedAt || p.at)}{p.editedAt ? '（編集）' : ''}</span>
                          <span className="rv-grow" />
                          {canEdit(p) && editId !== `${k}/${p.id}` && <>
                            <button className="ev-btn sm" onClick={() => { setEditId(`${k}/${p.id}`); setEditText(p.text); }}>編集</button>
                            <button className="ev-btn sm" style={{ color: '#b91c1c' }} onClick={() => del(k, p)}>削除</button>
                          </>}
                        </div>
                      </div>
                    ))}
                    {!list.length && !isW && <div className="ev-note">まだ書かれていません</div>}
                  </section>
                );
              })}
            </div>
            <div className="ev-note">メンバーはだれでも書けます。書いた人の名前が出ます。書いた本人と管理者が、編集・削除できます。</div>
          </main>
        </div>
      ) : (
        <div className="rv-listwrap">
          <div className="rv-table-box">
            <table className="rv-table">
              <thead><tr><th>会社</th><th>種類</th><th>特徴</th><th>メリット</th><th>デメリット</th><th /></tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <th>{c.name}</th><td className="sub">{c.group}</td>
                    <td>{first(c.id, 'feat')}</td><td>{first(c.id, 'merit')}</td><td>{first(c.id, 'demerit')}</td>
                    <td><button className="ev-btn" onClick={() => { pick(c.id); setView('docs'); }}>開く</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ev-note">各項目で、いちばん新しい書き込みが出ます。</div>
        </div>
      )}
    </div>
  );
}
