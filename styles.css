import React from 'react';
import { RANKS, CATEGORIES } from '../utils.js';

export default function Sidebar({
  open, onClose, rank, setRank, cat, setCat, rankCounts, catCounts, totalCount,
  onReset, onGoTest, onAdminLogin,
}) {
  return (
    <>
      <div className={`sb-overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <div className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sb-sec">
          <div className="sb-lbl">ランク</div>
          <div className="rank-btns">
            <button
              className={`rank-btn ${rank === 'all' ? 'active' : ''}`}
              data-rank="all"
              style={{ gridColumn: '1/-1' }}
              onClick={() => setRank('all')}
            >
              すべて <span className="rcnt">{totalCount}</span>
            </button>
            {RANKS.map((r) => (
              <button
                key={r}
                className={`rank-btn ${rank === r ? 'active' : ''}`}
                data-rank={r}
                onClick={() => setRank(r)}
              >
                {r === '秀' ? '🏆' : r === '優' ? '⭐' : r === '良' ? '✅' : '📌'} {r} <span className="rcnt">{rankCounts[r] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sb-sec">
          <div className="sb-lbl">カテゴリ</div>
          <div className="cat-btns">
            <button className={`cat-btn ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
              すべて <span className="ccnt">{totalCount}</span>
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className={`cat-btn ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c} <span className="ccnt">{catCounts[c] || 0}</span>
              </button>
            ))}
          </div>
          <button className="btn-reset" onClick={onReset}>🔄 リセット</button>
        </div>
        <div className="sb-sec">
          <div className="sb-lbl">テスト</div>
          <button className="btn-test" onClick={onGoTest}>📝 テストを受ける</button>
        </div>
        <div className="sb-sec">
          <div className="sb-lbl">管理者</div>
          <button className="btn-test" style={{ borderColor: '#ffb380', color: '#cc4f00' }} onClick={onAdminLogin}>
            🔐 管理者ログイン
          </button>
        </div>
      </div>
    </>
  );
}
