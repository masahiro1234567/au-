import { ManualButton } from '../manual/Manual.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet } from '../useFirebase.js';
import { keepPlace } from '../keepPlace.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { showToast } from '../utils.js';
import { parseBook, RANK_STYLE, RANKS5, normName } from '../evalSheets.js';
import { AutoTA, PersonEditor, KpiEditor, StandardEditor, normPerson, newPerson, downloadCsv, TOTAL_LABELS, WorkList, SelfTable, SectionEdit } from './EvalEditors.jsx';
import { dbPush, dbUpdateMany } from '../useFirebase.js';

// ===== 評価一覧（Googleスプレッドシートを読み取って表示）=====
// 編集はスプレッドシートで行い、ここは表示だけ。誰でも誰の評価でも見られる
// 表示する／しない・並び順・削除（このアプリに出さない）は、管理者ログイン中だけ変えられる（eval_config に保存）
const POS_ORDER = ['責任者', 'MQ', 'SAM', 'IN', 'NV'];
const GRADE_ORDER = ['S', 'A', 'B', 'C', 'R'];
const idOf = (v) => { const m = String(v || '').match(/\/d\/([A-Za-z0-9_-]{20,})/); return m ? m[1] : String(v || '').trim(); };

// 不可は「不可」と書かずに、文字なしのグレーにする（label を付けたときだけ文字を出す：評価基準の説明など）
export const Rank = ({ v, big, label }) => {
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
export function GoalEditor({ person, saved, canEdit }) {
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
          <AutoTA className="ev-inp ev-ta" value={g.cond} onChange={(e) => set(i, 'cond', e.target.value)} placeholder="達成条件（例：個人ディレクター達成率75%）" aria-label="達成条件" />
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

export default function EvalPage({ isAdmin, onBack, user, embedded }) {
  const [goals] = useDbCollection('eval_goals');
  const [cfg] = useDbCollection('eval_config');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const sheetId = (cfg && cfg.sheetId) || '';
  const [sheetBook, setSheetBook] = useState(null);
  const [evalData] = useDbCollection('eval_data');
  const [history] = useDbCollection('eval_history');
  const appMode = !!(evalData && evalData.persons && Object.keys(evalData.persons).length);
  const book = useMemo(() => (appMode ? {
    summary: null, tables: [],
    persons: Object.values(evalData.persons).filter(Boolean).map(normPerson),
    kpi: evalData.kpi ? { ...evalData.kpi, months: Object.values(evalData.kpi.months || {}), items: Object.values(evalData.kpi.items || {}).map((it) => ({ ...it, rows: Object.values(it.rows || {}).map((r) => ({ ...r, values: Object.values(r.values || {}) })) })) } : null,
    standard: evalData.standard ? { list: Object.values(evalData.standard.list || {}) } : null,
  } : sheetBook), [appMode, evalData, sheetBook]);
  const [editing, setEditing] = useState(null); // 編集中：人のキー / '__kpi' / '__standard'
  const [adding, setAdding] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [importing, setImporting] = useState(false);
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
      setSheetBook(parseBook(j));
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  // au navi に取り込んだあとは、スプレッドシートは読みに行かない（取り込みのときだけ読む）
  useEffect(() => { if (!appMode) load(); }, [sheetId, appMode]);

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
  // データごと消す（もう戻せない）。スプレッドシートの読み込みで、人ではないものが入ってしまったときなど
  const purge = async (key, name) => {
    if (!window.confirm(`「${name}」を評価一覧のデータから完全に消します。もう戻せません。よろしいですか？`)) return;
    await dbUpdateMany({ [`eval_data/persons/${key}`]: null, [`eval_config/removed/${key}`]: null, [`eval_config/hidden/${key}`]: null, [`eval_goals/${key}`]: null });
    const ord = manual.filter((x) => x !== key);
    if (ord.length !== manual.length) await dbSet('eval_config/order', ord);
    showToast('完全に消しました');
  };
  const saveUrl = async () => {
    const id = idOf(urlInput);
    if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return showToast('スプレッドシートのURLを貼り付けてください');
    await dbSet('eval_config/sheetId', id);
    setShowSetting(false); setUrlInput('');
    showToast('登録しました');
  };

  // ---- 1人分（個人別シート＋評価サマリ）----
  const [openSec, setOpenSec] = useState({});
  const [secEdit, setSecEdit] = useState(null); // その場で編集しているまとまり（人のキー|まとまり名）
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

  // ---- スプレッドシートから取り込む（最初の1回。やり直しもできる）----
  const doImport = async () => {
    if (!sheetBook) return showToast('先にスプレッドシートを読み込んでください');
    if (appMode && !window.confirm('au navi に記録している評価を、スプレッドシートの内容で上書きします。よろしいですか？')) return;
    setImporting(true);
    try {
      const up = {};
      people.forEach((m) => {
        const base = m.person ? normPerson(m.person) : normPerson({ key: m.key, info: { name: m.name, role: m.role } });
        const totals = TOTAL_LABELS.map((l, i) => ({ label: l, rank: m.tot3[i] || '' }));
        const skills = base.skills.length ? base.skills : m.secs.flatMap((sec) => sec.items.map((x) => ({ section: sec.name, item: x.item, view: '', rank: x.rank || '', prev: x.prev || '', comment: '' })));
        up[`eval_data/persons/${m.key}`] = JSON.parse(JSON.stringify({ ...base, key: m.key, info: { ...base.info, name: m.name, role: base.info.role || m.role || '' }, totals, skills, updatedAt: Date.now(), updatedBy: (user && user.name) || '管理者' }));
      });
      if (sheetBook.kpi) up['eval_data/kpi'] = JSON.parse(JSON.stringify(sheetBook.kpi));
      if (sheetBook.standard) up['eval_data/standard'] = JSON.parse(JSON.stringify(sheetBook.standard));
      up['eval_data/importedAt'] = Date.now();
      await dbUpdateMany(up);
      await dbPush('eval_history', { key: '__import', name: 'スプレッドシートから取り込み', by: (user && user.name) || '管理者', at: Date.now(), summary: `${people.length}人分を取り込み` });
      showToast(`${people.length}人分を取り込みました。これからは au navi で記録します`);
    } catch (e) { showToast('取り込めませんでした：' + e.message); }
    setImporting(false);
  };
  const addMember = async (name) => {
    const u = memberInfo[normName(name)] || {};
    const template = (book && book.persons.find((p) => p.skills.length)) || {};
    const p = newPerson(name, u.position || '', template.skills);
    await dbSet(`eval_data/persons/${p.key}`, JSON.parse(JSON.stringify({ ...p, updatedAt: Date.now(), updatedBy: (user && user.name) || '管理者' })));
    await dbPush('eval_history', { key: p.key, name, by: (user && user.name) || '管理者', at: Date.now(), summary: '評価一覧に追加' });
    setAdding(false); setSel(p.key); setTab('person'); setEditing(p.key);
    showToast(`${name}さんを追加しました`);
  };
  const exportCsv = (kind) => {
    const list = people.filter(visible);
    const d = new Date(); const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    if (kind === 'summary') downloadCsv(`評価サマリ_${ymd}.csv`, [['氏名', '現役割', 'キャッチ', 'クローズ', 'ディレクション'], ...list.map((p) => [p.name, p.role, ...p.tot3])]);
    else downloadCsv(`スキル評価_${ymd}.csv`, [['氏名', 'まとまり', '評価項目', 'ランク', '前回ランク', 'コメント'], ...list.flatMap((p) => p.secs.flatMap((sec) => sec.items.map((x) => [p.name, sec.name, x.item, x.rank || '', x.prev || '', x.comment || ''])))]);
  };
  const fmtAt = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const canAdd = Object.values(fpUsers || {}).filter((u) => u && u.name && u.permission !== 'pending' && !people.some((p) => p.key === normName(u.name))).map((u) => u.name).sort((a, b) => a.localeCompare(b, 'ja'));

  const tabs = [
    book && people.length > 0 && ['summary', '評価サマリ'],
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
    <div className={embedded ? 'ev-embedded' : 'page'}>
      {!embedded && (
        <header className="hdr">
          <div className="logo"><div className="logo-mark">au</div><h1>評価一覧</h1></div>
          <div className="hdr-right">
            {sheetId && !appMode && <button className="btn-ghost" onClick={load} disabled={loading}>{loading ? '読み込み中…' : '最新にする'}</button>}
            <button className="btn-back" onClick={onBack}>← ホーム</button>
            <ManualButton screen="eval" />
          </div>
        </header>
      )}
      <div className={embedded ? 'ev-body-embedded' : 't-body ev-body'}>
        {embedded && sheetId && !appMode && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><button className="btn-ghost" onClick={load} disabled={loading}>{loading ? '読み込み中…' : '最新にする'}</button></div>}
        {isAdmin && (
          <div className="ev-admin">
            <span>{appMode ? `au navi で記録中（${fmtAt(evalData.importedAt)} にスプレッドシートから取り込み）。編集は各メンバーの「編集する」から` : 'スプレッドシートを表示中です。「au navi に取り込む」を押すと、これからは au navi で記録できます'}</span>
            {!appMode && sheetBook && <button className="ev-btn p" disabled={importing} onClick={doImport}>{importing ? '取り込み中…' : 'au navi に取り込む'}</button>}
            {appMode && <button className="ev-btn" onClick={() => setAdding(!adding)}>＋ メンバーを追加</button>}
            <button className="ev-btn" onClick={() => exportCsv('summary')}>CSV（サマリ）</button>
            <button className="ev-btn" onClick={() => exportCsv('skills')}>CSV（スキル評価）</button>
            <button className="ev-btn" onClick={() => setShowHist(!showHist)}>変更履歴</button>
            {!appMode && <button className="btn-ghost" onClick={() => setShowSetting(!showSetting)}>スプレッドシートの設定</button>}
          </div>
        )}
        {isAdmin && adding && (
          <div className="ev-card">
            <div className="ev-h" style={{ marginTop: 0 }}>評価一覧に追加するメンバー</div>
            {!canAdd.length && <div className="ev-note">メンバー管理の名簿の人は、全員もう評価一覧に入っています</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{canAdd.map((n) => <button key={n} className="ev-btn" onClick={() => addMember(n)}>{n}</button>)}</div>
          </div>
        )}
        {isAdmin && showHist && (
          <div className="ev-card">
            <div className="ev-h" style={{ marginTop: 0 }}>変更履歴（新しい順・最大50件）</div>
            {Object.values(history || {}).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 50).map((h, i) => (
              <div key={i} className="ev-kv"><span>{fmtAt(h.at)}　{h.by}</span><b>{h.name}：{h.summary}</b></div>
            ))}
            {!Object.keys(history || {}).length && <div className="ev-note">まだ変更はありません</div>}
          </div>
        )}
        {!appMode && (showSetting || !sheetId) && isAdmin && (
          <div className="ev-card">
            <div className="ev-h">スプレッドシートを登録</div>
            <div className="ev-note">評価一覧のスプレッドシートのURLを貼り付けてください。スプレッドシートの共有に、読み取り用のアカウント（サービスアカウント）を「閲覧者」で追加しておく必要があります。{sheetId && `　今の登録：…${sheetId.slice(-8)}`}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="ev-inp" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" />
              <button className="ev-btn p" onClick={saveUrl}>登録</button>
            </div>
          </div>
        )}
        {!sheetId && !appMode && !isAdmin && <div className="ev-empty">評価一覧はまだ準備中です。<br />管理者ログイン → 管理画面の「評価一覧」から、スプレッドシートを登録すると表示されます。</div>}
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
                    <button className="ev-prow" onClick={(e) => keepPlace(e.currentTarget, () => setSel(on ? null : p.key))} aria-expanded={on}>
                      <span className="ev-av">{p.name.slice(0, 1)}</span>
                      <span className="ev-grow"><b>{p.name}</b><small>{p.role}</small></span>
                      <span className="ev-mini">{p.tot3.map((v, i) => <Rank key={i} v={v} />)}</span>
                      <span className="ev-arrow">{on ? '▲' : '▼'}</span>
                    </button>
                    {isAdmin && <div className="ev-pctl"><AdminCtl it={p} /></div>}
                    {on && editing === p.key && isAdmin && p.person && (
                      <div className="ev-pbody"><PersonEditor person={p.person} userName={user && user.name} onDone={() => setEditing(null)} /></div>
                    )}
                    {on && editing !== p.key && (
                      <div className="ev-pbody">
                        {(isAdmin && appMode || (p.person && p.person.updatedAt)) && (
                          <div className="ev-upd">
                            {p.person && p.person.updatedAt && <span>最終更新 {fmtAt(p.person.updatedAt)}{p.person.updatedBy ? `（${p.person.updatedBy}）` : ''}</span>}
                            {isAdmin && appMode && <button className="ev-btn p" onClick={() => setEditing(p.key)}>編集する</button>}
                          </div>
                        )}
                        {p.info && (p.info.kana || p.info.start) && <div className="ev-sub" style={{ marginBottom: 6 }}>{[p.info.kana, p.info.start && `稼働開始 ${p.info.start}`].filter(Boolean).join('・')}</div>}
                        {p.person && <GoalEditor key={p.key} person={p.person} saved={(goals || {})[p.key]} canEdit={!isAdmin && !!user && normName(user.name) === p.key} />}
                        {p.person && appMode ? (
                          <WorkList person={p.person} isAdmin={isAdmin} kpiData={kpiData} userName={user && user.name} legacy={p.reviews} />
                        ) : p.reviews.length > 0 && (<><div className="ev-h">具体評価</div>
                          {p.reviews.map((x) => <div key={x.label} className="ev-review"><small>{x.label}{x.store ? `（${x.store}）` : ''}</small>{x.text && <p>{x.text}</p>}</div>)}</>)}
                        {p.secs.map((sec) => {
                          const k = p.key + '|' + sec.name, so = !!openSec[k];
                          return (
                            <div key={sec.name} className="ev-secbox">
                              <button className="ev-secbtn" onClick={(e) => keepPlace(e.currentTarget, () => setOpenSec({ ...openSec, [k]: !so }))} aria-expanded={so}>
                                <b>{sec.name}</b>{sec.total && <Rank v={sec.total} />}<span className="ev-arrow">{so ? '▲' : '▼'}</span>
                              </button>
                              {so && isAdmin && appMode && p.person && secEdit === k && <SectionEdit person={p.person} section={sec.name} userName={user && user.name} onDone={() => setSecEdit(null)} />}
                              {so && secEdit !== k && (<>
                                {isAdmin && appMode && p.person && <div className="ev-secedit-bar"><button className="ev-btn p" onClick={() => setSecEdit(k)}>このまとまりを編集</button></div>}
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
                        {p.person && appMode && <SelfTable person={p.person} field="goals" title="目標設定" canEdit={!isAdmin && !!user && normName(user.name) === p.key} />}
                        {p.person && appMode && <SelfTable person={p.person} field="actions" title="具体的アクションプラン" canEdit={!isAdmin && !!user && normName(user.name) === p.key} />}
                        {p.person && (appMode ? [['月次振り返り / 1on1ログ', p.person.logs]] : [['目標設定', p.person.goals], ['具体的アクションプラン', p.person.actions], ['月次振り返り / 1on1ログ', p.person.logs]]).filter(([, tb]) => tb.rows.length).map(([title, tb]) => {
                          const k = p.key + '|' + title, so = !!openSec[k];
                          return (
                            <div key={title} className="ev-secbox">
                              <button className="ev-secbtn" onClick={(e) => keepPlace(e.currentTarget, () => setOpenSec({ ...openSec, [k]: !so }))} aria-expanded={so}><b>{title}</b><span className="ev-arrow">{so ? '▲' : '▼'}</span></button>
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
          {curTab === 'kpi' && isAdmin && appMode && editing !== '__kpi' && <div className="ev-upd"><span /><button className="ev-btn p" onClick={() => setEditing('__kpi')}>月次KPIを編集する</button></div>}
          {curTab === 'kpi' && editing === '__kpi' && isAdmin && <KpiEditor kpi={book.kpi} userName={user && user.name} onDone={() => setEditing(null)} />}
          {curTab === 'kpi' && editing !== '__kpi' && book.kpi && (() => {
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
          {curTab === 'standard' && isAdmin && appMode && editing !== '__standard' && <div className="ev-upd"><span /><button className="ev-btn p" onClick={() => setEditing('__standard')}>評価基準を編集する</button></div>}
          {curTab === 'standard' && editing === '__standard' && isAdmin && <StandardEditor standard={book.standard} userName={user && user.name} onDone={() => setEditing(null)} />}
          {curTab === 'standard' && editing !== '__standard' && book.standard && (
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
                return (
                  <div key={k} className="ev-kv"><span>{it ? it.name : k}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button className="ev-btn" onClick={() => restore(k)}>戻す</button>
                      <button className="ev-btn" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => purge(k, it ? it.name : k)}>完全に消す</button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
