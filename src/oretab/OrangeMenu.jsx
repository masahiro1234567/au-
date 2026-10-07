import { onAppBack, onAppSwipe } from '../backStack.js';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { TopBar, Toast, useToast, StaffContext } from './common.jsx';
import EoInquiry from './EoInquiry.jsx';
import { KoteiInquiry, DenkiInquiry } from './Inquiry.jsx';

// ===== Orange業務メニュー（ポータルの「Orange」） =====
// 「よく使う」タブで開く。タブは押すか、一覧を左右にスワイプして切り替える
// eo光契約照会：ブラウザで開く（×閉じるで戻る）
// 固定通信サービス契約照会・auでんき契約照会：オレタブの上に重ねて開く（右上の閉じるで消える）
const TABS = [
  ['よく使う', [['お客様情報照会'], ['お客様情報照会(回線契約無し)'], ['新規加入登録(1台)'], ['新規加入登録(複数台)'], ['割賦契約登録(回線契約無し)'], ['端末増設登録(加入者なし)', '', true], ['本日の手続き検索'], ['保存済み手続き一覧'], ['代理店控照会', '', true], ['申込書再出力'], ['イレギュラー登録依頼(au/UQ)'], ['イレギュラー登録依頼一覧(au/UQ)'], ['イレギュラー登録(BBC/でんき)(異業種商材取次申込)'], ['移動機メモリ確認結果登録']]],
  ['顧客特定業務', [['お客様情報照会'], ['お客様情報照会(回線契約無し)'], ['固定通信サービス契約照会', 'kotei'], ['eo光契約照会', 'eo'], ['auでんき契約照会', 'denki'], ['太陽光電力買取サービス契約照会'], ['au ID照会(回線契約無し)']]],
  ['新規加入', []], ['申込特定業務', []], ['単独業務', []], ['管理業務', []],
];
const Chev = () => <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="#d0461a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function OrangeMenu({ onClose, onMultitask }) {
  const { staff } = useContext(StaffContext);
  const [tab, setTab] = useState(0);
  const [sub, setSub] = useState(''); // eo ／ kotei ／ denki
  const toast = useToast();
  const noop = () => toast.say('練習用では操作できません');
  const sw = useRef(null);
  const swiped = useRef(false);
  const go = (i) => setTab(Math.max(0, Math.min(TABS.length - 1, i)));
  // 左右のスワイプでタブを切り替え（回転表示のときは画面の向きに合わせて読み替える）
  const down = (e) => { sw.current = { x: e.clientX, y: e.clientY }; };
  const up = (e) => {
    const s = sw.current; sw.current = null;
    if (!s) return;
    let dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (window.innerHeight > window.innerWidth) { const t = dx; dx = dy; dy = -t; } // 縦持ち（90度回して表示）
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped.current = true; go(tab + (dx < 0 ? 1 : -1)); setTimeout(() => { swiped.current = false; }, 300); }
  };
  // PCのタッチパッドの横スワイプでもタブを切り替える。ブラウザの「戻る」ではメニューを閉じる
  const tabRef = useRef(tab); tabRef.current = tab;
  const subRef = useRef(sub); subRef.current = sub;
  useEffect(() => onAppSwipe((dir) => {
    if (subRef.current) return dir === 'left'; // 照会画面の上では、戻る（左から右）だけ通す
    const t = tabRef.current, n = t + (dir === 'left' ? 1 : -1);
    if (n < 0 || n > TABS.length - 1) return true; // 端のタブでは何もしない（うっかり閉じないように）
    setTab(n); return true;
  }), []);
  useEffect(() => onAppBack(() => { if (subRef.current) { setSub(''); return true; } onClose(); return true; }), [onClose]);
  const items = TABS[tab][1];
  return (
    <div className="ot-screen" style={{ background: '#e8e6ea' }}>
      <TopBar right={['multi', 'manual', 'rw', 'sync', 'q', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />
      <main className="ot-main" style={{ padding: '18px 22px 0' }} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { sw.current = null; }}
        onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="ot-h1" style={{ flex: 1, fontSize: 26 }}>Orange業務メニュー</h1>
          <input className="ot-inp" aria-label="業務を検索" style={{ width: 300, height: 40 }} />
          <button className="ot-btn" style={{ height: 40, background: '#a7a9ae', borderColor: '#a7a9ae', color: '#1a0f08' }} onClick={noop}>検索</button>
        </div>
        <div className="om-tabs">
          {TABS.map(([n], i) => <button key={n} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>{n}</button>)}
        </div>
        <div className="om-grid">
          {items.map(([n, key, noArrow]) => (
            <button key={n} className="om-item" onClick={() => (key ? setSub(key) : toast.say('このメニューは練習用ではまだ使えません'))}>
              <span>{n}</span>{!noArrow && <Chev />}
            </button>
          ))}
        </div>
        {!items.length && <div style={{ textAlign: 'center', color: '#6b5a4e', fontSize: 14, marginTop: 40 }}>練習用では、このタブのメニューはまだありません</div>}
        <div className="ot-dots" style={{ paddingBottom: 14 }}>
          {TABS.map(([n], i) => <button key={n} onClick={() => setTab(i)} aria-label={`${n}のタブ`}><span style={{ background: i === tab ? '#e0561f' : '#9a9aa0' }} /></button>)}
        </div>
      </main>
      {sub === 'eo' && <div className="om-full"><EoInquiry staff={staff} onClose={() => setSub('')} /></div>}
      {(sub === 'kotei' || sub === 'denki') && (
        <div className="om-sheet">
          {sub === 'kotei'
            ? <KoteiInquiry onClose={() => setSub('')} onMultitask={onMultitask} />
            : <DenkiInquiry onClose={() => setSub('')} onMultitask={onMultitask} />}
        </div>
      )}
      <Toast msg={toast.msg} />
    </div>
  );
}
