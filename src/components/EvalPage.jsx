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

const Rank = ({ v, big }) => {
  const st = RANK_STYLE[v];
  if (!st) return <span className="ev-plain">{v || '－'}</span>;
  return <span className={`ev-rank ${big ? 'big' : ''}`} style={{ background: st.bg, color: st.fg }}>{v}</span>;
};
// 達成率の色：100%以上は緑、80%以上はオレンジ、80%未満は赤
const rateColor = (v) => { const n = parseFloat(String(v).replace('%', '')); if (Number.isNaN(n)) return null; return n >= 100 ? 'ok' : n >= 80 ? 'mid' : 'ng'; };

export default function EvalPage({ isAdmin, onBack }) {
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
  const allKeys = useMemo(() => {
    const seen = new Map();
    [...persons, ...summaryRows].forEach((x) => { if (!seen.has(x.key)) seen.set(x.key, x); });
    return sortKeys([...seen.values()]);
  }, [persons, summaryRows]);

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

  const tabs = [
    book && book.summary && ['summary', '評価サマリ'],
    book && book.persons.length > 0 && ['person', '個人別'],
    book && book.kpi && ['kpi', '月次KPI'],
    book && book.standard && ['standard', '評価基準'],
    ...((book && book.tables) || []).map((tb, i) => [`t${i}`, tb.title]),
  ].filter(Boolean);
  const curTab = tabs.find((x) => x[0] === tab) ? tab : (tabs[0] && tabs[0][0]);
  const cur = persons.find((p) => p.key === sel && visible(p));

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
          <button className="btn-back" onClick={onBack}>← ホーム</button>
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
        {!sheetId && !isAdmin && <div className="ev-empty">評価一覧はまだ準備中です（管理者がスプレッドシートを登録すると表示されます）</div>}
        {err && <div className="ev-err">{err}</div>}
        {loading && !book && <div className="ev-empty">読み込み中…</div>}

        {book && (<>
          <div className="tq-tabs ev-tabs">
            {tabs.map(([k, l]) => <button key={k} className={`tq-tab ${curTab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>

          {/* ---- 評価サマリ ---- */}
          {curTab === 'summary' && book.summary && (() => {
            const S = book.summary;
            const cols = S.headers.filter((h) => h !== '氏名');
            const rows = summaryRows.filter(visible);
            return (<>
              <div className="ev-table-wrap ev-pc">
                <table className="ev-table">
                  <thead><tr><th>氏名</th>{cols.map((h) => <th key={h}>{h}</th>)}{isAdmin && <th />}</tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className={hidden[r.key] ? 'dim' : ''} onClick={() => { const p = persons.find((x) => x.key === r.key); if (p) { setSel(p.key); setTab('person'); } }}>
                        <td className="nm">{r.name}</td>
                        {cols.map((h) => <td key={h} className={S.rankCols.includes(h) ? 'rk' : ''}>{S.rankCols.includes(h) ? <Rank v={r.cells[h]} /> : r.cells[h]}</td>)}
                        {isAdmin && <td><AdminCtl it={r} /></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ev-sp">
                {rows.map((r) => (
                  <div key={r.key} className={`ev-card ev-scard ${hidden[r.key] ? 'dim' : ''}`}>
                    <div className="ev-scard-top"><b>{r.name}</b><span className="ev-sub">{r.cells['現役割']}</span></div>
                    <div className="ev-ranks">{S.rankCols.map((h) => <span key={h}><small>{h}</small><Rank v={r.cells[h]} /></span>)}</div>
                    {cols.filter((h) => !S.rankCols.includes(h) && !['フリガナ', '現役割'].includes(h) && r.cells[h]).map((h) => (
                      <div key={h} className="ev-kv"><span>{h}</span><b>{r.cells[h]}</b></div>
                    ))}
                    <AdminCtl it={r} />
                  </div>
                ))}
              </div>
            </>);
          })()}

          {/* ---- 個人別 ---- */}
          {curTab === 'person' && (
            <div className="ev-grid">
              <div className="ev-list">
                {persons.filter(visible).map((p) => (
                  <button key={p.key} className={`ev-row ${sel === p.key ? 'on' : ''} ${hidden[p.key] ? 'dim' : ''}`} onClick={() => setSel(p.key)}>
                    <span className="ev-av">{p.name.slice(0, 1)}</span>
                    <span className="ev-grow"><b>{p.name}</b><small>{p.info.role}</small></span>
                    <span className="ev-mini">{p.totals.map((x) => <Rank key={x.label} v={x.rank} />)}</span>
                    <AdminCtl it={p} />
                  </button>
                ))}
              </div>
              <div className="ev-card ev-detail">
                {!cur && <div className="ev-empty" style={{ padding: '50px 0' }}>左の一覧から名前を選んでください</div>}
                {cur && (<>
                  <div className="ev-d-head"><span className="ev-av big">{cur.name.slice(0, 1)}</span><div className="ev-grow"><b>{cur.name}</b><div className="ev-sub">{[cur.info.kana, cur.info.role, cur.info.start && `稼働開始 ${cur.info.start}`].filter(Boolean).join('・')}</div></div>
                    <button className="ev-btn ev-close" onClick={() => setSel(null)} aria-label="閉じる">×</button></div>
                  {cur.totals.length > 0 && <div className="ev-totals">{cur.totals.map((x) => <div key={x.label}><small>{x.label}</small><Rank v={x.rank} big /></div>)}</div>}
                  {cur.reviews.length > 0 && (<><div className="ev-h">具体評価</div>{cur.reviews.map((x) => <div key={x.label} className="ev-review"><small>{x.label}</small><p>{x.text}</p></div>)}</>)}
                  {cur.skills.length > 0 && (<><div className="ev-h">スキル評価</div>
                    {[...new Set(cur.skills.map((x) => x.section))].map((sec) => (
                      <div key={sec || 'none'} className="ev-skillsec">
                        {sec && <div className="ev-sec">{sec}</div>}
                        {cur.skills.filter((x) => x.section === sec).map((x) => (
                          <div key={x.item} className="ev-skill">
                            <div className="ev-skill-top"><b>{x.item}</b><span className="ev-skill-r">{x.prev && <><Rank v={x.prev} /><i>→</i></>}<Rank v={x.rank} /></span></div>
                            {x.comment && <div className="ev-skill-c">{x.comment}</div>}
                          </div>
                        ))}
                      </div>
                    ))}</>)}
                  {[['目標設定', cur.goals], ['具体的アクションプラン', cur.actions], ['月次振り返り / 1on1ログ', cur.logs]].filter(([, tb]) => tb.rows.length).map(([title, tb]) => (
                    <div key={title}><div className="ev-h">{title}</div>
                      {tb.rows.map((row, i) => (
                        <div key={i} className="ev-goal">{tb.heads.filter((h) => !/^No\.?$/i.test(h) && row[h]).map((h, j) => <div key={h} className={j === 0 ? 'first' : ''}><small>{h}</small><span>{row[h]}</span></div>)}</div>
                      ))}
                    </div>
                  ))}
                </>)}
              </div>
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
            <div className="ev-card">{book.standard.list.map((x) => <div key={x.rank} className="ev-std"><Rank v={x.rank} big /><span>{x.desc}</span></div>)}</div>
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
