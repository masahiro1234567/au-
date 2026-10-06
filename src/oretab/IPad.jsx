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
    <svg className="ip-wall" viewBox="0 0 1024 768" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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
const GB = { ...G, stroke: '#2b6fd6' };
// 実機のホーム画面と同じ並び（アイコンはオリジナルの線画）
const APPS = [
  ['ファイル', '#eef2f8', <path d="M8 15h12l3 4h17v17H8z" {...GB} />],
  ['マップ', '#6fbf6a', <path d="M24 8l9 28-9-6-9 6z" {...G} />],
  ['ホーム', '#f4f1ee', <path d="M8 24l16-14 16 14M13 20v18h22V20" fill="none" stroke="#f08a2c" strokeWidth="2.6" strokeLinejoin="round" />],
  ['App Store', '#1f86f0', <path d="M17 34l12-22M31 34L19 12M13 28h22" {...G} />],
  ['ブック', '#f28a1c', <path d="M8 12h12a4 4 0 014 4v20a4 4 0 00-4-4H8zM40 12H28a4 4 0 00-4 4v20a4 4 0 014-4h12z" {...G} />],
  ['ポッドキャスト', '#9a4fe0', <><circle cx="24" cy="20" r="4" {...G} /><path d="M24 26v12M14 30a13 13 0 1120 0" {...G} /></>],
  ['設定', '#8e9097', <><circle cx="24" cy="24" r="7" {...G} /><path d="M24 8v6M24 34v6M8 24h6M34 24h6M13 13l4 4M31 31l4 4M13 35l4-4M31 17l4-4" {...G} /></>, 1],
  ['Orangeポータル', 'oretab'],
  ['USB連携用フォルダ', 'usb'],
  ['簡単復旧', '#2fae4e', <><text x="24" y="21" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">i-Filter</text><text x="24" y="34" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="700">再取得</text></>],
  ['install.iFilter', '#f4f6f8', <><rect x="14" y="8" width="20" height="28" rx="2" fill="none" stroke="#2fae4e" strokeWidth="2" /><path d="M18 16h12M18 21h12M18 26h8" stroke="#2fae4e" strokeWidth="2" /></>],
];
const DOCK = [
  ['メッセージ', '#3fc457', <path d="M10 22c0-7 6-12 14-12s14 5 14 12-6 12-14 12c-2 0-4 0-6-1l-7 3 2-6c-2-2-3-5-3-8z" fill="#fff" />],
  ['ミュージック', '#f2384a', <><path d="M20 34V14l14-4v20" {...G} /><circle cx="17" cy="34" r="3.5" {...G} /><circle cx="31" cy="30" r="3.5" {...G} /></>],
  ['メール', '#2a8cf0', <><rect x="8" y="13" width="32" height="22" rx="3" {...G} /><path d="M8 15l16 12 16-12" {...G} /></>],
  ['カレンダー', '#fff', 'cal'],
  ['メモ', '#fff8dc', <><path d="M8 14h32" stroke="#f2c200" strokeWidth="5" /><path d="M12 24h24M12 30h24M12 36h16" stroke="#c9c9c9" strokeWidth="1.5" /></>],
  null,
  ['USB連携用フォルダ', 'usb'],
  ['プリント', '#1f6fb8', <><rect x="10" y="10" width="28" height="18" rx="2" {...G} /><rect x="16" y="22" width="16" height="14" rx="1" fill="#1f6fb8" stroke="#fff" strokeWidth="2.2" /></>],
  ['Orangeポータル', 'oretab'],
  ['ブラウザ', 'browser'],
];
export const UsbIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill="#f6f2f0" />
    <rect x="16" y="20" width="68" height="60" rx="8" fill="none" stroke="#d2441b" strokeWidth="4.5" />
    <path d="M16 35h68M30 48h18l4 6h18v16H30z" fill="none" stroke="#d2441b" strokeWidth="4" strokeLinejoin="round" />
    <circle cx="64" cy="64" r="8" fill="#fff" stroke="#d2441b" strokeWidth="3.5" />
  </svg>
);
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
  const icon = (a, size) => {
    const [n, col, g, badge] = a;
    const r = Math.round(size * 0.23);
    const inner = col === 'oretab' ? <span className="ip-ico" style={{ width: size, height: size, borderRadius: r }}><OreTabIcon /></span>
      : col === 'usb' ? <span className="ip-ico" style={{ width: size, height: size, borderRadius: r }}><UsbIcon /></span>
      : col === 'browser' ? <span className="ip-ico" style={{ width: size, height: size, borderRadius: r }}><BrowserIcon /></span>
        : g === 'cal' ? (
          <span className="ip-ico" style={{ width: size, height: size, borderRadius: r, background: col, flexDirection: 'column', color: '#222' }}>
            <span style={{ fontSize: size * 0.18, color: '#e53935', lineHeight: 1 }}>{DOWS[new Date().getDay()]}</span>
            <span style={{ fontSize: size * 0.42, lineHeight: 1.05 }}>{new Date().getDate()}</span>
          </span>)
          : <AppGlyph color={col} size={size}>{g}</AppGlyph>;
    return <span style={{ position: 'relative', display: 'inline-flex' }}>{inner}{badge && <span className="ip-badge">{badge}</span>}</span>;
  };
  const tap = (a) => (a[1] === 'oretab' ? onOpenOreTab : a[1] === 'browser' ? onOpenBrowser : no);
  return (
    <div className="ip-screen ip-home">
      <div className="ip-home-time">{c.time}</div>
      <div className="ip-home-top">
        <button onClick={onLock}>ロック画面に戻す</button>
        <button onClick={onExit}>練習を終える</button>
      </div>
      <div className="ip-grid">
        {APPS.map((a) => (
          <button key={a[0]} className="ip-app" onClick={tap(a)}>{icon(a, 76)}<span>{a[0]}</span></button>
        ))}
      </div>
      <div className="ip-pages"><span className="on" /><span /></div>
      <div className="ip-dock">
        {DOCK.map((a, i) => (a ? (
          <button key={i} className="ip-dockapp" onClick={tap(a)} aria-label={a[0]}>{icon(a, 64)}</button>
        ) : <span key={i} className="ip-dock-sep" />))}
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
  const [fwd, setFwd] = useState(''); // ◀で戻ったページ（▶で開き直す）
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
      <div className="ip-b-bar">
        <button className="ip-b-round" onClick={() => { if (page) { setFwd(page); setPage(''); setMenu(''); } }} aria-label="戻る" disabled={!page}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4L6 12l11 8z" fill="#9aa4b4" /></svg></button>
        <button className="ip-b-round" onClick={() => { if (!page && fwd) { setPage(fwd); setFwd(''); setMenu(''); } }} aria-label="進む" disabled={!!page || !fwd}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l11 8-11 8z" fill="#9aa4b4" /></svg></button>
        <button className="ip-b-sq" onClick={() => { if (page) { setFwd(page); setPage(''); } setMenu(''); }} aria-label="ホーム"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12l9-8 9 8M6 10v10h12V10" fill="none" stroke="#9cc3f0" strokeWidth="2" strokeLinejoin="round" /></svg></button>
        <button className={`ip-b-sq ${menu === 'share' ? 'on' : ''}`} onClick={() => setMenu(menu === 'share' ? '' : 'share')} aria-label="共有"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19c0-6 4-9 10-9V6l6 6-6 6v-4c-4 0-7 1-10 5z" fill="#9cc3f0" /></svg></button>
        <button className={`ip-b-sq ${menu === 'bm' ? 'on' : ''}`} onClick={() => setMenu(menu === 'bm' ? '' : 'bm')} aria-label="ブックマーク"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h7a2 2 0 012 2v13a2 2 0 00-2-2H3zM21 5h-7a2 2 0 00-2 2v13a2 2 0 012-2h7z" fill="none" stroke="#9cc3f0" strokeWidth="1.8" /></svg></button>
        <button className="ip-b-sq" onClick={() => say('練習用では使えません')} aria-label="タブ一覧"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3" fill="none" stroke="#9cc3f0" strokeWidth="1.6" /><rect x="7" y="7" width="14" height="14" rx="3" fill="#2a2a30" stroke="#9cc3f0" strokeWidth="1.6" /><text x="14" y="17.5" fontSize="9" textAnchor="middle" fill="#9cc3f0">1</text></svg></button>
        <div className="ip-b-url"><span className="ot-ellipsis" style={{ flex: 1 }}>{page ? 'Web版お支払い目安額' : 'about:blank'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" /></svg></div>
        <button className="ip-b-x" onClick={onClose} aria-label="ブラウザを閉じる"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg></button>
        {menu === 'bm' && (
          <div className="ip-b-menu" style={{ left: 250, width: 300 }}>
            <div className="ip-b-menu-h">ブックマーク</div>
            <button className="ip-b-group" onClick={() => setBmGroup(!bmGroup)}><Bi k="folder" s={20} /><span>配信されたブックマーク</span><em>{bmGroup ? '▲' : '▼'}</em></button>
            {bmGroup && <button className="ip-b-link" onClick={() => { setPage('webpay'); setFwd(''); setMenu(''); }}><Bi k="book" s={18} />Web版お支払い目安額</button>}
          </div>
        )}
        {menu === 'share' && (
          <div className="ip-b-menu" style={{ left: 196, width: 220 }}>
            <button className="ip-b-item" onClick={() => { setMenu(''); if (!page) return say('先にブックマークからページを開いてください'); setPrint(true); }}><Bi k="print" s={20} />プリント</button>
          </div>
        )}
      </div>
      <div className="ip-b-body" onClick={() => menu && setMenu('')}>
        {!page && <div className="ip-b-blank" />}
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
                  <button className="ip-print-arw" onClick={() => so({ scale: Math.max(opt.scale - 1, 50) })} aria-label="縮尺を下げる">◀</button>
                  <b className="ip-print-scale">{opt.scale}%</b>
                  <button className="ip-print-arw" onClick={() => so({ scale: Math.min(opt.scale + 1, 150) })} aria-label="縮尺を上げる">▶</button></div>
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
