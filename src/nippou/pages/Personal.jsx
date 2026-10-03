import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useFirebaseList } from '../lib/useFirebaseList';
import { useFrames, md } from '../lib/frames';
import { getSavedResult, kpiMembers } from '../lib/kpiLink';
import MonthNav, { useMonth, inMonth } from '../components/MonthNav';
import { keepPlace } from '../../keepPlace.js';

// 個人実績（月）：メンバー全員を一覧で出す。名前を押すと、すぐ下にその月の明細が開く
// 並びはメンバー管理と同じ：役職（管理者［責任者］→MQ→SAM→IN→NV→未設定）→ 等級（S→R）→ 名前
// KPIがある日は KPI の実績（fp_kpi_results）、KPIが無い日は日報に入れた実績（memberResults）を使う
const POSITIONS = ['責任者', 'MQ', 'SAM', 'IN', 'NV'];
const POS_LABEL = { 責任者: '管理者（責任者）' };
const GRADES = ['S', 'A', 'B', 'C', 'R'];
const nn = (s) => String(s || '').normalize('NFKC').replace(/[\s　]/g, '');

export default function Personal() {
  const { frames, loading } = useFrames();
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const { data: fpUsers } = useFirebaseList('fp_users');
  const [month, setMonth] = useMonth();
  const [open, setOpen] = useState({});

  const all = useMemo(() => {
    const out = [];
    const covered = new Set();
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => kpiMembers(k, dt).forEach((m, mi) => {
      if (!m.member || m.member === '他社') return;
      const r = getSavedResult(kpiResults, kid, dt, mi, m.member, m.role);
      if (!r) return;
      out.push({ date: dt, store: k.store, name: m.member, role: m.role, target: +m.target || 0, actual: +r.actual || 0 });
      covered.add(`${dt}|${nn(m.member)}`);
    })));
    frames.forEach((f) => Object.entries(f.memberResults || {}).forEach(([dt, rows]) => (rows || []).forEach((r) => {
      if (!r || r.other || !r.member || covered.has(`${dt}|${nn(r.member)}`)) return;
      out.push({ date: dt, store: f.store, name: r.member, role: r.role, target: 0, actual: +r.actual || 0 });
    })));
    return out;
  }, [kpiData, kpiResults, frames]);

  // 名簿（承認済み・ログイン可）の人は、実績が0でも全員出す。名簿に無い人は「未設定」に入れる
  const people = useMemo(() => {
    const map = new Map();
    Object.values(fpUsers || {}).forEach((u) => {
      if (!u || !u.name || u.permission === 'disabled' || u.permission === 'pending') return;
      const k = nn(u.name);
      if (!map.has(k)) map.set(k, { key: k, name: u.name, position: u.position || '', grade: u.grade || '' });
    });
    all.forEach((x) => { const k = nn(x.name); if (!map.has(k)) map.set(k, { key: k, name: x.name, position: '', grade: '' }); });
    const rowsOf = (k) => all.filter((x) => nn(x.name) === k && inMonth(x.date, month)).sort((a, b) => (a.date > b.date ? 1 : -1));
    return [...map.values()].map((p) => {
      const rows = rowsOf(p.key);
      const sales = rows.filter((x) => x.role !== 'キャッチャー');
      const seats = rows.filter((x) => x.role === 'キャッチャー');
      const actual = sales.reduce((a, x) => a + x.actual, 0), target = sales.reduce((a, x) => a + x.target, 0);
      return { ...p, rows, actual, target, seats: seats.reduce((a, x) => a + x.actual, 0), days: new Set(rows.map((x) => x.date)).size };
    });
  }, [fpUsers, all, month]);

  const gOrder = (g) => { const i = GRADES.indexOf(g); return i < 0 ? 99 : i; };
  const groups = [...POSITIONS, ''].map((pos) => ({
    pos,
    label: pos ? POS_LABEL[pos] || pos : '未設定',
    list: people.filter((p) => (POSITIONS.includes(p.position) ? p.position : '') === pos)
      .sort((a, b) => gOrder(a.grade) - gOrder(b.grade) || a.name.localeCompare(b.name, 'ja')),
  })).filter((g) => g.list.length);

  const total = people.reduce((a, p) => ({ actual: a.actual + p.actual, target: a.target + p.target, days: a.days + p.days }), { actual: 0, target: 0, days: 0 });
  const rate = (a, t) => (t ? Math.round((a / t) * 100) + '%' : '-');
  const setAll = (v) => setOpen(v ? Object.fromEntries(people.map((p) => [p.key, true])) : {});

  return (
    <Layout title="個人実績">
      <div className="np-wrap">
        <MonthNav month={month} onChange={setMonth} />
        {loading && <div className="empty">読み込み中…</div>}
        <div className="np-res">
          <div><small>チーム合計の実績件数</small><b style={{ color: 'var(--pd)' }}>{total.actual}</b></div>
          <div><small>チーム全体の達成率</small><b>{rate(total.actual, total.target)}</b></div>
          <div><small>のべ稼働日</small><b>{total.days}日</b></div>
        </div>
        <div className="ps-tools">
          <button className="fchip" onClick={() => setAll(true)}>すべて開く</button>
          <button className="fchip" onClick={() => setAll(false)}>すべて閉じる</button>
        </div>
        {groups.map((g) => (
          <div className="ps-group" key={g.pos || 'none'}>
            <div className="ps-ghead">{g.label}<span>{g.list.length}人</span><i /></div>
            {g.list.map((p) => {
              const on = !!open[p.key];
              return (
                <div className="ps-card" key={p.key}>
                  <button className="ps-row" aria-expanded={on} onClick={(e) => keepPlace(e.currentTarget, () => setOpen({ ...open, [p.key]: !on }))}>
                    <span className="ps-name">
                      <b>{p.name}</b>
                      <span className="ps-bds">{p.position && <span className="ps-bd pos">{p.position}</span>}{p.grade && <span className="ps-bd gr">等級{p.grade}</span>}</span>
                    </span>
                    <span className="ps-nums">
                      <span>実績<b className="or">{p.actual}</b></span>
                      <span>達成率<b>{rate(p.actual, p.target)}</b></span>
                      <span>稼働<b>{p.days}日</b></span>
                    </span>
                    <span className="ps-arw" aria-hidden="true">{on ? '▲' : '▼'}</span>
                  </button>
                  {on && (
                    <div className="ps-det">
                      {p.seats > 0 && <div className="ts" style={{ marginBottom: 4 }}>キャッチャーとしての着座 {p.seats}組</div>}
                      {p.rows.length ? (
                        <table className="np-tbl">
                          <thead><tr><th>日付</th><th>店舗</th><th>役割</th><th>実績/目標</th></tr></thead>
                          <tbody>
                            {p.rows.map((x, i) => <tr key={i}><td>{md(x.date)}</td><td style={{ textAlign: 'left' }}>{x.store}</td><td>{x.role}</td><td><b>{x.actual}</b>{x.target ? `/${x.target}` : ''}</td></tr>)}
                          </tbody>
                        </table>
                      ) : <div className="ts" style={{ textAlign: 'center', padding: 8 }}>この月の実績はありません</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {!loading && !groups.length && <div className="empty">メンバーがいません</div>}
      </div>
    </Layout>
  );
}
