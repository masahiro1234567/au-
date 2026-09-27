import React, { useState } from 'react';
import { TopBar, KpField, Keypad, Toast, useForm, useToast, yen, Icons } from './common.jsx';

// ===== お支払い目安額 =====
// 上の5つのタブがそれぞれ別の見積もり。プルダウンも含め、すべての入力をタブごとに持つ（コピーでまるごと複製）
// 契約事務手数料・Pontaポイント還元・プラン一覧などは、今後データを入れて機能を足していく

const KINDS = ['auスマホ・ケータイ 機変', 'auスマホ・ケータイ 新規', 'auスマホ・ケータイ MNP'];
const TIMES = [['', ''], ['1', '一括'], ['12', '12回'], ['24', '24回'], ['36', '36回'], ['48', '48回']];
const LATER = '[後で追加]';

// 自動計算（金額はすべて税込の円）
export function calcEstimate(e) {
  const n = (k) => Number(String(e[k] || '').replace(/[^0-9]/g, '')) || 0;
  const price = n('price'), sd = n('shopDisc'), pd = n('ptDisc');
  const base = Math.max(price - sd, 0); // 分割支払金（販売価格−店頭値引き）
  const times = Number(e.times || 0);
  let monthly = 0, first = 0, store = 0;
  if (times === 1) store = base; // 一括：店頭で全額
  else if (times > 1) {
    monthly = Math.floor(base / times); // 月々（端数は初回に上乗せ）
    first = base - monthly * (times - 1);
  }
  const real = Math.max(price - sd - pd, 0); // 実質負担金（ポイント値引き含む）
  const disc = e.discOn ? n('disc') : 0;
  const sub = n('plan') + n('net') + n('option'); // 月々のご利用料金 小計
  const planMonthly = Math.max(sub - disc, 0);
  const total = monthly + planMonthly + n('plus1');
  return { sd, pd, base, monthly, first, store, real, otoku: sd + pd, sub, disc, planMonthly, total, plan: n('plan'), net: n('net'), option: n('option'), plus1: n('plus1') };
}

const DIALOGS = {
  disc: { title: '割引内訳入力', note: '店頭値引き・ポイント値引きの金額を入力します', fields: [['shopDisc', '店頭値引き'], ['ptDisc', 'ポイント値引き']] },
  plan: { title: '料金プラン', note: '練習用：プランの一覧は後で追加します。いまは月額を入力してください', fields: [['plan', '月額']] },
  net: { title: 'インターネット接続サービス', note: '練習用：月額を入力してください', fields: [['net', '月額']] },
  option: { title: 'オプション変更', note: '練習用：オプションの一覧は後で追加します。いまは月額の合計を入力してください', fields: [['option', '月額（合計）']] },
  discAmt: { title: '割引サービス', note: '練習用：割引の月額を入力してください', fields: [['disc', '割引額（月額）']] },
  plus1: { title: 'au +1collection', note: '練習用：月額を入力してください', fields: [['plus1', '月額']] },
};

const isEmpty = (e) => !Object.keys(e || {}).some((k) => e[k]);

export default function Payment({ onClose, onMultitask }) {
  const [ests, setEsts] = useState([{}, {}, {}, {}, {}]);
  const [cur, setCur] = useState(0);
  const [dlg, setDlg] = useState(null);
  const [askDelete, setAskDelete] = useState(false);
  const [layout, setLayout] = useState(false);
  const [printCode, setPrintCode] = useState('');
  const toast = useToast();
  const noop = () => toast.say('練習用では操作できません');
  const e = ests[cur];
  const setE = (name, v) => setEsts((es) => es.map((x, i) => (i === cur ? { ...x, [name]: v } : x)));

  const form = useForm({
    values: e, setValue: setE,
    maxLen: { price: 7, shopDisc: 7, ptDisc: 7, plan: 6, net: 6, option: 6, disc: 6, plus1: 6 },
    labels: { price: '販売価格', shopDisc: '店頭値引き', ptDisc: 'ポイント値引き', plan: '料金プラン（月額）', net: 'インターネット接続サービス（月額）', option: 'オプション（月額合計）', disc: '割引額（月額）', plus1: 'au +1collection（月額）' },
  });
  const r = calcEstimate(e);
  const sel = (name, options, props = {}) => (
    <select className="ot-sel" value={form.get(name) || props.fallback || ''} onChange={form.onChange(name)} aria-label={props.label} style={props.style}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const pickBtn = (label, onClick, style) => <button className="ot-btn sm" onClick={onClick} style={style}>{Icons.pick}{label}</button>;

  // コピー：開いているタブの内容を、空いているタブのうち一番左へ
  const copyEst = () => {
    const to = ests.findIndex((x, i) => i !== cur && isEmpty(x));
    if (to < 0) return toast.say('空いているタブがありません');
    setEsts((es) => es.map((x, i) => (i === to ? { ...es[cur] } : x)));
    toast.say(`${cur + 1}のタブを${to + 1}にコピーしました`);
  };
  const toggleDisc = () => {
    if (e.discOn) setE('discOn', '');
    else { setE('discOn', '1'); setDlg('discAmt'); }
  };
  const d = dlg ? DIALOGS[dlg] : null;
  const Y = { fontSize: 12, color: '#4a3528' };

  return (
    <div className="ot-screen" style={{ background: layout ? '#cfc8c1' : undefined }}>
      <div className={`ot-pay-wrap ${layout ? 'layout' : ''}`}>
        <TopBar right={['multi', 'manual', 'x']} onMultitask={onMultitask} onClose={onClose} noop={noop} />
        <main className="ot-main" style={{ padding: '8px 14px 8px 30px' }}>
          <button className="ot-side-tab" onClick={noop}>ご説明コンテンツ</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h1 className="ot-h1" style={{ marginRight: 'auto' }}>お支払い目安額</h1>
            <button className="ot-btn sm" onClick={noop}>回線紐づけ</button>
            <button className="ot-btn sm" onClick={noop}>お支払い目安額(固定)</button>
            <button className="ot-btn sm" onClick={noop}>サマリ表示 <b className="ot-badge">1</b></button>
            <button className="ot-btn sm" onClick={noop}>補助帳票 <b className="ot-badge">1</b></button>
            <button className="ot-btn sm" onClick={noop} style={{ color: '#b8aca2' }}>お申し込み</button>
          </div>
          <div className="ot-est-bar">
            {ests.map((x, i) => {
              const t = calcEstimate(x).total;
              return (
                <button key={i} className={`ot-est ${i === cur ? 'on' : ''}`} onClick={() => { setCur(i); form.closeKp(); setDlg(null); }}>
                  <span className="ot-est-check">{i === cur ? '✓' : ''}</span>
                  <span className="ot-est-total">{t ? t.toLocaleString('ja-JP') + '円' : '-円'}</span>
                </button>
              );
            })}
            <div className="ot-est-tools">
              <button className="ot-btn sm" onClick={copyEst}><Tool d="copy" />コピー</button>
              <button className="ot-btn icon" onClick={noop} aria-label="保存"><Tool d="up" /></button>
              <button className="ot-btn icon" onClick={noop} aria-label="読込"><Tool d="down" /></button>
              <button className="ot-btn icon" onClick={() => { setLayout(true); form.closeKp(); setDlg(null); }} aria-label="レイアウト"><Tool d="pen" /></button>
              <button className="ot-btn icon" onClick={noop} aria-label="グラフ"><Tool d="chart" /></button>
              <button className="ot-btn icon" onClick={noop} aria-label="ヘルプ"><Tool d="q" /></button>
              <button className="ot-btn icon" onClick={() => setAskDelete(true)} aria-label="このタブを削除"><Tool d="re" /></button>
            </div>
          </div>

          <div className="ot-pay-grid">
            {/* 端末料金 */}
            <section className="ot-col blue">
              <div className="ot-col-head">
                <b>端末料金</b>
                {sel('kind', KINDS.map((k) => [k, k]), { fallback: KINDS[0], label: '契約種別', style: { flex: 1, height: 30, fontSize: 12 } })}
                {pickBtn('機種比較', noop)}
              </div>
              <div className="ot-col-body">
                <div style={{ display: 'flex', gap: 10 }}><div style={{ width: 90 }} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {sel('model', [['', '－選択してください－'], [LATER, '[機種は後で追加]']], { label: '機種', style: { height: 32 } })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ marginLeft: 'auto' }}>販売価格</span><KpField form={form} name="price" label="販売価格" left align="right" placeholder="- 円" style={{ width: 170, height: 32 }} /></div>
                </div></div>
                <div className="ot-sep" />
                <b className="ot-col-sub">割引内訳</b>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {pickBtn('割引内訳入力', () => setDlg('disc'))}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="ot-kv" style={Y}><span>店頭値引き</span><span>{yen(r.sd)}</span></div>
                    <div className="ot-kv" style={Y}><span>ポイント値引き</span><span>{yen(r.pd)}</span></div>
                  </div>
                </div>
                <div className="ot-sep" />
                <div className="ot-kv"><b className="ot-col-sub">分割支払金</b><span style={Y}>{yen(r.base)}</span></div>
                {pickBtn('分割支払金入力', noop, { alignSelf: 'flex-start', color: '#b8aca2' })}
                {sel('times', TIMES, { label: '支払回数', style: { width: 110, height: 30 } })}
                <div style={{ ...Y, textAlign: 'right', lineHeight: 1.7 }}>初回 {yen(r.first)}　月々 {yen(r.monthly)}<br />最終回支払金額 -円　延長回数 -回<br />延長後初回 -円　延長後月々 -円</div>
                <div className="ot-sep" />
                <div className="ot-kv" style={{ alignItems: 'flex-start' }}>
                  <div><b className="ot-col-sub">実質負担金</b><div style={{ fontSize: 11, color: '#4a3528' }}>(ポイント値引き含む)</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 800 }}>{yen(r.real)}</div><div style={{ fontSize: 12, color: '#cc4f00' }}>{yen(r.otoku)} お得</div></div>
                </div>
              </div>
              <div className="ot-col-foot blue">
                <div><b>店頭お支払い額</b><div className="ot-big">{yen(r.store)}</div><div className="ot-mini">(初回のみ -円)</div></div>
                <div><b>月々のお支払い額</b><div className="ot-big">{yen(r.monthly)}</div></div>
              </div>
            </section>

            {/* 月々のご利用料金 */}
            <section className="ot-col pink">
              <div className="ot-col-head"><b>月々のご利用料金</b></div>
              <div className="ot-col-body" style={{ flexGrow: 0, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ width: 84 }}>基本パック</span>{sel('pack', [['', ''], [LATER, LATER]], { label: '基本パック', style: { flex: 1, height: 32 } })}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><b style={{ width: 84 }}>料金プラン</b><PickField onClick={() => setDlg('plan')} value={r.plan ? '月額 ' + yen(r.plan) : ''} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...Y }}><span style={{ width: 84 }}>インターネット<br />接続サービス</span><PickField onClick={() => setDlg('net')} value={r.net ? '月額 ' + yen(r.net) : ''} /></div>
              </div>
              <div className="ot-col-body" style={{ flexGrow: 1, gap: 6, borderTop: '1px solid #ecd2d2' }}>
                <div className="ot-kv"><b className="ot-col-sub">オプションサービス</b>{pickBtn('オプション変更', () => setDlg('option'), { height: 28, fontSize: 11 })}</div>
                {r.option > 0 && <div className="ot-kv" style={Y}><span>オプション（合計）</span><span>{yen(r.option)}</span></div>}
              </div>
              <div className="ot-col-body" style={{ flexGrow: 0, borderTop: '1px solid #ecd2d2' }}>
                <b className="ot-col-sub">割引サービス</b>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {sel('discSvc', [['', ''], [LATER, LATER]], { label: '割引サービス', style: { flex: 1, height: 30 } })}
                  <button className={`ot-onoff ${e.discOn ? 'on' : ''}`} onClick={toggleDisc}>{e.discOn ? 'ON' : 'OFF'}</button>
                </div>
                {e.discOn && <div className="ot-kv" style={Y}><span>割引額</span><span>－{yen(r.disc)}</span></div>}
              </div>
              <div className="ot-pink-foot">
                <div className="ot-pink-left">
                  <b>契約事務手数料</b><div className="ot-r">- 円</div>
                  <b>翌月請求額</b><div className="ot-r">- 円</div>
                  <div className="ot-mini">(初回のご利用料金と併<br />せてのご請求)</div>
                </div>
                <div className="ot-pink-right">
                  <div className="ot-pink-pay"><b>月々のお支払い額</b><div style={{ fontSize: 11, marginTop: 2 }}>小計 {yen(r.sub)} {yen(r.disc)} お得</div><div className="ot-big" style={{ marginTop: 10 }}>{yen(r.planMonthly)}</div></div>
                  <div className="ot-ponta">Pontaポイント還元 -Pt</div>
                </div>
              </div>
            </section>

            {/* キャンペーン・+1collection */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="ot-box green"><div className="ot-kv"><b>キャンペーン関連</b>{pickBtn('追加/変更', noop, { height: 28, fontSize: 11, color: '#b8aca2' })}</div></div>
              <div className="ot-box yellow">
                <div className="ot-kv"><b>au +1collection</b>{pickBtn('追加/変更', () => setDlg('plus1'), { height: 28, fontSize: 11 })}</div>
                <div style={{ flex: 1 }} />
                {sel('plus1Sel', [['', ''], [LATER, LATER]], { label: 'au +1collection', style: { width: 110, height: 30 } })}
                <div className="ot-kv" style={Y}><span>月々のお支払い額</span><b style={{ color: '#cc4f00' }}>{yen(r.plus1)}</b></div>
                <div className="ot-mini" style={{ textAlign: 'right' }}>(初回のみ -円)</div>
              </div>
              <div className="ot-box total"><b>月々のお支払い目安額</b><div className="ot-big" style={{ fontSize: 20, fontWeight: 900 }}>{r.total ? r.total.toLocaleString('ja-JP') + ' 円' : '- 円'}～</div></div>
              <button className="ot-orange" onClick={noop}>ポイントシミュレーターに連携</button>
            </section>
          </div>
          <div className="ot-mini" style={{ paddingTop: 5, lineHeight: 1.5 }}>※見積りは作成時の情報です。料金や提供条件は変更の可能性があります。<br />※税込価格です。※ポイント数は試算値で、実際と異なることがあります。</div>
        </main>
      </div>

      {/* 入力ダイアログ */}
      {d && (
        <div className="ot-ov center" style={{ zIndex: 45 }}>
          <div className="ot-dialog" role="dialog" aria-label={d.title}>
            <div className="ot-dialog-title">{d.title}</div>
            <div className="ot-dialog-note">{d.note}</div>
            {d.fields.map(([name, label]) => (
              <div key={name} className="ot-kv" style={{ fontSize: 13, fontWeight: 700, gap: 10 }}>
                <span>{label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><KpField form={form} name={name} label={label} align="right" placeholder="0" style={{ width: 200 }} />円</span>
              </div>
            ))}
            <div className="ot-dialog-foot">
              <button className="ot-btn" onClick={() => d.fields.forEach(([n]) => setE(n, ''))}>クリア</button>
              <button className="ot-ok" onClick={() => { setDlg(null); form.closeKp(); }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* レイアウト（鉛筆）：戻る矢印と印刷 */}
      {layout && !printCode && (
        <div className="ot-layer">
          <button className="ot-layout-back" onClick={() => setLayout(false)} aria-label="レイアウトを閉じる">
            <svg width="58" height="46" viewBox="0 0 58 46" aria-hidden="true"><path d="M24 3L3 23l21 20V31h31V15H24z" fill="#fff" stroke="#4a3528" strokeWidth="2.5" strokeLinejoin="round" /></svg>
          </button>
          <button className="ot-layout-print" onClick={() => setPrintCode(String(Math.floor(1000 + Math.random() * 9000)))}>印刷</button>
        </div>
      )}
      {printCode && (
        <div className="ot-print">
          <div className="ot-print-card"><div className="ot-print-label">印刷番号</div><div className="ot-print-code">{printCode}</div></div>
          <button className="ot-print-ok" onClick={() => setPrintCode('')}>OK</button>
        </div>
      )}

      {/* タブの削除確認 */}
      {askDelete && (
        <div className="ot-dim">
          <div className="ot-dialog" role="dialog" aria-label="タブの削除" style={{ width: 400, alignItems: 'center', gap: 20, padding: '26px 24px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>現在のタブを削除します</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="ot-btn" style={{ height: 44, minWidth: 130, fontSize: 14 }} onClick={() => setAskDelete(false)}>いいえ</button>
              <button className="ot-ok" style={{ height: 44, minWidth: 130 }} onClick={() => { setEsts((es) => es.map((x, i) => (i === cur ? {} : x))); setAskDelete(false); }}>はい</button>
            </div>
          </div>
        </div>
      )}
      <Keypad form={form} money />
      <Toast msg={toast.msg} />
    </div>
  );
}

function PickField({ onClick, value }) {
  return <button className="ot-pickfield" onClick={onClick}>{Icons.pick}<span style={{ marginLeft: 'auto' }}>{value}</span></button>;
}

// 右上ツールのアイコン
const TS = { stroke: '#4a3528', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
function Tool({ d }) {
  const p = {
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" {...TS} /><path d="M5 16V5a1 1 0 011-1h9" {...TS} /></>,
    up: <path d="M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 17M12 11v7M9 14l3-3 3 3" {...TS} />,
    down: <path d="M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 17M12 11v7M9 15l3 3 3-3" {...TS} />,
    pen: <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" {...TS} />,
    chart: <><rect x="4" y="4" width="16" height="16" rx="2" {...TS} /><path d="M8 16v-4M12 16V8M16 16v-6" {...TS} /></>,
    q: <><circle cx="12" cy="12" r="9" {...TS} /><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17v.5" {...TS} /></>,
    re: <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" {...TS} />,
  }[d];
  return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">{p}</svg>;
}
