import React, { useMemo, useState } from 'react';
import { useDbCollection } from '../useFirebase.js';
import { useFirebaseList } from '../nippou/lib/useFirebaseList.js';
import { useFrames } from '../nippou/lib/frames.js';
import { getSavedResult, resultFromFrames, kpiMembers, storeMatch } from '../nippou/lib/kpiLink.js';
import { normName } from '../evalSheets.js';
import { normPerson, WorkList, SelfTable, TOTAL_LABELS } from './EvalEditors.jsx';
import { GoalEditor, Rank } from './EvalPage.jsx';
import { keepPlace } from '../keepPlace.js';

// ===== マイページ（自分の評価・稼働の記録）=====
// 本人だけが見る画面。目標・目標設定・アクションプランはここから書き込める
const DOWS = ['日', '月', '火', '水', '木', '金', '土'];
const mdLabel = (dt) => { const [y, m, d] = String(dt).split('-').map(Number); return y ? `${m}/${d}（${DOWS[new Date(y, m - 1, d).getDay()]}）` : dt; };
const fmt = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; };
const pct = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '－');

export default function MyPage({ user, onBack, onGoKpi }) {
  const key = normName(user && user.name);
  const [open, setOpen] = useState({ eval: true });
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [moreHist, setMoreHist] = useState(false);
  const [evalPersons] = useDbCollection('eval_data/persons');
  const [goals] = useDbCollection('eval_goals');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const { frames } = useFrames();
  const { data: fpActual } = useFirebaseList('fp_kpi_fp'); // 日報が無い日のFP全体の獲得（KPIで入力）

  const me = useMemo(() => Object.values(fpUsers || {}).find((u) => u && normName(u.name) === key) || {}, [fpUsers, key]);
  const person = evalPersons && evalPersons[key] ? normPerson({ ...evalPersons[key], key }) : null;
  const registered = useMemo(() => new Set(Object.values(fpUsers || {}).map((u) => u && u.name).filter(Boolean)), [fpUsers]);

  // ---- 稼働の記録（KPI × メンバーの実績 × 日報のFP獲得）----
  const works = useMemo(() => {
    const out = [];
    const fpOf = (store, date, kid) => {
      const f = (frames || []).find((x) => storeMatch(x.store, store) && x.days.some((d) => d.date === date));
      const d = f && f.days.find((x) => x.date === date);
      if (d && d.fpA !== '' && d.fpA != null) return Number(d.fpA) || 0;
      const v = kid && (fpActual || {})[`${kid}_${date}`];
      return v ? Number(v.value) || 0 : null;
    };
    const seen = new Set();
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => {
      const ms = kpiMembers(k, dt);
      ms.forEach((m, mi) => {
        if (normName(m.member) !== key) return;
        const r = getSavedResult(kpiResults, kid, dt, mi, m.member, m.role) || resultFromFrames(frames, k, dt, mi, registered);
        const cat = m.role === 'キャッチャー';
        out.push({ date: dt, store: k.store, role: m.role, cat, target: +(cat ? m.catcherCount || m.target : m.target) || 0,
          actual: r && r.actual !== '' && r.actual != null ? +r.actual || 0 : null,
          fpT: ms.filter((x) => x.role !== 'キャッチャー').reduce((a, x) => a + (+x.target || 0), 0), fpA: fpOf(k.store, dt, kid),
          selfMode: !ms.some((x) => x.role === 'ディレクター' && x.member && x.member !== '他社' && [...registered].some((r) => normName(r) === normName(x.member))) });
        seen.add(dt + '|' + normName(k.store));
      });
    }));
    // KPIが無い日の実績（日報のあとに手で入れたもの）
    (frames || []).forEach((f) => Object.entries(f.memberResults || {}).forEach(([dt, rows]) => (rows || []).forEach((r) => {
      if (!r || normName(r.member) !== key || seen.has(dt + '|' + normName(f.store))) return;
      const d = f.days.find((x) => x.date === dt);
      out.push({ date: dt, store: f.store, role: r.role, cat: r.role === 'キャッチャー', target: 0, actual: +r.actual || 0, fpT: 0, fpA: d && d.fpA !== '' ? +d.fpA || 0 : null });
    })));
    const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return out.filter((w) => w.date <= t).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [kpiData, kpiResults, frames, key, registered, fpActual]);
  // ディレクターが自社メンバーでなくて、まだ自分で実績を入れていない日
  const pending = works.filter((w) => w.selfMode && w.actual == null);

  const sales = (l) => l.filter((w) => !w.cat && w.actual != null);
  const monthList = works.filter((w) => w.date.slice(0, 7) === month);
  const mGot = sales(monthList).reduce((a, w) => a + w.actual, 0);
  const mTgt = monthList.filter((w) => !w.cat).reduce((a, w) => a + w.target, 0);
  const allGot = sales(works).reduce((a, w) => a + w.actual, 0);
  const rates = sales(works).filter((w) => w.fpA > 0).map((w) => w.actual / w.fpA);
  const storeCount = {};
  works.forEach((w) => { storeCount[w.store] = (storeCount[w.store] || 0) + 1; });
  const topStores = Object.entries(storeCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const moveMonth = (d) => { const [y, m] = month.split('-').map(Number); const x = new Date(y, m - 1 + d, 1); setMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); };

  const Sec = ({ k, title, hint, children }) => (
    <div className="mp-card">
      <button className="mp-sec" onClick={(e) => keepPlace(e.currentTarget, () => setOpen({ ...open, [k]: !open[k] }))} aria-expanded={!!open[k]}>
        <b>{title}</b><i>{open[k] ? '▲' : '▼'}</i>
      </button>
      {open[k] && <div className="mp-body">{children}</div>}
    </div>
  );
  const sections = person ? [...new Set(person.skills.map((x) => x.section || 'その他'))] : [];

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo"><div className="logo-mark">au</div><h1>マイページ</h1></div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← ホーム</button></div>
      </header>
      <div className="t-body mp">
        <div className="mp-card mp-prof">
          <span className="mp-av">{(user && user.name || '?').slice(0, 1)}</span>
          <div className="mp-prof-main">
            <b>{user && user.name}</b>
            <div className="mp-badges">
              {me.position && <span className="mp-bd pos">{me.position}</span>}
              {me.grade && <span className="mp-bd gr">等級{me.grade}</span>}
            </div>
            <small>オレタブの担当者ID {me.oretabId || '未登録（管理者に登録を依頼してください）'}</small>
            {person && person.info.start && <small>稼働開始 {person.info.start}</small>}
          </div>
        </div>

        {pending.length > 0 && (
          <div className="mp-pending">
            <b>実績が未入力の日があります</b>
            <span>{pending.slice(0, 5).map((w) => `${mdLabel(w.date)} ${w.store}`).join('・')}{pending.length > 5 ? ` ほか${pending.length - 5}日` : ''}</span>
            {onGoKpi && <button className="ev-btn p" onClick={onGoKpi}>KPIで入力する</button>}
          </div>
        )}

        {Sec({ k: 'eval', title: '自分の評価', hint: '総合・スキル', children: !person ? <div className="ev-note">まだ評価が登録されていません</div> : (<>
          <div className="mp-totals">{TOTAL_LABELS.map((l) => <div key={l}><small>{l}</small><Rank v={(person.totals.find((x) => x.label === l) || {}).rank} big /></div>)}</div>
          {sections.map((sec) => (
            <div key={sec}>
              <div className="ev-sec">{sec}</div>
              <div className="ev-srow head"><span>評価項目</span><span>ランク</span><span>前回</span></div>
              {person.skills.filter((x) => (x.section || 'その他') === sec).map((x) => (
                <div key={x.item}><div className="ev-srow"><span>{x.item}</span><span><Rank v={x.rank} /></span><span><Rank v={x.prev} /></span></div>
                  {x.comment && <div className="ev-skill-c" style={{ padding: '0 12px 8px' }}>{x.comment}</div>}</div>
              ))}
            </div>
          ))}
        </>) })}

        {Sec({ k: 'log', title: 'ランクの変化の記録', children: person && person.rankLog.length ? person.rankLog.slice(0, 30).map((l, i) => <div key={i} className="ev-kv"><span>{fmt(l.at)}</span><b>{l.text}</b></div>) : <div className="ev-note">まだ記録はありません（管理者がランクを変えると、ここに残ります）</div> })}

        {Sec({ k: 'work', title: '稼働評価の履歴', hint: '新しい3件', children: person ? <WorkList person={person} isAdmin={false} legacy={person.reviews} /> : <div className="ev-note">まだ稼働評価はありません</div> })}

        {Sec({ k: 'goal', title: '目標・アクションプラン', hint: '自分で書けます', children: person ? (<>
          <GoalEditor person={person} saved={(goals || {})[key]} canEdit />
          <SelfTable person={person} field="goals" title="目標設定" canEdit />
          <SelfTable person={person} field="actions" title="具体的アクションプラン" canEdit />
        </>) : <div className="ev-note">評価一覧に登録されると書き込めるようになります</div> })}

        {Sec({ k: 'month', title: '今月の実績', children: (<>
          <div className="mp-month"><button className="ev-btn" onClick={() => moveMonth(-1)} aria-label="前の月">‹</button><b>{month.slice(0, 4)}年{Number(month.slice(5))}月</b><button className="ev-btn" onClick={() => moveMonth(1)} aria-label="次の月">›</button></div>
          <div className="mp-stat"><div><small>獲得件数</small><b className="o">{mGot}</b></div><div><small>達成率</small><b>{pct(mGot, mTgt)}</b></div><div><small>稼働日数</small><b>{new Set(monthList.map((w) => w.date)).size}日</b></div></div>
          <div className="ev-note">達成率＝この月の自分の獲得件数 ÷ 自分の目標件数の合計（キャッチャーの日は除く）</div>
        </>) })}

        {Sec({ k: 'hist', title: '稼働の履歴', hint: '通算・現場ごと', children: (<>
          <div className="mp-stat"><div><small>通算稼働</small><b>{works.length}回</b></div><div><small>通算獲得</small><b className="o">{allGot}件</b></div><div><small>平均貢献率</small><b>{rates.length ? Math.round((rates.reduce((a, x) => a + x, 0) / rates.length) * 100) + '%' : '－'}</b></div></div>
          {topStores.length > 0 && <div className="ev-note" style={{ margin: '6px 0' }}>よく入る店舗：{topStores.map(([s, c]) => `${s} ${c}回`).join('・')}</div>}
          {!works.length && <div className="ev-note">まだ稼働の記録はありません</div>}
          {(moreHist ? works : works.slice(0, 10)).map((w, i) => (
            <div key={i} className="mp-work">
              <div className="mp-work-h"><span className="ev-chip">{mdLabel(w.date)}</span><b>{w.store}</b><small>{w.role}</small></div>
              <div className="mp-work-g">
                <div><small>自分の目標</small><b>{w.target}{w.cat ? '組' : '件'}</b></div>
                <div><small>自分の実績</small><b className="o">{w.actual == null ? '－' : `${w.actual}${w.cat ? '組' : '件'}`}</b></div>
                <div><small>FP全体 目標/獲得</small><b>{w.fpT || '－'}/{w.fpA == null ? '－' : w.fpA}</b></div>
                <div><small>貢献率</small><b>{!w.cat && w.actual != null && w.fpA > 0 ? pct(w.actual, w.fpA) : '－'}</b></div>
              </div>
            </div>
          ))}
          {works.length > 10 && <button className="ev-btn" style={{ marginTop: 8 }} onClick={() => setMoreHist(!moreHist)}>{moreHist ? '新しい10件だけにする' : `以前の稼働を見る（ほか${works.length - 10}件）`}</button>}
          <div className="ev-note" style={{ marginTop: 6 }}>貢献率＝自分の実績 ÷ その日のFP獲得（日報の「FP獲得（総販）」）</div>
        </>) })}
      </div>
    </div>
  );
}
