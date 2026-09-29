import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFrames, calcDay, dayFilled, md } from '../lib/frames';
import MonthNav, { useMonth, inMonth } from '../components/MonthNav';

// 個人実績（月）：日報枠の中で、その日のディレクター（記入者）として入っている日の実績を集計
export default function Personal() {
  const { user } = useAuth();
  const { frames, loading } = useFrames();
  const [month, setMonth] = useMonth();
  const [person, setPerson] = useState(user?.name || '');
  const people = useMemo(() => [...new Set(frames.flatMap((f) => f.days.map((d) => d.director)).filter(Boolean))].sort(), [frames]);
  const rows = useMemo(() => frames.flatMap((f) => f.days.filter((d) => inMonth(d.date, month) && d.director === person && dayFilled(d)).map((d) => ({ d, f, c: calcDay(d) })))
    .sort((a, b) => (a.d.date > b.d.date ? 1 : -1)), [frames, month, person]);
  const tot = rows.reduce((a, x) => ({ s: a.s + x.c.souhan, r: a.r + x.c.riku }), { s: 0, r: 0 });
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
          <div><small>総販</small><b style={{ color: 'var(--pd)' }}>{tot.s}</b></div>
          <div><small>リク抜き</small><b>{tot.r}</b></div>
          <div><small>稼働日</small><b>{rows.length}日</b></div>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="np-tbl">
            <thead><tr><th>日付</th><th>店舗</th><th>総販/リク抜き</th></tr></thead>
            <tbody>
              {rows.map(({ d, f, c }) => <tr key={f.id + d.date}><td>{md(d.date)}</td><td style={{ textAlign: 'left' }}>{f.store}</td><td><b>{c.souhan}/{c.riku}</b></td></tr>)}
              {!rows.length && <tr><td colSpan={3} className="ts" style={{ textAlign: 'center' }}>この月の実績はありません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
