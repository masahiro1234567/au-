import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseList } from '../lib/useFirebaseList';
import { useFrames, md } from '../lib/frames';
import { getSavedResult, kpiMembers } from '../lib/kpiLink';
import MonthNav, { useMonth, inMonth } from '../components/MonthNav';

// 個人実績（月）：ディレクターが日報のあとに入れた「メンバーの実績」を、その人ごとに集計
// KPIがある日は KPI の実績（fp_kpi_results）、KPIが無い日は日報に入れた実績（memberResults）を使う
export default function Personal() {
  const { user } = useAuth();
  const { frames, loading } = useFrames();
  const { data: kpiData } = useFirebaseList('fp_kpi');
  const { data: kpiResults } = useFirebaseList('fp_kpi_results');
  const [month, setMonth] = useMonth();
  const [person, setPerson] = useState(user?.name || '');

  const all = useMemo(() => {
    const out = [];
    const covered = new Set();
    Object.entries(kpiData || {}).forEach(([kid, k]) => (k.dates || []).forEach((dt) => kpiMembers(k, dt).forEach((m, mi) => {
      if (!m.member || m.member === '他社') return;
      const r = getSavedResult(kpiResults, kid, dt, mi, m.member, m.role);
      if (!r) return;
      out.push({ date: dt, store: k.store, name: m.member, role: m.role, target: +m.target || 0, actual: +r.actual || 0 });
      covered.add(`${dt}|${m.member}`);
    })));
    frames.forEach((f) => Object.entries(f.memberResults || {}).forEach(([dt, rows]) => (rows || []).forEach((r) => {
      if (!r || r.other || !r.member || covered.has(`${dt}|${r.member}`)) return;
      out.push({ date: dt, store: f.store, name: r.member, role: r.role, target: 0, actual: +r.actual || 0 });
    })));
    return out;
  }, [kpiData, kpiResults, frames]);

  const people = useMemo(() => [...new Set(all.map((x) => x.name))].sort(), [all]);
  const rows = all.filter((x) => x.name === person && inMonth(x.date, month)).sort((a, b) => (a.date > b.date ? 1 : -1));
  const sales = rows.filter((x) => x.role !== 'キャッチャー');
  const seats = rows.filter((x) => x.role === 'キャッチャー');
  const sum = (l, k) => l.reduce((a, x) => a + x[k], 0);
  const tgt = sum(sales, 'target');

  return (
    <Layout title="個人実績">
      <div className="np-wrap">
        <MonthNav month={month} onChange={setMonth} />
        <label className="form-group"><span>メンバー</span>
          <select className="inp" value={person} onChange={(e) => setPerson(e.target.value)}>
            {!people.includes(person) && person && <option value={person}>{person}</option>}
            {people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        {loading && <div className="empty">読み込み中…</div>}
        <div className="np-res">
          <div><small>実績件数</small><b style={{ color: 'var(--pd)' }}>{sum(sales, 'actual')}</b></div>
          <div><small>達成率</small><b>{tgt ? Math.round((sum(sales, 'actual') / tgt) * 100) + '%' : '-'}</b></div>
          <div><small>稼働日</small><b>{new Set(rows.map((x) => x.date)).size}日</b></div>
        </div>
        {seats.length > 0 && <div className="ts" style={{ marginBottom: 8 }}>キャッチャーとしての着座件数：{sum(seats, 'actual')}件</div>}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="np-tbl">
            <thead><tr><th>日付</th><th>店舗</th><th>役割</th><th>実績/目標</th></tr></thead>
            <tbody>
              {rows.map((x, i) => <tr key={i}><td>{md(x.date)}</td><td style={{ textAlign: 'left' }}>{x.store}</td><td>{x.role}</td><td><b>{x.actual}</b>{x.target ? `/${x.target}` : ''}</td></tr>)}
              {!rows.length && <tr><td colSpan={4} className="ts" style={{ textAlign: 'center' }}>この月の実績はありません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
