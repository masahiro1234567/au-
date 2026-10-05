import { ManualButton } from '../manual/Manual.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OS_LIST, MARK_O, MARK_X, getDeviceData, seriesOf } from '../devices.js';

// ○×の見た目（○＝青、×＝グレー、未設定＝「－」）
function Mark({ v, big }) {
  if (v === MARK_O) return <span className={`kc-mark kc-o ${big ? 'big' : ''}`}>○</span>;
  if (v === MARK_X) return <span className={`kc-mark kc-x ${big ? 'big' : ''}`}>×</span>;
  if (!v) return <span className="kc-mark kc-none">－</span>;
  return <span className="kc-text">{v}</span>;
}

function BackBar({ title, onBack }) {
  return (
    <div className="kc-subbar">
      <button className="kc-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        一覧表
      </button>
      <div className="kc-subbar-title">{title}</div>
    </div>
  );
}

// 表の枠内スクロール：かなりまっすぐ縦か横に動かしたときだけ、その向きに固定する（斜めは自由）。
// 固定するのは指が触れている間だけで、指を離したあとの惰性スクロールは自由に滑らせる
function useAxisLock() {
  const ref = useRef(null);
  const st = useRef({ x: 0, y: 0, left: 0, top: 0, axis: null, touching: false });
  const onTouchStart = (e) => {
    const t = e.touches[0];
    const el = ref.current;
    st.current = { x: t.clientX, y: t.clientY, left: el.scrollLeft, top: el.scrollTop, axis: null, touching: true };
  };
  const onTouchMove = (e) => {
    const s = st.current;
    if (s.axis) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - s.x), dy = Math.abs(t.clientY - s.y);
    if (dx + dy < 12) return;
    if (dx > dy * 3) s.axis = 'x';
    else if (dy > dx * 3) s.axis = 'y';
    else s.axis = 'free';
  };
  const onTouchEnd = () => { st.current.touching = false; };
  const onScroll = () => {
    const el = ref.current, s = st.current;
    if (!s.touching) return;
    if (s.axis === 'x' && el.scrollTop !== s.top) el.scrollTop = s.top;
    if (s.axis === 'y' && el.scrollLeft !== s.left) el.scrollLeft = s.left;
  };
  return { ref, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd, onScroll };
}

// 機種比較画面：一覧表をベースに、「2機種を比較」「条件で絞り込み」を切り替えて表示する
export default function DeviceCompare({ devices, onBack }) {
  const [os, setOs] = useState('ios');
  const [view, setView] = useState('table'); // 'table' | 'compare' | 'filter'
  const [series, setSeries] = useState('all');
  const [cond, setCond] = useState([]); // 絞り込み条件（○×項目のid）
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [only, setOnly] = useState(false);

  const { features, models } = useMemo(() => getDeviceData(devices, os), [devices, os]);
  const markFeatures = features.filter((f) => f.type === 'mark');
  const seriesList = seriesOf(models);

  // OSを切り替えたら条件をリセットし、比較の初期値を決め直す
  useEffect(() => { setSeries('all'); setCond([]); setA(''); setB(''); }, [os]);
  const modelA = models.find((m) => m.id === a) || models[1] || models[0];
  const modelB = models.find((m) => m.id === b) || models[0];

  const matchCond = (m) => cond.every((fid) => m.values[fid] === MARK_O);
  const tableModels = models.filter((m) => (series === 'all' || m.series === series) && matchCond(m));
  const hits = models.filter(matchCond);

  const toggleCond = (fid) => setCond((c) => (c.includes(fid) ? c.filter((x) => x !== fid) : [...c, fid]));
  const openCompareWith = (m) => {
    setB(m.id);
    if (modelA && modelA.id === m.id) {
      const other = models.find((x) => x.id !== m.id);
      if (other) setA(other.id);
    }
    setView('compare');
  };

  const cmpRows = features.map((f) => {
    const va = modelA?.values[f.id] || '';
    const vb = modelB?.values[f.id] || '';
    return { f, va, vb, diff: va !== vb };
  });
  const diffCount = cmpRows.filter((r) => r.diff).length;

  const empty = !features.length || !models.length;
  const axisLock = useAxisLock();

  return (
    <div className="page">
      <header className="hdr">
        <div className="logo">
          <div className="logo-mark">au</div>
          <h1>機種比較</h1>
        </div>
        <div className="hdr-right"><button className="btn-back" onClick={onBack}>← ホーム</button><ManualButton screen="devices" /></div>
      </header>

      {view === 'table' && (
        <div className="kc-body">
          <div className="kc-top">
            <div className="kc-seg">
              {OS_LIST.map((o) => (
                <button key={o.id} className={os === o.id ? 'on' : ''} onClick={() => setOs(o.id)}>{o.label}</button>
              ))}
            </div>

            {!empty && (
              <>
                <div className="kc-actions">
                  <button className="kc-action" onClick={() => setView('compare')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    2機種を比較
                  </button>
                  <button className="kc-action" onClick={() => setView('filter')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    条件で絞り込み
                    {cond.length > 0 && <span className="kc-badge">{cond.length}</span>}
                  </button>
                </div>

                {cond.length > 0 && (
                  <div className="kc-conds">
                    条件：
                    {cond.map((fid) => (
                      <button key={fid} className="kc-cond" onClick={() => toggleCond(fid)}>
                        {features.find((f) => f.id === fid)?.name} ×
                      </button>
                    ))}
                  </div>
                )}

                {seriesList.length > 1 && (
                  <div className="kc-chips">
                    {['all', ...seriesList].map((s) => (
                      <button key={s} className={`kc-chip ${series === s ? 'on' : ''}`} onClick={() => setSeries(s)}>
                        {s === 'all' ? 'すべて' : s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="kc-meta">
                  <span>{tableModels.length}機種（横にスクロール・機種名タップで比較）</span>
                  <span className="kc-legend"><span><b className="kc-o">○</b> できる</span><span><b className="kc-x">×</b> できない</span></span>
                </div>
              </>
            )}
          </div>

          {empty ? (
            <div className="kc-empty">この機種のデータはまだ登録されていません。管理画面の「機種比較」タブから追加できます。</div>
          ) : (
            <div className="kc-table-wrap" {...axisLock}>
              <table className="kc-table">
                <thead>
                  <tr>
                    <th className="kc-th-corner">機能</th>
                    {tableModels.map((m) => (
                      <th key={m.id} className="kc-th-model">
                        <button onClick={() => openCompareWith(m)} aria-label={`${m.name}を乗り換え先にして比較`}>
                          <span className="kc-model-name">{m.name}</span>
                          <span className="kc-model-year">{m.year ? `${m.year}年` : ''}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => {
                    const hl = cond.includes(f.id);
                    return (
                      <tr key={f.id} className={hl ? 'hl' : ''}>
                        <td className="kc-td-label">{f.name}</td>
                        {tableModels.map((m) => <td key={m.id} className="kc-td"><Mark v={m.values[f.id]} /></td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tableModels.length === 0 && <div className="kc-empty">条件に合う機種がありません</div>}
            </div>
          )}
        </div>
      )}

      {view === 'compare' && (
        <div className="kc-body">
          <BackBar title="2機種を比較" onBack={() => setView('table')} />
          <div className="kc-scroll">
            <div className="kc-narrow">
              <div className="kc-pick">
                <label>
                  今の機種
                  <select value={modelA?.id || ''} onChange={(e) => setA(e.target.value)}>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
                <svg className="kc-pick-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <label>
                  乗り換え先
                  <select className="to" value={modelB?.id || ''} onChange={(e) => setB(e.target.value)}>
                    {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              </div>

              <div className="kc-cmp-head">
                <div>違い <b>{diffCount}</b> 項目</div>
                <button className={`kc-chip ${only ? 'on' : ''}`} onClick={() => setOnly((v) => !v)}>違いだけ表示</button>
              </div>

              <div className="kc-cmp">
                <div className="kc-cmp-row head">
                  <div>{modelA?.name}</div>
                  <div>機能</div>
                  <div className="to">{modelB?.name}</div>
                </div>
                {cmpRows.filter((r) => !only || r.diff).map((r) => (
                  <div key={r.f.id} className={`kc-cmp-row ${r.diff ? 'diff' : ''}`}>
                    <div><Mark v={r.va} big /></div>
                    <div className="kc-cmp-label">{r.f.name}</div>
                    <div><Mark v={r.vb} big /></div>
                  </div>
                ))}
              </div>
              <div className="kc-note">色付きの行が2機種で違うところです。</div>
            </div>
          </div>
        </div>
      )}

      {view === 'filter' && (
        <div className="kc-body">
          <BackBar title="条件で絞り込み" onBack={() => setView('table')} />
          <div className="kc-top">
            <div className="kc-sub">できることを選ぶ（複数選べます）</div>
            <div className="kc-chips wrap">
              {markFeatures.map((f) => (
                <button key={f.id} className={`kc-chip ${cond.includes(f.id) ? 'on' : ''}`} onClick={() => toggleCond(f.id)}>{f.name}</button>
              ))}
            </div>
            <div className="kc-cmp-head">
              <div><b>{hits.length}</b> 機種</div>
              <button className="kc-link" onClick={() => setCond([])}>条件をクリア</button>
            </div>
          </div>
          <div className="kc-scroll">
            <div className="kc-cards">
              {hits.map((m) => (
                <div key={m.id} className="kc-card">
                  <div className="kc-card-head">
                    <span className="kc-card-name">{m.name}</span>
                    {m.series && <span className="kc-card-series">{m.series}</span>}
                    {m.year && <span className="kc-card-year">{m.year}年</span>}
                  </div>
                  <div className="kc-card-marks">
                    {markFeatures.map((f) => {
                      const v = m.values[f.id];
                      return (
                        <span key={f.id} className={`kc-tag ${v === MARK_O ? 'o' : v === MARK_X ? 'x' : 'none'}`}>
                          <b>{v === MARK_O ? '○' : v === MARK_X ? '×' : '－'}</b> {f.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {hits.length === 0 && <div className="kc-empty">条件に合う機種がありません</div>}
            </div>
          </div>
          <div className="kc-footer">
            <button className="kc-primary" onClick={() => setView('table')}>この条件で一覧表を見る（{hits.length}機種）</button>
          </div>
        </div>
      )}
    </div>
  );
}
