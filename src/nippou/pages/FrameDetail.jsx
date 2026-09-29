import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ref, remove, update } from 'firebase/database';
import { db } from '../lib/firebase';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFrames, buildText, md, dayFilled } from '../lib/frames';

// 日報詳細：日ごとのテキスト（コピー・編集）
export default function FrameDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { canEditReport, isAdmin } = useAuth();
  const showToast = useToast();
  const { frames, loading } = useFrames();
  const f = frames.find((x) => x.id === id);
  const [date, setDate] = useState(sp.get('date') || '');
  if (!f) return <Layout title="日報詳細"><div className="empty">{loading ? '読み込み中…' : '日報が見つかりません'}</div></Layout>;
  const cur = f.days.find((d) => d.date === date) || [...f.days].reverse().find(dayFilled) || f.days[0];
  const text = buildText(f, cur.date);
  const editable = canEditReport(f);
  const del = async () => {
    if (!window.confirm || !window.confirm('この日報枠を削除します。この操作は戻せません。')) return;
    if (f.legacy) { const up = {}; f.legacyIds.forEach((lid) => { up[`fp_reports/${lid}`] = null; }); await update(ref(db), up); }
    else await remove(ref(db, `fp_frames/${f.id}`));
    showToast('削除しました');
    navigate(-1);
  };
  return (
    <Layout title="日報詳細" footer={<>
      <button className="btn btn-outline" onClick={() => { navigator.clipboard?.writeText(text); showToast('日報テキストをコピーしました'); }}>コピー</button>
      {editable && <button className="btn btn-p" style={{ marginTop: 0 }} onClick={() => navigate(`/report/frame/${f.id}?date=${cur.date}`)}>編集する</button>}</>}>
      <div className="np-wrap">
        <div className="np-frame-store" style={{ marginBottom: 4 }}>{f.store}</div>
        <div className="ts" style={{ marginBottom: 8 }}>{md(f.start)}〜{md(f.end)}・{f.channel}</div>
        <div className="filter-bar">
          {f.days.map((d) => <button key={d.date} className={`fchip ${d.date === cur.date ? 'active' : ''}`} onClick={() => setDate(d.date)}>{md(d.date)}{dayFilled(d) ? '' : '・未入力'}</button>)}
        </div>
        <pre className="np-pre">{text}</pre>
        {isAdmin && <button className="btn btn-gray" style={{ marginTop: 12, color: 'var(--red)' }} onClick={del}>この日報枠を削除（管理者）</button>}
      </div>
    </Layout>
  );
}
