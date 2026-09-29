import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useFrames, calcDay, md } from '../lib/frames';
import MonthNav, { useMonth, inMonth } from '../components/MonthNav';

// 実績確認（月）：月の中に日程がある日報枠を集計。月をまたぐ枠は、その月に入っている日の実績だけ数える
// 平均達成率は目標件数で重み付けした加重平均
export default function Stats() {
  const navigate = useNavigate();
  const { frames, loading } = useFrames();
  const [month, setMonth] = useMonth();
  const rows = useMemo(() => frames.filter((f) => f.days.some((d) => inMonth(d.date, month))).map((f) => {
    const t = f.days.filter((d) => inMonth(d.date, month)).reduce((a, d) => { const c = calcDay(d); return { s: a.s + c.souhan, r: a.r + c.riku }; }, { s: 0, r: 0 });
    return { f, t, ta: +f.ta || 0 };
  }), [frames, month]);
  const byChan = {};
  rows.forEach(({ f, t, ta }) => { const c = (byChan[f.channel || 'その他'] = byChan[f.channel || 'その他'] || { count: 0, s: 0, ta: 0 }); c.count++; c.s += t.s; c.ta += ta; });
  const allS = rows.reduce((a, x) => a + x.t.s, 0), allT = rows.reduce((a, x) => a + x.ta, 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '-');
  return (
    <Layout title="実績確認">
      <div className="np-wrap">
        <MonthNav month={month} onChange={setMonth} />
        {loading && <div className="empty">読み込み中…</div>}
        <div className="np-res">
          <div><small>総販合計</small><b style={{ color: 'var(--pd)' }}>{allS}件</b></div>
          <div><small>現場数</small><b>{rows.length}</b></div>
          <div><small>平均達成率</small><b>{pct(allS, allT)}</b></div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="np-tbl">
            <thead><tr><th>販路</th><th>現場</th><th>総販/目標</th><th>達成率</th></tr></thead>
            <tbody>
              {Object.entries(byChan).map(([ch, c]) => <tr key={ch}><td>{ch}</td><td>{c.count}</td><td>{c.s}/{c.ta}</td><td><b>{pct(c.s, c.ta)}</b></td></tr>)}
              {!rows.length && <tr><td colSpan={4} className="ts" style={{ textAlign: 'center' }}>この月のデータはありません</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card-title" style={{ marginTop: 6 }}>現場ごと（日報枠）</div>
        {rows.map(({ f, t, ta }) => (
          <button key={f.id} className="card np-statrow" onClick={() => navigate(`/frames/${f.id}`)}>
            <div className="np-statrow-top"><b>{f.store}</b><strong>{pct(t.s, ta)}</strong></div>
            <div className="ts">{md(f.start)}〜{md(f.end)}　総販 {t.s}／目標 {ta}</div>
            <div className="np-bar"><i style={{ width: `${Math.min(ta ? (t.s / ta) * 100 : 0, 100)}%` }} /></div>
          </button>
        ))}
      </div>
    </Layout>
  );
}
