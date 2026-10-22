import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFrames, calcDay, calcFrame, dayFilled, md, CHANNELS, directorsOf } from '../lib/frames';
import MonthNav, { useMonth, inMonth } from '../components/MonthNav';

// 日報確認：日報枠ごとのカード（月で切り替え、販路で絞り込み）
// pick=true のときは「日報の追加」の選択画面（押すとその枠に追記）
export default function FrameList({ pick }) {
  const navigate = useNavigate();
  const { canEditReport } = useAuth();
  const { frames, loading } = useFrames();
  const [month, setMonth] = useMonth();
  const [chan, setChan] = useState('');
  const list = useMemo(() => frames.filter((f) => f.days.some((d) => inMonth(d.date, month)) && (!chan || f.channel === chan)), [frames, month, chan]);

  return (
    <Layout title={pick ? '追記する日報を選択' : '日報確認'}>
      <div className="np-wrap">
        {pick && <div className="ts" style={{ marginBottom: 10 }}>追記する日報を選んでください。まだ入力していない日が開きます（全部入力済みなら、最後の日の翌日を追加します）。</div>}
        <MonthNav month={month} onChange={setMonth} />
        <div className="filter-bar">
          <button className={`fchip ${!chan ? 'active' : ''}`} onClick={() => setChan('')}>すべての販路</button>
          {CHANNELS.map((c) => <button key={c} className={`fchip ${chan === c ? 'active' : ''}`} onClick={() => setChan(c)}>{c}</button>)}
        </div>
        {loading && <div className="empty">読み込み中…</div>}
        {!loading && list.length === 0 && <div className="empty">この月の日報はありません</div>}
        <div className="pc-grid-2col">
          {list.map((f) => {
            const t = calcFrame(f), ta = +f.ta || 0, rate = ta ? Math.round((t.s / ta) * 100) : 0;
            const missing = f.days.filter((d) => !dayFilled(d)).length;
            const editable = canEditReport(f);
            return (
              <div className="card np-frame" key={f.id}>
                <div className="np-frame-top">
                  <span className="badge b-blue">{f.days.length > 1 ? `${md(f.start)}〜${md(f.end)}` : md(f.start)}</span>
                  <span className="ts">{f.channel}・{f.days.length}日間</span>
                  <span className={`np-frame-state ${missing ? 'warn' : ''}`}>{missing ? `未入力 ${missing}日` : '入力済み'}</span>
                </div>
                <div className="np-frame-store">{f.store}{directorsOf(f) && <span className="np-dir">{directorsOf(f)}</span>}</div>
                <div className="np-frame-sum">総販/リク抜き<b>{t.s}/{t.r}</b>目標 {f.ta || 0}/{f.tb || 0}{ta > 0 && <strong>達成率 {rate}%</strong>}</div>
                <div className="np-bar"><i style={{ width: `${Math.min(rate, 100)}%` }} /></div>
                <div className="np-frame-days">
                  {f.days.map((d) => {
                    const c = calcDay(d);
                    return (
                      <button key={d.date} className="np-frame-day" onClick={() => navigate(`/frames/${f.id}?date=${d.date}`)}>
                        <b>{md(d.date)}</b><span>{d.director || '－'}</span><em className={dayFilled(d) ? '' : 'miss'}>{dayFilled(d) ? `${c.souhan}/${c.riku}` : '未入力'}</em>
                      </button>
                    );
                  })}
                </div>
                <div className="np-frame-btns">
                  {pick ? (
                    <button className="btn btn-p" disabled={!editable} onClick={() => navigate(`/report/frame/${f.id}?append=1`)}>{editable ? 'この日報に追記する' : '編集の権限がありません'}</button>
                  ) : (<>
                    <button className="btn btn-gray" onClick={() => navigate(`/frames/${f.id}`)}>詳細・テキスト</button>
                    {editable && <button className="btn btn-outline" onClick={() => navigate(`/report/frame/${f.id}?append=1`)}>この枠に追記</button>}
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
