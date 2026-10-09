import React, { useEffect, useMemo, useState } from 'react';
import { useDbCollection, dbSet, dbPush, dbRemove } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { useFrames } from '../nippou/lib/frames.js';
import { getSavedResult, resultFromFrames, kpiMembers } from '../nippou/lib/kpiLink.js';
import { RANK_STYLE, RANKS5, normName } from '../evalSheets.js';
import { AutoTA, savePerson, TOTAL_LABELS, weekBlocks, weekKey, rangeLabel, WeekSelect } from './EvalEditors.jsx';
import { showToast } from '../utils.js';
import { autoTotals, totalsFromSkills, DeltaTag, NextText, ScoreGuide } from '../evalScore.jsx';

// ===== 評価作成（管理者だけ）：1人を選んで、今のステータスを見ながら次の評価をつける =====
// 下書き：eval_drafts/{名前のキー} = { next: { 't:キャッチャー': '良', s0: '優', ... }, cmt: { s0: '...' }, work: { date, store, text }, at, by }
// 確定：eval_data/persons/{キー} を更新（前回のランクは prev に移す）。ランクの変化は rankLog に、変更は eval_history に残る
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
// 日程別の欄：週の日付ごとに1つ（土日なら2つ）。日付が1つしかないときも2つ出す
const splitWorkDays = (w) => {
  const out = []; const d = new Date((w.date || '') + 'T00:00:00'); const end = w.dateTo || w.date;
  const k2 = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!isNaN(d)) { while (out.length < 7) { const k = k2(d); if (end && k > end) break; out.push({ date: k, text: '' }); d.setDate(d.getDate() + 1); } }
  while (out.length < 2) out.push({ date: '', text: '' });
  if (w.text && w.text.trim()) out[0].text = w.text;
  return out;
};
const md = (d) => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return `${x.getMonth() + 1}/${x.getDate()}（${DOW[x.getDay()]}）`; };
const ymd = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);

// ランクの小さな札（不可は文字なしのグレー）
const RankChip = ({ v }) => {
  const st = RANK_STYLE[v];
  if (!st) return <span className="ec-rk empty">－</span>;
  return <span className="ec-rk" style={{ background: st.bg, color: st.fg }} aria-label={v} title={v}>{v === '不可' ? '' : v}</span>;
};
// 今回のランクを選ぶボタン（前回のランクには「前回」）
function RankPicker({ value, prev, onPick, label }) {
  return (
    <div className="ec-picks" role="group" aria-label={label}>
      {RANKS5.map((r) => {
        const on = value === r, st = RANK_STYLE[r];
        return (
          <button key={r} type="button" className={`ec-pk ${on ? 'on' : ''} ${r === prev ? 'prev' : ''}`} aria-label={r} aria-pressed={on} title={r}
            style={on ? { background: st.bg, color: st.fg, borderColor: st.bg } : undefined} onClick={() => onPick(on ? undefined : r)}>
            {r === '不可' ? '' : r}{r === prev && <em>前回</em>}
          </button>
        );
      })}
    </div>
  );
}

export default function EvalCreate({ list, user, standard }) {
  const [drafts] = useDbCollection('eval_drafts');
  const [goals] = useDbCollection('eval_goals');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const { frames } = useFrames();
  const people = list.filter((x) => x.person);
  const [key, setKey] = useState(() => (people[0] && people[0].key) || '');
  const [next, setNext] = useState({});
  const [cmt, setCmt] = useState({});
  const [work, setWork] = useState({ date: '', dateTo: '', store: '', text: '' });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const cur = people.find((x) => x.key === key) || people[0];
  const p = cur && cur.person;
  const curKey = cur && cur.key;

  // 人を選び直したら、その人の下書きを読み込む
  useEffect(() => {
    if (!curKey || dirty) return;
    const d = (drafts || {})[curKey];
    setNext((d && d.next) || {}); setCmt((d && d.cmt) || {}); setWork({ date: '', dateTo: '', store: '', text: '', ...((d && d.work) || {}) });
  }, [curKey, drafts && JSON.stringify(drafts[curKey] || null)]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (k) => {
    if (k === curKey) return;
    if (dirty && !window.confirm('下書き保存していない入力があります。破棄して別の人に移りますか？')) return;
    setDirty(false); setKey(k);
    const d = (drafts || {})[k];
    setNext((d && d.next) || {}); setCmt((d && d.cmt) || {}); setWork({ date: '', dateTo: '', store: '', text: '', ...((d && d.work) || {}) });
  };
  const idx = people.findIndex((x) => x.key === curKey);
  const step = (dv) => { if (people.length) choose(people[(idx + dv + people.length) % people.length].key); };
  const pick = (k, v) => { setNext((n) => { const o = { ...n }; if (v) o[k] = v; else delete o[k]; return o; }); setDirty(true); };

  // ---- この人の稼働（KPI × 実績）：直近3か月の集計と、稼働評価の現場の提案に使う ----
  const registered = useMemo(() => new Set(Object.values(fpUsers || {}).map((u) => u && u.name).filter(Boolean)), [fpUsers]);
  const rows = useMemo(() => {
    if (!curKey) return [];
    const out = [];
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => kpiMembers(k, dt).forEach((m, mi) => {
      if (normName(m.member) !== curKey) return;
      const r = getSavedResult(kpiResults, kid, dt, mi, m.member, m.role) || resultFromFrames(frames, k, dt, mi, registered);
      out.push({ date: dt, store: k.store, role: m.role, cat: m.role === 'キャッチャー', target: +m.target || 0, actual: r && r.actual !== '' && r.actual != null ? +r.actual || 0 : null });
    })));
    const t = ymd(new Date());
    return out.filter((w) => w.date <= t).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [kpiData, kpiResults, frames, curKey, registered]);
  const months = useMemo(() => {
    const now = new Date();
    return [2, 1, 0].map((back) => {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const l = rows.filter((w) => w.date.slice(0, 7) === ym);
      const sales = l.filter((w) => !w.cat);
      const got = sales.reduce((a, w) => a + (w.actual || 0), 0), tgt = sales.reduce((a, w) => a + w.target, 0);
      return { label: `${d.getMonth() + 1}月`, got, tgt, rate: tgt ? Math.round((got / tgt) * 100) + '%' : '-', days: new Set(l.map((w) => w.date)).size };
    });
  }, [rows]);
  // 稼働評価の提案：今日より前の稼働を週（土日）ごとにまとめ、まだ書いていない週を新しい順に3つ
  const proposals = useMemo(() => {
    const t = ymd(new Date());
    const done = new Set(Object.values((p && p.works) || {}).filter((w) => w && w.date).map((w) => weekKey(w.date)));
    return weekBlocks(rows.filter((w) => w.date < t)).filter((b) => !done.has(weekKey(b.date))).slice(0, 3);
  }, [rows, p]);

  if (!people.length) return <div className="ev-note">評価できるメンバーがいません（個人別のデータがある人だけ評価できます）。</div>;

  const info = p.info || {};
  const u = Object.values(fpUsers || {}).find((x) => x && normName(x.name) === curKey) || {};
  const totals = TOTAL_LABELS.map((l) => ({ label: l, rank: ((p.totals || []).find((t) => t.label === l) || {}).rank || '' }));
  const skills = p.skills || [];
  const sections = [...new Set(skills.map((s) => s.section || 'その他'))];
  const doneCount = Object.keys(next).filter((k) => k.startsWith('s')).length, allCount = skills.length;
  // 総合評価：今回選んだランク（まだ選んでいない項目は今のランク）で自動計算
  const autoNow = autoTotals(skills.map((s, i) => ({ ...s, prev: s.rank, rank: next[`s${i}`] || s.rank })));

  // 変更点（前回→今回）
  const changes = [];
  totals.forEach((t) => { const a = autoNow[t.label]; if (a && a.rank && a.rank !== t.rank) changes.push(`総合（${t.label}）${t.rank || '－'}→${a.rank}`); });
  skills.forEach((s, i) => { const v = next[`s${i}`]; if (v && v !== s.rank) changes.push(`${s.item}：${s.rank || '－'}→${v}`); });

  const saveDraft = async () => {
    setBusy(true);
    try { await dbSet(`eval_drafts/${curKey}`, { next, cmt, work, at: Date.now(), by: user?.name || '管理者' }); setDirty(false); showToast('下書きを保存しました'); } catch (e) { showToast('保存できませんでした：' + e.message); }
    setBusy(false);
  };
  const commit = async () => {
    if (!doneCount && !work.text.trim() && !(work.days || []).some((d) => d.text.trim()) && !Object.values(cmt).some((x) => String(x || '').trim())) return showToast('まだ何も入力されていません');
    const left = allCount - doneCount;
    if (!window.confirm(`${info.name || cur.name}さんの評価を確定します。${left ? `\n（まだ選んでいない項目が${left}つあります。その項目は前回のまま残ります）` : ''}\n\n変更点：${changes.length ? changes.join('、') : 'ランクの変更なし'}`)) return;
    setBusy(true);
    try {
      const before = JSON.parse(JSON.stringify(p));
      const after = JSON.parse(JSON.stringify(p));
      after.skills = skills.map((s, i) => {
        const v = next[`s${i}`], c = String(cmt[`s${i}`] || '').trim();
        return { ...s, ...(v ? { prev: s.rank || '', rank: v } : {}), comment: c }; // コメントは毎回書き直し（空なら空のまま）
      });
      after.totals = totalsFromSkills(after.skills, p.totals, TOTAL_LABELS);
      await savePerson(before, after, user?.name);
      // 日程別に書いたときは、1日ずつの評価として保存する
      const wl = work.split ? (work.days || []).filter((d) => d.text.trim()).map((d) => ({ date: d.date, dateTo: d.date, text: d.text.trim() }))
        : (work.text.trim() ? [{ date: work.date, dateTo: work.dateTo || work.date, text: work.text.trim() }] : []);
      for (const w of wl) {
        await dbPush(`eval_data/persons/${curKey}/works`, { date: w.date || '', dateTo: w.dateTo || '', store: work.store || '', text: w.text, at: Date.now(), by: user?.name || '管理者', sortKey: w.date ? new Date(w.date + 'T00:00:00').getTime() : Date.now() });
      }
      await dbRemove(`eval_drafts/${curKey}`);
      setNext({}); setCmt({}); setWork({ date: '', dateTo: '', store: '', text: '' }); setDirty(false);
      showToast('評価を確定しました');
    } catch (e) { showToast('確定できませんでした：' + e.message); }
    setBusy(false);
  };

  const g = arr((goals || {})[curKey]);
  const goalRows = arr(p.goals && p.goals.rows), actionRows = arr(p.actions && p.actions.rows), logRows = arr(p.logs && p.logs.rows);
  const lastLog = logRows[logRows.length - 1];
  const draftInfo = (drafts || {})[curKey];

  return (
    <div className="ec">
      <div className="ec-bar">
        <button className="ec-nav" onClick={() => step(-1)} aria-label="前の人">‹</button>
        <label className="ec-pick"><span>評価する人</span>
          <select value={curKey} onChange={(e) => choose(e.target.value)}>
            {people.map((x) => <option key={x.key} value={x.key}>{x.role ? `${x.role}　` : ''}{x.name}{(drafts || {})[x.key] ? '（下書きあり）' : ''}</option>)}
          </select>
        </label>
        <button className="ec-nav" onClick={() => step(1)} aria-label="次の人">›</button>
        <div className="ec-prog"><span>入力済み {doneCount} / {allCount} 項目</span><div><i style={{ width: `${allCount ? Math.round((doneCount / allCount) * 100) : 0}%` }} /></div></div>
        <div className="ec-acts">
          {draftInfo && !dirty && <span className="ec-draft">下書き：{new Date(draftInfo.at).getMonth() + 1}/{new Date(draftInfo.at).getDate()} {draftInfo.by}</span>}
          <button className="ev-btn" disabled={busy} onClick={saveDraft}>{dirty ? '下書き保存' : '下書き保存済み'}</button>
          <button className="ev-btn p" disabled={busy} onClick={commit}>評価を確定</button>
        </div>
      </div>

      <div className="ec-grid">
        {/* 左：今のステータス */}
        <div className="ec-col ec-sticky">
          <div className="ec-card"><h3>基本情報<i /></h3>
            <b className="ec-name">{info.name || cur.name}</b>
            <div className="ec-small">{[u.position || info.role, u.grade && `等級${u.grade}`, info.start && `稼働開始 ${info.start}`].filter(Boolean).join('・')}</div>
          </div>
          <div className="ec-card"><h3>実績（直近3か月）<i /></h3>
            <table className="ec-kt"><thead><tr><th>月</th><th>獲得</th><th>目標</th><th>達成率</th><th>稼働</th></tr></thead>
              <tbody>{months.map((m) => <tr key={m.label}><td>{m.label}</td><td><b>{m.got}</b></td><td>{m.tgt}</td><td>{m.rate}</td><td>{m.days}日</td></tr>)}</tbody></table>
          </div>
          <div className="ec-card"><h3>稼働評価（新しい順）<i /></h3>
            {(p.works || []).slice(0, 5).map((w) => <div className="ec-w" key={w.id}><div><span className="ec-chipd">{rangeLabel(w.date, w.dateTo)}</span><b>{w.store || '店舗未記入'}</b></div>{w.text && <div className="ec-small">{w.text}</div>}</div>)}
            {!(p.works || []).length && <div className="ec-small">まだありません</div>}
          </div>
          <div className="ec-card"><h3>本人の目標・アクションプラン<i /></h3>
            {g.length > 0 && g.map((x, i) => <div key={i} className="ec-small">・{x.item}を{x.rank}に{x.cond ? `（${x.cond}）` : ''}</div>)}
            {goalRows.filter((r) => arr(r).some(Boolean)).map((r, i) => <div key={'g' + i} className="ec-small">・{arr(r).filter(Boolean).join('／')}</div>)}
            <div className="ec-hd" style={{ marginTop: 8 }}>アクションプラン</div>
            {actionRows.filter((r) => arr(r).some(Boolean)).map((r, i) => <div key={i} className="ec-small">・{arr(r).filter(Boolean).join('／')}</div>)}
            {!g.length && !goalRows.length && !actionRows.length && <div className="ec-small">まだ書かれていません</div>}
          </div>
          {lastLog && <div className="ec-card"><h3>前回の振り返り<i /></h3><div className="ec-small">{arr(lastLog).filter(Boolean).join('／')}</div></div>}
          <div className="ec-card"><h3>ランクの変化の記録<i /></h3>
            {(p.rankLog || []).slice(0, 8).map((r, i) => <div key={i} className="ec-small">{new Date(r.at).getMonth() + 1}/{new Date(r.at).getDate()}　{r.text}</div>)}
            {!(p.rankLog || []).length && <div className="ec-small">まだありません</div>}
          </div>
        </div>

        {/* 真ん中：今回の評価 */}
        <div className="ec-col">
          <div className="ec-card"><h3>総合評価（自動で計算）<i /></h3>
            <div className="ec-trow head"><span>区分</span><span>前回</span><span>今回</span><span>点数</span></div>
            {totals.map((t) => { const a = autoNow[t.label]; return (
              <div className="ec-trow" key={t.label}>
                <b>{t.label}</b><RankChip v={t.rank} />
                <span className="ec-row">{a ? <RankChip v={a.rank} /> : <span className="ec-small">項目なし</span>}{a && <DeltaTag now={a.rank} prev={t.rank} />}</span>
                <span className="ec-small">{a ? `${a.score} / ${a.max}点` : ''}{a && <><br /><NextText a={a} /></>}</span>
              </div>
            ); })}
            <ScoreGuide />
            <div className="ec-small sm" style={{ marginTop: 6 }}>項目（秀5・優4・良3・可2・不可1）の合計＋現場評価（キャッチ×3・クローズ×6・ディレクター×3）。点数はメンバーの画面にも出ます。</div>
          </div>
          {sections.map((sec) => (
            <div className="ec-card" key={sec}>
              <h3>{sec}<i /><button className="ec-mini" onClick={() => { setNext((n) => { const o = { ...n }; skills.forEach((s, i) => { if ((s.section || 'その他') === sec && s.rank) o[`s${i}`] = s.rank; }); return o; }); setDirty(true); }}>この区分をすべて前回と同じに</button></h3>
              <div className="ec-srow head"><span>項目・観点</span><span>前回</span><span>今回</span><span>コメント</span></div>
              {skills.map((s, i) => ((s.section || 'その他') !== sec ? null : (
                <div className={`ec-srow ${next[`s${i}`] && s.rank && next[`s${i}`] !== s.rank ? ({ 秀: 5, 優: 4, 良: 3, 可: 2, 不可: 1 }[next[`s${i}`]] > ({ 秀: 5, 優: 4, 良: 3, 可: 2, 不可: 1 }[s.rank] || 0) ? 'dt-up' : 'dt-down') : ''}`} key={i}>
                  <div><b>{s.item}</b>{s.view && <div className="ec-small sm">{s.view}</div>}</div>
                  <div><RankChip v={s.rank} /></div>
                  <div className="ec-pickcol"><RankPicker value={next[`s${i}`]} prev={s.rank} label={`${s.item}の今回の評価`} onPick={(v) => pick(`s${i}`, v)} />{next[`s${i}`] && <DeltaTag now={next[`s${i}`]} prev={s.rank} />}</div>
                  <div className="ec-cmt">
                    <AutoTA className="ec-ta" value={cmt[`s${i}`] || ''} placeholder="コメント（必要なときだけ）" aria-label={`${s.item}のコメント`} onChange={(e) => { const v = e.target.value; setCmt((c) => ({ ...c, [`s${i}`]: v })); setDirty(true); }} />
                    {s.comment && <div className="ec-small sm">前回：{s.comment}</div>}
                  </div>
                </div>
              )))}
            </div>
          ))}
          <div className="ec-card"><h3>今回の稼働評価を追加<i /></h3>
            {proposals.length > 0 && <div className="ec-small" style={{ marginBottom: 8 }}>1週（土日）で1件。KPIから、まだ書いていない週：{proposals.map((w) => (
              <button key={w.date} className={`ec-prop ${work.date === w.date ? 'on' : ''}`} onClick={() => { setWork((x) => ({ ...x, date: w.date, dateTo: w.dateTo, store: w.store })); setDirty(true); }}>{rangeLabel(w.date, w.dateTo)} {w.store}</button>
            ))}</div>}
            <div className="ec-wrow">
              <label className="ec-fld wk">週<WeekSelect value={work.date} onChange={(a, b) => { setWork((w) => ({ ...w, date: a, dateTo: b, days: w.split ? splitWorkDays({ ...w, date: a, dateTo: b }) : w.days })); setDirty(true); }} /></label>
              <label className="ec-fld" style={{ flex: 1 }}>店舗<input className="ev-inp" value={work.store} onChange={(e) => { setWork({ ...work, store: e.target.value }); setDirty(true); }} /></label>
            </div>
            {!work.split ? (<>
              <AutoTA className="ec-ta big" value={work.text} rows={3} placeholder="稼働評価の文章（空なら追加しません）" aria-label="稼働評価" onChange={(e) => { setWork({ ...work, text: e.target.value }); setDirty(true); }} />
              <button className="ev-btn" style={{ marginTop: 6 }} onClick={() => { setWork({ ...work, split: true, days: splitWorkDays(work) }); setDirty(true); }}>日程別の評価を入力</button>
            </>) : (<>
              {(work.days || []).map((d, k) => (
                <div key={k} className="ev-day-row">
                  <label><small>日付</small><input className="ev-inp" type="date" value={d.date} onChange={(e) => { setWork({ ...work, days: work.days.map((x, n) => (n === k ? { ...x, date: e.target.value } : x)) }); setDirty(true); }} /></label>
                  <label style={{ flex: 1 }}><small>稼働評価{d.date ? `（${md(d.date)}）` : ''}</small><AutoTA className="ec-ta" value={d.text} rows={2} placeholder="評価の内容（空ならその日は追加しません）" onChange={(e) => { const v = e.target.value; setWork((w) => ({ ...w, days: w.days.map((x, n) => (n === k ? { ...x, text: v } : x)) })); setDirty(true); }} /></label>
                </div>
              ))}
              <button className="ev-btn" style={{ marginTop: 6 }} onClick={() => { setWork({ ...work, split: false }); setDirty(true); }}>1つの欄にまとめて書く</button>
            </>)}
          </div>
        </div>

        {/* 右：変更点と評価基準 */}
        <div className="ec-col ec-sticky">
          <div className="ec-card"><h3>今回の変更点 {changes.length}件<i /></h3>
            {!changes.length && <div className="ec-small">まだ変更はありません。ランクを選ぶと、ここに「前回→今回」が並びます。</div>}
            <ul className="ec-chg">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          {standard && arr(standard.list).length > 0 && (
            <div className="ec-card"><h3>評価基準<i /></h3>
              {arr(standard.list).map((x) => <div className="ec-std" key={x.rank}><RankChip v={x.rank} /><span className="ec-small">{x.rank === '不可' ? '不可：' : ''}{x.desc}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
