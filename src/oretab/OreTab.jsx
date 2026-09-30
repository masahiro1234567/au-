import React, { useEffect, useState } from 'react';
import './ore.css';
import { TopBar, Toast, useToast, StageContext } from './common.jsx';
import Identity from './Identity.jsx';
import Payment from './Payment.jsx';
import AreaSearch from './AreaSearch.jsx';
import DenkiInquiry from './DenkiInquiry.jsx';

const W = 1024, H = 768;
const TITLES = { portal: 'ポータルメニュー', identity: 'お客様照会', payment: 'お支払い目安額', area: 'エリア検索', denki: 'auでんき契約照会' };
const SCREENS = { identity: Identity, payment: Payment, area: AreaSearch, denki: DenkiInquiry };

// ---- 端末サイズに合わせて 1024×768 を縮小。縦持ちなら90度回して横画面で表示 ----
function useStage() {
  const calc = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const portrait = vh > vw;
    const scale = portrait ? Math.min(vh / W, vw / H) : Math.min(vw / W, vh / H);
    return { portrait, scale };
  };
  const [st, setSt] = useState(calc);
  useEffect(() => {
    const on = () => setSt(calc());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    // 対応端末（Androidなど）では横向きに固定する。iPhoneは非対応なので回転表示で対応
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch { /* 非対応 */ }
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch { /* 非対応 */ }
    };
  }, []);
  return st;
}

// ---- 横画面の固定 ----
// Androidなど対応ブラウザ：全画面にしてから横向きに固定（ゲームのように本当に横画面になる）
// iPhoneのSafariは固定できないため、縦持ちのときは画面を回転して表示する
export async function enterLandscape() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch { /* 非対応の端末では回転表示で対応 */ }
}
export function exitLandscape() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch { /* 非対応 */ }
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch { /* 非対応 */ }
}

// ---- ポータルのタイル ----
const T = { stroke: '#cc4f00', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const TILES = [
  ['お客様照会', 'identity', <><circle cx="18" cy="14" r="6" {...T} /><path d="M8 38c0-8 4-14 10-14" {...T} /><rect x="24" y="24" width="18" height="14" rx="2" {...T} /><circle cx="30" cy="31" r="2.5" {...T} /><path d="M35 29h4M35 33h4" {...T} /></>],
  ['お支払い目安額', 'payment', <><rect x="10" y="8" width="26" height="30" rx="3" {...T} /><path d="M15 16h6M18 13v6M26 16h6M15 28l5 5M20 28l-5 5" {...T} /><circle cx="34" cy="34" r="6" {...T} /><path d="M31 33h6M31 36h6" {...T} /></>],
  ['販促アプリ', null, <><circle cx="24" cy="26" r="14" {...T} /><path d="M24 12c2-4 6-5 9-4" {...T} /><path d="M17 24h14M17 29h14" {...T} /></>],
  ['機種比較', null, <><rect x="6" y="14" width="12" height="22" rx="2" {...T} /><rect x="18" y="8" width="14" height="30" rx="2" {...T} /><rect x="32" y="14" width="10" height="22" rx="2" {...T} /><path d="M35 20h4M35 25h4M35 30h4" {...T} /></>],
  ['Orange', null, <><circle cx="24" cy="27" r="13" {...T} /><path d="M24 14c0-3 3-6 8-6" {...T} /><circle cx="29" cy="30" r="1" {...T} /><circle cx="32" cy="27" r="1" {...T} /><circle cx="30" cy="33" r="1" {...T} /></>],
  ['お支払い目安額(固定)', null, <><rect x="14" y="8" width="24" height="30" rx="3" {...T} /><path d="M19 16h6M22 13v6M29 16h6M19 28l5 5M24 28l-5 5" {...T} /><path d="M4 22h8M4 27h8" {...T} /></>],
  ['エリア検索', 'area', <><circle cx="30" cy="14" r="5" {...T} /><path d="M34 18l4 4" {...T} /><path d="M8 38v-8h8v8M18 38v-12h10v12M30 38v-6h8v6M6 38h36" {...T} /></>],
  ['ツール・リンク', null, <><path d="M14 6h20v34l-10-8-10 8z" {...T} /><path d="M24 14l2.4 5 5.3.6-4 3.6 1.1 5.3-4.8-2.8-4.8 2.8 1.1-5.3-4-3.6 5.3-.6z" {...T} /></>],
  ['ARCH関連', null, <><rect x="8" y="10" width="18" height="26" rx="3" {...T} /><path d="M12 30l5-14 5 14M14 25h6" {...T} /><rect x="26" y="16" width="14" height="18" rx="2" {...T} /><circle cx="33" cy="23" r="3" {...T} /></>],
  ['来店予約メニュー', null, <><path d="M8 20h24v16H8zM6 20l4-8h20l4 8" {...T} /><path d="M16 36v-8h8v8" {...T} /><circle cx="37" cy="15" r="7" {...T} /><path d="M37 11v4l3 2" {...T} /></>],
  ['販売予約メニュー', null, <><rect x="16" y="6" width="16" height="26" rx="3" {...T} /><path d="M20 14h8" {...T} /><path d="M6 32c6 0 8-4 14-4h8c2 0 2 4 0 4h-8M6 40l12-2 16-6c3-1 4 2 2 3l-14 7H6" {...T} /></>],
  ['証明書類確認', null, <><rect x="6" y="10" width="32" height="24" rx="3" {...T} /><rect x="10" y="14" width="32" height="24" rx="3" {...T} /><circle cx="20" cy="24" r="4" {...T} /><path d="M14 33c1-4 4-5 6-5s5 1 6 5M30 22h8M30 27h8" {...T} /></>],
  ['クレカ関連業務', null, <><rect x="6" y="12" width="36" height="24" rx="3" {...T} /><path d="M6 19h36M12 29h10M30 28h6v4h-6z" {...T} /></>],
  ['スマホ教室予約', null, <><path d="M6 38V24l10-6 10 6v14zM12 38v-6h8v6" {...T} /><path d="M16 18v-6" {...T} /><circle cx="36" cy="16" r="7" {...T} /><path d="M36 12v4l3 2" {...T} /></>],
  ['WEB重要事項説明', null, <><rect x="10" y="8" width="24" height="32" rx="3" {...T} /><path d="M18 6h8v5h-8zM15 18h4M15 25h4M15 32h4M22 18h8M22 25h6" {...T} /><path d="M30 34l10-12 3 3-10 12-4 1z" {...T} /></>],
  ['お知らせアプリ', null, <><path d="M10 20v8h6l14 8V12l-14 8z" {...T} /><path d="M16 28l3 10h4l-2-9M34 18c2 2 2 8 0 10M38 14c4 4 4 16 0 20" {...T} /></>],
];
const PAGE2 = [['auでんき契約照会', 'denki', <path d="M27 6L12 27h10l-3 15 16-22H25z" {...T} />]];

function Portal({ onOpen, onMultitask, onLogout, say }) {
  const [page, setPage] = useState(0);
  const noop = () => say('練習用では操作できません');
  const tiles = page === 0 ? TILES : PAGE2;
  return (
    <div className="ot-screen">
      <TopBar right={['multi', 'manual', 'rw', 'sync', 'out']} onMultitask={onMultitask} onLogout={onLogout} noop={noop} />
      <div className="ot-memo">
        <span>用件メモ</span>
        <button className="ot-btn" onClick={noop}>登録</button><button className="ot-btn" onClick={noop}>一覧</button>
        <i />
        <button className="ot-btn" onClick={noop}>アプローチ</button>
      </div>
      <main className="ot-main" style={{ padding: '18px 28px', gap: 14 }}>
        <div className="ot-kv">
          <h1 className="ot-h1" style={{ fontSize: 22 }}>ポータルメニュー</h1>
          <div style={{ display: 'flex', gap: 10 }}><button className="ot-btn" onClick={noop}>新たなご提案を開始</button><button className="ot-btn" onClick={noop}>› 管理メニュー</button></div>
        </div>
        <div className="ot-tiles">
          {tiles.map(([name, key, icon]) => (
            <button key={name} className="ot-tile" onClick={key ? () => onOpen(key) : () => say('このメニューは練習用ではまだ使えません')}>
              <svg width="52" height="52" viewBox="0 0 48 48" aria-hidden="true">{icon}</svg>{name}
            </button>
          ))}
        </div>
        <div className="ot-dots">
          {[0, 1].map((p) => (
            <button key={p} onClick={() => setPage(p)} aria-label={`ページ${p + 1}`}><span style={{ background: page === p ? '#cc4f00' : '#d4c8bd' }} /></button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ===== オレタブ練習の本体 =====
// 開いた画面は閉じるまで入力を保持。閉じる（×・一括終了）と画面ごと消えて入力はリセットされる
// オレタブ自体を出る（ログアウト）と、すべてリセット
export default function OreTab({ onExit, payConfig }) {
  const stage = useStage();
  const [open, setOpen] = useState([]); // 開いている画面（開いた順）
  const [active, setActive] = useState('portal');
  const [multi, setMulti] = useState(false);
  const toast = useToast();
  const [stageEl, setStageEl] = useState(null);

  const openScreen = (k) => { setOpen((o) => (o.includes(k) ? o : [...o, k])); setActive(k); setMulti(false); };
  const closeScreen = (k) => { setOpen((o) => o.filter((x) => x !== k)); setActive((a) => (a === k ? 'portal' : a)); };

  // マルチタスク：画面を縮尺そのまま小さくして、縦2つずつ・右詰め（サイズ固定）
  const S = 0.26, TW = Math.round(W * S), TH = Math.round(H * S), GAP = 26, LABEL = 30, RIGHT = 40;
  const items = ['portal', ...open];
  const cols = Math.ceil(items.length / 2);
  const top = Math.round((H - (2 * (TH + LABEL) + GAP)) / 2) + 20;
  const pos = {};
  items.forEach((k, i) => {
    const col = Math.floor(i / 2), row = i % 2;
    pos[k] = {
      x: W - RIGHT - (cols - col) * TW - (cols - col - 1) * GAP,
      y: top + row * (TH + LABEL + GAP) + LABEL,
    };
  });
  const layerStyle = (k) => {
    if (multi) {
      return { left: pos[k].x, top: pos[k].y, transform: `scale(${S})`, zIndex: 40, pointerEvents: 'none', borderRadius: 30, overflow: 'hidden', boxShadow: '0 10px 30px rgba(74,53,40,.22)' };
    }
    const on = active === k;
    return { left: 0, top: 0, zIndex: on ? 20 : 5, visibility: on ? 'visible' : 'hidden' };
  };

  const stageStyle = {
    width: W, height: H,
    transform: `translate(-50%, -50%) ${stage.portrait ? 'rotate(90deg) ' : ''}scale(${stage.scale})`,
  };

  return (
    <div className="ot-viewport">
      <div className="ot-stage" style={stageStyle} ref={setStageEl}>
        <StageContext.Provider value={stageEl}>
        <div className="ot-layer-screen" style={layerStyle('portal')}>
          <Portal onOpen={openScreen} onMultitask={() => setMulti(true)} onLogout={() => { exitLandscape(); onExit(); }} say={toast.say} />
        </div>
        {open.map((k) => {
          const C = SCREENS[k];
          return (
            <div key={k} className="ot-layer-screen" style={layerStyle(k)}>
              <C onClose={() => closeScreen(k)} onMultitask={() => setMulti(true)} config={payConfig} />
            </div>
          );
        })}

        {multi && (
          <div className="ot-multi">
            <button className="ot-multi-bg" onClick={() => setMulti(false)} aria-label="マルチタスクを閉じる" />
            <div className="ot-multi-title">マルチタスク</div>
            <div className="ot-multi-sub">開いている画面をタップすると切り替わります。×で閉じると、その画面の入力はリセットされます</div>
            {items.map((k) => (
              <div key={k} className="ot-multi-label" style={{ left: pos[k].x, top: pos[k].y - LABEL, width: TW }}>
                <span className="ot-multi-au">au</span>
                <span className="ot-ellipsis" style={{ flex: 1 }}>{TITLES[k]}</span>
                {k !== 'portal' && <button onClick={() => closeScreen(k)} aria-label={`${TITLES[k]}を閉じる`}>×</button>}
              </div>
            ))}
          </div>
        )}
        {multi && items.map((k) => (
          <button key={k} className="ot-multi-pick" aria-label={`${TITLES[k]}に切り替える`}
            style={{ left: pos[k].x, top: pos[k].y, width: TW, height: TH, borderColor: active === k ? '#ff6600' : '#e0d6cc' }}
            onClick={() => { setActive(k); setMulti(false); }} />
        ))}
        <Toast msg={toast.msg} />
        </StageContext.Provider>
      </div>
    </div>
  );
}
