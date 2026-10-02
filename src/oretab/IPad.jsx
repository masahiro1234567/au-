import React, { useEffect, useRef, useState } from 'react';
import Payment, { WEB_PAY_H } from './Payment.jsx';

// ===== iPadの起動シミュレーション：ロック画面 → パスコード → ホーム画面 → オレタブ／ブラウザ =====
const DOWS = ['日', '月', '火', '水', '木', '金', '土'];
const PASS = '0077';
const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  return { date: `${now.getMonth() + 1}月${now.getDate()}日 ${DOWS[now.getDay()]}曜日`, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}` };
};

// 壁紙（オリジナルの抽象柄）
export function Wallpaper() {
  return (
    <svg className="ip-wall" width="1024" height="768" viewBox="0 0 1024 768" aria-hidden="true">
      <rect width="1024" height="768" fill="#1f3c94" />
      <path d="M0 0H760C700 170 640 330 470 440S120 600 0 768Z" fill="#2c7fd6" />
      <path d="M0 768C160 610 330 520 520 470S880 330 1024 120V768Z" fill="#4b36a8" />
      <path d="M0 768C210 640 420 590 620 560S920 470 1024 380V768Z" fill="#2f2582" />
      <path d="M0 470C150 430 300 360 420 250S600 40 640 0H0Z" fill="#3fb6cf" opacity=".85" />
      <path d="M1024 0V300C930 250 860 150 830 0Z" fill="#8fc3f5" opacity=".6" />
      <circle cx="820" cy="600" r="160" fill="#ff8a3d" opacity=".35" />
    </svg>
  );
}

// ---- アイコン ----
export const OreTabIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill="#FF6A00" />
    <circle cx="50" cy="57" r="29" fill="#fff" />
    <path d="M50 30c0-6 2-10 5-13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    <path d="M55 22c6-8 16-9 22-6-4 7-13 11-22 6z" fill="#fff" />
    <ellipse cx="50" cy="31" rx="5" ry="3" fill="#FF6A00" />
    {[[42, 48], [57, 46], [50, 58], [63, 58], [38, 62], [46, 70], [60, 71]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="2.2" fill="#FF6A00" />)}
  </svg>
);
export const BrowserIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill="#1E74C2" />
    <circle cx="50" cy="50" r="34" fill="#EAF2FB" stroke="#fff" strokeWidth="6" />
    <circle cx="50" cy="32" r="6.5" fill="#1E74C2" />
    <path d="M42 43h13v24h5v6H40v-6h5V49h-3z" fill="#1E74C2" />
  </svg>
);
const G = { fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const APPS = [
  ['設定', '#6b7280', <><circle cx="24" cy="24" r="7" {...G} /><path d="M24 9v5M24 34v5M9 24h5M34 24h5M13.4 13.4l3.5 3.5M31.1 31.1l3.5 3.5M13.4 34.6l3.5-3.5M31.1 16.9l3.5-3.5" {...G} /></>],
  ['カメラ', '#374151', <><rect x="9" y="15" width="30" height="21" rx="4" {...G} /><circle cx="24" cy="25.5" r="6" {...G} /><path d="M18 15l2-4h8l2 4" {...G} /></>],
  ['写真', '#f59e0b', <><rect x="10" y="12" width="28" height="24" rx="3" {...G} /><path d="M10 31l8-8 6 6 5-5 9 9" {...G} /><circle cx="31" cy="19" r="2.5" {...G} /></>],
  ['時計', '#111827', <><circle cx="24" cy="24" r="14" {...G} /><path d="M24 16v9l6 4" {...G} /></>],
  ['ファイル', '#2563eb', <path d="M10 15h11l3 4h14v17H10z" {...G} />],
  ['計算機', '#1f2937', <><rect x="13" y="9" width="22" height="30" rx="3" {...G} /><path d="M17 15h14M18 23h2M24 23h2M18 29h2M24 29h2M30 29v4" {...G} /></>],
  ['天気', '#0ea5e9', <><circle cx="20" cy="20" r="6" {...G} /><path d="M16 34h16a6 6 0 000-12 8 8 0 00-15 3" {...G} /></>],
  ['地図', '#10b981', <><path d="M9 13l10-4 10 4 10-4v26l-10 4-10-4-10 4z" {...G} /><path d="M19 9v26M29 13v26" {...G} /></>],
  ['メール', '#3b82f6', <><rect x="9" y="13" width="30" height="22" rx="3" {...G} /><path d="M9 15l15 11 15-11" {...G} /></>],
  ['連絡先', '#9ca3af', <><circle cx="24" cy="20" r="6" {...G} /><path d="M13 37c1-6 5-9 11-9s10 3 11 9" {...G} /></>],
  ['カレンダー', '#dc2626', <><rect x="10" y="12" width="28" height="25" rx="3" {...G} /><path d="M10 19h28M17 9v6M31 9v6" {...G} /></>],
  ['音楽', '#ef4444', <><path d="M19 33V14l16-4v19" {...G} /><circle cx="16" cy="33" r="3.5" {...G} /><circle cx="32" cy="29" r="3.5" {...G} /></>],
];
const AppGlyph = ({ color, children, size = 76 }) => (
  <span className="ip-ico" style={{ width: size, height: size, borderRadius: size * 0.235, background: color }}>
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 48 48" aria-hidden="true">{children}</svg>
  </span>
);

export function LockScreen({ onUnlock }) {
  const c = useClock();
  return (
    <div className="ip-screen ip-lock">
      <div className="ip-lock-date">{c.date}</div>
      <div className="ip-lock-time">{c.time}</div>
      <button className="ip-lock-open" onClick={onUnlock}>上にスワイプ（タップ）で開く<span /></button>
    </div>
  );
}

export function Passcode({ onOk, onCancel }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const press = (n) => {
    const next = (code + n).slice(0, 4);
    setCode(next); setWrong(false);
    if (next.length === 4) {
      clearTimeout(t.current);
      t.current = setTimeout(() => { if (next === PASS) onOk(); else { setCode(''); setWrong(true); } }, 180);
    }
  };
  return (
    <div className="ip-screen ip-pass">
      <div className="ip-pass-title">{wrong ? 'パスコードが違います' : 'パスコードを入力'}</div>
      <div className="ip-pass-dots">{[0, 1, 2, 3].map((i) => <span key={i} className={i < code.length ? 'on' : ''} />)}</div>
      <div className="ip-pass-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k, i) => (
          <button key={k} onClick={() => press(k)} style={i === 9 ? { gridColumn: 2 } : undefined}>{k}</button>
        ))}
      </div>
      <div className="ip-pass-foot">
        <button onClick={onCancel}>キャンセル</button>
        <button onClick={() => { setCode(code.slice(0, -1)); setWrong(false); }}>削除</button>
      </div>
    </div>
  );
}

export function HomeScreen({ onOpenOreTab, onOpenBrowser, onLock, onExit, say }) {
  const c = useClock();
  const no = () => say('練習用では開けません');
  const dock = [APPS[8], APPS[10], APPS[2], APPS[3]];
  return (
    <div className="ip-screen ip-home">
      <div className="ip-home-time">{c.time}</div>
      <div className="ip-home-top">
        <button onClick={onLock}>ロック画面に戻す</button>
        <button onClick={onExit}>練習を終える</button>
      </div>
      <div className="ip-grid">
        {APPS.map(([n, col, g]) => (
          <button key={n} className="ip-app" onClick={no}><AppGlyph color={col}>{g}</AppGlyph><span>{n}</span></button>
        ))}
      </div>
      <div className="ip-pages"><span className="on" /><span /></div>
      <div className="ip-dock">
        {dock.map(([n, col, g]) => <button key={n} className="ip-dockapp" onClick={no} aria-label={n}><AppGlyph color={col} size={64}>{g}</AppGlyph></button>)}
        <button className="ip-dockapp" onClick={onOpenOreTab} aria-label="オレタブ"><span className="ip-ico" style={{ width: 64, height: 64, borderRadius: 15 }}><OreTabIcon /></span></button>
        <button className="ip-dockapp" onClick={onOpenBrowser} aria-label="ブラウザ"><span className="ip-ico" style={{ width: 64, height: 64, borderRadius: 15 }}><BrowserIcon /></span></button>
      </div>
    </div>
  );
}

// ===== ブラウザ =====
const B = { fill: 'none', stroke: '#1e6fd9', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const BI = {
  book: <path d="M4 5h6a2 2 0 012 2v12a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v12a2 2 0 012-2h6z" {...B} />,
  folder: <path d="M3 7h6l2 2h10v10H3z" {...B} />,
  down: <path d="M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-2M12 3v11M8 10l4 4 4-4" {...B} />,
  share: <path d="M4 19c0-6 4-9 10-9V6l6 6-6 6v-4c-4 0-7 1-10 5z" fill="#1e6fd9" />,
  print: <path d="M7 9V4h10v5M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v6H7z" {...B} />,
};
const Bi = ({ k, s = 24 }) => <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">{BI[k]}</svg>;
const PRINTERS = ['店舗のプリンタ1', '店舗のプリンタ2', '店舗のプリンタ3'];
// 印刷プレビュー：用紙（余白込み）と、中身（Web版お支払い目安額 1024×820）の当てはめ
// 縮尺100%で用紙の横幅いっぱい。横向きは90%以上だと下の部分が2枚目に回る（実際の現場と同じ）
const PAGE = { portrait: { w: 800, h: 1120 }, landscape: { w: 1120, h: 800 } };
const MARGIN = 20, CW = 1024, CH = WEB_PAY_H, PF = 0.2;

export function Browser({ config, onClose, say }) {
  const [page, setPage] = useState('');
  const [menu, setMenu] = useState(''); // bm / share
  const [bmGroup, setBmGroup] = useState(false);
  const [print, setPrint] = useState(false);
  const [opt, setOpt] = useState({ printer: PRINTERS[0], copies: 1, mono: false, paper: 'A4', orient: 'portrait', scale: 100 });
  // Web版お支払い目安額の入力内容（ブラウザを閉じるまで残る。印刷プレビューにも同じ内容を出す）
  const [ests, setEsts] = useState([{}, {}, {}, {}, {}]);
  const [cur, setCur] = useState(0);
  const ctrl = { ests, setEsts, cur, setCur };
  const so = (p) => setOpt((o) => ({ ...o, ...p }));

  const pg = PAGE[opt.orient], iw = pg.w - MARGIN * 2, ih = pg.h - MARGIN * 2;
  const k = (iw / CW) * (opt.scale / 100);
  const n = Math.max(1, Math.ceil((CH * k - 0.5) / ih));

  return (
    <div className="ip-screen ip-browser">
      <div className="ip-b-title"><b>ブラウザ{page ? '　Web版お支払い目安額' : ''}</b>
        <button onClick={onClose} aria-label="ブラウザを閉じる"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg></button>
      </div>
      <div className="ip-b-tools">
        <button className={menu === 'bm' ? 'on' : ''} onClick={() => setMenu(menu === 'bm' ? '' : 'bm')} aria-label="ブックマーク"><Bi k="book" /></button>
        <button onClick={() => say('練習用では使えません')} aria-label="フォルダ"><Bi k="folder" /></button>
        <button onClick={() => say('練習用では使えません')} aria-label="ダウンロード"><Bi k="down" /></button>
        <button className={menu === 'share' ? 'on' : ''} onClick={() => setMenu(menu === 'share' ? '' : 'share')} aria-label="共有"><Bi k="share" /></button>
        {menu === 'bm' && (
          <div className="ip-b-menu" style={{ left: 10, width: 300 }}>
            <div className="ip-b-menu-h">ブックマーク</div>
            <button className="ip-b-group" onClick={() => setBmGroup(!bmGroup)}><Bi k="folder" s={20} /><span>配信されたブックマーク</span><em>{bmGroup ? '▲' : '▼'}</em></button>
            {bmGroup && <button className="ip-b-link" onClick={() => { setPage('webpay'); setMenu(''); }}><Bi k="book" s={18} />Web版お支払い目安額</button>}
          </div>
        )}
        {menu === 'share' && (
          <div className="ip-b-menu" style={{ left: 118, width: 220 }}>
            <button className="ip-b-item" onClick={() => { setMenu(''); if (!page) return say('先にブックマークからページを開いてください'); setPrint(true); }}><Bi k="print" s={20} />プリント</button>
          </div>
        )}
      </div>
      <div className="ip-b-body" onClick={() => menu && setMenu('')}>
        {!page && <div className="ip-b-empty"><Bi k="book" s={40} />左上のブックマークからページを開いてください</div>}
        {page === 'webpay' && <div className="ip-b-page"><Payment web ctrl={ctrl} config={config} /></div>}
      </div>

      {print && (
        <div className="ip-print-ov">
          <div className="ip-print" role="dialog" aria-label="プリントオプション">
            <div className="ip-print-head">
              <button onClick={() => setPrint(false)}>キャンセル</button>
              <b>プリントオプション</b>
              <button className="strong" onClick={() => { setPrint(false); say(`練習用：${opt.printer} に${opt.copies}部（${n}ページ）を送る想定です`); }}>プリント</button>
            </div>
            <div className="ip-print-body">
              <div className="ip-print-grp">
                <label className="ip-print-row">プリンタ<select value={opt.printer} onChange={(e) => so({ printer: e.target.value })}>{PRINTERS.map((p) => <option key={p}>{p}</option>)}</select></label>
                <div className="ip-print-row last">プリセット<span className="ip-print-val">デフォルト設定</span></div>
              </div>
              <div className="ip-print-grp">
                <div className="ip-print-row"><span className="grow">{opt.copies}部</span>
                  <span className="ip-print-stp"><button onClick={() => so({ copies: Math.max(opt.copies - 1, 1) })} aria-label="部数を減らす">−</button><button onClick={() => so({ copies: Math.min(opt.copies + 1, 99) })} aria-label="部数を増やす">＋</button></span></div>
                <label className="ip-print-row"><span className="grow">白黒</span><input type="checkbox" checked={opt.mono} onChange={() => so({ mono: !opt.mono })} /></label>
                <label className="ip-print-row">用紙サイズ<select value={opt.paper} onChange={(e) => so({ paper: e.target.value })}>{['A4', 'B5', 'A3'].map((p) => <option key={p}>{p}</option>)}</select></label>
                <div className="ip-print-row"><span className="grow">方向</span><span className="ip-print-val">{opt.orient === 'portrait' ? '縦向き' : '横向き'}</span>
                  <span className="ip-print-stp">
                    <button className={opt.orient === 'portrait' ? 'on' : ''} onClick={() => so({ orient: 'portrait' })} aria-label="縦向き"><i className="p" /></button>
                    <button className={opt.orient === 'landscape' ? 'on' : ''} onClick={() => so({ orient: 'landscape' })} aria-label="横向き"><i className="l" /></button>
                  </span></div>
                <div className="ip-print-row last"><span className="grow">縮尺</span>
                  <button className="ip-print-arw" onClick={() => so({ scale: Math.max(opt.scale - 5, 50) })} aria-label="縮尺を下げる">◀</button>
                  <b className="ip-print-scale">{opt.scale}%</b>
                  <button className="ip-print-arw" onClick={() => so({ scale: Math.min(opt.scale + 5, 150) })} aria-label="縮尺を上げる">▶</button></div>
              </div>
              <div className="ip-print-grp"><div className="ip-print-row last">メディアと品質<span className="ip-print-val">メディアタイプ自動選択、標準品質</span></div></div>
              <div className="ip-print-pages">
                {Array.from({ length: n }, (_, i) => (
                  <div className="ip-print-page" key={opt.orient + i}>
                    <div className="ip-print-paper" style={{ width: pg.w * PF, height: pg.h * PF, padding: MARGIN * PF }}>
                      <div style={{ width: iw * PF, height: ih * PF, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: -i * ih * PF, width: CW, height: CH, transform: `scale(${k * PF})`, transformOrigin: '0 0', filter: opt.mono ? 'grayscale(1)' : 'none' }}>
                          <Payment web preview ctrl={ctrl} config={config} />
                        </div>
                      </div>
                    </div>
                    <span>{i + 1}/{n}ページ</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
