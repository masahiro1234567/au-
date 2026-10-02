import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useFrames, calcFrame, md } from '../lib/frames';
import { loadDraft, clearDraft, draftPath, draftLabel } from '../lib/draft';

const MENU = [
  ['/reports', '日報確認', '日報枠ごと・月で確認'],
  ['/stats', '実績確認', '販路・現場ごとの達成率'],
  ['/stores', '店舗特徴', '店舗ごとのメモ'],
  ['/kpi', 'KPI', '現場全体の目標'],
  ['/personal', '個人実績', '自分の獲得件数'],
];

export default function NpHome() {
  const navigate = useNavigate();
  const { isAdmin, onAdmin, user } = useAuth();
  const [draft, setDraft] = useState(() => loadDraft(user?.name));
  const { frames } = useFrames();
  const [sheet, setSheet] = useState(false);
  return (
    <Layout title="日報">
      <div className="np-wrap">
        {draft && (
          <div className="np-draft big">
            <div><b>書きかけの日報があります</b><span>{draftLabel(draft)}</span></div>
            <button className="btn btn-p" onClick={() => navigate(draftPath(draft))}>続きを書く</button>
            <button className="fchip" onClick={() => { clearDraft(); setDraft(null); }}>破棄する</button>
          </div>
        )}
        <button className="btn btn-p np-cta" onClick={() => setSheet(true)}>日報を登録する</button>
        <div className="home-menu-grid">
          {MENU.map(([to, label, desc]) => (
            <button key={to} className="np-tile" onClick={() => navigate(to)}>{label}<small>{desc}</small></button>
          ))}
          <button className="np-tile" onClick={onAdmin}>{isAdmin ? '管理者画面' : '管理者ログイン'}<small>ユーザー・日報・KPIの管理</small></button>
        </div>
        {frames.length > 0 && (
          <div className="card">
            <div className="card-title">最近の日報</div>
            {frames.slice(0, 3).map((f) => { const t = calcFrame(f); return (
              <button key={f.id} className="np-recent" onClick={() => navigate(`/frames/${f.id}`)}><b>{f.store}</b><span>{md(f.start)}〜{md(f.end)}</span><em>{t.s}/{t.r}</em></button>
            ); })}
          </div>
        )}
      </div>
      {sheet && (
        <div className="modal-overlay" onClick={() => setSheet(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="fw8" style={{ fontSize: 16, marginBottom: 12 }}>日報を登録</div>
            <button className="btn btn-p" onClick={() => { setSheet(false); navigate('/report/new'); }}>新規日報<div className="np-sheet-sub">何日〜何日の日報を新しく作る</div></button>
            <button className="btn btn-outline" onClick={() => { setSheet(false); navigate('/report/pick'); }}>日報の追加<div className="np-sheet-sub dark">登録済みの日報を選んで、日程を追記する</div></button>
            <button className="btn btn-gray" onClick={() => setSheet(false)}>キャンセル</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
