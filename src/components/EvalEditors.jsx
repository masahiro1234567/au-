import React, { useState } from 'react';
import { dbSet, dbPush } from '../useFirebase.js';
import { showToast } from '../utils.js';
import { RANKS5 } from '../evalSheets.js';

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
    totals: arr(p.totals), goalsSheet: arr(p.goalsSheet), skills: arr(p.skills), reviews: arr(p.reviews),
    goals: tb(p.goals, GOAL_HEADS), actions: tb(p.actions, ACTION_HEADS), logs: tb(p.logs, LOG_HEADS),
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
export async function savePerson(before, after, userName) {
  const data = { ...clone(after), updatedAt: Date.now(), updatedBy: userName || '管理者' };
  await dbSet(`eval_data/persons/${after.key}`, data);
  await dbPush('eval_history', { key: after.key, name: after.info.name, by: userName || '管理者', at: Date.now(), summary: diffSummary(before, after).slice(0, 12).join('、') });
}

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
            <label key={h}><small>{h}</small><textarea className="ev-inp ev-ta" rows={1} value={r[h] || ''} onChange={(e) => set(i, h, e.target.value)} /></label>
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
  // 新しい「直近の評価」を追加（直近→前回→前々回にずれる）
  const addReview = () => {
    const old = d.reviews;
    const labels = ['直近の評価', '前回の評価', '前々回の評価'];
    up({ reviews: [{ label: labels[0], store: '', text: '' }, ...old.slice(0, 2).map((r, i) => ({ ...r, label: labels[i + 1] }))] });
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
        <div className="ev-h" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>具体評価<span style={{ flex: 1 }} /><button className="ev-btn" onClick={addReview}>＋ 新しい評価を追加</button></div>
        {d.reviews.map((r, i) => (
          <div key={i} className="ev-edit-review">
            <b>{r.label}</b>
            <input className="ev-inp" value={r.store || ''} placeholder="店舗名" onChange={(e) => up({ reviews: d.reviews.map((x, j) => (j === i ? { ...x, store: e.target.value } : x)) })} />
            <textarea className="ev-inp ev-ta" rows={3} value={r.text || ''} placeholder="評価の内容" onChange={(e) => up({ reviews: d.reviews.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
          </div>
        ))}
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
                <textarea className="ev-inp ev-ta" rows={1} value={s.comment || ''} placeholder="強み・課題コメント" onChange={(e) => setSkill(i, 'comment', e.target.value)} />
              </div>
            ) : null))}
          </div>
        ))}
      </div>
      <TableEdit title="目標設定" table={d.goals} onChange={(t) => up({ goals: t })} />
      <TableEdit title="具体的アクションプラン" table={d.actions} onChange={(t) => up({ actions: t })} />
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
        <label key={x.rank} className="ev-edit-review"><b>{x.rank}</b><textarea className="ev-inp ev-ta" rows={2} value={x.desc} onChange={(e) => setD(d.map((y, j) => (j === i ? { ...y, desc: e.target.value } : y)))} /></label>
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
