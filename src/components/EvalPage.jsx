import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { showToast } from '../utils.js';
import { parseBook, RANK_STYLE, RANKS5, normName } from '../evalSheets.js';

// ===== 評価一覧（Googleスプレッドシートを読み取って表示）=====
// 編集はスプレッドシートで行い、ここは表示だけ。誰でも誰の評価でも見られる
// 表示する／しない・並び順・削除（このアプリに出さない）は、管理者ログイン中だけ変えられる（eval_config に保存）
const POS_ORDER = ['責任者', 'MQ', 'SAM', 'IN', 'NV'];
const GRADE_ORDER = ['S', 'A', 'B', 'C', 'R'];
const idOf = (v) => { const m = String(v || '').match(/\/d\/([A-Za-z0-9_-]{20,})/); return m ? m[1] : String(v || '').trim(); };

// 不可は「不可」と書かずに、文字なしのグレーにする（label を付けたときだけ文字を出す：評価基準の説明など）
const Rank = ({ v, big, label }) => {
  const st = RANK_STYLE[v];
  if (!st) return <span className="ev-plain">{v || '－'}</span>;
  const blank = v === '不可' && !label;
  return <span className={`ev-rank ${big ? 'big' : ''} ${blank ? 'none' : ''}`} style={{ background: st.bg, color: st.fg }} aria-label={v} title={v}>{blank ? '' : v}</span>;
};
// 達成率の色：100%以上は緑、80%以上はオレンジ、80%未満は赤
const rateColor = (v) => { const n = parseFloat(String(v).replace('%', '')); if (Number.isNaN(n)) return null; return n >= 100 ? 'ok' : n >= 80 ? 'mid' : 'ng'; };

// 個人の目標（例：クローズを秀に／達成条件：個人ディレクター達成率75%）。本人と管理者がこの画面で書き込める
// 保存先：eval_goals/{名前のキー} = [{ item, rank, cond }]（書き込みがなければスプレッドシートの内容を出す）
const GOAL_ITEMS = ['キャッチ', 'クローズ', 'ディレクション'];
function GoalEditor({ person, saved, canEdit }) {
  const base = saved ? (Array.isArray(saved) ? saved : Object.values(saved)) : person.goalsSheet || [];
  const [edit, setEdit] = useState(null);
  const list = (edit || base).filter(Boolean);
  const set = (i, k, v) => setEdit(list.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
  const save = async () => {
    await dbSet(`eval_goals/${person.key}`, list.filter((g) => g.item || g.cond).map((g) => ({ item: g.item || '', rank: g.rank || '', cond: g.cond || '' })));
    setEdit(null);
    showToast('目標を保存しました');
  };
  if (!list.length && !canEdit) return null;
  return (
    <div>
      <div className="ev-h">目標（各自で設定）</div>
      {!edit && list.map((g, i) => (
        <div key={i} className="ev-goalrow">
          <span className="ev-goal-item">{g.item || '－'}</span>
          <span className="ev-goal-rank"><small>目標</small><Rank v={g.rank} /></span>
          <span className="ev-goal-cond"><small>達成条件</small>{g.cond || '－'}</span>
        </div>
      ))}
      {!edit && !list.length && <div className="ev-note">まだ目標が書かれていません</div>}
      {edit && list.map((g, i) => (
        <div key={i} className="ev-goaledit">
          <select className="ev-inp" value={g.item} onChange={(e) => set(i, 'item', e.target.value)} aria-label="項目">
            <option value="">項目</option>{[...new Set([...GOAL_ITEMS, g.item].filter(Boolean))].map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className="ev-inp" value={g.rank} onChange={(e) => set(i, 'rank', e.target.value)} aria-label="目標ランク">
            <option value="">目標ランク</option>{RANKS5.map((x) => <option key={x}>{x}</option>)}
          </select>
          <input className="ev-inp" value={g.cond} onChange={(e) => set(i, 'cond', e.target.value)} placeholder="達成条件（例：個人ディレクター達成率75%）" aria-label="達成条件" />
          <button className="ev-btn" onClick={() => setEdit(list.filter((_, j) => j !== i))} aria-label="この目標を削除">×</button>
        </div>
      ))}
      {canEdit && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {!edit && <button className="ev-btn" onClick={() => setEdit(list.length ? list : [{ item: '', rank: '', cond: '' }])}>目標を書く・直す</button>}
          {edit && <>
            <button className="ev-btn" onClick={() => setEdit([...list, { item: '', rank: '', cond: '' }])}>＋ 目標を追加</button>
            <span style={{ flex: 1 }} />
            <button className="ev-btn" onClick={() => setEdit(null)}>キャンセル</button>
            <button className="ev-btn p" onClick={save}>保存</button>
          </>}
        </div>
      )}
    </div>
  );
}

export default function EvalPage({ isAdmin, onBack, user }) {
  const [goals] = useDbCollection('eval_goals');
  const [cfg] = useDbCollection('eval_config');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const sheetId = (cfg && cfg.sheetId) || '';
  const [book, setBook] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('summary');
  const [sel, setSel] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [showSetting, setShowSetting] = useState(false);

  const load = async () => {
    if (!sheetId) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch(`/api/sheets?id=${encodeURIComponent(sheetId)}&t=${Date.now()}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `読み取りに失敗しました（${r.status}）`);
      setBook(parseBook(j));
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [sheetId]);

  // ---- 並び順（メンバー管理の順：役職→等級→名前。管理者が並べ替えたらその順）----
  const memberInfo = useMemo(() => {
    const m = {};
    Object.values(fpUsers || {}).forEach((u) => { if (u && u.name) m[normName(u.name)] = u; });
    return m;
  }, [fpUsers]);
  const hidden = (cfg && cfg.hidden) || {};
  const removed = (cfg && cfg.removed) || {};
  const manual = Array.isArray(cfg && cfg.order) ? cfg.order : Object.values((cfg && cfg.order) || {});
  const defaultRank = (key) => {
    const u = memberInfo[key] || {};
    const p = POS_ORDER.indexOf(u.position); const g = GRADE_ORDER.indexOf(u.grade);
    return (p < 0 ? 9 : p) * 10 + (g < 0 ? 9 : g);
  };
  const sortKeys = (items) => [...items].sort((a, b) => {
    const ia = manual.indexOf(a.key), ib = manual.indexOf(b.key);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib);
    return defaultRank(a.key) - defaultRank(b.key) || a.name.localeCompare(b.name, 'ja');
  });
  const visible = (it) => !removed[it.key] && (isAdmin || !hidden[it.key]);

  const persons = useMemo(() => (book ? sortKeys(book.persons.map((p) => ({ ...p, name: p.info.name }))) : []), [book, cfg, memberInfo]);
  const summaryRows = useMemo(() => (book && book.summary ? sortKeys(book.summary.rows) : []), [book, cfg, memberInfo]);

  // ---- 管理者の操作 ----
  const move = async (key, d) => {
    const keys = allKeys.filter((x) => !removed[x.key]).map((x) => x.key);
    const i = keys.indexOf(key), j = i + d;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    await dbSet('eval_config/order', keys);
  };
  const toggleHidden = (key) => dbSet(`eval_config/hidden/${key}`, hidden[key] ? null : true);
  const remove = async (key, name) => {
    if (!window.confirm(`「${name}」を評価一覧に出さないようにします（スプレッドシートからは消えません。下の「削除したメンバー」から戻せます）`)) return;
    await dbSet(`eval_config/removed/${key}`, true);
    if (sel === key) setSel(null);
  };
  const restore = (key) => dbSet(`eval_config/removed/${key}`, null);
  const saveUrl = async () => {
    const id = idOf(urlInput);
    if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return showToast('スプレッドシートのURLを貼り付けてください');
    await dbSet('eval_config/sheetId', id);
    setShowSetting(false); setUrlInput('');
    showToast('登録しました');
  };

  // ---- 1人分（個人別シート＋評価サマリ）----
  const [openSec, setOpenSec] = useState({});
  const TOTAL3 = ['キャッチ', 'クローズ', 'ディレクション'];
  const people = useMemo(() => {
    if (!book) return [];
    const S = book.summary;
    const START = { キャッチ: 'キャッチ力', クローズ: 'クローズ力', ディレクション: 'ディレクション力', ディレクター: 'ディレクション力' };
    // サマリの列のまとまり（「キャッチ」の列から次のまとまりまで）
    const colGroup = {};
    if (S) {
      let g = Object.keys(S.groups || {}).length ? null : '';
      S.headers.forEach((h) => {
        if (g === null) { colGroup[h] = (S.groups || {})[h] || ''; return; }
        const k = h.replace(/[\s　]/g, '');
        if (START[k]) g = START[k];
        else if (!S.rankCols.includes(h)) g = '';
        if (g && S.rankCols.includes(h)) colGroup[h] = g;
      });
    }
    const totalOf = (cells, idx) => {
      if (!cells) return '';
      const h = S.headers.find((x) => START[x.replace(/[\s　]/g, '')] === ['キャッチ力', 'クローズ力', 'ディレクション力'][idx]);
      return h ? cells[h] : '';
    };
    const map = new Map();
    book.persons.forEach((pp) => map.set(pp.key, { key: pp.key, name: pp.info.name, role: pp.info.role, person: pp, info: pp.info }));
    (S ? S.rows : []).forEach((r) => { const m = map.get(r.key) || { key: r.key, name: r.name, role: '', info: null }; m.row = r; if (!m.role) m.role = r.cells['現役割'] || ''; map.set(r.key, m); });
    const list = [...map.values()].map((m) => {
      const pt = (m.person && m.person.totals) || [];
      const fromP = (i) => (pt.find((x) => [/キャッチ/, /クローズ/, /ディレク/][i].test(x.label)) || {}).rank || '';
      const tot3 = [0, 1, 2].map((i) => fromP(i) || totalOf(m.row && m.row.cells, i));
      // まとまりごとの項目：個人別シートがあればそれ（前回ランク・コメント付き）、なければサマリの列
      let secs;
      if (m.person && m.person.skills.length) {
        const names = [...new Set(m.person.skills.map((x) => x.section || 'その他'))];
        secs = names.map((n) => ({ name: n, items: m.person.skills.filter((x) => (x.section || 'その他') === n) }));
      } else if (m.row) {
        const names = [...new Set(Object.values(colGroup).filter(Boolean))];
        secs = names.map((n) => ({ name: n, items: S.headers.filter((h) => colGroup[h] === n && !START[h.replace(/[\s　]/g, '')]).map((h) => ({ item: h, rank: m.row.cells[h], prev: '' })) }));
      } else secs = [];
      secs.forEach((sec) => { const i = ['キャッチ力', 'クローズ力', 'ディレクション力'].indexOf(sec.name); sec.total = i >= 0 ? tot3[i] : ''; });
      return { ...m, tot3, secs, reviews: (m.person && m.person.reviews) || [] };
    });
    return sortKeys(list);
  }, [book, cfg, memberInfo]);

  const allKeys = useMemo(() => {
    const seen = new Map();
    [...persons, ...summaryRows, ...people].forEach((x) => { if (!seen.has(x.key)) seen.set(x.key, x); });
    return sortKeys([...seen.values()]);
  }, [persons, summaryRows, people]);

  const tabs = [
    book && book.summary && ['summary', '評価サマリ'],
    book && book.persons.length > 0 && ['person', '個人別'],
    book && book.kpi && ['kpi', '月次KPI'],
    book && book.standard && ['standard', '評価基準'],
    ...((book && book.tables) || []).map((tb, i) => [`t${i}`, tb.title]),
  ].filter(Boolean);
  const curTab = tabs.find((x) => x[0] === tab) ? tab : (tabs[0] && tabs[0][0]);

  const AdminCtl = ({ it }) => isAdmin && (
    <span className="ev-ctl" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => move(it.key, -1)} aria-label="上へ">▲</button>
      <button onClick={() => move(it.key, 1)} aria-label="下へ">▼</button>
      <button className={hidden[it.key] ? 'off' : ''} onClick={() => toggleHidden(it.key)}>{hidden[it.key] ? '非表示中' : '表示中'}</button>
      <button className="del" onClick={() => remove(it.key, it.name)}>削除</button>
    </span>
  );

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>評価一覧</h1></div>
        <div className="hdr-right">
          {sheetId && <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? '読み込み中…' : '最新にする'}</button>}
          <button className="btn-back" onClick={onBack}>← {isAdmin ? '管理画面' : 'ホーム'}</button>
        </div>
      </header>
      <div className="t-body ev-body">
        {isAdmin && (
          <div className="ev-admin">
            <span>管理者モード：表示する／しない・並び順・削除を変えられます</span>
            <button className="btn-ghost" onClick={() => setShowSetting(!showSetting)}>スプレッドシートの設定</button>
          </div>
        )}
        {(showSetting || (!sheetId && isAdmin)) && isAdmin && (
          <div className="ev-card">
            <div className="ev-h">スプレッドシートを登録</div>
            <div className="ev-note">評価一覧のスプレッドシートのURLを貼り付けてください。スプレッドシートの共有に、読み取り用のアカウント（サービスアカウント）を「閲覧者」で追加しておく必要があります。{sheetId && `　今の登録：…${sheetId.slice(-8)}`}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="ev-inp" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
              <button className="ev-btn p" onClick={saveUrl}>登録</button>
            </div>
          </div>
        )}
        {!sheetId && !isAdmin && <div className="ev-empty">評価一覧はまだ準備中です。<br />管理者ログイン →「評価一覧の管理」から、スプレッドシートを登録すると表示されます。</div>}
        {err && <div className="ev-err">{err}</div>}
        {loading && !book && <div className="ev-empty">読み込み中…</div>}

        {book && (<>
          <div className="tq-tabs ev-tabs">
            {tabs.map(([k, l]) => <button key={k} className={`tq-tab ${curTab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>

          {/* ---- 評価サマリ：キャッチ・クローズ・ディレクションの総合評価だけ ---- */}
          {curTab === 'summary' && (
            <>
              <div className="ev-sum">
                <div className="ev-sum-row head"><span>氏名</span>{TOTAL3.map((x) => <span key={x}>{x}</span>)}{isAdmin && <span />}</div>
                {people.filter(visible).map((p) => (
                  <div key={p.key} className={`ev-sum-row ${hidden[p.key] ? 'dim' : ''}`}>
                    <button className="ev-sum-name" onClick={() => { setSel(p.key); setTab('person'); }}><b>{p.name}</b><small>{p.role}</small></button>
                    {p.tot3.map((v, i) => <span key={i} className="ev-sum-c"><Rank v={v} /></span>)}
                    {isAdmin && <AdminCtl it={p} />}
                  </div>
                ))}
              </div>
              <div className="ev-note" style={{ marginTop: 6 }}>名前を押すと、その人の個人別が開きます</div>
            </>
          )}

          {/* ---- 個人別：押すとその場で開く。キャッチ力などのまとまりも開閉できる ---- */}
          {curTab === 'person' && (
            <div className="ev-plist">
              {people.filter(visible).map((p) => {
                const on = sel === p.key;
                return (
                  <div key={p.key} className={`ev-pcard ${on ? 'on' : ''} ${hidden[p.key] ? 'dim' : ''}`}>
                    <button className="ev-prow" onClick={() => setSel(on ? null : p.key)} aria-expanded={on}>
                      <span className="ev-av">{p.name.slice(0, 1)}</span>
                      <span className="ev-grow"><b>{p.name}</b><small>{p.role}</small></span>
                      <span className="ev-mini">{p.tot3.map((v, i) => <Rank key={i} v={v} />)}</span>
                      <span className="ev-arrow">{on ? '▲' : '▼'}</span>
                    </button>
                    {isAdmin && <div className="ev-pctl"><AdminCtl it={p} /></div>}
                    {on && (
                      <div className="ev-pbody">
                        {p.info && (p.info.kana || p.info.start) && <div className="ev-sub" style={{ marginBottom: 6 }}>{[p.info.kana, p.info.start && `稼働開始 ${p.info.start}`].filter(Boolean).join('・')}</div>}
                        {p.person && <GoalEditor key={p.key} person={p.person} saved={(goals || {})[p.key]} canEdit={isAdmin || (!!user && normName(user.name) === p.key)} />}
                        {p.reviews.length > 0 && (<><div className="ev-h">具体評価</div>
                          {p.reviews.map((x) => <div key={x.label} className="ev-review"><small>{x.label}{x.store ? `（${x.store}）` : ''}</small>{x.text && <p>{x.text}</p>}</div>)}</>)}
                        {p.secs.map((sec) => {
                          const k = p.key + '|' + sec.name, so = !!openSec[k];
                          return (
                            <div key={sec.name} className="ev-secbox">
                              <button className="ev-secbtn" onClick={() => setOpenSec({ ...openSec, [k]: !so })} aria-expanded={so}>
                                <b>{sec.name}</b>{sec.total && <Rank v={sec.total} />}<span className="ev-arrow">{so ? '▲' : '▼'}</span>
                              </button>
                              {so && (<>
                                <div className="ev-srow head"><span>評価項目</span><span>ランク</span><span>前回</span></div>
                                {sec.items.map((x) => (
                                  <div key={x.item}>
                                    <div className="ev-srow"><span>{x.item}</span><span><Rank v={x.rank} /></span><span><Rank v={x.prev} /></span></div>
                                    {x.comment && <div className="ev-skill-c" style={{ padding: '0 4px 8px' }}>{x.comment}</div>}
                                  </div>
                                ))}
                              </>)}
                            </div>
                          );
                        })}
                        {p.person && [['目標設定', p.person.goals], ['具体的アクションプラン', p.person.actions], ['月次振り返り / 1on1ログ', p.person.logs]].filter(([, tb]) => tb.rows.length).map(([title, tb]) => {
                          const k = p.key + '|' + title, so = !!openSec[k];
                          return (
                            <div key={title} className="ev-secbox">
                              <button className="ev-secbtn" onClick={() => setOpenSec({ ...openSec, [k]: !so })} aria-expanded={so}><b>{title}</b><span className="ev-arrow">{so ? '▲' : '▼'}</span></button>
                              {so && tb.rows.map((row, i) => (
                                <div key={i} className="ev-goal">{tb.heads.filter((h) => !/^No\.?$/i.test(h) && row[h]).map((h, j) => <div key={h} className={j === 0 ? 'first' : ''}><small>{h}</small><span>{row[h]}</span></div>)}</div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- 月次KPI ---- */}
          {curTab === 'kpi' && book.kpi && (() => {
            const K = book.kpi; const nowM = `${new Date().getMonth() + 1}月`;
            return (<>
              {K.note && <div className="ev-note" style={{ marginBottom: 8 }}>{K.note}</div>}
              {K.items.map((it) => (
                <div key={it.name} className="ev-card" style={{ marginBottom: 10 }}>
                  <div className="ev-h" style={{ marginTop: 0 }}>{it.name}</div>
                  <div className="ev-table-wrap">
                    <table className="ev-table kpi">
                      <thead><tr><th />{K.months.map((m) => <th key={m} className={m === nowM ? 'now' : ''}>{m}</th>)}</tr></thead>
                      <tbody>{it.rows.map((r) => (
                        <tr key={r.kind}><td className="nm">{r.kind}</td>{r.values.map((v, i) => { const isRate = /達成率/.test(r.kind); const c = isRate && rateColor(v); return <td key={i} className={`${K.months[i] === nowM ? 'now' : ''} ${c ? 'rate-' + c : ''}`}>{v}</td>; })}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              ))}
              <div className="ev-legend"><span className="rate-ok">100%以上</span><span className="rate-mid">80%以上</span><span className="rate-ng">80%未満</span><span className="now">当月</span></div>
            </>);
          })()}

          {/* ---- 評価基準 ---- */}
          {curTab === 'standard' && book.standard && (
            <div className="ev-card">{book.standard.list.map((x) => <div key={x.rank} className="ev-std"><Rank v={x.rank} big label /><span>{x.desc}</span></div>)}</div>
          )}

          {/* ---- その他の表 ---- */}
          {curTab && curTab.startsWith('t') && (() => {
            const tb = book.tables[+curTab.slice(1)];
            return tb ? (
              <div className="ev-table-wrap"><table className="ev-table"><thead><tr>{tb.heads.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>{tb.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{RANKS5.includes(v) ? <Rank v={v} /> : v}</td>)}</tr>)}</tbody></table></div>
            ) : null;
          })()}

          {isAdmin && Object.keys(removed).filter((k) => removed[k]).length > 0 && (
            <div className="ev-card" style={{ marginTop: 14 }}>
              <div className="ev-h" style={{ marginTop: 0 }}>削除したメンバー（評価一覧に出していない人）</div>
              {Object.keys(removed).filter((k) => removed[k]).map((k) => {
                const it = allKeys.find((x) => x.key === k);
                return <div key={k} className="ev-kv"><span>{it ? it.name : k}</span><button className="ev-btn" onClick={() => restore(k)}>戻す</button></div>;
              })}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
