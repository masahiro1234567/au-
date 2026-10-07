import React, { useLayoutEffect, useRef, useState } from 'react';

// 入力した文字の量に合わせて、高さが自動で伸び縮みする入力欄（日報の入力と同じ）
export function AutoTA({ value, onChange, rows = 1, style, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={rows} value={value} onChange={onChange} style={{ overflow: 'hidden', resize: 'none', ...style }} {...rest} />;
}
import { dbSet, dbPush, dbRemove, dbUpdateMany } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { RANKS5 } from '../evalSheets.js';
import { autoTotals, totalsFromSkills, DeltaTag, deltaRowClass } from '../evalScore.jsx';
import { pushNotice } from '../notices.jsx';

// ===== 評価一覧の編集（au navi を正にする）=====
// 保存先：eval_data/persons/{名前のキー}（1人分）、eval_data/kpi、eval_data/standard
// 変更するたびに eval_history に「いつ・誰が・何を」を残す
export const TOTAL_LABELS = ['キャッチャー', 'クローズ', 'ディレクター'];
const blankTable = (heads) => ({ heads, rows: [] });
export const GOAL_HEADS = ['スパン', '期間', '達成目標（ランク）', '達成基準（定量）', '結果'];
export const ACTION_HEADS = ['対象スキル', 'アクション内容', '期限/ステータス'];
export const LOG_HEADS = ['記入日', '実施事項Good', '改善事項Bad'];
const clone = (x) => JSON.parse(JSON.stringify(x || null));
const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
// Firebaseから読んだ1人分を、画面で使う形にそろえる
export function normPerson(p) {
  const tb = (t, heads) => ({ heads: arr(t && t.heads).length ? arr(t.heads) : heads, rows: arr(t && t.rows) });
  return {
    ...p,
    info: p.info || { name: p.name || '' },
    // 総合評価は、項目のランクから自動で計算する（スプレッドシートと同じ計算。項目が無い区分は今までの値）
    totals: totalsFromSkills(arr(p.skills), arr(p.totals), TOTAL_LABELS), goalsSheet: arr(p.goalsSheet), skills: arr(p.skills), reviews: arr(p.reviews),
    goals: tb(p.goals, GOAL_HEADS), actions: tb(p.actions, ACTION_HEADS), logs: tb(p.logs, LOG_HEADS),
    // 稼働評価：1件ずつ残す（新しい順）。まだ無い人は、取り込んだ「具体評価」を表示用に使う
    works: Object.entries(p.works || {}).filter(([, w]) => w).map(([id, w]) => ({ id, ...w })).sort((a, b) => (b.sortKey || b.at || 0) - (a.sortKey || a.at || 0)),
    rankLog: Object.values(p.rankLog || {}).filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0)),
  };
}
// 新しく追加するメンバーの、ひな形（スキル評価の項目は、今いる人の項目をそのまま使う）
export function newPerson(name, role, template) {
  return normPerson({
    key: String(name || '').normalize('NFKC').replace(/[\s　]/g, ''), info: { name, kana: '', role: role || '', start: '', period: '' },
    totals: TOTAL_LABELS.map((label) => ({ label, rank: '' })),
    skills: arr(template).map((x) => ({ section: x.section, item: x.item, view: x.view || '', rank: '', prev: '', comment: '' })),
    reviews: [], goals: blankTable(GOAL_HEADS), actions: blankTable(ACTION_HEADS), logs: blankTable(LOG_HEADS),
  });
}

// 何が変わったかの一言（履歴用）
function diffSummary(a, b) {
  const out = [];
  if (!a) return ['新しく追加'];
  TOTAL_LABELS.forEach((l) => {
    const x = (arr(a.totals).find((t) => t.label === l) || {}).rank || '', y = (arr(b.totals).find((t) => t.label === l) || {}).rank || '';
    if (x !== y) out.push(`総合（${l}）${x || '－'}→${y || '－'}`);
  });
  arr(b.skills).forEach((s) => {
    const o = arr(a.skills).find((x) => x.item === s.item && x.section === s.section);
    if (!o) out.push(`${s.item}を追加`);
    else if (o.rank !== s.rank) out.push(`${s.item} ${o.rank || '－'}→${s.rank || '－'}`);
    else if ((o.comment || '') !== (s.comment || '')) out.push(`${s.item}のコメント`);
  });
  if (JSON.stringify(arr(a.reviews)) !== JSON.stringify(arr(b.reviews))) out.push('具体評価');
  if (JSON.stringify(a.goals) !== JSON.stringify(b.goals)) out.push('目標設定');
  if (JSON.stringify(a.actions) !== JSON.stringify(b.actions)) out.push('アクションプラン');
  if (JSON.stringify(a.logs) !== JSON.stringify(b.logs)) out.push('振り返り');
  if (JSON.stringify(a.info) !== JSON.stringify(b.info)) out.push('基本情報');
  return out.length ? out : ['変更なし'];
}
function rankChanges(a, b) {
  const out = [];
  TOTAL_LABELS.forEach((l) => {
    const x = (arr(a && a.totals).find((t) => t.label === l) || {}).rank || '', y = (arr(b.totals).find((t) => t.label === l) || {}).rank || '';
    if (x !== y && y) out.push(`総合（${l}）：${x || '－'}→${y}`);
  });
  arr(b.skills).forEach((s) => {
    const o = arr(a && a.skills).find((x) => x.item === s.item && x.section === s.section);
    if (o && o.rank !== s.rank && s.rank) out.push(`${s.item}：${o.rank || '－'}→${s.rank}`);
  });
  return out;
}
export async function savePerson(before, after, userName) {
  // 稼働評価・本人が書く欄（目標設定・アクションプラン）・ランクの記録は、ここでは上書きしない
  const { works, rankLog, goals, actions, ...rest } = clone(after);
  const data = { ...rest, updatedAt: Date.now(), updatedBy: userName || '管理者' };
  const up = {};
  Object.entries(data).forEach(([k, v]) => { up[`eval_data/persons/${after.key}/${k}`] = v; });
  await dbUpdateMany(up);
  for (const text of rankChanges(before, after)) await dbPush(`eval_data/persons/${after.key}/rankLog`, { at: Date.now(), by: userName || '管理者', text });
  await dbPush('eval_history', { key: after.key, name: after.info.name, by: userName || '管理者', at: Date.now(), summary: diffSummary(before, after).slice(0, 12).join('、') });
  // 本人へのお知らせ（マイページ）。ランクが変わったときはその中身も書く
  const rc = rankChanges(before, after);
  if (before && after.info && after.info.name) {
    await pushNotice({ tab: 'mypage', to: [after.info.name], by: userName || '管理者',
      title: rc.length ? 'あなたの評価が更新されました' : 'あなたの評価の内容が更新されました',
      body: rc.length ? rc.slice(0, 4).join('\n') : '評価・コメントなどが更新されました。マイページで確認してください' });
  }
}

// ランクの札（EvalPage の Rank と同じ見た目。不可は文字なしのグレー）
const RK_COL = { 秀: ['#e53935', '#fff'], 優: ['#f6ad6b', '#fff'], 良: ['#fde68a', '#7a5b00'], 可: ['#a7d38f', '#245c12'], 不可: ['#9ca3af', '#fff'] };
export const Rank5 = ({ v }) => (RK_COL[v] ? <span className="ev-rank" style={{ background: RK_COL[v][0], color: RK_COL[v][1] }} aria-label={v} title={v}>{v === '不可' ? '' : v}</span> : <span className="ev-plain">－</span>);
const RankSel = ({ value, onChange, label }) => (
  <select className="ev-inp ev-rsel" value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label={label}>
    <option value="">－</option>{RANKS5.map((r) => <option key={r}>{r}</option>)}
  </select>
);

// 表（目標設定・アクションプラン・振り返り）の編集
function TableEdit({ title, table, onChange }) {
  const rows = table.rows || [];
  const set = (i, h, v) => onChange({ ...table, rows: rows.map((r, j) => (j === i ? { ...r, [h]: v } : r)) });
  return (
    <div className="ev-edit-block">
      <div className="ev-h">{title}</div>
      {rows.map((r, i) => (
        <div key={i} className="ev-edit-trow">
          {table.heads.map((h) => (
            <label key={h}><small>{h}</small><AutoTA className="ev-inp ev-ta" rows={1} value={r[h] || ''} onChange={(e) => set(i, h, e.target.value)} /></label>
          ))}
          <button className="ev-btn" onClick={() => onChange({ ...table, rows: rows.filter((_, j) => j !== i) })} aria-label="この行を削除">×</button>
        </div>
      ))}
      <button className="ev-btn" onClick={() => onChange({ ...table, rows: [...rows, Object.fromEntries(table.heads.map((h) => [h, '']))] })}>＋ 行を追加</button>
    </div>
  );
}

// 1人分の編集
export function PersonEditor({ person, userName, onDone }) {
  const [d, setD] = useState(() => clone(normPerson(person)));
  const [saving, setSaving] = useState(false);
  const up = (patch) => setD((x) => ({ ...x, ...patch }));
  const setTotal = (label, rank) => {
    const list = TOTAL_LABELS.map((l) => ({ label: l, rank: (d.totals.find((t) => t.label === l) || {}).rank || '' }));
    up({ totals: list.map((t) => (t.label === label ? { ...t, rank } : t)) });
  };
  const setSkill = (i, k, v) => up({ skills: d.skills.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  // 今のランクを「前回」に移して、新しい評価を付け始める
  const rollSkills = () => {
    if (!window.confirm('今のランクを「前回ランク」に移して、新しい評価を付け始めます。よろしいですか？')) return;
    up({ skills: d.skills.map((s) => ({ ...s, prev: s.rank || s.prev, rank: '' })) });
  };
  const sections = [...new Set(d.skills.map((s) => s.section || 'その他'))];
  const save = async () => {
    setSaving(true);
    try { await savePerson(person, d, userName); showToast('保存しました'); onDone(); } catch (e) { showToast('保存できませんでした：' + e.message); }
    setSaving(false);
  };
  return (
    <div className="ev-edit">
      <div className="ev-edit-block">
        <div className="ev-h" style={{ marginTop: 0 }}>基本情報</div>
        <div className="ev-edit-grid">
          {[['kana', 'フリガナ'], ['role', '現役割'], ['start', '稼働開始日']].map(([k, l]) => (
            <label key={k}><small>{l}</small><input className="ev-inp" value={d.info[k] || ''} onChange={(e) => up({ info: { ...d.info, [k]: e.target.value } })} /></label>
          ))}
        </div>
      </div>
      <div className="ev-edit-block">
        <div className="ev-h">総合評価</div>
        <div className="ev-edit-grid">
          {TOTAL_LABELS.map((l) => <label key={l}><small>{l}</small><RankSel label={`総合評価（${l}）`} value={(d.totals.find((t) => t.label === l) || {}).rank} onChange={(v) => setTotal(l, v)} /></label>)}
        </div>
      </div>
      <div className="ev-edit-block">
        <div className="ev-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>スキル評価<span style={{ flex: 1 }} /><button className="ev-btn" onClick={rollSkills}>今のランクを前回に移す</button></div>
        {sections.map((sec) => (
          <div key={sec}>
            <div className="ev-sec">{sec}</div>
            <div className="ev-srow head"><span>評価項目</span><span>ランク</span><span>前回</span></div>
            {d.skills.map((s, i) => ((s.section || 'その他') === sec ? (
              <div key={i} className="ev-edit-skill">
                <div className="ev-srow"><span>{s.item}</span><span><RankSel label={`${s.item}のランク`} value={s.rank} onChange={(v) => setSkill(i, 'rank', v)} /></span><span><RankSel label={`${s.item}の前回ランク`} value={s.prev} onChange={(v) => setSkill(i, 'prev', v)} /></span></div>
                <AutoTA className="ev-inp ev-ta" rows={1} value={s.comment || ''} placeholder="強み・課題コメント" onChange={(e) => setSkill(i, 'comment', e.target.value)} />
              </div>
            ) : null))}
          </div>
        ))}
      </div>
      <TableEdit title="月次振り返り / 1on1ログ" table={d.logs} onChange={(t) => up({ logs: t })} />
      <div className="ev-edit-foot">
        <button className="ev-btn" onClick={onDone}>キャンセル</button>
        <button className="ev-btn p" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存する'}</button>
      </div>
    </div>
  );
}

// 月次KPIの編集（目標・実績を入れると、達成率は自動で計算）
export function KpiEditor({ kpi, userName, onDone }) {
  const months = ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月'];
  const [d, setD] = useState(() => {
    const k = clone(kpi) || { note: '', items: [] };
    k.months = months;
    k.items = arr(k.items).map((it) => ({ name: it.name, rows: ['目標', '実績'].map((kind) => {
      const r = arr(it.rows).find((x) => String(x.kind).startsWith(kind)) || { kind, values: [] };
      return { kind: r.kind, values: months.map((_, i) => arr(r.values)[i] || '') };
    }) }));
    return k;
  });
  const num = (v) => parseFloat(String(v).replace(/[%,]/g, ''));
  const rate = (t, a) => { const x = num(t), y = num(a); return x > 0 && !Number.isNaN(y) ? `${Math.round((y / x) * 100)}%` : ''; };
  const setV = (ii, ri, mi, v) => setD((x) => ({ ...x, items: x.items.map((it, i) => (i !== ii ? it : { ...it, rows: it.rows.map((r, j) => (j !== ri ? r : { ...r, values: r.values.map((y, k) => (k === mi ? v : y)) })) })) }));
  const save = async () => {
    const out = { note: d.note || '', months, items: d.items.map((it) => ({ name: it.name, rows: [...it.rows, { kind: '達成率', values: months.map((_, i) => rate(it.rows[0].values[i], it.rows[1].values[i])) }] })) };
    await dbSet('eval_data/kpi', out);
    await dbPush('eval_history', { key: '__kpi', name: '月次KPI', by: userName || '管理者', at: Date.now(), summary: '月次KPIを更新' });
    showToast('保存しました'); onDone();
  };
  return (
    <div className="ev-edit">
      <label className="ev-edit-grid" style={{ gridTemplateColumns: '1fr' }}><small>説明（表の上に出す一言）</small><input className="ev-inp" value={d.note || ''} onChange={(e) => setD({ ...d, note: e.target.value })} /></label>
      {d.items.map((it, ii) => (
        <div key={ii} className="ev-card" style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="ev-inp" value={it.name} placeholder="項目名（例：クローザー認定数）" onChange={(e) => setD({ ...d, items: d.items.map((x, i) => (i === ii ? { ...x, name: e.target.value } : x)) })} />
            <button className="ev-btn" onClick={() => setD({ ...d, items: d.items.filter((_, i) => i !== ii) })}>削除</button>
          </div>
          <div className="ev-table-wrap"><table className="ev-table kpi">
            <thead><tr><th />{months.map((m) => <th key={m}>{m}</th>)}</tr></thead>
            <tbody>
              {it.rows.map((r, ri) => (
                <tr key={ri}><td className="nm">{r.kind}</td>{r.values.map((v, mi) => <td key={mi}><input className="ev-inp ev-kin" value={v} onChange={(e) => setV(ii, ri, mi, e.target.value)} aria-label={`${it.name} ${r.kind} ${months[mi]}`} /></td>)}</tr>
              ))}
              <tr><td className="nm">達成率</td>{months.map((_, mi) => <td key={mi} className="ev-sub">{rate(it.rows[0].values[mi], it.rows[1].values[mi])}</td>)}</tr>
            </tbody>
          </table></div>
        </div>
      ))}
      <button className="ev-btn" style={{ marginTop: 10 }} onClick={() => setD({ ...d, items: [...d.items, { name: '', rows: [{ kind: '目標', values: months.map(() => '') }, { kind: '実績', values: months.map(() => '') }] }] })}>＋ 項目を追加</button>
      <div className="ev-edit-foot"><button className="ev-btn" onClick={onDone}>キャンセル</button><button className="ev-btn p" onClick={save}>保存する</button></div>
    </div>
  );
}

// 評価基準の編集
export function StandardEditor({ standard, userName, onDone }) {
  const [d, setD] = useState(() => RANKS5.map((r) => ({ rank: r, desc: ((arr(standard && standard.list).find((x) => x.rank === r)) || {}).desc || '' })));
  const save = async () => {
    await dbSet('eval_data/standard', { list: d });
    await dbPush('eval_history', { key: '__standard', name: '評価基準', by: userName || '管理者', at: Date.now(), summary: '評価基準を更新' });
    showToast('保存しました'); onDone();
  };
  return (
    <div className="ev-edit">
      {d.map((x, i) => (
        <label key={x.rank} className="ev-edit-review"><b>{x.rank}</b><AutoTA className="ev-inp ev-ta" rows={2} value={x.desc} onChange={(e) => setD(d.map((y, j) => (j === i ? { ...y, desc: e.target.value } : y)))} /></label>
      ))}
      <div className="ev-edit-foot"><button className="ev-btn" onClick={onDone}>キャンセル</button><button className="ev-btn p" onClick={save}>保存する</button></div>
    </div>
  );
}

// CSVの書き出し（スプレッドシートで開ける形。Excelで文字化けしないよう先頭にBOMを付ける）
export function downloadCsv(filename, rows) {
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ===== 本人が書く欄（目標設定・アクションプラン）=====
// 本人だけが書ける（管理者は見るだけ）。保存先：eval_data/persons/{キー}/goals ・ /actions
export function SelfTable({ person, field, title, canEdit }) {
  const table = person[field] || { heads: [], rows: [] };
  const [edit, setEdit] = useState(null);
  const heads = table.heads.length ? table.heads : field === 'goals' ? GOAL_HEADS : ACTION_HEADS;
  const rows = (table.rows || []).filter((r) => Object.values(r || {}).some(Boolean));
  if (!rows.length && !canEdit) return null;
  const save = async () => {
    await dbSet(`eval_data/persons/${person.key}/${field}`, { heads, rows: (edit.rows || []).filter((r) => Object.values(r).some(Boolean)) });
    setEdit(null); showToast('保存しました');
  };
  return (
    <div className="ev-secbox">
      <div className="ev-secbtn" style={{ cursor: 'default' }}><b>{title}</b>{canEdit && !edit && <button className="ev-btn" onClick={() => setEdit({ heads, rows: rows.length ? rows : [Object.fromEntries(heads.map((h) => [h, '']))] })}>書く・直す</button>}</div>
      {edit ? (
        <div style={{ padding: '0 12px 10px' }}>
          <TableEdit title="" table={edit} onChange={setEdit} />
          <div className="ev-edit-foot"><button className="ev-btn" onClick={() => setEdit(null)}>キャンセル</button><button className="ev-btn p" onClick={save}>保存</button></div>
        </div>
      ) : (
        rows.map((row, i) => (
          <div key={i} className="ev-goal">{heads.filter((h) => !/^No\.?$/i.test(h) && row[h]).map((h, j) => <div key={h} className={j === 0 ? 'first' : ''}><small>{h}</small><span>{row[h]}</span></div>)}</div>
        ))
      )}
    </div>
  );
}

// ===== 稼働評価（店舗管理者からの評価）=====
// 管理者だけが記入・編集・削除。最初は新しい3件、「以前の評価を見る」で全部
const DOWS = ['日', '月', '火', '水', '木', '金', '土'];
const mdLabel = (dt) => { const [y, m, d] = String(dt).split('-').map(Number); if (!y) return dt || ''; return `${m}/${d}（${DOWS[new Date(y, m - 1, d).getDay()]}）`; };
const nn = (x) => String(x || '').normalize('NFKC').replace(/[\s　]/g, '');
// KPIで、このメンバーが最後に稼働した週（今日より前で一番新しい日の、月曜〜日曜）の現場
export function lastWeekSites(kpiData, personKey) {
  const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const all = [];
  Object.values(kpiData || {}).forEach((k) => (k && k.dates || []).forEach((dt) => {
    if (dt >= t) return;
    const ms = (k.dateMembers && k.dateMembers[dt]) || [];
    if (ms.some((m) => m && nn(m.member) === personKey)) all.push({ date: dt, store: k.store || '' });
  }));
  if (!all.length) return [];
  all.sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = new Date(all[0].date + 'T00:00:00');
  const mon = new Date(last); mon.setDate(last.getDate() - ((last.getDay() + 6) % 7));
  const ms = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  const seen = new Set();
  return all.filter((x) => x.date >= ms && x.date <= all[0].date).sort((a, b) => (a.date > b.date ? 1 : -1))
    .filter((x) => { const k = x.date + x.store; if (seen.has(k)) return false; seen.add(k); return true; });
}
export function WorkList({ person, isAdmin, kpiData, userName, legacy }) {
  const [more, setMore] = useState(false);
  const [adding, setAdding] = useState(null); // { picks: [...], manual: [...] }
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const works = person.works.length ? person.works : (legacy || []).map((r, i) => ({ id: 'legacy' + i, legacy: true, dateLabel: r.label, store: r.store, text: r.text }));
  const shown = more ? works : works.slice(0, 3);
  const fmt = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const sugs = isAdmin ? lastWeekSites(kpiData, person.key) : [];
  const start = () => setAdding({ forms: sugs.map((x) => ({ on: true, date: x.date, store: x.store, text: '' })), manual: [] });
  const save = async () => {
    const list = [...adding.forms.filter((f) => f.on), ...adding.manual].filter((f) => f.store || f.text);
    if (!list.length) return showToast('書く現場を選ぶか、入力してください');
    for (const f of list) {
      await dbPush(`eval_data/persons/${person.key}/works`, { date: f.date || '', store: f.store || '', text: f.text || '', at: Date.now(), by: userName || '管理者', sortKey: f.date ? new Date(f.date + 'T00:00:00').getTime() : Date.now() });
    }
    await dbPush('eval_history', { key: person.key, name: person.info.name, by: userName || '管理者', at: Date.now(), summary: `稼働評価を${list.length}件追加` });
    setAdding(null); showToast(`${list.length}件を保存しました`);
  };
  const setF = (grp, i, k, v) => setAdding({ ...adding, [grp]: adding[grp].map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  const FormBox = ({ f, grp, i }) => (
    <div className="ev-card" style={{ padding: 12, marginBottom: 6 }}>
      <div className="ev-edit-grid" style={{ gridTemplateColumns: '160px 1fr' }}>
        <label><small>稼働日</small><input className="ev-inp" type="date" value={f.date} onChange={(e) => setF(grp, i, 'date', e.target.value)} /></label>
        <label><small>稼働店舗</small><input className="ev-inp" value={f.store} placeholder="店舗名" onChange={(e) => setF(grp, i, 'store', e.target.value)} /></label>
      </div>
      <label className="ev-edit-review" style={{ borderTop: 'none', paddingBottom: 0 }}><small>店舗管理者からの評価</small><AutoTA className="ev-inp ev-ta" rows={3} value={f.text} placeholder="評価の内容" onChange={(e) => setF(grp, i, 'text', e.target.value)} /></label>
    </div>
  );
  return (
    <div>
      <div className="ev-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>稼働評価<span style={{ flex: 1 }} />{isAdmin && !adding && <button className="ev-btn p" onClick={start}>＋ 稼働評価を追加</button>}</div>
      {adding && (
        <div className="ev-addbox">
          <b style={{ fontSize: '.8rem' }}>最後に稼働した週の現場（KPIから）</b>
          <div className="ev-note">今日より前で、このメンバーがKPIに入っている一番新しい週です。書く現場にチェックを入れてください（1件だけでもOK）</div>
          {!sugs.length && <div className="ev-note">KPIに登録された稼働が見つかりませんでした。下の「店舗を手で入力して追加」から書いてください</div>}
          {adding.forms.map((f, i) => (
            <div key={'s' + i}>
              <button className={`ev-sug ${f.on ? 'on' : ''}`} onClick={() => setF('forms', i, 'on', !f.on)}><i />{mdLabel(sugs[i].date)}<b>{sugs[i].store}</b></button>
              {f.on && FormBox({ f, grp: 'forms', i })}
            </div>
          ))}
          {adding.manual.map((f, i) => <div key={'m' + i}>{FormBox({ f, grp: 'manual', i })}</div>)}
          <button className="ev-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding({ ...adding, manual: [...adding.manual, { date: '', store: '', text: '' }] })}>＋ 店舗を手で入力して追加</button>
          <div className="ev-edit-foot" style={{ background: 'transparent' }}><button className="ev-btn" onClick={() => setAdding(null)}>キャンセル</button><button className="ev-btn p" onClick={save}>{adding.forms.filter((f) => f.on).length + adding.manual.length}件を保存</button></div>
        </div>
      )}
      {!works.length && !adding && <div className="ev-note">まだ稼働評価はありません</div>}
      {shown.map((w) => (
        <div key={w.id} className="ev-review">
          <div className="ev-work-h">
            <span className="ev-chip">{w.legacy ? w.dateLabel : mdLabel(w.date)}</span><b>{w.store || '店舗未記入'}</b>
            {!w.legacy && <span className="ev-sub" style={{ marginLeft: 'auto' }}>記入 {fmt(w.at)}{w.by ? `・${w.by}` : ''}</span>}
            {isAdmin && !w.legacy && editId !== w.id && <>
              <button className="ev-btn" onClick={() => { setEditId(w.id); setEditText(w.text || ''); }}>編集</button>
              <button className="ev-btn" style={{ color: '#b91c1c' }} onClick={async () => { if (window.confirm('この稼働評価を削除します。よろしいですか？')) { await dbRemove(`eval_data/persons/${person.key}/works/${w.id}`); showToast('削除しました'); } }}>削除</button>
            </>}
          </div>
          {editId === w.id ? (
            <div style={{ marginTop: 6 }}>
              <AutoTA className="ev-inp ev-ta" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="ev-edit-foot" style={{ background: 'transparent' }}><button className="ev-btn" onClick={() => setEditId(null)}>キャンセル</button>
                <button className="ev-btn p" onClick={async () => { await dbSet(`eval_data/persons/${person.key}/works/${w.id}/text`, editText); setEditId(null); showToast('保存しました'); }}>保存</button></div>
            </div>
          ) : w.text && <p>{w.text}</p>}
        </div>
      ))}
      {works.length > 3 && <button className="ev-btn" style={{ marginTop: 6 }} onClick={() => setMore(!more)}>{more ? '新しい3件だけにする' : `以前の評価を見る（ほか${works.length - 3}件）`}</button>}
    </div>
  );
}

// ===== まとまり（キャッチ力など）だけを、その場で編集 =====
// 開いたまとまりの中で直せるので、上の「編集する」から探しに行かなくていい
const SEC_TOTAL = { キャッチ力: 'キャッチャー', クローズ力: 'クローズ', ディレクション力: 'ディレクター' };
export function SectionEdit({ person, section, userName, onDone }) {
  const base = normPerson(person);
  const [skills, setSkills] = useState(() => clone(base.skills));
  const totalLabel = SEC_TOTAL[section];
  const [saving, setSaving] = useState(false);
  const auto = (autoTotals(skills) || {})[totalLabel];
  const set = (i, k, v) => setSkills(skills.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const save = async () => {
    setSaving(true);
    const totals = totalsFromSkills(skills, base.totals, TOTAL_LABELS);
    try { await savePerson(base, { ...base, skills, totals }, userName); showToast('保存しました'); onDone(); } catch (e) { showToast('保存できませんでした：' + e.message); }
    setSaving(false);
  };
  return (
    <div className="ev-secedit">
      {totalLabel && auto && (
        <div className="ev-autototal">
          <b>総合（{totalLabel}）</b><span className="ev-note">自動で計算</span>
          <span className="ev-autoscore">{auto.score} / {auto.max}点</span>
          <Rank5 v={auto.rank} /><DeltaTag now={auto.rank} prev={auto.prevRank} />
        </div>
      )}
      <div className="ev-srow head"><span>評価項目</span><span>ランク</span><span>前回</span></div>
      {skills.map((s, i) => ((s.section || 'その他') === section ? (
        <div key={i} className="ev-edit-skill">
          <div className="ev-srow"><span>{s.item}</span><span><RankSel label={`${s.item}のランク`} value={s.rank} onChange={(v) => set(i, 'rank', v)} /></span><span><RankSel label={`${s.item}の前回ランク`} value={s.prev} onChange={(v) => set(i, 'prev', v)} /></span></div>
          <AutoTA className="ev-inp ev-ta" rows={1} value={s.comment || ''} placeholder="強み・課題コメント" onChange={(e) => set(i, 'comment', e.target.value)} />
        </div>
      ) : null))}
      <div className="ev-edit-foot" style={{ padding: '10px 12px' }}><button className="ev-btn" onClick={onDone}>キャンセル</button><button className="ev-btn p" disabled={saving} onClick={save}>{saving ? '保存中…' : '保存する'}</button></div>
    </div>
  );
}
